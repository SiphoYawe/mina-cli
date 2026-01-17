import React, { useState, useEffect, useCallback } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import {
  getChains,
  getBridgeableTokens,
  type Chain,
  type Token,
  type Quote,
  HYPEREVM_CHAIN_ID,
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

/**
 * Wizard step types
 */
type WizardStep = 'chain' | 'token' | 'amount' | 'confirm' | 'execute'

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
}

/**
 * Navigation hints component
 */
function NavigationHints({ step }: { step: WizardStep }) {
  const hints: Record<WizardStep, string> = {
    chain: 'up/down Select  Enter Confirm  q Quit',
    token: 'up/down Select  Enter Confirm  b Back  q Quit',
    amount: 'Enter Confirm  b Back  q Quit',
    confirm: 'Enter Execute  b Back  q Quit',
    execute: 'Please wait...',
  }

  return (
    <Box marginTop={1}>
      <Text color={theme.muted} dimColor>
        {hints[step]}
      </Text>
    </Box>
  )
}

/**
 * Step indicator component showing current position in wizard
 */
function StepIndicator({ currentStep }: { currentStep: WizardStep }) {
  const steps: WizardStep[] = ['chain', 'token', 'amount', 'confirm', 'execute']
  const stepLabels: Record<WizardStep, string> = {
    chain: 'Chain',
    token: 'Token',
    amount: 'Amount',
    confirm: 'Confirm',
    execute: 'Execute',
  }

  const currentIndex = steps.indexOf(currentStep)

  return (
    <Box marginBottom={1}>
      {steps.map((step, index) => {
        const isActive = index === currentIndex
        const isCompleted = index < currentIndex
        const separator = index < steps.length - 1 ? ' > ' : ''

        return (
          <Text key={step}>
            <Text
              color={isActive ? theme.primary : isCompleted ? theme.success : theme.muted}
              bold={isActive}
              dimColor={!isActive && !isCompleted}
            >
              {isCompleted ? symbols.check : isActive ? symbols.arrow : symbols.pending} {stepLabels[step]}
            </Text>
            <Text color={theme.muted} dimColor>{separator}</Text>
          </Text>
        )
      })}
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
 * Confirmation step showing summary
 */
function ConfirmationStep({
  chain,
  token,
  amount,
  onConfirm,
}: {
  chain: Chain
  token: Token
  amount: string
  onConfirm: () => void
}) {
  // Handle Enter key to confirm
  useInput((_input, key) => {
    if (key.return) {
      onConfirm()
    }
  })

  // Mock fee estimate (actual quote fetching will be in Story 12.5)
  const estimatedFees = '$1.50 - $3.00'
  const estimatedTime = '2-5 minutes'

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={theme.secondary} bold>
          Review your bridge transaction:
        </Text>
      </Box>

      <StyledBox bordered title="Transaction Summary" padding={1}>
        <KeyValue
          items={[
            { key: 'From Chain', value: chain.name },
            { key: 'Token', value: token.symbol },
            { key: 'Amount', value: `${amount} ${token.symbol}` },
            { key: 'To Chain', value: 'HyperEVM' },
            { key: 'Receive', value: 'USDC' },
          ]}
        />

        <Box marginTop={1} marginBottom={1}>
          <Divider width={40} />
        </Box>

        <KeyValue
          items={[
            { key: 'Est. Fees', value: estimatedFees },
            { key: 'Est. Time', value: estimatedTime },
          ]}
          keyColor={theme.muted}
          valueColor={theme.warning}
        />
      </StyledBox>

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
 * Execution step showing progress
 */
function ExecutionStep({
  chain,
  token,
  amount,
}: {
  chain: Chain
  token: Token
  amount: string
}) {
  const [currentStep, setCurrentStep] = useState(0)

  // Simulate progress for demo (actual execution in Story 12.5)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= 4) {
          clearInterval(timer)
          return prev
        }
        return prev + 1
      })
    }, 2000)
    return () => clearInterval(timer)
  }, [])

  const steps: ProgressStep[] = [
    {
      label: 'Connecting wallet',
      status: currentStep > 0 ? 'completed' : currentStep === 0 ? 'active' : 'pending',
    },
    {
      label: 'Fetching quote',
      status: currentStep > 1 ? 'completed' : currentStep === 1 ? 'active' : 'pending',
    },
    {
      label: 'Approving token',
      status: currentStep > 2 ? 'completed' : currentStep === 2 ? 'active' : 'pending',
    },
    {
      label: 'Executing bridge',
      status: currentStep > 3 ? 'completed' : currentStep === 3 ? 'active' : 'pending',
    },
    {
      label: 'Confirming on destination',
      status: currentStep > 4 ? 'completed' : currentStep === 4 ? 'active' : 'pending',
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

      {currentStep >= 4 && (
        <Box marginTop={1}>
          <Text color={theme.success} bold>
            {symbols.check} Bridge transaction submitted! Waiting for confirmation...
          </Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color={theme.muted} dimColor>
          (Demo mode - actual execution will be implemented in Story 12.5)
        </Text>
      </Box>
    </Box>
  )
}

/**
 * Main Wizard component
 */
export function Wizard() {
  const { exit } = useApp()
  const [state, setState] = useState<WizardState>(initialState)

  // Handle global navigation
  useInput((input, key) => {
    // Quit on 'q'
    if (input === 'q' && state.step !== 'execute') {
      exit()
      return
    }

    // Go back on 'b' or backspace (except in amount step where backspace deletes)
    if ((input === 'b') && state.step !== 'chain' && state.step !== 'execute' && state.step !== 'amount') {
      goBack()
      return
    }

    // In amount step, 'b' goes back
    if (input === 'b' && state.step === 'amount') {
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
        case 'confirm':
          return { ...prev, step: 'amount', error: null }
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
    setState(prev => ({ ...prev, step: 'confirm', error: null }))
  }, [state.amount])

  const handleConfirm = useCallback(() => {
    setState(prev => ({ ...prev, step: 'execute', error: null }))
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

      case 'confirm':
        if (!state.chain || !state.token) return null
        return (
          <ConfirmationStep
            chain={state.chain}
            token={state.token}
            amount={state.amount}
            onConfirm={handleConfirm}
          />
        )

      case 'execute':
        if (!state.chain || !state.token) return null
        return (
          <ExecutionStep
            chain={state.chain}
            token={state.token}
            amount={state.amount}
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
