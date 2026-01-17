import React from 'react'
import { Box, Text } from 'ink'
import InkSpinner from 'ink-spinner'
import { theme, symbols, borders } from './theme.js'

export type StepStatus = 'pending' | 'active' | 'completed' | 'failed'

export interface Step {
  /** Step label */
  label: string
  /** Current status */
  status: StepStatus
  /** Optional description/details */
  description?: string
  /** Optional timestamp */
  timestamp?: string
}

export interface ProgressStepsProps {
  /** Array of steps to display */
  steps: Step[]
  /** Whether to show step numbers */
  showNumbers?: boolean
  /** Whether to show timestamps */
  showTimestamps?: boolean
  /** Title for the progress section */
  title?: string
}

/**
 * Get the status indicator for a step
 * Enhanced with more distinctive visual states
 */
function getStatusIndicator(status: StepStatus): React.ReactNode {
  switch (status) {
    case 'pending':
      return <Text color={theme.muted}>{symbols.circleEmpty}</Text>
    case 'active':
      return (
        <Text color={theme.highlight}>
          <InkSpinner type="dots" />
        </Text>
      )
    case 'completed':
      return <Text color={theme.success}>{symbols.checkCircle}</Text>
    case 'failed':
      return <Text color={theme.error}>{symbols.cross}</Text>
  }
}

/**
 * Get the color for a step based on status
 */
function getStatusColor(status: StepStatus): string {
  switch (status) {
    case 'pending':
      return theme.muted
    case 'active':
      return theme.highlight
    case 'completed':
      return theme.success
    case 'failed':
      return theme.error
  }
}

/**
 * Get connector style based on step status
 */
function getConnectorStyle(currentStatus: StepStatus, nextStatus: StepStatus): { char: string; color: string } {
  if (currentStatus === 'completed') {
    return { char: borders.vertical, color: theme.success }
  }
  if (currentStatus === 'active') {
    return { char: borders.vertical, color: theme.highlight }
  }
  return { char: borders.vertical, color: theme.border }
}

/**
 * Single step component
 * Enhanced with better visual hierarchy
 */
function StepItem({
  step,
  index,
  showNumber,
  showTimestamp,
  isLast,
  nextStep,
}: {
  step: Step
  index: number
  showNumber: boolean
  showTimestamp: boolean
  isLast: boolean
  nextStep?: Step
}) {
  const color = getStatusColor(step.status)
  const connector = !isLast ? getConnectorStyle(step.status, nextStep?.status || 'pending') : null

  return (
    <Box flexDirection="column">
      <Box>
        {/* Status indicator */}
        <Box width={3}>{getStatusIndicator(step.status)}</Box>

        {/* Step number (optional) */}
        {showNumber && (
          <Box width={4}>
            <Text color={color} dimColor={step.status === 'pending'}>
              {String(index + 1).padStart(2, '0')}
            </Text>
          </Box>
        )}

        {/* Step label */}
        <Box flexGrow={1}>
          <Text
            color={color}
            bold={step.status === 'active'}
            dimColor={step.status === 'pending'}
          >
            {step.label}
          </Text>
        </Box>

        {/* Status badge for active/completed */}
        {step.status === 'active' && (
          <Box marginLeft={1}>
            <Text color={theme.highlight}>[</Text>
            <Text color={theme.highlight}>processing</Text>
            <Text color={theme.highlight}>]</Text>
          </Box>
        )}

        {/* Timestamp (optional) */}
        {showTimestamp && step.timestamp && (
          <Box marginLeft={2}>
            <Text color={theme.muted} dimColor>
              {step.timestamp}
            </Text>
          </Box>
        )}
      </Box>

      {/* Description with indentation */}
      {step.description && (
        <Box marginLeft={showNumber ? 7 : 3}>
          <Text color={step.status === 'failed' ? theme.error : theme.muted} dimColor={step.status !== 'failed'}>
            {symbols.pointer} {step.description}
          </Text>
        </Box>
      )}

      {/* Connector line (not for last item) */}
      {connector && (
        <Box marginLeft={1}>
          <Text color={connector.color}>{connector.char}</Text>
        </Box>
      )}
    </Box>
  )
}

/**
 * Bridge progress steps component with status indicators
 * Enhanced with visual timeline effect
 *
 * Status indicators:
 * - Pending: ○ (empty circle)
 * - Active: ◆ (with spinner)
 * - Completed: ◉ (filled circle, green)
 * - Failed: ✗ (red)
 */
export function ProgressSteps({
  steps,
  showNumbers = true,
  showTimestamps = false,
  title,
}: ProgressStepsProps) {
  return (
    <Box flexDirection="column">
      {title && (
        <Box marginBottom={1}>
          <Text color={theme.borderLight}>{borders.vertical}</Text>
          <Text color={theme.secondary} bold> {title}</Text>
        </Box>
      )}
      {steps.map((step, index) => (
        <StepItem
          key={index}
          step={step}
          index={index}
          showNumber={showNumbers}
          showTimestamp={showTimestamps}
          isLast={index === steps.length - 1}
          nextStep={steps[index + 1]}
        />
      ))}
    </Box>
  )
}

/**
 * Pre-configured bridge progress steps
 */
export function BridgeProgress({
  currentStep,
  error,
}: {
  currentStep: number
  error?: string
}) {
  const bridgeSteps: Step[] = [
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
      description: error || undefined,
    },
  ]

  // Mark as failed if there's an error
  if (error && currentStep >= 0 && currentStep < 5) {
    const step = bridgeSteps[currentStep]
    if (step) {
      step.status = 'failed'
      step.description = error
    }
  }

  return <ProgressSteps steps={bridgeSteps} title="Bridge Progress" />
}
