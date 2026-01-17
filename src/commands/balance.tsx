import React, { useState, useEffect } from 'react'
import { Box, Text, useApp } from 'ink'
import {
  Mina,
  getChains,
  type Chain,
  type BalanceWithMetadata,
} from '@siphoyawe/mina-sdk'
import {
  Header,
  Spinner,
  theme,
  symbols,
  borders,
} from '../ui/index.js'

/**
 * Truncate address for display
 */
function truncateAddress(address: string): string {
  if (address.length <= 14) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Format number with thousands separators
 */
function formatNumber(value: number, decimals: number = 2): string {
  if (value === 0) return '0'

  // For very small values, show more decimals
  if (value < 0.01 && value > 0) {
    return value.toFixed(6)
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Format USD value
 */
function formatUsd(value?: number): string {
  if (value === undefined || value === 0) return '-'
  return `$${formatNumber(value, 2)}`
}

/**
 * Major chains for multi-chain balance lookup
 */
const MAJOR_CHAIN_IDS = [1, 42161, 137, 10, 8453] // ETH, ARB, POLY, OP, BASE

/**
 * Chain display names
 */
const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  42161: 'Arbitrum',
  137: 'Polygon',
  10: 'Optimism',
  8453: 'Base',
  56: 'BNB Chain',
  43114: 'Avalanche',
  250: 'Fantom',
  100: 'Gnosis',
  59144: 'Linea',
  534352: 'Scroll',
  324: 'zkSync',
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
    return { chainId: numericId, chainName: CHAIN_NAMES[numericId] || chainInput }
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
 * Balance row for a single token
 */
interface BalanceRow {
  symbol: string
  balance: string
  balanceFormatted: string
  usdValue?: number
  hasBalance: boolean
}

/**
 * Chain balances group
 */
interface ChainBalances {
  chainId: number
  chainName: string
  balances: BalanceRow[]
  totalUsd: number
}

/**
 * Balance command props
 */
interface BalanceCommandProps {
  address: string
  chain?: string
  showAll?: boolean
  json?: boolean
}

/**
 * Balance command component - displays wallet balances
 */
export function BalanceCommand({
  address,
  chain,
  showAll = false,
  json = false,
}: BalanceCommandProps) {
  const { exit } = useApp()
  const [chainBalances, setChainBalances] = useState<ChainBalances[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalUsd, setTotalUsd] = useState(0)

  useEffect(() => {
    async function loadBalances() {
      try {
        setLoading(true)
        setError(null)

        const mina = new Mina({ integrator: 'mina-cli' })

        // Determine which chains to fetch
        let chainIds: number[] = []
        let chainNameMap: Record<number, string> = {}

        if (chain) {
          // Specific chain requested
          const resolved = await resolveChainId(chain)
          if (!resolved) {
            setError(`Unknown chain: "${chain}"`)
            setLoading(false)
            return
          }
          chainIds = [resolved.chainId]
          chainNameMap[resolved.chainId] = resolved.chainName
        } else {
          // Multi-chain - use major chains
          chainIds = MAJOR_CHAIN_IDS
          chainIds.forEach(id => {
            chainNameMap[id] = CHAIN_NAMES[id] || `Chain ${id}`
          })
        }

        // Fetch balances for all chains in parallel
        const results = await Promise.all(
          chainIds.map(async (chainId) => {
            try {
              const balances = await mina.getChainBalances(address, chainId)
              return { chainId, balances }
            } catch (err) {
              console.warn(`Failed to fetch balances for chain ${chainId}:`, err)
              return { chainId, balances: [] }
            }
          })
        )

        // Process results
        const processedChains: ChainBalances[] = []
        let grandTotal = 0

        for (const result of results) {
          const { chainId, balances } = result

          // Filter and map balances
          let filteredBalances = balances.filter((b: BalanceWithMetadata) => {
            // If showAll, include all. Otherwise, only include non-zero balances
            return showAll || b.hasBalance
          })

          // Calculate chain total
          const chainTotal = balances.reduce((sum: number, b: BalanceWithMetadata) => {
            return sum + (b.balanceUsd || 0)
          }, 0)
          grandTotal += chainTotal

          // Map to display format
          const balanceRows: BalanceRow[] = filteredBalances.map((b: BalanceWithMetadata) => ({
            symbol: b.token.symbol,
            balance: b.balance,
            balanceFormatted: b.formatted,
            usdValue: b.balanceUsd,
            hasBalance: b.hasBalance,
          }))

          // Sort: non-zero first, then by USD value
          balanceRows.sort((a, b) => {
            if (a.hasBalance !== b.hasBalance) {
              return a.hasBalance ? -1 : 1
            }
            return (b.usdValue || 0) - (a.usdValue || 0)
          })

          // Only add chain if it has balances to show
          if (balanceRows.length > 0 || showAll) {
            processedChains.push({
              chainId,
              chainName: chainNameMap[chainId] || `Chain ${chainId}`,
              balances: balanceRows,
              totalUsd: chainTotal,
            })
          }
        }

        // Sort chains by total USD value
        processedChains.sort((a, b) => b.totalUsd - a.totalUsd)

        setChainBalances(processedChains)
        setTotalUsd(grandTotal)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load balances')
      } finally {
        setLoading(false)
      }
    }
    loadBalances()
  }, [address, chain, showAll])

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
    console.log(JSON.stringify({
      address,
      chains: chainBalances.map(cb => ({
        chainId: cb.chainId,
        chainName: cb.chainName,
        balances: cb.balances,
        totalUsd: cb.totalUsd,
      })),
      totalUsd,
    }, null, 2))
    return null
  }

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Header compact showTagline={false} />
        <Spinner text={chain ? `Loading balances on ${chain}...` : 'Loading balances across chains...'} />
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

  // Calculate max width for the box
  const maxSymbolWidth = Math.max(
    8,
    ...chainBalances.flatMap(cb => cb.balances.map(b => b.symbol.length))
  )
  const maxBalanceWidth = Math.max(
    12,
    ...chainBalances.flatMap(cb => cb.balances.map(b => b.balanceFormatted.length))
  )
  const boxWidth = Math.max(40, maxSymbolWidth + maxBalanceWidth + 20)

  // Check if we have any balances
  const hasAnyBalances = chainBalances.some(cb => cb.balances.length > 0)

  return (
    <Box flexDirection="column" padding={1}>
      <Header compact showTagline={false} />

      {/* Box header */}
      <Box>
        <Text color={theme.border}>
          {borders.topLeft}{borders.horizontal.repeat(boxWidth - 2)}{borders.topRight}
        </Text>
      </Box>

      {/* Title */}
      <Box>
        <Text color={theme.border}>{borders.vertical}</Text>
        <Box width={boxWidth - 2} justifyContent="center">
          <Text color={theme.primary} bold>
            Balances: {truncateAddress(address)}
          </Text>
        </Box>
        <Text color={theme.border}>{borders.vertical}</Text>
      </Box>

      {/* Separator */}
      <Box>
        <Text color={theme.border}>
          {borders.leftT}{borders.horizontal.repeat(boxWidth - 2)}{borders.rightT}
        </Text>
      </Box>

      {!hasAnyBalances ? (
        <>
          <Box>
            <Text color={theme.border}>{borders.vertical}</Text>
            <Box width={boxWidth - 2} justifyContent="center">
              <Text color={theme.muted}>No balances found</Text>
            </Box>
            <Text color={theme.border}>{borders.vertical}</Text>
          </Box>
        </>
      ) : (
        chainBalances.map((chainData, chainIndex) => (
          <React.Fragment key={chainData.chainId}>
            {/* Chain name header */}
            <Box>
              <Text color={theme.border}>{borders.vertical}</Text>
              <Text>  </Text>
              <Text color={theme.accent} bold>
                {chainData.chainName}
              </Text>
              <Box flexGrow={1} />
              <Text color={theme.border}>{borders.vertical}</Text>
            </Box>

            {/* Token balances */}
            {chainData.balances.length === 0 ? (
              <Box>
                <Text color={theme.border}>{borders.vertical}</Text>
                <Text>    </Text>
                <Text color={theme.muted} dimColor>No balances</Text>
                <Box flexGrow={1} />
                <Text color={theme.border}>{borders.vertical}</Text>
              </Box>
            ) : (
              chainData.balances.map((balance, i) => (
                <Box key={`${chainData.chainId}-${balance.symbol}-${i}`}>
                  <Text color={theme.border}>{borders.vertical}</Text>
                  <Text>    </Text>
                  <Text
                    color={balance.hasBalance ? theme.success : theme.muted}
                    dimColor={!balance.hasBalance}
                  >
                    {balance.symbol.padEnd(maxSymbolWidth)}
                  </Text>
                  <Text>  </Text>
                  <Text
                    color={balance.hasBalance ? theme.secondary : theme.muted}
                    dimColor={!balance.hasBalance}
                  >
                    {balance.balanceFormatted.padStart(maxBalanceWidth)}
                  </Text>
                  <Text>  </Text>
                  <Text
                    color={balance.hasBalance ? theme.muted : theme.muted}
                    dimColor={!balance.hasBalance}
                  >
                    {formatUsd(balance.usdValue).padStart(12)}
                  </Text>
                  <Box flexGrow={1} />
                  <Text color={theme.border}>{borders.vertical}</Text>
                </Box>
              ))
            )}

            {/* Chain separator (if not last) */}
            {chainIndex < chainBalances.length - 1 && (
              <Box>
                <Text color={theme.border}>
                  {borders.leftT}{borders.horizontal.repeat(boxWidth - 2)}{borders.rightT}
                </Text>
              </Box>
            )}
          </React.Fragment>
        ))
      )}

      {/* Bottom border */}
      <Box>
        <Text color={theme.border}>
          {borders.bottomLeft}{borders.horizontal.repeat(boxWidth - 2)}{borders.bottomRight}
        </Text>
      </Box>

      {/* Total */}
      {hasAnyBalances && totalUsd > 0 && (
        <Box marginTop={1}>
          <Text color={theme.secondary}>
            {symbols.arrow} Total:
          </Text>
          <Text color={theme.success} bold>
            {' '}${formatNumber(totalUsd, 2)}
          </Text>
        </Box>
      )}

      {/* Tip */}
      <Box marginTop={1}>
        <Text color={theme.muted} dimColor>
          {chain
            ? 'Use --all to show zero balances'
            : 'Use --chain <name> for specific chain, --all for zero balances'}
        </Text>
      </Box>
    </Box>
  )
}

export default BalanceCommand
