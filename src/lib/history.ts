/**
 * History storage utilities for Mina Bridge CLI
 * Stores bridge transaction history locally for quick access
 */

import os from 'os'
import fs from 'fs'
import path from 'path'

/**
 * Path to the history file
 */
const HISTORY_PATH = path.join(os.homedir(), '.mina', 'history.json')

/**
 * Maximum number of history entries to keep
 */
const MAX_HISTORY_ENTRIES = 100

/**
 * History entry type representing a bridge transaction
 */
export interface HistoryEntry {
  /** Transaction hash */
  txHash: string
  /** Source chain name */
  fromChain: string
  /** Destination chain name */
  toChain: string
  /** Amount bridged */
  amount: string
  /** Token symbol */
  token: string
  /** Transaction status */
  status: 'pending' | 'completed' | 'failed'
  /** Timestamp when the transaction was initiated */
  timestamp: number
  /** Wallet address that initiated the transaction */
  walletAddress?: string
  /** Bridge transaction hash (if available) */
  bridgeTxHash?: string
  /** Deposit transaction hash (if available) */
  depositTxHash?: string
}

/**
 * History data structure stored in the file
 */
interface HistoryData {
  entries: HistoryEntry[]
  version: number
}

/**
 * Ensures the .mina directory exists
 */
function ensureDir(): void {
  const dir = path.dirname(HISTORY_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/**
 * Gets the history file path
 */
export function getHistoryPath(): string {
  return HISTORY_PATH
}

/**
 * Gets bridge history entries
 * @param limit - Maximum number of entries to return (default: 10)
 * @param address - Optional wallet address to filter by
 * @returns Array of history entries, most recent first
 */
export function getHistory(limit = 10, address?: string): HistoryEntry[] {
  ensureDir()

  if (!fs.existsSync(HISTORY_PATH)) {
    return []
  }

  try {
    const data: HistoryData = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'))
    let entries = data.entries || []

    // Filter by address if provided
    if (address) {
      entries = entries.filter(
        (e) => e.walletAddress?.toLowerCase() === address.toLowerCase()
      )
    }

    // Return most recent entries first
    return entries.slice(-limit).reverse()
  } catch {
    // If file is corrupted, return empty array
    return []
  }
}

/**
 * Adds a history entry
 * @param entry - History entry to add
 */
export function addHistory(entry: HistoryEntry): void {
  ensureDir()

  let data: HistoryData

  if (fs.existsSync(HISTORY_PATH)) {
    try {
      data = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'))
      if (!data.entries) {
        data = { entries: [], version: 1 }
      }
    } catch {
      data = { entries: [], version: 1 }
    }
  } else {
    data = { entries: [], version: 1 }
  }

  // Add new entry
  data.entries.push(entry)

  // Trim to max entries if needed
  if (data.entries.length > MAX_HISTORY_ENTRIES) {
    data.entries = data.entries.slice(-MAX_HISTORY_ENTRIES)
  }

  // Write back to file
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(data, null, 2))
}

/**
 * Updates a history entry by transaction hash
 * @param txHash - Transaction hash to find
 * @param updates - Partial updates to apply
 */
export function updateHistory(
  txHash: string,
  updates: Partial<Pick<HistoryEntry, 'status' | 'bridgeTxHash' | 'depositTxHash'>>
): void {
  ensureDir()

  if (!fs.existsSync(HISTORY_PATH)) {
    return
  }

  try {
    const data: HistoryData = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'))

    const index = data.entries.findIndex((e) => e.txHash === txHash)
    if (index !== -1 && data.entries[index]) {
      const entry = data.entries[index]
      data.entries[index] = {
        ...entry,
        ...updates,
      }
      fs.writeFileSync(HISTORY_PATH, JSON.stringify(data, null, 2))
    }
  } catch {
    // Silently fail if file is corrupted
  }
}

/**
 * Gets a single history entry by transaction hash
 * @param txHash - Transaction hash to find
 * @returns History entry or null if not found
 */
export function getHistoryEntry(txHash: string): HistoryEntry | null {
  const entries = getHistory(MAX_HISTORY_ENTRIES)
  return entries.find((e) => e.txHash === txHash) || null
}

/**
 * Clears all history
 */
export function clearHistory(): void {
  ensureDir()
  const data: HistoryData = { entries: [], version: 1 }
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(data, null, 2))
}

/**
 * Gets history statistics
 */
export function getHistoryStats(): {
  total: number
  completed: number
  pending: number
  failed: number
} {
  const entries = getHistory(MAX_HISTORY_ENTRIES)
  return {
    total: entries.length,
    completed: entries.filter((e) => e.status === 'completed').length,
    pending: entries.filter((e) => e.status === 'pending').length,
    failed: entries.filter((e) => e.status === 'failed').length,
  }
}
