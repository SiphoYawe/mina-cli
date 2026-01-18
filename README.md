<h1 align="center">@siphoyawe/mina-cli</h1>

<p align="center">
  <strong>Terminal-based cross-chain bridge to Hyperliquid</strong>
</p>

<p align="center">
  Bridge assets from any chain directly from your command line
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@siphoyawe/mina-cli">
    <img src="https://img.shields.io/npm/v/@siphoyawe/mina-cli.svg" alt="npm version" />
  </a>
  <a href="https://www.typescriptlang.org/">
    <img src="https://img.shields.io/badge/TypeScript-Ready-blue.svg" alt="TypeScript" />
  </a>
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" />
  </a>
</p>

---

## Features

- **Interactive Wizard** - Step-by-step guided bridging experience
- **Multi-chain Support** - Bridge from 40+ chains including Ethereum, Arbitrum, Polygon, Base, and more
- **Auto-deposit** - Automatic deposit to Hyperliquid L1 trading account
- **Transaction Tracking** - Real-time status monitoring with progress indicators
- **Local History** - Track all your bridge transactions locally
- **Beautiful TUI** - Dark luxe terminal theme with elegant UI components
- **JSON Output** - Machine-readable output for scripting and automation

## Installation

```bash
# npm
npm install -g @siphoyawe/mina-cli

# yarn
yarn global add @siphoyawe/mina-cli

# pnpm
pnpm add -g @siphoyawe/mina-cli
```

## Quick Start

### Interactive Wizard (Recommended)

Simply run `mina` with no arguments to launch the interactive wizard:

```bash
mina
```

The wizard will guide you through:
1. Selecting a source chain
2. Choosing a token to bridge
3. Entering the amount
4. Confirming and executing the transaction

### Get a Quote

```bash
# Get a quote for bridging USDC from Arbitrum
mina quote --from arbitrum --token USDC --amount 100

# Get a quote with JSON output
mina quote --from ethereum --token ETH --amount 0.5 --json
```

### Execute a Bridge

```bash
# Bridge USDC from Arbitrum (will prompt for private key)
mina bridge --from arbitrum --token USDC --amount 100

# Bridge with a key file
mina bridge --from arbitrum --token USDC --amount 100 --key ./key.json

# Skip confirmation prompt
mina bridge --from ethereum --token ETH --amount 0.5 --key ./key.json --yes
```

## Commands

### `mina` / `mina wizard`

Launch the interactive bridge wizard.

```bash
mina
mina wizard
```

### `mina quote`

Get a bridge quote without executing.

```bash
mina quote --from <chain> --token <symbol> --amount <number> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--from <chain>` | Source chain (required) | - |
| `--to <chain>` | Destination chain | `hyperliquid` |
| `--token <symbol>` | Token symbol (required) | - |
| `--amount <number>` | Amount to bridge (required) | - |
| `--json` | Output as JSON | `false` |

### `mina bridge`

Execute a bridge transaction.

```bash
mina bridge --from <chain> --token <symbol> --amount <number> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--from <chain>` | Source chain (required) | - |
| `--token <symbol>` | Token symbol (required) | - |
| `--amount <number>` | Amount to bridge (required) | - |
| `--key <path>` | Path to private key file | Prompt |
| `--yes` | Skip confirmation prompt | `false` |
| `--auto-deposit` | Auto-deposit to Hyperliquid L1 | `true` |

### `mina status`

Check the status of a bridge transaction.

```bash
mina status <txHash> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--watch` | Poll for real-time updates | `false` |

### `mina chains`

List all supported source chains.

```bash
mina chains [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--json` | Output as JSON | `false` |

### `mina tokens`

List bridgeable tokens.

```bash
mina tokens [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--chain <chain>` | Filter by chain (name or ID) | All chains |
| `--json` | Output as JSON | `false` |

### `mina balance`

Check wallet token balances.

```bash
mina balance --address <address> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--address <address>` | Wallet address (required) | - |
| `--chain <chain>` | Specific chain (name or ID) | All chains |
| `--all` | Show all tokens including zero balance | `false` |
| `--json` | Output as JSON | `false` |

### `mina history`

View bridge transaction history.

```bash
mina history [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--limit <number>` | Number of entries to show | `10` |
| `--address <address>` | Filter by wallet address | All |
| `--json` | Output as JSON | `false` |

### `mina config`

Manage CLI configuration.

```bash
# List all config
mina config list

# Get a specific value
mina config get <key>

# Set a value
mina config set <key> <value>
```

**Configuration Options:**

| Key | Type | Description | Default |
|-----|------|-------------|---------|
| `slippage` | `number` | Slippage tolerance (percentage) | `0.5` |
| `autoDeposit` | `boolean` | Auto-deposit to Hyperliquid L1 | `true` |
| `defaultChain` | `string` | Default source chain | `arbitrum` |
| `rpc.<chain>` | `string` | Custom RPC URL per chain | Default RPC |

**Examples:**

```bash
mina config set slippage 1.0
mina config set defaultChain ethereum
mina config set rpc.arbitrum https://arb1.example.com
```

## Private Key Handling

The CLI supports multiple formats for providing your private key:

### Key File (Recommended)

Create a JSON file with your private key:

```json
{
  "privateKey": "0x..."
}
```

Or use plain text format:

```
0x1234567890abcdef...
```

Then pass it to the bridge command:

```bash
mina bridge --from arbitrum --token USDC --amount 100 --key ./key.json
```

### Interactive Prompt

If no key file is provided, you'll be prompted to enter your private key:

```bash
mina bridge --from arbitrum --token USDC --amount 100
# Enter private key (input will be visible):
```

**Security Note:** Never share your private key. Store key files securely and add them to `.gitignore`.

## Configuration File

CLI settings are stored in `~/.mina/config.json`. Bridge history is stored in `~/.mina/history.json`.

## Supported Chains

| Chain | Chain ID |
|-------|----------|
| Ethereum | 1 |
| Arbitrum | 42161 |
| Optimism | 10 |
| Base | 8453 |
| Polygon | 137 |
| BSC | 56 |
| Avalanche | 43114 |
| Fantom | 250 |
| zkSync Era | 324 |
| Linea | 59144 |
| Scroll | 534352 |
| And 30+ more... | |

**Destination:** HyperEVM (Chain ID: 999) with automatic deposit to Hyperliquid L1

## Examples

```bash
# Launch the interactive wizard
mina

# Get a quote for bridging 100 USDC from Arbitrum
mina quote --from arbitrum --token USDC --amount 100

# Bridge 0.5 ETH from Ethereum
mina bridge --from ethereum --token ETH --amount 0.5 --key ./key.json

# Check transaction status with live updates
mina status 0x1234...abcd --watch

# View supported chains in JSON format
mina chains --json

# List tokens available on Arbitrum
mina tokens --chain arbitrum

# Check wallet balance on all chains
mina balance --address 0x1234...abcd

# View recent bridge history
mina history --limit 20

# Configure default slippage
mina config set slippage 1.0
```

## Related Packages

- [@siphoyawe/mina-sdk](https://www.npmjs.com/package/@siphoyawe/mina-sdk) - The underlying SDK with React hooks
- [Mina Bridge Web App](https://github.com/siphoyawe/mina-sdk) - Web interface for bridging

## License

MIT
