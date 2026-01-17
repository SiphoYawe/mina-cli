import React, { useState, useEffect } from 'react'
import { Box, Text, useApp } from 'ink'
import {
  Mina,
  getChains,
  getTokens,
  HYPEREVM_CHAIN_ID,
  HYPEREVM_USDC_ADDRESS,
  type Chain,
  type Token,
  type Quote,
} from '@siphoyawe/mina-sdk'
import {
  Box as StyledBox,
  Divider,
  KeyValue,
  Spinner,
  theme,
  symbols,
} from '../ui/index.js'

/**
 * Props for the QuoteDisplay component
 */
interface QuoteDisplayProps {
  fromChain: string
  toChain: string
  token: string
  amount: string
  jsonOutput: boolean
}

/**
 * Parse amount string to smallest unit based on decimals
 */
function parseAmount(amount: string, decimals: number): string {
  const [whole, fraction = ''] = amount.split('.')
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals)
  return (whole || '0') + paddedFraction
}

/**
 * Format amount from smallest unit to human-readable
 */
function formatAmount(amount: string, decimals: number): string {
  const padded = amount.padStart(decimals + 1, '0')
  const integerPart = padded.slice(0, -decimals) || '0'
  const decimalPart = padded.slice(-decimals)
  const trimmedDecimal = decimalPart.replace(/0+$/, '')
  return trimmedDecimal ? `${integerPart}.${trimmedDecimal}` : integerPart
}

/**
 * Format time in seconds to human-readable string
 */
function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `~${seconds} seconds`
  }
  const minutes = Math.ceil(seconds / 60)
  return `~${minutes} minute${minutes > 1 ? 's' : ''}`
}

/**
 * Format USD amount
 */
function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`
}

/**
 * Get route steps description
 */
function getRouteDescription(quote: Quote): string {
  const stepTools = quote.steps.map(step => step.tool)
  // Remove duplicates and join
  const uniqueTools = [...new Set(stepTools)]
  return uniqueTools.join(' -> ')
}

/**
 * Quote display component (styled box)
 */
function QuoteBox({
  quote,
  fromChain,
  toChain,
  sourceToken,
  destToken,
}: {
  quote: Quote
  fromChain: Chain
  toChain: string
  sourceToken: Token
  destToken: Token
}) {
  const inputAmount = formatAmount(quote.fromAmount, sourceToken.decimals)
  const outputAmount = formatAmount(quote.toAmount, destToken.decimals)
  const routeDescription = getRouteDescription(quote)
  const estimatedTime = formatTime(quote.estimatedTime)
  const totalFees = formatUsd(quote.fees.totalUsd)

  // Fee breakdown
  const gasFees = formatUsd(quote.fees.gasUsd)
  const bridgeFees = formatUsd(quote.fees.bridgeFeeUsd)
  const protocolFees = formatUsd(quote.fees.protocolFeeUsd)

  return (
    <Box flexDirection="column">
      <StyledBox bordered title="Bridge Quote" padding={1}>
        {/* From/To Section */}
        <KeyValue
          items={[
            { key: 'From', value: `${inputAmount} ${sourceToken.symbol} (${fromChain.name})` },
            { key: 'To', value: `~${outputAmount} ${destToken.symbol} (${toChain})` },
          ]}
          keyColor={theme.muted}
          valueColor={theme.primary}
        />

        <Box marginY={1}>
          <Divider width={45} />
        </Box>

        {/* Route Info */}
        <KeyValue
          items={[
            { key: 'Route', value: routeDescription },
            { key: 'Time', value: estimatedTime },
            { key: 'Fees', value: totalFees },
          ]}
          keyColor={theme.muted}
          valueColor={theme.secondary}
        />

        <Box marginY={1}>
          <Divider width={45} />
        </Box>

        {/* Fee Breakdown */}
        <Box marginBottom={1}>
          <Text color={theme.muted} bold>Fee Breakdown:</Text>
        </Box>
        <KeyValue
          items={[
            { key: '  Gas', value: gasFees },
            { key: '  Bridge', value: bridgeFees },
            { key: '  Protocol', value: protocolFees },
            { key: '  Total', value: totalFees },
          ]}
          keyColor={theme.muted}
          valueColor={theme.warning}
        />

        {/* Price Impact Warning */}
        {quote.highImpact && (
          <Box marginTop={1}>
            <Text color={theme.warning}>
              {symbols.pending} High price impact: {(quote.priceImpact * 100).toFixed(2)}%
            </Text>
          </Box>
        )}

        {/* Minimum Received */}
        <Box marginTop={1}>
          <Text color={theme.muted}>
            Min. received: {quote.minimumReceivedFormatted} {destToken.symbol}
          </Text>
        </Box>
      </StyledBox>
    </Box>
  )
}

/**
 * JSON output for machine-readable format
 */
function JsonOutput({ quote, fromChain, sourceToken }: {
  quote: Quote
  fromChain: Chain
  sourceToken: Token
}) {
  const jsonData = {
    quote: {
      id: quote.id,
      from: {
        chain: fromChain.name,
        chainId: fromChain.id,
        token: sourceToken.symbol,
        amount: formatAmount(quote.fromAmount, sourceToken.decimals),
        amountRaw: quote.fromAmount,
      },
      to: {
        chain: 'Hyperliquid',
        chainId: HYPEREVM_CHAIN_ID,
        token: quote.toToken.symbol,
        amount: formatAmount(quote.toAmount, quote.toToken.decimals),
        amountRaw: quote.toAmount,
      },
      route: {
        steps: quote.steps.map(step => ({
          type: step.type,
          tool: step.tool,
          fromChain: step.fromChainId,
          toChain: step.toChainId,
          estimatedTime: step.estimatedTime,
        })),
        totalSteps: quote.steps.length,
      },
      fees: {
        total: quote.fees.totalUsd,
        gas: quote.fees.gasUsd,
        bridge: quote.fees.bridgeFeeUsd,
        protocol: quote.fees.protocolFeeUsd,
      },
      estimatedTime: quote.estimatedTime,
      priceImpact: quote.priceImpact,
      highImpact: quote.highImpact,
      slippageTolerance: quote.slippageTolerance,
      minimumReceived: quote.minimumReceivedFormatted,
      expiresAt: quote.expiresAt,
    },
  }

  return <Text>{JSON.stringify(jsonData, null, 2)}</Text>
}

/**
 * Error display component
 */
function ErrorDisplay({ message }: { message: string }) {
  return (
    <Box flexDirection="column" padding={1}>
      <Box>
        <Text color={theme.error} bold>
          {symbols.failed} Error: {message}
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color={theme.muted}>
          Usage: npx mina quote --from &lt;chain&gt; --token &lt;symbol&gt; --amount &lt;number&gt;
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color={theme.muted}>Example: npx mina quote --from arbitrum --token USDC --amount 100</Text>
      </Box>
    </Box>
  )
}

/**
 * Main QuoteDisplay component
 */
export function QuoteDisplay({
  fromChain,
  toChain,
  token,
  amount,
  jsonOutput,
}: QuoteDisplayProps) {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [sourceChain, setSourceChain] = useState<Chain | null>(null)
  const [sourceToken, setSourceToken] = useState<Token | null>(null)
  const [destToken, setDestToken] = useState<Token | null>(null)

  useEffect(() => {
    async function fetchQuote() {
      try {
        setLoading(true)
        setError(null)

        // Validate amount
        const numAmount = parseFloat(amount)
        if (isNaN(numAmount) || numAmount <= 0) {
          throw new Error('Invalid amount. Please provide a positive number.')
        }

        // Find source chain by name/key (case insensitive)
        const chainsResponse = await getChains()
        const chain = chainsResponse.chains.find(
          c =>
            c.name.toLowerCase() === fromChain.toLowerCase() ||
            c.key.toLowerCase() === fromChain.toLowerCase()
        )

        if (!chain) {
          const availableChains = chainsResponse.chains.map(c => c.name).join(', ')
          throw new Error(
            `Unknown chain: "${fromChain}". Available chains: ${availableChains}`
          )
        }
        setSourceChain(chain)

        // Find token by symbol
        const tokensResponse = await getTokens(chain.id)
        const foundToken = tokensResponse.tokens.find(
          t => t.symbol.toLowerCase() === token.toLowerCase()
        )

        if (!foundToken) {
          const availableTokens = tokensResponse.tokens
            .slice(0, 10)
            .map(t => t.symbol)
            .join(', ')
          throw new Error(
            `Token "${token}" not found on ${chain.name}. Available tokens include: ${availableTokens}...`
          )
        }
        setSourceToken(foundToken)

        // Create destination token reference (HyperEVM USDC)
        const destinationToken: Token = {
          address: HYPEREVM_USDC_ADDRESS,
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          logoUrl: '',
          chainId: HYPEREVM_CHAIN_ID,
        }
        setDestToken(destinationToken)

        // Get quote
        const mina = new Mina({ integrator: 'mina-cli' })
        const quoteResult = await mina.getQuote({
          fromChainId: chain.id,
          toChainId: HYPEREVM_CHAIN_ID,
          fromToken: foundToken.address,
          toToken: HYPEREVM_USDC_ADDRESS,
          fromAmount: parseAmount(amount, foundToken.decimals),
          fromAddress: '0x0000000000000000000000000000000000000000', // Placeholder for quote
        })

        setQuote(quoteResult)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch quote'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    fetchQuote()
  }, [fromChain, token, amount])

  // Exit after rendering JSON output
  useEffect(() => {
    if (!loading && jsonOutput) {
      // Give time for output to render
      const timer = setTimeout(() => exit(), 100)
      return () => clearTimeout(timer)
    }
  }, [loading, jsonOutput, exit])

  if (loading) {
    return (
      <Box padding={1}>
        <Spinner text={`Fetching quote for ${amount} ${token} from ${fromChain}...`} />
      </Box>
    )
  }

  if (error) {
    return <ErrorDisplay message={error} />
  }

  if (!quote || !sourceChain || !sourceToken || !destToken) {
    return <ErrorDisplay message="Failed to fetch quote data" />
  }

  if (jsonOutput) {
    return <JsonOutput quote={quote} fromChain={sourceChain} sourceToken={sourceToken} />
  }

  return (
    <Box flexDirection="column" padding={1}>
      <QuoteBox
        quote={quote}
        fromChain={sourceChain}
        toChain={toChain === 'hyperliquid' ? 'Hyperliquid' : toChain}
        sourceToken={sourceToken}
        destToken={destToken}
      />

      {/* Quote expiry info */}
      <Box marginTop={1}>
        <Text color={theme.muted}>
          Quote valid until: {new Date(quote.expiresAt).toLocaleTimeString()}
        </Text>
      </Box>
    </Box>
  )
}

/**
 * Quote command handler
 */
export interface QuoteCommandOptions {
  from: string
  to: string
  token: string
  amount: string
  json?: boolean
}

export default QuoteDisplay
