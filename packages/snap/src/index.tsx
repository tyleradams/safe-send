import type { OnRpcRequestHandler } from '@metamask/snaps-sdk';
import { Box, Text, Bold, Heading, Icon } from '@metamask/snaps-sdk/jsx';
import { keccak_256 } from '@noble/hashes/sha3';

const PM_CONTRACT =
  '0x6080604052600080546001600160a01b0316813563530ca43760e11b1415602857808252602082f35b3682833781823684845af490503d82833e806041573d82fd5b503d81f3fea264697066735822122015938e3bf2c49f5df5c1b7f9569fa85cc5d6f3074bb258a2dc0c7e299bc9e33664736f6c63430008040033';

/**
 *
 * @param address
 */
function toChecksumCase(address: string): string {
  if (typeof address !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(`Invalid address format: ${address}`);
  }

  const addressLower = address.toLowerCase().replace('0x', '');
  const hash = keccak_256(Uint8Array.from(Buffer.from(addressLower, 'utf-8')));
  const hashHex = Buffer.from(hash).toString('hex').slice(0, 40);

  let checksumAddress = '0x';
  for (let i = 0; i < 40; i++) {
    const h: string = hashHex[i] ?? `NO HASH HEX AT ${i}!`;
    const n = parseInt(h, 16);
    const c = addressLower[i] ?? `NO CHAR AT ${i}!`;
    checksumAddress += n > 7 ? c.toUpperCase() : c;
  }

  return checksumAddress;
}

// example usage
/**
 * Handle incoming JSON-RPC requests, sent through `wallet_invokeSnap`.
 *
 * @param args - The request handler args as object.
 * @param args.origin - The origin of the request, e.g., the website that
 * invoked the snap.
 * @param args.request - A validated JSON-RPC request object.
 * @returns The result of `snap_dialog`.
 * @throws If the request method is not valid for this snap.
 */
export const onRpcRequest: OnRpcRequestHandler = async ({
  origin,
  request,
}) => {
  const x = 1;
  console.log('Test', x);
  switch (request.method) {
    case 'hello':
      return snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          content: (
            <Box>
              <Text>
                Hello world {x.toString()}, <Bold>{origin}</Bold>!
              </Text>
              <Text>
                This custom confirmation is just for display purposes.
              </Text>
              <Text>
                But you can edit the snap source code to make it do something,
                if you want to!
              </Text>
            </Box>
          ),
        },
      });
    default:
      throw new Error(
        `Method not found. ${request.method}: ${JSON.stringify(request)}`,
      );
  }
};

// in src/index.js
export const onTransaction = async ({
  transaction,
  chainId,
  transactionOrigin,
}) => {
  let error: any = null;
  try {
    console.log('OnTx', { transaction, chainId });
    const accounts = []; // await ethereum.request({ method: "eth_requestAccounts", params: [] })
    // parse tx, do checks, etc
    let recipientType = 'UNKNOWN';
    let rightNetwork: any = null;
    let usdcToken: any = null;
    let usdceToken: any = null;
    let lowerR: any = null;
    let actualRecipient: any = null;
    const contractQ: any = null;
    let creationBlockNumber: any = null;
    let code: any = null;
    let eventLog: any = null;
    let matchSender: any = null;
    let nativeToken: any = null;
    let amount: any = null;
    let matchRecipient: any = null;
    const severity = 'critical';

    const checklist: any[] = [];

    try {
      nativeToken = transaction.data === '0x';
      lowerR = nativeToken
        ? transaction.to
        : `0x${transaction.data.substring(34, 74)}`;
      actualRecipient = toChecksumCase(lowerR);
      code = await getCode(actualRecipient);
      if (nativeToken) {
        amount = BigInt(transaction.value);
      } else {
        amount = BigInt(`0x${transaction.data.slice(-64)}`);
      }
      if (amount === 0n) {
        recipientType = 'ZERO_SEND';
      } else if (code === PM_CONTRACT) {
        recipientType = 'POLYMARKET';
        rightNetwork = chainId === 'eip155:137';
        usdcToken =
          transaction.to ===
          '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'.toLowerCase();
        usdceToken =
          transaction.to ===
          '0x2791bca1f2de4661ed88a30c99a7a9449aa84174'.toLowerCase();
        creationBlockNumber = await findCreationBlockNumber(actualRecipient);
        eventLog = await getEventLog(creationBlockNumber);
        matchSender = eventLog?.by === toChecksumCase(transaction.from);
      } else if (code === '0x') {
        recipientType = 'UNKNOWN';
      } else {
        recipientType = `UnreachableRecipientType`;
      }
      matchRecipient = eventLog?.to === actualRecipient;
    } catch (e) {
      const err: Error = e as Error;
      error = { err, s: err.toString(), stack: err.stack };
    }

    const config = {
      keys: {
        account: { true: 'account_matched', false: 'account_mismatched' },
        network: { true: 'network_correct', false: 'network_incorrect' },
      },
      messages: {
        account_matched: [
          'check',
          'success',
          'account confirmed: this is the same account used to deploy your polymarket contract',
        ],
        account_mismatched: [
          '?',
          'warning',
          `warning: account mismatch detected. expected deployer account, but got ${eventLog.by}`,
        ],
        deployment: [
          'i',
          'default',
          'deployment info: your polymarket contract was deployed on [date]',
        ],
        network_correct: [
          'check',
          'success',
          "network confirmed: you're on the correct network for polymarket transactions",
        ],
        network_incorrect: [
          '!',
          'error',
          'error: incorrect network detected. switch immediately to avoid issues',
        ],
        token_usdce: ['check', 'success', 'token verified: usdc(e) is in use'],
        token_usdc: [
          '?',
          'warning',
          'warning: usdc detected. redemption required',
        ],
        token_incorrect: [
          '!',
          'error',
          'error: incorrect token found. transaction halted to prevent fund loss',
        ],
        token_error: [
          '!',
          'error',
          'error: token verification failed due to network misconfiguration',
        ],
        wallet: [
          '?',
          'warning',
          'warning: wallet unknown. proceed with caution and verify recipient details',
        ],
      },
      checklist: {
        polymarket: {
          account_matched: {
            network_correct: {
              token_usdce: [
                'account_matched',
                'deployment',
                'network_correct',
                'token_usdce',
              ],
              token_usdc: [
                'account_matched',
                'deployment',
                'network_correct',
                'token_usdc',
              ],
              token_incorrect: [
                'account_matched',
                'deployment',
                'network_correct',
                'token_incorrect',
              ],
            },
            network_incorrect: {
              default: [
                'account_matched',
                'deployment',
                'network_incorrect',
                'token_error',
              ],
            },
          },
          account_mismatched: {
            network_correct: {
              token_usdce: [
                'account_mismatched',
                'deployment',
                'network_correct',
                'token_usdce',
              ],
              token_usdc: [
                'account_mismatched',
                'deployment',
                'network_correct',
                'token_usdc',
              ],
              token_incorrect: [
                'account_mismatched',
                'deployment',
                'network_correct',
                'token_incorrect',
              ],
            },
            network_incorrect: {
              default: [
                'account_mismatched',
                'deployment',
                'network_incorrect',
                'token_error',
              ],
            },
          },
        },
        unknown: { wallet: ['wallet'] },
      },
      displayRecipientType: {
        polymarket: 'depositing into a polymarket account.',
        unknown: 'unknown recipient: extra caution required.',
        zero_send: 'sending $0: no risk detected.',
      },
      supportEmail: 'tyler@blitzblitzblitz.com',
      masterStatusDisplay: {
        default: 'all clear: safe to proceed',
        success: 'all clear: safe to proceed',
        warning: 'caution: proceed with attention',
        error:
          'error: critical issues detected. contact support immediately at tyler@blitzblitzblitz.com',
      },
      priority: { default: -1, success: 0, warning: 1, error: 2 },
    };

    const {
      keys,
      messages,
      checklist: cfgChecklist,
      displayRecipientType: displayTypeMap,
      supportEmail,
      masterStatusDisplay,
      priority: prio,
    } = config;

    const accountKey = keys.account[String(matchSender)];
    const networkKey = keys.network[String(rightNetwork)];
    const tokenMap = { token_usdce: usdceToken, token_usdc: usdcToken };
    const tokenKey =
      (Object.entries(tokenMap).find(([, v]) => v) ?? [])[0] ??
      'token_incorrect';
    const recipientKey = recipientType.toLowerCase();

    const recipientConfig = config.checklist[recipientKey] ?? {};
    const accountConfig = recipientConfig[accountKey] ?? {};
    const networkConfig = accountConfig[networkKey] ?? {};

    const networkMapping = {
      network_correct: networkConfig[tokenKey],
      network_incorrect: networkConfig.default,
    };
    const rawChecklistKeys =
      networkMapping[networkKey] ?? config.checklist.unknown.wallet;
    const finalChecklist = rawChecklistKeys.map((key) => messages[key]);

    checklist.push(...finalChecklist);

    const masterStatusValue = checklist
      .map((item) => prio[item[1]])
      .reduce((a, b) => Math.max(a, b), -1);
    const masterStatusKey =
      Object.keys(prio).find((key) => prio[key] === masterStatusValue) ??
      'default';

    const displayType =
      displayTypeMap[recipientKey] ??
      `warning: unexpected recipient type (${recipientType}). contact support immediately at ${supportEmail}`;

    checklist.unshift(
      [masterStatusKey, masterStatusKey, masterStatusDisplay[masterStatusKey]],
      ['i', 'default', displayType],
    );

    const emojiMapping = {
      'check': '✅',
      'success': '✅',
      '?': '⚠️',
      'warning': '⚠️',
      'i': 'ℹ️',
      'default': 'ℹ️',
      '!': '🥵',
      'error': '🥵',
    }
    const iconMapping = {
      'check': 'confirmation',
      '?': 'question',
      'i': 'question',
      '!': 'danger'
    }

const icons: any = [ 'add-square', 'add', 'arrow-2-down', 'arrow-2-left', 'arrow-2-right', 'arrow-2-up', 'arrow-2-up-right', 'arrow-double-left', 'arrow-double-right', 'arrow-down', 'arrow-left', 'arrow-right', 'arrow-up', 'bank-token', 'bank', 'book', 'bookmark', 'bridge', 'calculator', 'card-pos', 'card-token', 'card', 'category', 'chart', 'check-bold', 'check', 'clock', 'close', 'code-circle', 'coin', 'confirmation', 'connect', 'copy-success', 'copy', 'customize', 'danger', 'dark', 'data', 'diagram', 'document-code', 'drag-drop', 'dragging-animation', 'pinning-animation', 'edit', 'eraser', 'ethereum', 'expand', 'explore', 'export', 'eye-slash', 'eye', 'filter', 'flag', 'flash-slash', 'flash', 'full-circle', 'gas', 'global-search', 'global', 'graph', 'hardware', 'heart', 'hierarchy', 'home', 'import', 'info', 'key', 'light', 'link', 'loading', 'lock-circle', 'lock-slash', 'lock', 'login', 'logout', 'menu', 'message-question', 'messages', 'minus-bold', 'minus-square', 'minus', 'mobile', 'money', 'monitor', 'more-horizontal', 'more-vertical', 'notification-circle', 'notification', 'password-check', 'people', 'pin', 'programming-arrows', 'custody', 'question', 'received', 'refresh', 'save', 'scan-barcode', 'scan-focus', 'scan', 'scroll', 'search', 'security-card', 'security-cross', 'security-key', 'security-search', 'security-slash', 'security-tick', 'security-time', 'security-user', 'security', 'send-1', 'send-2', 'setting', 'slash', 'snaps-mobile', 'snaps-plus', 'snaps', 'speedometer', 'star', 'stake', 'student', 'swap-horizontal', 'swap-vertical', 'tag', 'tilde', 'timer', 'trash', 'trend-down', 'trend-up', 'user-circle-add', 'user-circle-link', 'user-circle-remove', 'user-circle', 'user', 'wallet-card', 'wallet-money', 'wallet', 'warning', 'twitter', 'qr-code', 'user-check', 'unpin', 'ban', 'bold', 'circle-x', 'download', 'file', 'flask', 'plug', 'share', 'square', 'tint', 'upload', 'usb', 'wifi', 'plus-minus' ]
    const iconPallet = (
      <Box>
        <Heading>Icons</Heading>
          {icons.map(i => {
          return (
            <Box>
              <Text>{i}</Text>
              {(["default", "primary", "muted"] as any).map(c => ((<Icon name={i} color={c}/>)))}
            </Box>
          )})}
      </Box>
    )

    const debugOutput = (
      <Box>
        <Heading>Debug Output</Heading>
        {iconPallet}
        <Text>
          {jsonStr({
            transaction,
            chainId,
            accounts,
            transactionOrigin,
            nativeToken,
            lowerR,
            actualRecipient,
            code,
            amount,
            recipientType,
            rightNetwork,
            usdcToken,
            usdceToken,
            creationBlockNumber,
            contractQ,
            eventLog,
            matchRecipient,
            matchSender,
            checklist,
            error,
          })}
        </Text>
      </Box>
    );

    return {
      content: (
        <Box>
          {checklist.map((row) => {
            return (
              <Box>
                <Text color={row[1]}>{emojiMapping[row[0]]} {row[2].toString()}</Text>
              </Box>
          )
          })}
        </Box>
      ),
      severity,
    };
  } catch (e) {
    const err: Error = e as Error;
    error = { err, s: err.toString(), stack: err.stack };
    return {
      content: (
        <Box>
          <Heading>Error</Heading>
          <Text>{JSON.stringify({ error })}</Text>
        </Box>
      ),
    };
  }
};

/**
 *
 * @param method
 * @param params
 */
async function rpcRequest(method, params) {
  const rpcUrl = 'https://polygon-rpc.com';
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });
  const json = await response.json();
  if (json.error) {
    throw new Error(json.error.message);
  }
  return json.result;
}

/**
 *
 * @param address
 */
async function getCode(address) {
  return await rpcRequest('eth_getCode', [address, 'latest']);
  return code !== '0x';
}

/**
 *
 * @param address
 */
async function findCreationBlockNumber(address) {
  const latestHex = await rpcRequest('eth_blockNumber', []);
  const latest = parseInt(latestHex, 16);
  let low = 0;
  let high = latest;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const code = await rpcRequest('eth_getCode', [
      address,
      `0x${mid.toString(16)}`,
    ]);
    if (code === '0x') {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

/**
 *
 * @param blockNumber
 */
async function getEventLog(blockNumber) {
  const eventTopic =
    '0x4f51faf6c4561ff95f067657e43439f0f856d97c04d9ec9070a6199ad418e235';
  const receipts = await rpcRequest('eth_getBlockReceipts', [
    `0x${blockNumber.toString(16)}`,
  ]);
  for (const r of receipts) {
    const logs = r.logs.filter((l) => l.topics[0] === eventTopic);
    if (logs.length) {
      const log = logs[0];
      console.log(log);
      const to = toChecksumCase(`0x${log.data.slice(26, 66)}`);
      const by = toChecksumCase(`0x${log.data.slice(90, 130)}`);
      // trace = await provider.send("debug_traceTransaction", [tx, {}]);
      return { eventTopic, log, to, by };
    }
  }
}
/**
 *
 * @param obj
 */
function jsonStr(obj) {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return `${value.toString()}n`;
    } // stringify bigint
    if (value instanceof Date) {
      return value.toISOString();
    } // stringify date
    if (value instanceof Map) {
      return Object.fromEntries(value);
    } // stringify map
    if (value instanceof Set) {
      return [...value];
    } // stringify set
    return value; // default case
  });
}
