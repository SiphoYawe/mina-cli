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
} from '@siphoyawe/mina-sdk'
import {
  Header,
  theme,
  symbols,
  ChainSelect,
  TokenSelect,
  Spinner,
  ProgressSteps,
  KeyValue,
  Box as StyledBox,
  Divider,
  type ChainSelectItem,
  type TokenSelectItem,
  type Step as ProgressStep,
} from '../ui/index.js'
import { loadPrivateKey, createSigner, getAddressFromPrivateKey } from '../lib/wallet.js'

/**
 * Wizard step types
 */
type WizardStep = 'chain' | 'token' | 'amount' | 'key' | 'confirm' | 'execute'

/**
 * Wizard state interface
 */
interface WizardState {
  step: WizardStep
  chain: Chain | null
  token: Token | null
  amount: string
  quote: Quote | null
  error: string | null
  privateKey: string | null
  walletAddress: string | null
  executionResult: ExecutionResult | null
  executionStatus: string
}

/**
 * Initial wizard state
 */
const initialState: WizardState = {
  step: 'chain',
  chain: null,
  token: null,
  amount: '',
  quote: null,
  error: null,
  privateKey: null,
  walletAddress: null,
  executionResult: null,
  executionStatus: '',
}

/**
 * Navigation hints component
 * Enhanced with visual key indicators
 */
function NavigationHints({ step }: { step: WizardStep }) {
  // Key styling helper
  const Key = ({ children }: { children: string }) => (
    <Text color={theme.borderLight}>[</Text>
  )

  const renderHint = (key: string, action: string, isLast = false) => (
    <>
      <Text color={theme.secondary}>{key}</Text>
      <Text color={theme.muted}> {action}</Text>
      {!isLast && <Text color={theme.border}>  {symbols.dot}  </Text>}
    </>
  )

  const hints: Record<WizardStep, React.ReactNode> = {
    chain: (
      <>
        {renderHint('↑↓', 'Navigate')}
        {renderHint('Enter', 'Select')}
        {renderHint('q', 'Quit', true)}
      </>
    ),
    token: (
      <>
        {renderHint('↑↓', 'Navigate')}
        {renderHint('Enter', 'Select')}
        {renderHint('b', 'Back')}
        {renderHint('q', 'Quit', true)}
      </>
    ),
    amount: (
      <>
        {renderHint('0-9', 'Type amount')}
        {renderHint('Enter', 'Confirm')}
        {renderHint('b', 'Back')}
        {renderHint('q', 'Quit', true)}
      </>
    ),
    key: (
      <>
        {renderHint('Paste', 'Private key')}
        {renderHint('Enter', 'Confirm')}
        {renderHint('b', 'Back')}
        {renderHint('q', 'Quit', true)}
      </>
    ),
    confirm: (
      <>
        {renderHint('Enter', 'Execute bridge')}
        {renderHint('b', 'Back')}
        {renderHint('q', 'Quit', true)}
      </>
    ),
    execute: (
      <Text color={theme.muted}>
        <Text color={theme.primary}>{symbols.active}</Text> Processing transaction...
      </Text>
    ),
  }

  return (
    <Box marginTop={1} paddingTop={1} borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false} borderColor={theme.border}>
      <Text color={theme.muted}>{symbols.pointer} </Text>
      {hints[step]}
    </Box>
  )
}

/**
 * Step indicator component showing current position in wizard
 * Enhanced with visual progress bar effect
 */
function StepIndicator({ currentStep }: { currentStep: WizardStep }) {
  const steps: WizardStep[] = ['chain', 'token', 'amount', 'key', 'confirm', 'execute']
  const stepLabels: Record<WizardStep, string> = {
    chain: 'Chain',
    token: 'Token',
    amount: 'Amount',
    key: 'Wallet',
    confirm: 'Confirm',
    execute: 'Execute',
  }

  const currentIndex = steps.indexOf(currentStep)

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Progress bar */}
      <Box marginBottom={1}>
        {steps.map((step, index) => {
          const isActive = index === currentIndex
          const isCompleted = index < currentIndex
          const isLast = index === steps.length - 1

          return (
            <React.Fragment key={step}>
              {/* Step indicator */}
              <Text
                color={isCompleted ? theme.success : isActive ? theme.primary : theme.muted}
                bold={isActive}
              >
                {isCompleted ? symbols.checkCircle : isActive ? symbols.diamondFilled : symbols.circleEmpty}
              </Text>
              {/* Connector line */}
              {!isLast && (
                <Text color={isCompleted ? theme.success : theme.border}>
                  {isCompleted ? '━━' : '──'}
                </Text>
              )}
            </React.Fragment>
          )
        })}
      </Box>

      {/* Step labels */}
      <Box>
        {steps.map((step, index) => {
          const isActive = index === currentIndex
          const isCompleted = index < currentIndex
          const isLast = index === steps.length - 1
          const label = stepLabels[step]
          // Pad label to align with progress indicators (3 chars for indicator + 2 for connector = 5 total per step)
          const paddedLabel = label.padEnd(isLast ? label.length : 5, ' ')

          return (
            <Text
              key={step}
              color={isActive ? theme.primary : isCompleted ? theme.success : theme.muted}
              bold={isActive}
              dimColor={!isActive && !isCompleted}
            >
              {paddedLabel.slice(0, isLast ? undefined : 5)}
            </Text>
          )
        })}
      </Box>
    </Box>
  )
}

/**
 * Chain selection step
 */
function ChainSelectionStep({
  onSelect,
  selectedChain,
}: {
  onSelect: (chain: Chain) => void
  selectedChain: Chain | null
}) {
  const [chains, setChains] = useState<Chain[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadChains() {
      try {
        setLoading(true)
        setError(null)
        const response = await getChains()
        // Filter out HyperEVM as it's the destination
        const originChains = response.chains.filter(c => c.id !== HYPEREVM_CHAIN_ID)
        setChains(originChains)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load chains')
      } finally {
        setLoading(false)
      }
    }
    loadChains()
  }, [])

  if (loading) {
    return <Spinner text="Loading available chains..." />
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color={theme.error}>{symbols.failed} Error: {error}</Text>
        <Text color={theme.muted}>Press q to quit and try again</Text>
      </Box>
    )
  }

  const chainItems: ChainSelectItem[] = chains.map(chain => ({
    label: chain.name,
    value: chain.id,
    chainId: chain.id,
    type: 'origin' as const,
    description: `Chain ID: ${chain.id}`,
  }))

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={theme.secondary} bold>
          Select source chain to bridge from:
        </Text>
      </Box>
      <ChainSelect
        chains={chainItems}
        onSelect={(item) => {
          const chain = chains.find(c => c.id === item.chainId)
          if (chain) onSelect(chain)
        }}
        label=""
      />
      <Box marginTop={1}>
        <Text color={theme.muted} dimColor>
          Destination: HyperEVM (Chain ID: {HYPEREVM_CHAIN_ID})
        </Text>
      </Box>
    </Box>
  )
}

/**
 * Token selection step
 */
function TokenSelectionStep({
  chain,
  onSelect,
  selectedToken,
}: {
  chain: Chain
  onSelect: (token: Token) => void
  selectedToken: Token | null
}) {
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTokens() {
      try {
        setLoading(true)
        setError(null)
        const response = await getBridgeableTokens(chain.id)
        setTokens(response.tokens)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tokens')
      } finally {
        setLoading(false)
      }
    }
    loadTokens()
  }, [chain.id])

  if (loading) {
    return <Spinner text={`Loading bridgeable tokens for ${chain.name}...`} />
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color={theme.error}>{symbols.failed} Error: {error}</Text>
        <Text color={theme.muted}>Press b to go back or q to quit</Text>
      </Box>
    )
  }

  if (tokens.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color={theme.warning}>{symbols.pending} No bridgeable tokens found for {chain.name}</Text>
        <Text color={theme.muted}>Press b to go back and select another chain</Text>
      </Box>
    )
  }

  const tokenItems: TokenSelectItem[] = tokens.map(token => ({
    label: token.symbol,
    value: token.address,
    symbol: token.symbol,
    description: token.name,
  }))

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={theme.secondary} bold>
          Select token to bridge from {chain.name}:
        </Text>
      </Box>
      <TokenSelect
        tokens={tokenItems}
        onSelect={(item) => {
          const token = tokens.find(t => t.address === item.value)
          if (token) onSelect(token)
        }}
        label=""
      />
    </Box>
  )
}

/**
 * Amount input step with blinking cursor
 */
function AmountInputStep({
  token,
  chain,
  amount,
  onAmountChange,
  onConfirm,
  error,
}: {
  token: Token
  chain: Chain
  amount: string
  onAmountChange: (amount: string) => void
  onConfirm: () => void
  error: string | null
}) {
  const [cursorVisible, setCursorVisible] = useState(true)

  // Blinking cursor effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible(v => !v)
    }, 530)
    return () => clearInterval(interval)
  }, [])

  // Handle input
  useInput((input, key) => {
    if (key.return && amount.length > 0) {
      onConfirm()
      return
    }

    if (key.backspace || key.delete) {
      onAmountChange(amount.slice(0, -1))
      return
    }

    // Only allow numeric input and decimal point
    if (/^[0-9.]$/.test(input)) {
      // Prevent multiple decimal points
      if (input === '.' && amount.includes('.')) return
      // Prevent starting with multiple zeros
      if (input === '0' && amount === '0') return
      onAmountChange(amount + input)
    }
  })

  const cursor = cursorVisible ? '|' : ' '
  const displayAmount = amount || '0'

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={theme.secondary} bold>
          Enter amount of {token.symbol} to bridge:
        </Text>
      </Box>

      <StyledBox bordered padding={1}>
        <Box>
          <Text color={theme.primary} bold>
            {displayAmount}
          </Text>
          <Text color={theme.primary}>{cursor}</Text>
          <Text color={theme.muted}> {token.symbol}</Text>
        </Box>
      </StyledBox>

      {error && (
        <Box marginTop={1}>
          <Text color={theme.error}>{symbols.failed} {error}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color={theme.muted} dimColor>
          From: {chain.name} ({token.symbol})
        </Text>
      </Box>
      <Box>
        <Text color={theme.muted} dimColor>
          To: HyperEVM (USDC)
        </Text>
      </Box>
    </Box>
  )
}

/**
 * Private key input step
 */
function KeyInputStep({
  privateKey,
  walletAddress,
  onKeyChange,
  onConfirm,
  error,
  loading,
}: {
  privateKey: string
  walletAddress: string | null
  onKeyChange: (key: string) => void
  onConfirm: () => void
  error: string | null
  loading: boolean
}) {
  const [cursorVisible, setCursorVisible] = useState(true)

  // Blinking cursor effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible(v => !v)
    }, 530)
    return () => clearInterval(interval)
  }, [])

  // Handle input
  useInput((input, key) => {
    if (loading) return

    if (key.return && privateKey.length >= 64) {
      onConfirm()
      return
    }

    if (key.backspace || key.delete) {
      onKeyChange(privateKey.slice(0, -1))
      return
    }

    // Only allow hex characters
    if (/^[0-9a-fA-Fx]$/.test(input)) {
      onKeyChange(privateKey + input)
    }
  })

  const cursor = cursorVisible ? '|' : ' '
  // Mask the key for security (show first 6 and last 4 chars)
  const maskedKey = privateKey.length > 10
    ? `${privateKey.slice(0, 6)}${'*'.repeat(Math.max(0, privateKey.length - 10))}${privateKey.slice(-4)}`
    : privateKey

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={theme.secondary} bold>
          Enter your private key to sign the transaction:
        </Text>
      </Box>

      <StyledBox bordered padding={1}>
        <Box>
          <Text color={theme.primary} bold>
            {maskedKey || '0x'}
          </Text>
          <Text color={theme.primary}>{cursor}</Text>
        </Box>
      </StyledBox>

      {loading && (
        <Box marginTop={1}>
          <Spinner text="Validating key and fetching quote..." />
        </Box>
      )}

      {walletAddress && !loading && (
        <Box marginTop={1}>
          <Text color={theme.success}>
            {symbols.check} Wallet: {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
          </Text>
        </Box>
      )}

      {error && (
        <Box marginTop={1}>
          <Text color={theme.error}>{symbols.failed} {error}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color={theme.muted} dimColor>
          Your key is only used locally to sign transactions
        </Text>
      </Box>
      <Box>
        <Text color={theme.muted} dimColor>
          Tip: Paste your 64-character hex key (with or without 0x prefix)
        </Text>
      </Box>
    </Box>
  )
}

/**
 * Confirmation step showing summary with real quote
 */
function ConfirmationStep({
  chain,
  token,
  amount,
  quote,
  walletAddress,
  onConfirm,
}: {
  chain: Chain
  token: Token
  amount: string
  quote: Quote | null
  walletAddress: string | null
  onConfirm: () => void
}) {
  // Handle Enter key to confirm
  useInput((_input, key) => {
    if (key.return && quote) {
      onConfirm()
    }
  })

  if (!quote) {
    return <Spinner text="Fetching quote..." />
  }

  const estimatedMinutes = Math.ceil(quote.estimatedTime / 60)
  const outputFormatted = (Number(quote.toAmount) / Math.pow(10, quote.toToken.decimals)).toFixed(2)

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={theme.secondary} bold>
          Review your bridge transaction:
        </Text>
      </Box>

      {walletAddress && (
        <Box marginBottom={1}>
          <Text color={theme.muted} dimColor>
            Wallet: {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
          </Text>
        </Box>
      )}

      <StyledBox bordered title="Transaction Summary" padding={1}>
        <KeyValue
          items={[
            { key: 'From Chain', value: chain.name },
            { key: 'Token', value: token.symbol },
            { key: 'Amount', value: `${amount} ${token.symbol}` },
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
      </StyledBox>

      {quote.highImpact && (
        <Box marginTop={1}>
          <Text color={theme.warning}>
            {symbols.pending} Warning: High price impact ({(quote.priceImpact * 100).toFixed(2)}%)
          </Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color={theme.success} bold>
          {symbols.arrow} Press Enter to execute the bridge
        </Text>
      </Box>
      <Box>
        <Text color={theme.muted} dimColor>
          Press b to go back and edit
        </Text>
      </Box>
    </Box>
  )
}

/**
 * Step state for tracking execution progress
 */
type StepState = 'pending' | 'active' | 'completed' | 'failed'

interface ExecutionStepState {
  approval: StepState
  bridge: StepState
  confirm: StepState
}

/**
 * Execution step showing progress with real bridge execution
 */
function ExecutionStep({
  chain,
  token,
  amount,
  quote,
  privateKey,
  onComplete,
  onError,
}: {
  chain: Chain
  token: Token
  amount: string
  quote: Quote
  privateKey: string
  onComplete: (result: ExecutionResult) => void
  onError: (error: Error) => void
}) {
  const [stepState, setStepState] = useState<ExecutionStepState>({
    approval: 'active',
    bridge: 'pending',
    confirm: 'pending',
  })
  const [statusMessage, setStatusMessage] = useState('Initializing...')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)

  // Execute bridge on mount
  useEffect(() => {
    if (isExecuting) return
    setIsExecuting(true)

    const executeBridge = async () => {
      try {
        // Create signer
        const signer = await createSigner(privateKey, chain.id)

        // Create Mina client and execute
        const mina = new Mina({
          integrator: 'mina-cli-wizard',
          autoDeposit: true,
        })

        const result = await mina.execute({
          quote,
          signer,
          onStepChange: (stepStatus: StepStatusPayload) => {
            setStatusMessage(`${stepStatus.step}: ${stepStatus.status}`)

            if (stepStatus.step === 'approval') {
              if (stepStatus.status === 'completed') {
                setStepState(prev => ({ ...prev, approval: 'completed', bridge: 'active' }))
              } else if (stepStatus.status === 'failed') {
                setStepState(prev => ({ ...prev, approval: 'failed' }))
              } else if (stepStatus.status === 'active') {
                setStepState(prev => ({ ...prev, approval: 'active' }))
              }
            } else if (stepStatus.step === 'bridge' || stepStatus.step === 'swap') {
              if (stepStatus.status === 'completed') {
                setStepState(prev => ({ ...prev, bridge: 'completed', confirm: 'active' }))
              } else if (stepStatus.status === 'failed') {
                setStepState(prev => ({ ...prev, bridge: 'failed' }))
              } else if (stepStatus.status === 'active') {
                setStepState(prev => ({ ...prev, bridge: 'active' }))
              }
              if (stepStatus.txHash) {
                setTxHash(stepStatus.txHash)
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
            setStatusMessage(status.substatus || `Step ${status.currentStep}/${status.totalSteps}`)
            if (status.txHash) {
              setTxHash(status.txHash)
            }
          },
        })

        if (result.status === 'completed') {
          setStepState({
            approval: 'completed',
            bridge: 'completed',
            confirm: 'completed',
          })
          onComplete(result)
        } else if (result.status === 'failed') {
          setError(result.error?.message || 'Bridge execution failed')
          onError(result.error || new Error('Bridge execution failed'))
        }
      } catch (err) {
        const normalizedError = normalizeError(err instanceof Error ? err : new Error(String(err)))
        setError(normalizedError.message)
        onError(normalizedError)
      }
    }

    executeBridge()
  }, [])

  const steps: ProgressStep[] = [
    {
      label: 'Approving token spend',
      status: stepState.approval,
      description: stepState.approval === 'active' ? 'Waiting for approval...' : undefined,
    },
    {
      label: 'Executing bridge transaction',
      status: stepState.bridge,
      description: stepState.bridge === 'active' ? statusMessage : undefined,
    },
    {
      label: 'Confirming on destination',
      status: stepState.confirm,
      description: stepState.confirm === 'active' ? 'Waiting for bridge confirmation...' : undefined,
    },
  ]

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={theme.secondary} bold>
          Bridging {amount} {token.symbol} from {chain.name} to HyperEVM
        </Text>
      </Box>

      <ProgressSteps steps={steps} title="Bridge Progress" showNumbers />

      {txHash && (
        <Box marginTop={1}>
          <Text color={theme.muted}>
            TX: {txHash.slice(0, 16)}...{txHash.slice(-8)}
          </Text>
        </Box>
      )}

      {stepState.confirm === 'completed' && (
        <Box marginTop={1}>
          <Text color={theme.success} bold>
            {symbols.check} Bridge completed successfully!
          </Text>
        </Box>
      )}

      {error && (
        <Box marginTop={1}>
          <Text color={theme.error}>
            {symbols.failed} Error: {error}
          </Text>
        </Box>
      )}

      {!error && stepState.confirm !== 'completed' && (
        <Box marginTop={1}>
          <Text color={theme.muted} dimColor>
            {statusMessage}
          </Text>
        </Box>
      )}
    </Box>
  )
}

/**
 * Main Wizard component
 */
export function Wizard() {
  const { exit } = useApp()
  const [state, setState] = useState<WizardState>(initialState)

  // Loading state for key validation
  const [keyLoading, setKeyLoading] = useState(false)

  // Handle global navigation
  useInput((input, key) => {
    // Quit on 'q'
    if (input === 'q' && state.step !== 'execute') {
      exit()
      return
    }

    // Go back on 'b' (except in amount/key steps where backspace deletes, and execute)
    if ((input === 'b') && state.step !== 'chain' && state.step !== 'execute' && state.step !== 'amount' && state.step !== 'key') {
      goBack()
      return
    }

    // In amount step, 'b' goes back
    if (input === 'b' && state.step === 'amount') {
      goBack()
      return
    }

    // In key step, 'b' goes back only if not loading
    if (input === 'b' && state.step === 'key' && !keyLoading) {
      goBack()
      return
    }
  })

  const goBack = useCallback(() => {
    setState(prev => {
      switch (prev.step) {
        case 'token':
          return { ...prev, step: 'chain', token: null, error: null }
        case 'amount':
          return { ...prev, step: 'token', amount: '', error: null }
        case 'key':
          return { ...prev, step: 'amount', privateKey: null, walletAddress: null, quote: null, error: null }
        case 'confirm':
          return { ...prev, step: 'key', error: null }
        default:
          return prev
      }
    })
  }, [])

  const handleChainSelect = useCallback((chain: Chain) => {
    setState(prev => ({ ...prev, chain, step: 'token', error: null }))
  }, [])

  const handleTokenSelect = useCallback((token: Token) => {
    setState(prev => ({ ...prev, token, step: 'amount', error: null }))
  }, [])

  const handleAmountChange = useCallback((amount: string) => {
    setState(prev => ({ ...prev, amount, error: null }))
  }, [])

  const handleAmountConfirm = useCallback(() => {
    // Validate amount
    const numAmount = parseFloat(state.amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setState(prev => ({ ...prev, error: 'Please enter a valid positive amount' }))
      return
    }
    // Go to key input step
    setState(prev => ({ ...prev, step: 'key', error: null }))
  }, [state.amount])

  const handleKeyChange = useCallback((key: string) => {
    setState(prev => ({ ...prev, privateKey: key, error: null }))
  }, [])

  const handleKeyConfirm = useCallback(async () => {
    if (!state.privateKey || !state.chain || !state.token) return

    // Validate key format
    const keyWithoutPrefix = state.privateKey.startsWith('0x') ? state.privateKey.slice(2) : state.privateKey
    if (!/^[0-9a-fA-F]{64}$/.test(keyWithoutPrefix)) {
      setState(prev => ({ ...prev, error: 'Invalid private key format. Expected 64 hex characters.' }))
      return
    }

    setKeyLoading(true)

    try {
      // Get wallet address from key
      const normalizedKey = state.privateKey.startsWith('0x') ? state.privateKey : `0x${state.privateKey}`
      const address = await getAddressFromPrivateKey(normalizedKey)
      setState(prev => ({ ...prev, walletAddress: address, privateKey: normalizedKey }))

      // Fetch quote
      const amountInSmallestUnit = (parseFloat(state.amount) * Math.pow(10, state.token!.decimals)).toString()

      const quote = await getQuote({
        fromChainId: state.chain!.id,
        toChainId: HYPEREVM_CHAIN_ID,
        fromToken: state.token!.address,
        toToken: HYPEREVM_USDC_ADDRESS,
        fromAmount: amountInSmallestUnit,
        fromAddress: address,
      })

      setState(prev => ({ ...prev, quote, step: 'confirm', error: null }))
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to validate key or fetch quote'
      setState(prev => ({ ...prev, error }))
    } finally {
      setKeyLoading(false)
    }
  }, [state.privateKey, state.chain, state.token, state.amount])

  const handleConfirm = useCallback(() => {
    setState(prev => ({ ...prev, step: 'execute', error: null }))
  }, [])

  const handleExecutionComplete = useCallback((result: ExecutionResult) => {
    setState(prev => ({ ...prev, executionResult: result, executionStatus: 'completed' }))
  }, [])

  const handleExecutionError = useCallback((error: Error) => {
    setState(prev => ({ ...prev, error: error.message, executionStatus: 'failed' }))
  }, [])

  // Render step content
  const renderStepContent = () => {
    switch (state.step) {
      case 'chain':
        return (
          <ChainSelectionStep
            onSelect={handleChainSelect}
            selectedChain={state.chain}
          />
        )

      case 'token':
        if (!state.chain) return null
        return (
          <TokenSelectionStep
            chain={state.chain}
            onSelect={handleTokenSelect}
            selectedToken={state.token}
          />
        )

      case 'amount':
        if (!state.chain || !state.token) return null
        return (
          <AmountInputStep
            chain={state.chain}
            token={state.token}
            amount={state.amount}
            onAmountChange={handleAmountChange}
            onConfirm={handleAmountConfirm}
            error={state.error}
          />
        )

      case 'key':
        if (!state.chain || !state.token) return null
        return (
          <KeyInputStep
            privateKey={state.privateKey || ''}
            walletAddress={state.walletAddress}
            onKeyChange={handleKeyChange}
            onConfirm={handleKeyConfirm}
            error={state.error}
            loading={keyLoading}
          />
        )

      case 'confirm':
        if (!state.chain || !state.token) return null
        return (
          <ConfirmationStep
            chain={state.chain}
            token={state.token}
            amount={state.amount}
            quote={state.quote}
            walletAddress={state.walletAddress}
            onConfirm={handleConfirm}
          />
        )

      case 'execute':
        if (!state.chain || !state.token || !state.quote || !state.privateKey) return null
        return (
          <ExecutionStep
            chain={state.chain}
            token={state.token}
            amount={state.amount}
            quote={state.quote}
            privateKey={state.privateKey}
            onComplete={handleExecutionComplete}
            onError={handleExecutionError}
          />
        )

      default:
        return null
    }
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header with logo */}
      <Header showTagline tagline="Cross-chain bridge to Hyperliquid" />

      {/* Step indicator */}
      <StepIndicator currentStep={state.step} />

      {/* Main content area */}
      <Box flexDirection="column" marginY={1}>
        {renderStepContent()}
      </Box>

      {/* Navigation hints */}
      <NavigationHints step={state.step} />
    </Box>
  )
}

export default Wizard
