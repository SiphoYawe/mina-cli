import React, { useState, useEffect } from 'react'
import { Box, Text, useApp } from 'ink'
import {
  getChains,
  getBridgeableTokens,
  type Chain,
  type Token,
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
 * Truncate address for display
 */
function truncateAddress(address: string): string {
  if (address.length <= 14) return address
  return `${address.slice(0, 10)}...${address.slice(-4)}`
}

/**
 * Token display row type
 */
interface TokenRow {
  symbol: string
  address: string
  displayAddress: string
  decimals: number
  name?: string
}

/**
 * Resolve chain name or ID to chain ID
 */
async function resolveChainId(chainInput: string): Promise<{ chainId: number; chainName: string } | null> {
  // Check if it's a numeric ID
  const numericId = parseInt(chainInput, 10)
  if (!isNaN(numericId)) {
    const response = await getChains()
    const chain = response.chains.find((c: Chain) => c.id === numericId)
    if (chain) {
      return { chainId: chain.id, chainName: chain.name }
    }
    // Still try with the ID even if not found
    return { chainId: numericId, chainName: chainInput }
  }

  // Otherwise treat as chain name/key
  const response = await getChains()
  const chainLower = chainInput.toLowerCase()
  const chain = response.chains.find((c: Chain) =>
    c.name.toLowerCase() === chainLower ||
    c.key?.toLowerCase() === chainLower
  )

  if (chain) {
    return { chainId: chain.id, chainName: chain.name }
  }

  return null
}

/**
 * Tokens command component - displays bridgeable tokens table
 */
export function TokensCommand({
  chain,
  json = false,
}: {
  chain?: string
  json?: boolean
}) {
  const { exit } = useApp()
  const [tokens, setTokens] = useState<TokenRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chainName, setChainName] = useState<string>('')
  const [availableChains, setAvailableChains] = useState<Chain[]>([])

  useEffect(() => {
    async function loadTokens() {
      try {
        setLoading(true)
        setError(null)

        // If no chain specified, show available chains hint
        if (!chain) {
          const chainsResponse = await getChains()
          setAvailableChains(chainsResponse.chains)
          setError('Please specify a chain with --chain <name|id>')
          setLoading(false)
          return
        }

        // Resolve chain name to ID
        const resolved = await resolveChainId(chain)
        if (!resolved) {
          const chainsResponse = await getChains()
          setAvailableChains(chainsResponse.chains)
          setError(`Unknown chain: "${chain}"`)
          setLoading(false)
          return
        }

        setChainName(resolved.chainName)

        // Fetch bridgeable tokens for the chain
        const response = await getBridgeableTokens(resolved.chainId)

        // Map tokens to display format
        const tokenRows: TokenRow[] = response.tokens.map((token: Token) => ({
          symbol: token.symbol,
          address: token.address,
          displayAddress: truncateAddress(token.address),
          decimals: token.decimals,
          name: token.name,
        }))

        // Sort alphabetically by symbol
        tokenRows.sort((a, b) => a.symbol.localeCompare(b.symbol))

        setTokens(tokenRows)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tokens')
      } finally {
        setLoading(false)
      }
    }
    loadTokens()
  }, [chain])

  // Exit after rendering in JSON mode
  useEffect(() => {
    if (!loading && json) {
      setTimeout(() => exit(), 100)
    }
  }, [loading, json, exit])

  // JSON output mode
  if (json) {
    if (loading) return null
    if (error && !availableChains.length) {
      console.error(JSON.stringify({ error }, null, 2))
      return null
    }
    if (error && availableChains.length) {
      console.error(JSON.stringify({
        error,
        availableChains: availableChains.map(c => ({ name: c.name, id: c.id }))
      }, null, 2))
      return null
    }
    console.log(JSON.stringify(tokens.map(t => ({
      symbol: t.symbol,
      address: t.address,
      decimals: t.decimals,
      name: t.name,
    })), null, 2))
    return null
  }

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Header compact showTagline={false} />
        <Spinner text={chain ? `Loading tokens for ${chain}...` : 'Loading...'} />
      </Box>
    )
  }

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Header compact showTagline={false} />
        <Box marginBottom={1}>
          <Text color={theme.error}>{symbols.failed} {error}</Text>
        </Box>

        {availableChains.length > 0 && (
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text color={theme.secondary}>Available chains:</Text>
            </Box>
            {availableChains.slice(0, 10).map((c, i) => (
              <Box key={i}>
                <Text color={theme.muted}>  {symbols.arrow} </Text>
                <Text color={theme.primary}>{c.name}</Text>
                <Text color={theme.muted}> (ID: {c.id})</Text>
              </Box>
            ))}
            {availableChains.length > 10 && (
              <Box marginTop={1}>
                <Text color={theme.muted} dimColor>
                  ...and {availableChains.length - 10} more. Use "mina chains" to see all.
                </Text>
              </Box>
            )}
            <Box marginTop={1}>
              <Text color={theme.muted} dimColor>
                Example: mina tokens --chain arbitrum
              </Text>
            </Box>
          </Box>
        )}
      </Box>
    )
  }

  if (tokens.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Header compact showTagline={false} />
        <Box>
          <Text color={theme.warning}>
            {symbols.pending} No bridgeable tokens found for {chainName}
          </Text>
        </Box>
      </Box>
    )
  }

  // Define table columns
  const columns: Column<TokenRow>[] = [
    {
      header: 'Symbol',
      accessor: 'symbol',
      headerColor: theme.primary,
      cellColor: theme.success,
    },
    {
      header: 'Address',
      accessor: 'displayAddress',
      headerColor: theme.primary,
      cellColor: theme.muted,
      width: 20,
    },
    {
      header: 'Decimals',
      accessor: (row) => String(row.decimals),
      align: 'right',
      headerColor: theme.primary,
      cellColor: theme.secondary,
    },
  ]

  return (
    <Box flexDirection="column" padding={1}>
      <Header compact showTagline={false} />

      <Box marginBottom={1}>
        <Text color={theme.secondary}>
          {symbols.arrow} Bridgeable Tokens on{' '}
        </Text>
        <Text color={theme.primary} bold>
          {chainName}
        </Text>
        <Text color={theme.muted}> ({tokens.length})</Text>
      </Box>

      <Table
        data={tokens}
        columns={columns}
        bordered
        borderColor={theme.border}
      />

      <Box marginTop={1}>
        <Text color={theme.muted} dimColor>
          Tokens that can be bridged to Hyperliquid via Mina
        </Text>
      </Box>
    </Box>
  )
}

export default TokensCommand
