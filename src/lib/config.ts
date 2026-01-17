/**
 * Mina Bridge CLI Configuration Management
 *
 * Stores user preferences in ~/.mina/config.json
 */
import os from 'os'
import fs from 'fs'
import path from 'path'

const CONFIG_PATH = path.join(os.homedir(), '.mina', 'config.json')

/**
 * CLI Configuration interface
 */
export interface CliConfig {
  /** Default slippage tolerance (percentage) */
  slippage: number
  /** Auto-deposit to Hyperliquid L1 after bridge */
  autoDeposit: boolean
  /** Default source chain for bridging */
  defaultChain: string
  /** Custom RPC URLs per chain (null = use default) */
  rpc: Record<string, string | null>
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: CliConfig = {
  slippage: 0.5,
  autoDeposit: true,
  defaultChain: 'arbitrum',
  rpc: {},
}

/**
 * List of valid top-level config keys
 */
export const VALID_KEYS = ['slippage', 'autoDeposit', 'defaultChain', 'rpc'] as const
export type ValidKey = (typeof VALID_KEYS)[number]

/**
 * Ensure the config directory exists
 */
function ensureDir(): void {
  const dir = path.dirname(CONFIG_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/**
 * Get the full configuration, merging saved values with defaults
 */
export function getConfig(): CliConfig {
  ensureDir()
  if (!fs.existsSync(CONFIG_PATH)) {
    return { ...DEFAULT_CONFIG }
  }

  try {
    const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
    return {
      ...DEFAULT_CONFIG,
      ...data,
      // Ensure rpc is always an object
      rpc: { ...DEFAULT_CONFIG.rpc, ...(data.rpc || {}) },
    }
  } catch {
    // If parsing fails, return defaults
    return { ...DEFAULT_CONFIG }
  }
}

/**
 * Parse a string value to the appropriate type
 */
export function parseValue(value: string): string | number | boolean {
  // Boolean parsing
  if (value.toLowerCase() === 'true') return true
  if (value.toLowerCase() === 'false') return false

  // Number parsing
  const num = Number(value)
  if (!isNaN(num) && value.trim() !== '') return num

  // Default to string
  return value
}

/**
 * Validate that a key is a valid config key
 */
export function isValidKey(key: string): boolean {
  const parts = key.split('.')

  // Check if it's a nested rpc key
  if (parts.length === 2 && parts[0] === 'rpc') {
    return true
  }

  // Check if it's a top-level key
  return VALID_KEYS.includes(key as ValidKey)
}

/**
 * Set a configuration value
 * Supports nested keys like "rpc.arbitrum"
 */
export function setConfig(key: string, value: string | number | boolean): void {
  ensureDir()
  const config = getConfig()

  const keys = key.split('.')
  const rpcKey = keys[1]
  if (keys.length === 2 && keys[0] === 'rpc' && rpcKey) {
    // Handle nested RPC configuration
    config.rpc[rpcKey] = value as string
  } else if (VALID_KEYS.includes(key as ValidKey)) {
    // Handle top-level keys
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (config as any)[key] = value
  } else {
    throw new Error(`Unknown config key: ${key}`)
  }

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
}

/**
 * Get a specific configuration value
 * Supports nested keys like "rpc.arbitrum"
 */
export function getConfigValue(key: string): unknown {
  const config = getConfig()
  const keys = key.split('.')
  const rpcKey = keys[1]

  if (keys.length === 2 && keys[0] === 'rpc' && rpcKey) {
    return config.rpc[rpcKey] ?? null
  }

  if (VALID_KEYS.includes(key as ValidKey)) {
    return config[key as ValidKey]
  }

  return undefined
}

/**
 * Get a flattened list of all config values for display
 */
export function getConfigList(): Array<{ key: string; value: string; isDefault: boolean }> {
  const config = getConfig()
  const savedConfig = fs.existsSync(CONFIG_PATH)
    ? JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
    : {}

  const items: Array<{ key: string; value: string; isDefault: boolean }> = []

  // Add top-level values
  items.push({
    key: 'slippage',
    value: String(config.slippage),
    isDefault: savedConfig.slippage === undefined,
  })
  items.push({
    key: 'autoDeposit',
    value: String(config.autoDeposit),
    isDefault: savedConfig.autoDeposit === undefined,
  })
  items.push({
    key: 'defaultChain',
    value: config.defaultChain,
    isDefault: savedConfig.defaultChain === undefined,
  })

  // Add RPC values - show common chains
  const commonChains = ['ethereum', 'arbitrum', 'polygon', 'optimism', 'base']
  for (const chain of commonChains) {
    const customRpc = config.rpc[chain]
    items.push({
      key: `rpc.${chain}`,
      value: customRpc || '(default)',
      isDefault: !customRpc,
    })
  }

  // Add any additional custom RPC URLs
  for (const [chain, url] of Object.entries(config.rpc)) {
    if (!commonChains.includes(chain) && url) {
      items.push({
        key: `rpc.${chain}`,
        value: url,
        isDefault: false,
      })
    }
  }

  return items
}

/**
 * Reset a specific config key to default
 */
export function resetConfig(key: string): void {
  ensureDir()
  const config = getConfig()

  const keys = key.split('.')
  const rpcKey = keys[1]
  if (keys.length === 2 && keys[0] === 'rpc' && rpcKey) {
    delete config.rpc[rpcKey]
  } else if (VALID_KEYS.includes(key as ValidKey)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (config as any)[key] = DEFAULT_CONFIG[key as ValidKey]
  }

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
}

/**
 * Reset all configuration to defaults
 */
export function resetAllConfig(): void {
  ensureDir()
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2))
}

/**
 * Get the config file path
 */
export function getConfigPath(): string {
  return CONFIG_PATH
}
