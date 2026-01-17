import React, { useState, useEffect } from 'react'
import { Box, Text, useApp } from 'ink'
import {
  Header,
  Table,
  theme,
  symbols,
  type Column,
} from '../ui/index.js'
import { getHistory, type HistoryEntry } from '../lib/history.js'

/**
 * Props for the History command component
 */
interface HistoryCommandProps {
  /** Maximum number of entries to show */
  limit: number
  /** Optional wallet address to filter by */
  address?: string
  /** Output as JSON */
  json?: boolean
}

/**
 * Format timestamp to human readable date/time
 */
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * Truncate transaction hash for display
 */
function truncateHash(hash: string): string {
  if (hash.length <= 16) return hash
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`
}

/**
 * Get status icon and color based on status
 */
function getStatusDisplay(status: HistoryEntry['status']): {
  icon: string
  color: string
  label: string
} {
  switch (status) {
    case 'completed':
      return { icon: symbols.completed, color: theme.success, label: 'Complete' }
    case 'pending':
      return { icon: symbols.pending, color: theme.warning, label: 'Pending' }
    case 'failed':
      return { icon: symbols.failed, color: theme.error, label: 'Failed' }
    default:
      return { icon: symbols.pending, color: theme.muted, label: 'Unknown' }
  }
}

/**
 * History row type for table display
 */
interface HistoryRow {
  [key: string]: unknown
  date: string
  route: string
  amount: string
  status: string
  txHash: string
  statusColor: string
}

/**
 * Transform history entries to table rows
 */
function transformToRows(entries: HistoryEntry[]): HistoryRow[] {
  return entries.map((entry) => {
    const { icon, color, label } = getStatusDisplay(entry.status)
    return {
      date: formatDate(entry.timestamp),
      route: `${entry.fromChain} ${symbols.arrow} ${entry.toChain}`,
      amount: `${entry.amount} ${entry.token}`,
      status: `${icon} ${label}`,
      txHash: entry.txHash,
      statusColor: color,
    }
  })
}

/**
 * Empty state component when no history is found
 */
function EmptyState({ address }: { address?: string }) {
  return (
    <Box flexDirection="column">
      <Box
        borderStyle="round"
        borderColor={theme.border}
        paddingX={2}
        paddingY={1}
      >
        <Box flexDirection="column">
          <Text color={theme.muted}>
            {symbols.pending} No bridge history found
          </Text>
          <Box marginTop={1}>
            <Text color={theme.muted} dimColor>
              {address
                ? `No transactions found for address ${truncateHash(address)}`
                : 'Start by running a bridge transaction with: mina bridge --from <chain> --token USDC --amount 100'}
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

/**
 * History display component
 */
export function HistoryCommand({
  limit,
  address,
  json = false,
}: HistoryCommandProps) {
  const { exit } = useApp()
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load history
    const history = getHistory(limit, address)
    setEntries(history)
    setLoading(false)
  }, [limit, address])

  // Exit after rendering in JSON mode
  useEffect(() => {
    if (!loading && json) {
      setTimeout(() => exit(), 100)
    }
  }, [loading, json, exit])

  // JSON output mode
  if (json) {
    if (loading) return null
    console.log(JSON.stringify(entries, null, 2))
    return null
  }

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Header compact showTagline={false} />
        <Text color={theme.muted}>Loading history...</Text>
      </Box>
    )
  }

  const rows = transformToRows(entries)

  // Define table columns
  const columns: Column<HistoryRow>[] = [
    {
      header: 'Date',
      accessor: 'date',
      headerColor: theme.primary,
      cellColor: theme.secondary,
    },
    {
      header: 'Route',
      accessor: 'route',
      headerColor: theme.primary,
      cellColor: theme.info,
    },
    {
      header: 'Amount',
      accessor: 'amount',
      align: 'right',
      headerColor: theme.primary,
      cellColor: theme.secondary,
    },
    {
      header: 'Status',
      accessor: 'status',
      headerColor: theme.primary,
      cellColor: (_, row) => row.statusColor,
    },
  ]

  return (
    <Box flexDirection="column" padding={1}>
      <Header compact showTagline={false} />

      <Box marginBottom={1}>
        <Text color={theme.secondary}>
          {symbols.arrow} Bridge History
          {address && (
            <Text color={theme.muted}> ({truncateHash(address)})</Text>
          )}
          {entries.length > 0 && (
            <Text color={theme.muted}> - {entries.length} transaction{entries.length !== 1 ? 's' : ''}</Text>
          )}
        </Text>
      </Box>

      {entries.length === 0 ? (
        <EmptyState address={address} />
      ) : (
        <>
          <Table
            data={rows}
            columns={columns}
            bordered
            borderColor={theme.border}
          />

          <Box marginTop={1} flexDirection="column">
            <Text color={theme.muted} dimColor>
              Use {'"'}mina status {'<'}hash{'>"'} for full transaction details
            </Text>
            {entries.length >= limit && (
              <Text color={theme.muted} dimColor>
                Showing last {limit} entries. Use --limit to see more.
              </Text>
            )}
          </Box>
        </>
      )}
    </Box>
  )
}

/**
 * History command handler for commander
 */
export async function historyCommand(options: {
  limit?: string
  address?: string
  json?: boolean
}): Promise<void> {
  const { render } = await import('ink')
  const React = await import('react')

  const limit = options.limit ? parseInt(options.limit, 10) : 10

  render(
    React.createElement(HistoryCommand, {
      limit: isNaN(limit) ? 10 : limit,
      address: options.address,
      json: options.json || false,
    })
  )
}

export default HistoryCommand
