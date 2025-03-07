import type { OnRpcRequestHandler } from '@metamask/snaps-sdk';
import { Box, Text, Bold, Heading } from '@metamask/snaps-sdk/jsx';
import { keccak_256 } from "@noble/hashes/sha3";

const PM_CONTRACT = "0x6080604052600080546001600160a01b0316813563530ca43760e11b1415602857808252602082f35b3682833781823684845af490503d82833e806041573d82fd5b503d81f3fea264697066735822122015938e3bf2c49f5df5c1b7f9569fa85cc5d6f3074bb258a2dc0c7e299bc9e33664736f6c63430008040033"
function toChecksumCase(address: string): string {
  if (typeof address !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(`Invalid address format: ${address}`);
  }

  const addressLower = address.toLowerCase().replace("0x", "");
  const hash = keccak_256(Uint8Array.from(Buffer.from(addressLower, "utf-8")));
  const hashHex = Buffer.from(hash).toString("hex").slice(0, 40);

  let checksumAddress: string = "0x";
  for (let i = 0; i < 40; i++) {
    const h: string = hashHex[i] ?? `NO HASH HEX AT ${i}!`
    const n = parseInt(h, 16)
    const c = addressLower[i]  ?? `NO CHAR AT ${i}!`
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
  const x = 1
  console.log("Test", x)
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
      throw new Error(`Method not found. ${request.method}: ${JSON.stringify(request)}`);
  }
};

// in src/index.js
export const onTransaction = async ({ transaction, chainId, transactionOrigin }) => {
  let error: any = null
  try {
    console.log("OnTx", {transaction, chainId})
    const accounts = []; //await ethereum.request({ method: "eth_requestAccounts", params: [] })
    // parse tx, do checks, etc
    let recipientType: string = "UNKNOWN"
    let rightNetwork: any = null
    let usdcToken: any = null
    let usdceToken: any = null
    let lowerR: any = null
    let actualRecipient: any = null
    let contractQ: any = null
    let creationBlockNumber: any = null
    let code: any = null
    let eventLog: any = null
    let matchSender: any = null
    let nativeToken: any = null
    let amount: any = null
    let matchRecipient: any = null
    let severity = "critical"

    try {

      nativeToken = transaction.data === "0x"
      lowerR = nativeToken ? transaction.to : "0x" + transaction.data.substring(34, 74)
      actualRecipient = toChecksumCase(lowerR)
      code = await  getCode(actualRecipient)
      if(nativeToken) {
        amount = BigInt(transaction.value)
      } else {
        amount = BigInt("0x" + transaction.data.slice(-64))
      }
      if(amount === 0n) {
        recipientType = "ZERO_SEND"
      } else if(code === PM_CONTRACT) {
        recipientType = "POLYMARKET"
        rightNetwork = chainId === "eip155:137"
        usdcToken = transaction.to === "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359".toLowerCase()
        usdceToken = transaction.to === "0x2791bca1f2de4661ed88a30c99a7a9449aa84174".toLowerCase()
        creationBlockNumber = await findCreationBlockNumber(actualRecipient)
        eventLog = await getEventLog(creationBlockNumber)
        matchSender = eventLog?.by === toChecksumCase(transaction.from)
      } else if (code === "0x") {
        recipientType = "UNKNOWN"
      } else {
        recipientType = `UnreachableRecipientType`
      }
      matchRecipient = eventLog?.to === actualRecipient
    } catch (e) {
      const err: Error = e as Error
      error = {err, s: err.toString(), stack: err.stack}
    }
    const colors: any = [ 'default' , 'alternative' , 'muted' , 'error' , 'success' , 'warning']
    const masterStatus = "Safe"
    const displayRecipientType = {
    }[recipientType]
    const checklist: any = [
      ["CHECK", "success", masterStatus],
      ["i", "success", displayRecipientType],
    ]

            // {checklist.map(row => { return (<Text color={row[1]}>{row[2]}</Text>)w })}
    return {
      content: (
         <Box>
          <Heading>{masterStatus}</Heading>
          <Heading>Text colors</Heading>
            {colors.map(c => (( <Text color={c}>{c}</Text>)))}
          <Heading>Debug Output</Heading>
          <Text>{jsonStr({
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
              error
            })}</Text>
        </Box>
      ),
      severity,
    }
  } catch(e) {
    const err: Error = e as Error
    error = {err, s: err.toString(), stack: err.stack}
    return {
      content: (
         <Box>
          <Heading>Error</Heading>
          <Text>{JSON.stringify({ error })}</Text>
        </Box>
      )
    }
  }
}


async function rpcRequest(method, params) {
  const rpcUrl = "https://polygon-rpc.com"
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });
  const json = await response.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

async function getCode(address) {
  return await rpcRequest( "eth_getCode", [address, "latest"]);
  return code !== "0x";
}

async function findCreationBlockNumber(address) {
  let latestHex = await rpcRequest("eth_blockNumber", []);
  let latest = parseInt(latestHex, 16);
  let low = 0,
    high = latest;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const code = await rpcRequest("eth_getCode", [address, "0x" + mid.toString(16)]);
    if (code === "0x") {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

async function getEventLog(blockNumber) {
  const eventTopic = "0x4f51faf6c4561ff95f067657e43439f0f856d97c04d9ec9070a6199ad418e235";
  const receipts = await rpcRequest("eth_getBlockReceipts", ["0x" + blockNumber.toString(16)])
  for(const r of receipts) {
    const logs = r.logs.filter(l => l.topics[0] === eventTopic)
    if(logs.length) {
      const log = logs[0]
      console.log(log)
      const to = toChecksumCase("0x" + log.data.slice(26, 66))
      const by = toChecksumCase("0x" + log.data.slice(90, 130))
        // trace = await provider.send("debug_traceTransaction", [tx, {}]);
      return {eventTopic, log, to, by}
    }
  }
}
function jsonStr(obj) {
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === "bigint") return value.toString() + "n"; // stringify bigint
        if (value instanceof Date) return value.toISOString(); // stringify date
        if (value instanceof Map) return Object.fromEntries(value); // stringify map
        if (value instanceof Set) return [...value]; // stringify set
        return value; // default case
    });
}
