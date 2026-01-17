import React, { useState, useEffect, useCallback } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import {
  Mina,
  getChains,
  getBridgeableTokens,
  getQuote,
  type Chain,
  type Token,
  type Quote,
  type ExecutionResult,
  type StepStatusPayload,
  type TransactionStatusPayload,
  HYPEREVM_CHAIN_ID,
  HYPEREVM_USDC_ADDRESS,
  normalizeError,
  isRecoverableError,
  RECOVERY_ACTIONS,
} from '@siphoyawe/mina-sdk'
import {
  Header,
  theme,
  symbols,
  Spinner,
  ProgressSteps,
  KeyValue,
  Box as StyledBox,
  Divider,
  type Step as ProgressStep,
} from '../ui/index.js'
import { loadPrivateKey, createSigner, getAddressFromPrivateKey } from '../lib/wallet.js'

/**
 * Bridge command options from CLI
 */
export interface BridgeCommandOptions {
  from: string
  token: string
  amount: string
  key?: string
  yes?: boolean
  autoDeposit?: boolean
}

/**
 * Bridge execution state
 */
type BridgeState =
  | 'loading'
  | 'loaded'
  | 'confirming'
  | 'executing'
  | 'completed'
  | 'failed'

/**
 * Step status for progress display
 */
interface BridgeStepState {
  loading: 'pending' | 'active' | 'completed' | 'failed'
  quote: 'pending' | 'active' | 'completed' | 'failed'
  approval: 'pending' | 'active' | 'completed' | 'failed'
  bridge: 'pending' | 'active' | 'completed' | 'failed'
  confirm: 'pending' | 'active' | 'completed' | 'failed'
}

/**
 * Props for the Bridge component
 */
interface BridgeProps {
  options: BridgeCommandOptions
}

/**
 * Error display component with recovery suggestions
 */
function ErrorDisplay({
  error,
  recoveryAction,
}: {
  error: Error
  recoveryAction?: string
}) {
  const normalizedError = normalizeError(error)
  const isRecoverable = isRecoverableError(normalizedError)

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Text color={theme.error} bold>
          {symbols.failed} Error: {normalizedError.message}
        </Text>
      </Box>

      {recoveryAction && (
        <Box marginTop={1}>
          <Text color={theme.warning}>
            {symbols.arrow} Recovery suggestion: {recoveryAction}
          </Text>
        </Box>
      )}

      {isRecoverable && (
        <Box marginTop={1}>
          <Text color={theme.muted} dimColor>
            This error may be temporary. Try again in a few moments.
          </Text>
        </Box>
      )}
    </Box>
  )
}

/**
 * Quote display component
 */
function QuoteDisplay({
  quote,
  chain,
  token,
  amount,
}: {
  quote: Quote
  chain: Chain
  token: Token
  amount: string
}) {
  const estimatedMinutes = Math.ceil(quote.estimatedTime / 60)
  const outputFormatted = (Number(quote.toAmount) / Math.pow(10, quote.toToken.decimals)).toFixed(2)

  return (
    <StyledBox bordered title="Bridge Quote" padding={1}>
      <KeyValue
        items={[
          { key: 'From Chain', value: chain.name },
          { key: 'Token', value: `${amount} ${token.symbol}` },
          { key: 'To Chain', value: 'HyperEVM' },
          { key: 'You Receive', value: `~${outputFormatted} ${quote.toToken.symbol}` },
        ]}
      />

      <Box marginTop={1} marginBottom={1}>
        <Divider width={40} />
      </Box>

      <KeyValue
        items={[
          { key: 'Gas Fee', value: `$${quote.fees.gasUsd.toFixed(2)}` },
          { key: 'Bridge Fee', value: `$${quote.fees.bridgeFeeUsd.toFixed(2)}` },
          { key: 'Total Fees', value: `$${quote.fees.totalUsd.toFixed(2)}` },
          { key: 'Est. Time', value: `~${estimatedMinutes} min` },
        ]}
        keyColor={theme.muted}
        valueColor={theme.warning}
      />

      {quote.highImpact && (
        <Box marginTop={1}>
          <Text color={theme.warning}>
            {symbols.pending} Warning: High price impact ({(quote.priceImpact * 100).toFixed(2)}%)
          </Text>
        </Box>
      )}

      {quote.includesAutoDeposit && (
        <Box marginTop={1}>
          <Text color={theme.success} dimColor>
            {symbols.check} Auto-deposit to Hyperliquid L1 included
          </Text>
        </Box>
      )}
    </StyledBox>
  )
}

/**
 * Bridge progress component
 */
function BridgeProgressDisplay({
  stepState,
  error,
  currentStepDescription,
}: {
  stepState: BridgeStepState
  error?: string
  currentStepDescription?: string
}) {
  const steps: ProgressStep[] = [
    {
      label: 'Loading wallet & chain data',
      status: stepState.loading,
    },
    {
      label: 'Fetching bridge quote',
      status: stepState.quote,
    },
    {
      label: 'Approving token spend',
      status: stepState.approval,
      description: stepState.approval === 'active' ? 'Waiting for approval transaction...' : undefined,
    },
    {
      label: 'Executing bridge transaction',
      status: stepState.bridge,
      description: stepState.bridge === 'active' ? 'Waiting for bridge transaction...' : undefined,
    },
    {
      label: 'Confirming on destination',
      status: stepState.confirm,
      description: stepState.confirm === 'active' ? currentStepDescription : error,
    },
  ]

  // Mark failed step
  if (error) {
    const activeIndex = steps.findIndex(s => s.status === 'active' || s.status === 'failed')
    if (activeIndex >= 0) {
      const step = steps[activeIndex]
      if (step) {
        step.status = 'failed'
        step.description = error
      }
    }
  }

  return <ProgressSteps steps={steps} title="Bridge Progress" showNumbers />
}

/**
 * Success display component
 */
function SuccessDisplay({
  result,
  chain,
  token,
  amount,
}: {
  result: ExecutionResult
  chain: Chain
  token: Token
  amount: string
}) {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Text color={theme.success} bold>
          {symbols.check} Bridge completed successfully!
        </Text>
      </Box>

      <Box marginTop={1}>
        <StyledBox bordered padding={1}>
          <KeyValue
            items={[
              { key: 'Status', value: 'Success' },
              { key: 'From', value: `${amount} ${token.symbol} on ${chain.name}` },
              { key: 'To', value: 'USDC on HyperEVM' },
              ...(result.txHash ? [{ key: 'Bridge TX', value: result.txHash.slice(0, 20) + '...' }] : []),
              ...(result.depositTxHash ? [{ key: 'Deposit TX', value: result.depositTxHash.slice(0, 20) + '...' }] : []),
            ]}
            valueColor={theme.success}
          />
        </StyledBox>
      </Box>

      <Box marginTop={1}>
        <Text color={theme.muted} dimColor>
          Your funds are now available on HyperEVM. Check your Hyperliquid balance.
        </Text>
      </Box>
    </Box>
  )
}

/**
 * Main Bridge Command Component
 */
export function Bridge({ options }: BridgeProps) {
  const { exit } = useApp()

  // State
  const [state, setState] = useState<BridgeState>('loading')
  const [chain, setChain] = useState<Chain | null>(null)
  const [token, setToken] = useState<Token | null>(null)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [privateKey, setPrivateKey] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [recoveryAction, setRecoveryAction] = useState<string | null>(null)
  const [result, setResult] = useState<ExecutionResult | null>(null)
  const [currentStepDescription, setCurrentStepDescription] = useState<string>('')

  // Step state for progress display
  const [stepState, setStepState] = useState<BridgeStepState>({
    loading: 'active',
    quote: 'pending',
    approval: 'pending',
    bridge: 'pending',
    confirm: 'pending',
  })

  // Handle confirmation input
  useInput((input, key) => {
    if (state === 'confirming') {
      if (key.return || input === 'y' || input === 'Y') {
        executeBridge()
      } else if (input === 'n' || input === 'N' || input === 'q') {
        exit()
      }
    }

    if (state === 'completed' || state === 'failed') {
      if (key.return || input === 'q') {
        exit()
      }
    }
  })

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setStepState(prev => ({ ...prev, loading: 'active' }))

      // Load private key
      const key = await loadPrivateKey(options.key)
      setPrivateKey(key)

      // Get wallet address from key
      const address = await getAddressFromPrivateKey(key)
      setWalletAddress(address)

      // Load chains
      const chainsResponse = await getChains()
      const foundChain = chainsResponse.chains.find(
        c => c.key.toLowerCase() === options.from.toLowerCase() ||
             c.name.toLowerCase() === options.from.toLowerCase() ||
             c.id.toString() === options.from
      )

      if (!foundChain) {
        throw new Error(`Chain not found: ${options.from}. Available chains: ${chainsResponse.chains.map(c => c.key).join(', ')}`)
      }

      setChain(foundChain)

      // Load tokens for the chain
      const tokensResponse = await getBridgeableTokens(foundChain.id)
      const foundToken = tokensResponse.tokens.find(
        t => t.symbol.toLowerCase() === options.token.toLowerCase() ||
             t.address.toLowerCase() === options.token.toLowerCase()
      )

      if (!foundToken) {
        throw new Error(`Token not found: ${options.token}. Available tokens: ${tokensResponse.tokens.map(t => t.symbol).join(', ')}`)
      }

      setToken(foundToken)

      setStepState(prev => ({ ...prev, loading: 'completed', quote: 'active' }))

      // Fetch quote
      const amountInSmallestUnit = (parseFloat(options.amount) * Math.pow(10, foundToken.decimals)).toString()

      const quoteResult = await getQuote({
        fromChainId: foundChain.id,
        toChainId: HYPEREVM_CHAIN_ID,
        fromToken: foundToken.address,
        toToken: HYPEREVM_USDC_ADDRESS,
        fromAmount: amountInSmallestUnit,
        fromAddress: address,
      })

      setQuote(quoteResult)
      setStepState(prev => ({ ...prev, quote: 'completed' }))
      setState('loaded')

      // Auto-confirm if --yes flag
      if (options.yes) {
        setState('confirming')
        // Small delay for visual feedback
        setTimeout(() => executeBridge(), 500)
      } else {
        setState('confirming')
      }
    } catch (err) {
      const normalizedError = normalizeError(err instanceof Error ? err : new Error(String(err)))
      setError(normalizedError)

      // Get recovery action if available
      const action = RECOVERY_ACTIONS[normalizedError.code as keyof typeof RECOVERY_ACTIONS]
      if (action) {
        setRecoveryAction(action)
      }

      setStepState(prev => ({
        ...prev,
        loading: prev.loading === 'active' ? 'failed' : prev.loading,
        quote: prev.quote === 'active' ? 'failed' : prev.quote,
      }))
      setState('failed')
    }
  }

  const executeBridge = useCallback(async () => {
    if (!quote || !chain || !token || !privateKey || !walletAddress) return

    try {
      setState('executing')
      setStepState(prev => ({ ...prev, approval: 'active' }))

      // Create signer
      const signer = await createSigner(privateKey, chain.id)

      // Execute the bridge
      const mina = new Mina({
        integrator: 'mina-cli',
        autoDeposit: options.autoDeposit !== false,
      })

      const executeResult = await mina.execute({
        quote,
        signer,
        onStepChange: (stepStatus: StepStatusPayload) => {
          setCurrentStepDescription(`${stepStatus.step}: ${stepStatus.status}`)

          // Update step state based on step type
          if (stepStatus.step === 'approval') {
            if (stepStatus.status === 'completed') {
              setStepState(prev => ({ ...prev, approval: 'completed', bridge: 'active' }))
            } else if (stepStatus.status === 'failed') {
              setStepState(prev => ({ ...prev, approval: 'failed' }))
            }
          } else if (stepStatus.step === 'bridge' || stepStatus.step === 'swap') {
            if (stepStatus.status === 'completed') {
              setStepState(prev => ({ ...prev, bridge: 'completed', confirm: 'active' }))
            } else if (stepStatus.status === 'failed') {
              setStepState(prev => ({ ...prev, bridge: 'failed' }))
            }
          } else if (stepStatus.step === 'deposit') {
            if (stepStatus.status === 'completed') {
              setStepState(prev => ({ ...prev, confirm: 'completed' }))
            } else if (stepStatus.status === 'failed') {
              setStepState(prev => ({ ...prev, confirm: 'failed' }))
            }
          }
        },
        onStatusChange: (status: TransactionStatusPayload) => {
          setCurrentStepDescription(status.substatus || `Step ${status.currentStep}/${status.totalSteps}`)
        },
      })

      setResult(executeResult)

      if (executeResult.status === 'completed') {
        setStepState(prev => ({
          ...prev,
          approval: 'completed',
          bridge: 'completed',
          confirm: 'completed',
        }))
        setState('completed')
      } else if (executeResult.status === 'failed') {
        setError(executeResult.error || new Error('Bridge execution failed'))
        setState('failed')
      }
    } catch (err) {
      const normalizedError = normalizeError(err instanceof Error ? err : new Error(String(err)))
      setError(normalizedError)

      const action = RECOVERY_ACTIONS[normalizedError.code as keyof typeof RECOVERY_ACTIONS]
      if (action) {
        setRecoveryAction(action)
      }

      setState('failed')
    }
  }, [quote, chain, token, privateKey, walletAddress, options.autoDeposit])

  // Render based on state
  return (
    <Box flexDirection="column" padding={1}>
      {/* Compact header */}
      <Header compact showTagline={false} />

      {/* Title */}
      <Box marginBottom={1}>
        <Text color={theme.primary} bold>
          Bridge {options.amount} {options.token} from {options.from}
        </Text>
      </Box>

      {/* Wallet info */}
      {walletAddress && (
        <Box marginBottom={1}>
          <Text color={theme.muted} dimColor>
            Wallet: {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
          </Text>
        </Box>
      )}

      {/* Loading state */}
      {state === 'loading' && (
        <Box flexDirection="column">
          <BridgeProgressDisplay stepState={stepState} />
        </Box>
      )}

      {/* Confirmation state */}
      {state === 'confirming' && quote && chain && token && (
        <Box flexDirection="column">
          <QuoteDisplay
            quote={quote}
            chain={chain}
            token={token}
            amount={options.amount}
          />

          {!options.yes && (
            <Box marginTop={1}>
              <Text color={theme.warning} bold>
                {symbols.arrow} Proceed with bridge? (y/n)
              </Text>
            </Box>
          )}

          {options.yes && (
            <Box marginTop={1}>
              <Spinner text="Auto-confirming..." />
            </Box>
          )}
        </Box>
      )}

      {/* Executing state */}
      {state === 'executing' && (
        <Box flexDirection="column">
          <BridgeProgressDisplay
            stepState={stepState}
            currentStepDescription={currentStepDescription}
          />
        </Box>
      )}

      {/* Completed state */}
      {state === 'completed' && result && chain && token && (
        <Box flexDirection="column">
          <BridgeProgressDisplay stepState={stepState} />
          <SuccessDisplay
            result={result}
            chain={chain}
            token={token}
            amount={options.amount}
          />
          <Box marginTop={1}>
            <Text color={theme.muted} dimColor>
              Press Enter or q to exit
            </Text>
          </Box>
        </Box>
      )}

      {/* Failed state */}
      {state === 'failed' && error && (
        <Box flexDirection="column">
          <BridgeProgressDisplay stepState={stepState} error={error.message} />
          <ErrorDisplay error={error} recoveryAction={recoveryAction || undefined} />
          <Box marginTop={1}>
            <Text color={theme.muted} dimColor>
              Press Enter or q to exit
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  )
}

/**
 * Bridge command action handler
 * Called by Commander when `mina bridge` is invoked
 */
export async function bridgeCommand(options: BridgeCommandOptions): Promise<void> {
  const { render } = await import('ink')
  const React = await import('react')

  render(React.createElement(Bridge, { options }))
}

export default Bridge
