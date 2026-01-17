import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Box, Text, useApp } from 'ink'
import {
  Mina,
  type TransactionStatus,
  type StepStatus,
} from '@siphoyawe/mina-sdk'
import {
  Header,
  theme,
  symbols,
  Box as StyledBox,
  KeyValue,
  Spinner,
} from '../ui/index.js'

/**
 * Props for the Status command component
 */
interface StatusCommandProps {
  txHash: string
  watch?: boolean
}

/**
 * Format duration from milliseconds to human readable string
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  return formatDuration(diff) + ' ago'
}

/**
 * Truncate transaction hash for display
 */
function truncateHash(hash: string): string {
  if (hash.length <= 16) return hash
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`
}

/**
 * Get status color based on status
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return theme.success
    case 'failed':
      return theme.error
    case 'pending':
      return theme.muted
    case 'bridging':
    case 'depositing':
    case 'executing':
      return theme.primary
    default:
      return theme.secondary
  }
}

/**
 * Get step status indicator
 */
function getStepIndicator(status: string): React.ReactNode {
  switch (status) {
    case 'pending':
      return <Text color={theme.muted}>{symbols.pending}</Text>
    case 'executing':
      return (
        <Text color={theme.primary}>
          <Spinner />
        </Text>
      )
    case 'completed':
      return <Text color={theme.success}>{symbols.completed}</Text>
    case 'failed':
      return <Text color={theme.error}>{symbols.failed}</Text>
    default:
      return <Text color={theme.muted}>{symbols.pending}</Text>
  }
}

/**
 * Calculate overall progress percentage based on steps
 */
function calculateProgress(steps: StepStatus[]): number {
  if (steps.length === 0) return 0
  const completedSteps = steps.filter(s => s.status === 'completed').length
  const executingSteps = steps.filter(s => s.status === 'executing').length
  // Count executing steps as 50% complete
  return Math.round(((completedSteps + executingSteps * 0.5) / steps.length) * 100)
}

/**
 * Get current step info
 */
function getCurrentStepInfo(steps: StepStatus[]): { current: number; total: number } {
  const total = steps.length
  const current = steps.findIndex(s => s.status === 'executing' || s.status === 'pending')
  // If all completed, return total
  if (current === -1) {
    return { current: total, total }
  }
  // Add 1 for 1-based display
  return { current: current + 1, total }
}

/**
 * Format step type for display
 */
function formatStepType(stepType?: string): string {
  if (!stepType) return 'Unknown'
  const mapping: Record<string, string> = {
    approval: 'Approval',
    swap: 'Swap',
    bridge: 'Bridging',
    deposit: 'Deposit',
  }
  return mapping[stepType] || stepType.charAt(0).toUpperCase() + stepType.slice(1)
}

/**
 * Status display component
 */
function StatusDisplay({
  status,
  txHash,
  elapsedTime,
  estimatedRemaining,
}: {
  status: TransactionStatus
  txHash: string
  elapsedTime: number
  estimatedRemaining: number | null
}) {
  const stepInfo = getCurrentStepInfo(status.steps)
  const progress = calculateProgress(status.steps)
  const statusLabel = status.status.charAt(0).toUpperCase() + status.status.slice(1)

  return (
    <Box flexDirection="column">
      {/* Header Section */}
      <StyledBox bordered title="Bridge Status" padding={1}>
        <KeyValue
          items={[
            { key: 'TX', value: truncateHash(txHash) },
            { key: 'Status', value: `${statusLabel} (Step ${stepInfo.current}/${stepInfo.total})` },
          ]}
          valueColor={getStatusColor(status.status)}
        />
      </StyledBox>

      {/* Progress Steps Section */}
      <Box marginTop={1}>
        <StyledBox bordered padding={1}>
          <Box flexDirection="column">
            {status.steps.map((step, index) => (
              <Box key={step.stepId}>
                <Box width={3}>{getStepIndicator(step.status)}</Box>
                <Box flexGrow={1}>
                  <Text
                    color={getStatusColor(step.status)}
                    bold={step.status === 'executing'}
                    dimColor={step.status === 'pending'}
                  >
                    {formatStepType(step.stepType)}
                    {step.status === 'executing' && progress > 0 && ` (${progress}%)`}
                  </Text>
                </Box>
                {step.txHash && (
                  <Box marginLeft={2}>
                    <Text color={theme.muted} dimColor>
                      {truncateHash(step.txHash)}
                    </Text>
                  </Box>
                )}
              </Box>
            ))}
            {status.steps.length === 0 && (
              <Text color={theme.muted}>No steps found</Text>
            )}
          </Box>
        </StyledBox>
      </Box>

      {/* Timing Section */}
      <Box marginTop={1}>
        <StyledBox bordered padding={1}>
          <KeyValue
            items={[
              { key: 'Elapsed', value: formatDuration(elapsedTime) },
              {
                key: 'Remaining',
                value: estimatedRemaining !== null ? `~${formatDuration(estimatedRemaining)}` : 'Calculating...'
              },
            ]}
            keyColor={theme.muted}
            valueColor={theme.secondary}
          />
        </StyledBox>
      </Box>

      {/* Error Section (if failed) */}
      {status.status === 'failed' && (
        <Box marginTop={1}>
          <StyledBox bordered borderColor={theme.error} padding={1}>
            <Box flexDirection="column">
              <Text color={theme.error} bold>
                {symbols.failed} Transaction Failed
              </Text>
              {status.steps.find(s => s.status === 'failed')?.error && (
                <Box marginTop={1}>
                  <Text color={theme.muted}>
                    {status.steps.find(s => s.status === 'failed')?.error}
                  </Text>
                </Box>
              )}
            </Box>
          </StyledBox>
        </Box>
      )}

      {/* Success Section */}
      {status.status === 'completed' && (
        <Box marginTop={1}>
          <StyledBox bordered borderColor={theme.success} padding={1}>
            <Box flexDirection="column">
              <Text color={theme.success} bold>
                {symbols.completed} Bridge Completed Successfully
              </Text>
              {status.bridgeTxHash && (
                <Box marginTop={1}>
                  <KeyValue
                    items={[
                      { key: 'Bridge TX', value: truncateHash(status.bridgeTxHash) },
                      ...(status.depositTxHash ? [{ key: 'Deposit TX', value: truncateHash(status.depositTxHash) }] : []),
                    ]}
                    keyColor={theme.muted}
                    valueColor={theme.success}
                  />
                </Box>
              )}
            </Box>
          </StyledBox>
        </Box>
      )}
    </Box>
  )
}

/**
 * Loading state component
 */
function LoadingState({ txHash }: { txHash: string }) {
  return (
    <Box flexDirection="column">
      <StyledBox bordered title="Bridge Status" padding={1}>
        <Box>
          <Spinner text={`Looking up ${truncateHash(txHash)}...`} />
        </Box>
      </StyledBox>
    </Box>
  )
}

/**
 * Not found state component
 */
function NotFoundState({ txHash }: { txHash: string }) {
  return (
    <Box flexDirection="column">
      <StyledBox bordered borderColor={theme.warning} title="Bridge Status" padding={1}>
        <Box flexDirection="column">
          <Text color={theme.warning}>
            {symbols.pending} Transaction not found
          </Text>
          <Box marginTop={1}>
            <Text color={theme.muted}>
              TX: {truncateHash(txHash)}
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text color={theme.muted} dimColor>
              The transaction may not have been initiated via this CLI,
              or it may have expired from the local cache.
            </Text>
          </Box>
        </Box>
      </StyledBox>
    </Box>
  )
}

/**
 * Error state component
 */
function ErrorState({ error }: { error: string }) {
  return (
    <Box flexDirection="column">
      <StyledBox bordered borderColor={theme.error} title="Error" padding={1}>
        <Text color={theme.error}>
          {symbols.failed} {error}
        </Text>
      </StyledBox>
    </Box>
  )
}

/**
 * Main Status component
 */
export function Status({ txHash, watch = false }: StatusCommandProps) {
  const { exit } = useApp()
  const [status, setStatus] = useState<TransactionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [startTime] = useState(Date.now())
  const [elapsedTime, setElapsedTime] = useState(0)

  // Create Mina client (memoized to avoid recreation on each render)
  const mina = useMemo(() => new Mina({ integrator: 'mina-cli' }), [])

  // Fetch status
  const fetchStatus = useCallback(async () => {
    try {
      const result = await mina.getStatus(txHash)
      if (result === null) {
        setNotFound(true)
        setLoading(false)
        // Exit if not watching and not found
        if (!watch) {
          setTimeout(() => exit(), 100)
        }
        return
      }
      setStatus(result)
      setNotFound(false)
      setLoading(false)

      // Exit if completed/failed and not watching
      if (!watch && (result.status === 'completed' || result.status === 'failed')) {
        setTimeout(() => exit(), 100)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status')
      setLoading(false)
      if (!watch) {
        setTimeout(() => exit(), 100)
      }
    }
  }, [txHash, watch, exit, mina])

  // Initial fetch
  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Watch mode polling
  useEffect(() => {
    if (!watch) return

    const interval = setInterval(() => {
      fetchStatus()
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(interval)
  }, [watch, fetchStatus])

  // Update elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - (status?.createdAt || startTime))
    }, 1000)

    return () => clearInterval(interval)
  }, [status?.createdAt, startTime])

  // Calculate estimated remaining time
  const estimatedRemaining = status
    ? (() => {
        // Estimate based on progress
        const progress = calculateProgress(status.steps)
        if (progress === 0) return null
        if (progress >= 100) return 0
        // Simple linear estimation
        const elapsed = elapsedTime
        const totalEstimated = (elapsed / progress) * 100
        return Math.max(0, totalEstimated - elapsed)
      })()
    : null

  // Render
  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Header showTagline={false} />

      {/* Watch mode indicator */}
      {watch && (
        <Box marginBottom={1}>
          <Text color={theme.primary}>
            <Spinner /> Watching for updates (polling every 5s)
          </Text>
        </Box>
      )}

      {/* Content */}
      <Box marginTop={1}>
        {loading && <LoadingState txHash={txHash} />}
        {error && <ErrorState error={error} />}
        {notFound && !loading && <NotFoundState txHash={txHash} />}
        {status && !loading && !error && (
          <StatusDisplay
            status={status}
            txHash={txHash}
            elapsedTime={elapsedTime}
            estimatedRemaining={estimatedRemaining}
          />
        )}
      </Box>

      {/* Navigation hints */}
      <Box marginTop={1}>
        <Text color={theme.muted} dimColor>
          {watch ? 'Ctrl+C to stop watching' : 'Press any key to exit'}
        </Text>
      </Box>
    </Box>
  )
}

/**
 * Status command handler for commander
 */
export async function statusCommand(
  txHash: string,
  options: { watch?: boolean }
): Promise<void> {
  const { render } = await import('ink')
  const React = await import('react')

  render(React.createElement(Status, { txHash, watch: options.watch }))
}

export default Status
