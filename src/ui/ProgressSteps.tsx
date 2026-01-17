import React from 'react'
import { Box, Text } from 'ink'
import InkSpinner from 'ink-spinner'
import { theme, symbols } from './theme.js'

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
 */
function getStatusIndicator(status: StepStatus): React.ReactNode {
  switch (status) {
    case 'pending':
      return <Text color={theme.muted}>{symbols.pending}</Text>
    case 'active':
      return (
        <Text color={theme.primary}>
          <InkSpinner type="dots" />
        </Text>
      )
    case 'completed':
      return <Text color={theme.success}>{symbols.completed}</Text>
    case 'failed':
      return <Text color={theme.error}>{symbols.failed}</Text>
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
      return theme.primary
    case 'completed':
      return theme.success
    case 'failed':
      return theme.error
  }
}

/**
 * Single step component
 */
function StepItem({
  step,
  index,
  showNumber,
  showTimestamp,
  isLast,
}: {
  step: Step
  index: number
  showNumber: boolean
  showTimestamp: boolean
  isLast: boolean
}) {
  const color = getStatusColor(step.status)

  return (
    <Box flexDirection="column">
      <Box>
        {/* Status indicator */}
        <Box width={3}>{getStatusIndicator(step.status)}</Box>

        {/* Step number (optional) */}
        {showNumber && (
          <Box width={4}>
            <Text color={color} dimColor={step.status === 'pending'}>
              {index + 1}.
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

        {/* Timestamp (optional) */}
        {showTimestamp && step.timestamp && (
          <Box marginLeft={2}>
            <Text color={theme.muted} dimColor>
              {step.timestamp}
            </Text>
          </Box>
        )}
      </Box>

      {/* Description */}
      {step.description && (
        <Box marginLeft={showNumber ? 7 : 3}>
          <Text color={theme.muted} dimColor>
            {step.description}
          </Text>
        </Box>
      )}

      {/* Connector line (not for last item) */}
      {!isLast && step.status !== 'pending' && (
        <Box marginLeft={1}>
          <Text color={theme.border}>│</Text>
        </Box>
      )}
    </Box>
  )
}

/**
 * Bridge progress steps component with status indicators
 *
 * Status indicators:
 * - Pending: ○
 * - Active: → (with spinner)
 * - Completed: ✓ (green)
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
          <Text color={theme.secondary} bold>
            {title}
          </Text>
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
