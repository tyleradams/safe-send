# Safe Send - MetaMask Snap

This snap helps ensure users safely send transactions, with a special focus on identifying Polymarket deposit addresses and validating transaction details.

## Knowledge Document

### Purpose and Functionality

Safe Send is a MetaMask snap that enhances transaction security by providing real-time validation and feedback on outgoing transactions. The snap specifically helps users identify Polymarket deposit addresses and validates that transactions are properly configured for this purpose.

### Key Features

- **Transaction Analysis**: Examines transaction details including recipient, network, and token type
- **Polymarket Address Verification**: Identifies Polymarket deposit contracts and validates their authenticity
- **Security Warnings**: Provides clear, color-coded alerts about potential issues with transactions
- **Network Validation**: Ensures users are on the correct network (Polygon) for Polymarket transactions
- **Token Verification**: Confirms users are using the correct tokens (USDC/USDCe) for Polymarket deposits

### Permissions Used

- `endowment:transaction-insight`: Allows the snap to analyze transaction data before signing
- `endowment:ethereum-provider`: Enables querying blockchain data to verify contract details
- `snap_dialog`: Creates user dialogs to display transaction analysis results
- `snap_manageState`: Stores persistent data when needed

### User Flow

1. User initiates a transaction in MetaMask
2. Safe Send analyzes the transaction details
3. The snap displays a confirmation dialog with security analysis
4. Color-coded indicators show safety status:
   - ✅ Green: Safe to proceed
   - ⚠️ Yellow: Caution advised
   - 🥵 Red: Potential danger, transaction should be canceled

### Security Considerations

- This snap does not modify transactions - it only provides information
- No external API calls are made; all validation happens locally or via the connected blockchain
- The snap only has access to transaction data you're already sending through MetaMask
- This is an independent project not officially affiliated with or endorsed by Polymarket

### Support and Feedback

For questions, support, or feedback about this snap, please contact tyler@blitzblitzblitz.com

## Development

This snap is built with TypeScript and uses the MetaMask Snaps SDK. To test the snap, run `yarn test` in this directory.

## Installation

The snap can be installed through the MetaMask extension by visiting the snap's website and clicking "Connect".

## Testing

The snap comes with basic tests to demonstrate testing practices for snaps. To test the snap, run `yarn test` in this directory. This uses [`@metamask/snaps-jest`](https://github.com/MetaMask/snaps/tree/main/packages/snaps-jest) to run tests in `src/index.test.ts`.