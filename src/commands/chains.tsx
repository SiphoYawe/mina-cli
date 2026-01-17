import React, { useState, useEffect } from 'react'
import { Box, Text, useApp } from 'ink'
import {
  getChains,
  HYPEREVM_CHAIN_ID,
  type Chain,
} from '@siphoyawe/mina-sdk'
import {
  Header,
  SearchableList,
  Spinner,
  theme,
  symbols,
  type ListItem,
} from '../ui/index.js'

/**
 * Popular chains to highlight (by chain ID)
 * These appear first and get a star indicator
 */
const POPULAR_CHAIN_IDS = [
  1,      // Ethereum
  42161,  // Arbitrum
  10,     // Optimism
  137,    // Polygon
  8453,   // Base
  43114,  // Avalanche
  56,     // BNB Chain
  999,    // HyperEVM (destination)
]

/**
 * Chain display row type
 */
interface ChainRow {
  name: string
  id: number
  type: 'Origin' | 'Dest'
}

/**
 * Chains command component - displays supported chains with interactive search
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
        const hasHyperEvm = chainRows.some(c => c.id === HYPEREVM_CHAIN_ID)
        if (!hasHyperEvm) {
          chainRows.push({
            name: 'Hyperliquid',
            id: HYPEREVM_CHAIN_ID,
            type: 'Dest',
          })
        } else {
          const hyperEvmChain = chainRows.find(c => c.id === HYPEREVM_CHAIN_ID)
          if (hyperEvmChain) {
            hyperEvmChain.type = 'Dest'
          }
        }

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

  // Convert to ListItem format
  const listItems: ListItem[] = chains.map((chain) => ({
    id: chain.id,
    label: chain.name,
    sublabel: `ID: ${chain.id}`,
    badge: chain.type,
    badgeColor: chain.type === 'Origin' ? theme.success : theme.accent,
  }))

  return (
    <Box flexDirection="column" padding={1}>
      <Header compact showTagline={false} />

      <SearchableList
        items={listItems}
        title="Supported Chains"
        placeholder="Type to filter chains..."
        popularIds={POPULAR_CHAIN_IDS}
        maxDisplay={12}
        searchable={true}
      />

      <Box marginTop={1}>
        <Text color={theme.muted} dimColor>
          ★ = Popular chains • Origin = Source for bridging • Dest = Destination
        </Text>
      </Box>
    </Box>
  )
}

export default ChainsCommand
