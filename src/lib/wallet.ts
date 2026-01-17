/**
 * Private key handling utilities for Mina Bridge CLI
 */
import fs from 'fs'
import readline from 'readline'
import type { TransactionSigner, TransactionRequestData } from '@siphoyawe/mina-sdk'
import type { Chain } from 'viem'

/**
 * Load a private key from a file path
 * Supports both JSON format ({"privateKey": "0x..."}) and plain text format
 */
export async function loadPrivateKey(path?: string): Promise<string> {
  if (path) {
    if (!fs.existsSync(path)) {
      throw new Error(`Key file not found: ${path}`)
    }

    const content = fs.readFileSync(path, 'utf-8')

    try {
      // Try JSON format: { "privateKey": "0x..." }
      const json = JSON.parse(content)
      const key = json.privateKey || json.private_key || json.key
      if (key) {
        return normalizePrivateKey(key)
      }
      // If parsed but no key field, treat content as plain text
      return normalizePrivateKey(content.trim())
    } catch {
      // Plain text format - just the key
      return normalizePrivateKey(content.trim())
    }
  }

  // Prompt for key if not provided
  return promptForPrivateKey()
}

/**
 * Prompt user for private key via stdin
 * Note: Input is visible in terminal (for hidden input, use a dedicated library)
 */
export function promptForPrivateKey(): Promise<string> {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    // Note: readline doesn't support hiding input natively
    // For production, consider using a library like 'read' or 'prompts'
    process.stdout.write('Enter private key (input will be visible): ')

    rl.on('line', (answer) => {
      rl.close()
      try {
        resolve(normalizePrivateKey(answer.trim()))
      } catch (err) {
        reject(err)
      }
    })

    rl.on('close', () => {
      // Handle Ctrl+C
    })
  })
}

/**
 * Normalize private key to ensure it has 0x prefix
 */
function normalizePrivateKey(key: string): string {
  const trimmed = key.trim()

  // Validate it looks like a private key
  const keyWithoutPrefix = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed

  if (!/^[0-9a-fA-F]{64}$/.test(keyWithoutPrefix)) {
    throw new Error('Invalid private key format. Expected 64 hex characters.')
  }

  return trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`
}

/**
 * Get address from private key using viem
 */
export async function getAddressFromPrivateKey(privateKey: string): Promise<string> {
  const { privateKeyToAccount } = await import('viem/accounts')
  const account = privateKeyToAccount(privateKey as `0x${string}`)
  return account.address
}

/**
 * Create a transaction signer from a private key
 * This creates a signer compatible with the SDK's TransactionSigner interface
 */
export async function createSigner(
  privateKey: string,
  chainId: number,
  rpcUrl?: string
): Promise<TransactionSigner> {
  const { privateKeyToAccount } = await import('viem/accounts')
  const { createWalletClient, http } = await import('viem')
  const { arbitrum, mainnet, optimism, polygon, base, avalanche, bsc } = await import('viem/chains')

  // Map chain ID to viem chain config
  const chainMap: Record<number, Chain> = {
    1: mainnet,
    42161: arbitrum,
    10: optimism,
    137: polygon,
    8453: base,
    43114: avalanche,
    56: bsc,
    // HyperEVM Mainnet
    999: {
      id: 999,
      name: 'HyperEVM',
      nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
      rpcUrls: {
        default: { http: ['https://rpc.hyperliquid.xyz/evm'] },
      },
    } as Chain,
    // HyperEVM Testnet
    998: {
      id: 998,
      name: 'HyperEVM Testnet',
      nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
      rpcUrls: {
        default: { http: ['https://rpc.hyperliquid-testnet.xyz/evm'] },
      },
    } as Chain,
  }

  const chain = chainMap[chainId]
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}. Supported: ${Object.keys(chainMap).join(', ')}`)
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`)

  const transport = rpcUrl ? http(rpcUrl) : http()

  const walletClient = createWalletClient({
    account,
    chain,
    transport,
  })

  return {
    sendTransaction: async (request: TransactionRequestData): Promise<string> => {
      const txHash = await walletClient.sendTransaction({
        to: request.to as `0x${string}`,
        data: request.data as `0x${string}`,
        value: BigInt(request.value || '0'),
        gas: request.gasLimit ? BigInt(request.gasLimit) : undefined,
        gasPrice: request.gasPrice ? BigInt(request.gasPrice) : undefined,
        chain,
      })

      return txHash
    },

    getAddress: async (): Promise<string> => {
      return account.address
    },

    getChainId: async (): Promise<number> => {
      return chainId
    },
  }
}

/**
 * Validate that a wallet has sufficient balance for gas
 */
export async function checkGasBalance(
  address: string,
  chainId: number,
  rpcUrl?: string
): Promise<{ balance: bigint; sufficient: boolean }> {
  const { createPublicClient, http } = await import('viem')
  const { arbitrum, mainnet, optimism, polygon, base, avalanche, bsc } = await import('viem/chains')

  const chainMap: Record<number, Chain> = {
    1: mainnet,
    42161: arbitrum,
    10: optimism,
    137: polygon,
    8453: base,
    43114: avalanche,
    56: bsc,
    // HyperEVM Mainnet
    999: {
      id: 999,
      name: 'HyperEVM',
      nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
      rpcUrls: {
        default: { http: ['https://rpc.hyperliquid.xyz/evm'] },
      },
    } as Chain,
    // HyperEVM Testnet
    998: {
      id: 998,
      name: 'HyperEVM Testnet',
      nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
      rpcUrls: {
        default: { http: ['https://rpc.hyperliquid-testnet.xyz/evm'] },
      },
    } as Chain,
  }

  const chain = chainMap[chainId]
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}. Supported: ${Object.keys(chainMap).join(', ')}`)
  }

  const client = createPublicClient({
    chain,
    transport: rpcUrl ? http(rpcUrl) : http(),
  })

  const balance = await client.getBalance({ address: address as `0x${string}` })

  // Consider sufficient if > 0.001 ETH (or equivalent)
  const minBalance = BigInt('1000000000000000') // 0.001 ETH in wei

  return {
    balance,
    sufficient: balance >= minBalance,
  }
}
