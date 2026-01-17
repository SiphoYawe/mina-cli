import React, { useState, useEffect } from 'react'
import { Box, Text, useApp } from 'ink'
import {
  getChains,
  HYPEREVM_CHAIN_ID,
  type Chain,
} from '@siphoyawe/mina-sdk'
import {
  Header,
  Table,
  Spinner,
  theme,
  symbols,
  type Column,
} from '../ui/index.js'

/**
 * Chain display row type
 */
interface ChainRow {
  name: string
  id: number
  type: 'Origin' | 'Dest'
}

/**
 * Chains command component - displays supported chains table
 */
export function ChainsCommand({ json = false }: { json?: boolean }) {
  const { exit } = useApp()
  const [chains, setChains] = useState<ChainRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadChains() {
      try {
        setLoading(true)
        setError(null)

        const response = await getChains()

        // Map chains to display format
        const chainRows: ChainRow[] = response.chains.map((chain: Chain) => ({
          name: chain.name,
          id: chain.id,
          type: 'Origin' as const,
        }))

        // Add HyperEVM as destination
        // Check if HyperEVM already exists in the list
        const hasHyperEvm = chainRows.some(c => c.id === HYPEREVM_CHAIN_ID)
        if (!hasHyperEvm) {
          chainRows.push({
            name: 'Hyperliquid',
            id: HYPEREVM_CHAIN_ID,
            type: 'Dest',
          })
        } else {
          // Mark existing HyperEVM as destination
          const hyperEvmChain = chainRows.find(c => c.id === HYPEREVM_CHAIN_ID)
          if (hyperEvmChain) {
            hyperEvmChain.type = 'Dest'
          }
        }

        // Sort: Origin chains first (alphabetically), then Dest
        chainRows.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'Origin' ? -1 : 1
          }
          return a.name.localeCompare(b.name)
        })

        setChains(chainRows)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load chains')
      } finally {
        setLoading(false)
      }
    }
    loadChains()
  }, [])

  // Exit after rendering in JSON mode
  useEffect(() => {
    if (!loading && json) {
      setTimeout(() => exit(), 100)
    }
  }, [loading, json, exit])

  // JSON output mode
  if (json) {
    if (loading) return null
    if (error) {
      console.error(JSON.stringify({ error }, null, 2))
      return null
    }
    console.log(JSON.stringify(chains, null, 2))
    return null
  }

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Header compact showTagline={false} />
        <Spinner text="Loading supported chains..." />
      </Box>
    )
  }

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Header compact showTagline={false} />
        <Box>
          <Text color={theme.error}>{symbols.failed} Error: {error}</Text>
        </Box>
      </Box>
    )
  }

  // Define table columns
  const columns: Column<ChainRow>[] = [
    {
      header: 'Chain',
      accessor: 'name',
      headerColor: theme.primary,
      cellColor: theme.secondary,
    },
    {
      header: 'ID',
      accessor: (row) => String(row.id),
      align: 'right',
      headerColor: theme.primary,
      cellColor: theme.muted,
    },
    {
      header: 'Type',
      accessor: 'type',
      headerColor: theme.primary,
      cellColor: (value) =>
        value === 'Origin' ? theme.success : theme.accent,
    },
  ]

  return (
    <Box flexDirection="column" padding={1}>
      <Header compact showTagline={false} />

      <Box marginBottom={1}>
        <Text color={theme.secondary}>
          {symbols.arrow} Supported Chains ({chains.length})
        </Text>
      </Box>

      <Table
        data={chains}
        columns={columns}
        bordered
        borderColor={theme.border}
      />

      <Box marginTop={1}>
        <Text color={theme.muted} dimColor>
          Origin = Source chains for bridging | Dest = Destination chain
        </Text>
      </Box>
    </Box>
  )
}

export default ChainsCommand
