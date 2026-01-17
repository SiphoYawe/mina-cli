#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import React from 'react';
import { render } from 'ink';
import { Wizard } from './commands/wizard.js';
import { QuoteDisplay } from './commands/quote.js';
import { ChainsCommand } from './commands/chains.js';
import { TokensCommand } from './commands/tokens.js';
import { Status } from './commands/status.js';
import { bridgeCommand, type BridgeCommandOptions } from './commands/bridge.js';
import { HistoryCommand } from './commands/history.js';
import { BalanceCommand } from './commands/balance.js';
import { ConfigCommand } from './commands/config.js';

const VERSION = '1.2.2';

const program = new Command();

program
  .name('mina')
  .description('Mina Bridge CLI - Bridge assets from any chain to Hyperliquid')
  .version(VERSION, '-v, --version', 'Display the current version')
  .helpOption('-h, --help', 'Display help information');

// Wizard command (can be explicitly called)
program
  .command('wizard')
  .description('Launch the interactive bridge wizard')
  .action(() => {
    render(React.createElement(Wizard));
  });

// Quote command - get a bridge quote
program
  .command('quote')
  .description('Get a bridge quote')
  .requiredOption('--from <chain>', 'Source chain (e.g., ethereum, arbitrum, polygon)')
  .option('--to <chain>', 'Destination chain', 'hyperliquid')
  .requiredOption('--token <symbol>', 'Token to bridge (e.g., USDC, ETH)')
  .requiredOption('--amount <number>', 'Amount to bridge')
  .option('--json', 'Output as JSON for machine-readable format')
  .action((options) => {
    render(
      React.createElement(QuoteDisplay, {
        fromChain: options.from,
        toChain: options.to,
        token: options.token,
        amount: options.amount,
        jsonOutput: options.json || false,
      })
    );
  });

// Status command - check bridge transaction status
program
  .command('status <txHash>')
  .description('Check bridge status')
  .option('--watch', 'Poll for updates')
  .action((txHash, options) => {
    render(
      React.createElement(Status, {
        txHash,
        watch: options.watch || false,
      })
    );
  });

// Chains command - list supported chains
program
  .command('chains')
  .description('List supported chains')
  .option('--json', 'Output as JSON')
  .action((options) => {
    render(
      React.createElement(ChainsCommand, {
        json: options.json || false,
      })
    );
  });

// Tokens command - list bridgeable tokens
program
  .command('tokens')
  .description('List bridgeable tokens')
  .option('--chain <chain>', 'Filter by chain (name or ID)')
  .option('--json', 'Output as JSON')
  .action((options) => {
    render(
      React.createElement(TokensCommand, {
        chain: options.chain,
        json: options.json || false,
      })
    );
  });

// Bridge command - execute a bridge transaction
program
  .command('bridge')
  .description('Execute a bridge transaction')
  .requiredOption('--from <chain>', 'Source chain (e.g., arbitrum, ethereum, polygon)')
  .requiredOption('--token <symbol>', 'Token to bridge (e.g., USDC, ETH)')
  .requiredOption('--amount <number>', 'Amount to bridge')
  .option('--key <path>', 'Path to private key file (JSON or plain text)')
  .option('--yes', 'Skip confirmation prompt')
  .option('--auto-deposit', 'Auto-deposit to Hyperliquid L1', true)
  .action((options) => {
    bridgeCommand(options as BridgeCommandOptions);
  });

// History command - view bridge transaction history
program
  .command('history')
  .description('View bridge transaction history')
  .option('--limit <number>', 'Number of entries to show', '10')
  .option('--address <address>', 'Filter by wallet address')
  .option('--json', 'Output as JSON')
  .action((options) => {
    render(
      React.createElement(HistoryCommand, {
        limit: parseInt(options.limit, 10) || 10,
        address: options.address,
        json: options.json || false,
      })
    );
  });

// Balance command - check wallet balances
program
  .command('balance')
  .description('Check wallet balances')
  .requiredOption('--address <address>', 'Wallet address')
  .option('--chain <chain>', 'Specific chain (name or ID)')
  .option('--all', 'Show all tokens including zero balance')
  .option('--json', 'Output as JSON')
  .action((options) => {
    render(
      React.createElement(BalanceCommand, {
        address: options.address,
        chain: options.chain,
        showAll: options.all || false,
        json: options.json || false,
      })
    );
  });

// Config command - manage CLI configuration
program
  .command('config [action] [key] [value]')
  .description('Manage CLI configuration')
  .action((action, key, value) => {
    render(
      React.createElement(ConfigCommand, {
        action,
        key,
        value,
      })
    );
  });

program.addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.dim('# Launch interactive wizard (default when no command given)')}
  $ mina

  ${chalk.dim('# Get a bridge quote')}
  $ mina quote --from arbitrum --token USDC --amount 100
  $ mina quote --from ethereum --token ETH --amount 0.5 --json

  ${chalk.dim('# Bridge USDC from Ethereum to Hyperliquid')}
  $ mina bridge --from arbitrum --token USDC --amount 100 --key ./key.json
  $ mina bridge --from ethereum --token ETH --amount 0.5 --yes

  ${chalk.dim('# Check transaction status')}
  $ mina status 0x1234...abcd
  $ mina status 0x1234...abcd --watch

  ${chalk.dim('# View supported chains and tokens')}
  $ mina chains
  $ mina tokens --chain arbitrum
  $ mina tokens --chain 1

  ${chalk.dim('# View bridge transaction history')}
  $ mina history
  $ mina history --limit 20
  $ mina history --address 0x1234...abcd
  $ mina history --json

  ${chalk.dim('# Check wallet balances')}
  $ mina balance --address 0x1234...abcd
  $ mina balance --address 0x1234...abcd --chain arbitrum
  $ mina balance --address 0x1234...abcd --all
  $ mina balance --address 0x1234...abcd --json

  ${chalk.dim('# Manage configuration')}
  $ mina config list
  $ mina config get slippage
  $ mina config set slippage 0.5
  $ mina config set rpc.arbitrum https://arb1.example.com

${chalk.bold('Documentation:')}
  https://github.com/siphoyawe/mina-sdk
`);

// Check if no command is provided - launch wizard
const args = process.argv.slice(2);
const hasCommand = args.length > 0 && !args[0]?.startsWith('-');
const isHelpOrVersion = args.some(arg => ['-h', '--help', '-v', '--version'].includes(arg));

if (!hasCommand && !isHelpOrVersion) {
  // No command provided, launch interactive wizard
  render(React.createElement(Wizard));
} else {
  // Parse command normally
  program.parse(process.argv);
}
