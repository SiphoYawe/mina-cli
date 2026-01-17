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
  SearchableList,
  Spinner,
  theme,
  symbols,
  type ListItem,
} from '../ui/index.js'

/**
 * Popular token symbols to highlight
 * These appear first and get a star indicator
 */
const POPULAR_TOKEN_SYMBOLS = [
  'USDC',
  'USDT',
  'ETH',
  'WETH',
  'WBTC',
  'DAI',
  'USDC.e',
  'LINK',
  'UNI',
  'ARB',
  'OP',
  'MATIC',
]

/**
 * Truncate address for display
 */
function truncateAddress(address: string): string {
  if (address.length <= 14) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
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
  const response = await getChains()

  // Check if it's a numeric ID
  const numericId = parseInt(chainInput, 10)
  if (!isNaN(numericId)) {
    const chain = response.chains.find((c: Chain) => c.id === numericId)
    if (chain) {
      return { chainId: chain.id, chainName: chain.name }
    }
    // Still try with the ID even if not found
    return { chainId: numericId, chainName: chainInput }
  }

  // Otherwise treat as chain name/key
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
 * Tokens command component - displays bridgeable tokens with interactive search
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

        // Map tokens to display format, filter out tokens without symbols
        const tokenRows: TokenRow[] = response.tokens
          .filter((token: Token) => token.symbol && token.symbol.trim() !== '')
          .map((token: Token) => ({
            symbol: token.symbol,
            address: token.address,
            displayAddress: truncateAddress(token.address),
            decimals: token.decimals,
            name: token.name,
          }))

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
    // Show top 6 popular chains as quick suggestions
    const popularChainIds = [1, 42161, 10, 137, 8453, 43114]
    const popularChains = availableChains
      .filter(c => popularChainIds.includes(c.id))
      .slice(0, 6)

    return (
      <Box flexDirection="column" padding={1}>
        <Header compact showTagline={false} />
        <Box marginBottom={1}>
          <Text color={theme.error}>{symbols.failed} {error}</Text>
        </Box>

        {availableChains.length > 0 && (
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text color={theme.secondary}>Popular chains:</Text>
            </Box>
            <Box flexDirection="row" gap={2} flexWrap="wrap">
              {popularChains.map((c) => (
                <Box key={c.id}>
                  <Text color={theme.primary}>{c.name.toLowerCase()}</Text>
                </Box>
              ))}
            </Box>
            <Box marginTop={1}>
              <Text color={theme.muted} dimColor>
                Example: mina tokens --chain arbitrum
              </Text>
            </Box>
            <Box marginTop={1}>
              <Text color={theme.muted} dimColor>
                Run "mina chains" to see all {availableChains.length} supported chains
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

  // Convert to ListItem format
  const listItems: ListItem[] = tokens.map((token) => ({
    id: token.address,
    label: token.symbol,
    sublabel: token.displayAddress,
    badge: `${token.decimals}d`,
    badgeColor: theme.muted,
  }))

  // Get popular token IDs (addresses) for highlighting
  const popularTokenIds = tokens
    .filter(t => POPULAR_TOKEN_SYMBOLS.includes(t.symbol.toUpperCase()))
    .map(t => t.address)

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
      </Box>

      <SearchableList
        items={listItems}
        placeholder="Type to filter tokens (e.g. USDC, ETH)..."
        popularIds={popularTokenIds}
        maxDisplay={12}
        searchable={true}
      />

      <Box marginTop={1}>
        <Text color={theme.muted} dimColor>
          ★ = Popular tokens • Tokens bridgeable to Hyperliquid via Mina
        </Text>
      </Box>
    </Box>
  )
}

export default TokensCommand
