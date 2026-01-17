import React from 'react'
import { Box, Text } from 'ink'
import InkSpinner from 'ink-spinner'
import { theme } from './theme.js'

export type SpinnerType =
  | 'dots'
  | 'line'
  | 'pipe'
  | 'simpleDots'
  | 'simpleDotsScrolling'
  | 'star'
  | 'flip'
  | 'hamburger'
  | 'growVertical'
  | 'growHorizontal'
  | 'balloon'
  | 'balloon2'
  | 'noise'
  | 'bounce'
  | 'boxBounce'
  | 'boxBounce2'
  | 'triangle'
  | 'arc'
  | 'circle'
  | 'squareCorners'
  | 'circleQuarters'
  | 'circleHalves'
  | 'squish'
  | 'toggle'
  | 'toggle2'
  | 'toggle3'
  | 'toggle4'
  | 'toggle5'
  | 'toggle6'
  | 'toggle7'
  | 'toggle8'
  | 'toggle9'
  | 'toggle10'
  | 'toggle11'
  | 'toggle12'
  | 'toggle13'
  | 'arrow'
  | 'arrow2'
  | 'arrow3'
  | 'bouncingBar'
  | 'bouncingBall'
  | 'smiley'
  | 'monkey'
  | 'hearts'
  | 'clock'
  | 'earth'
  | 'moon'
  | 'runner'
  | 'pong'
  | 'shark'
  | 'dqpb'
  | 'weather'
  | 'christmas'
  | 'grenade'
  | 'point'
  | 'layer'
  | 'betaWave'

export interface SpinnerProps {
  /** Text to display next to the spinner */
  text?: string
  /** Type of spinner animation */
  type?: SpinnerType
  /** Color of the spinner */
  color?: string
  /** Color of the text */
  textColor?: string
  /** Whether to show the spinner on the right */
  rightAlign?: boolean
}

/**
 * Animated loading spinner component with Dark Luxe theme
 */
export function Spinner({
  text,
  type = 'dots',
  color = theme.primary,
  textColor = theme.secondary,
  rightAlign = false,
}: SpinnerProps) {
  const spinnerElement = (
    <Text color={color}>
      <InkSpinner type={type} />
    </Text>
  )

  if (!text) {
    return spinnerElement
  }

  return (
    <Box>
      {!rightAlign && spinnerElement}
      <Text color={textColor}>
        {rightAlign ? '' : ' '}{text}{rightAlign ? ' ' : ''}
      </Text>
      {rightAlign && spinnerElement}
    </Box>
  )
}

/**
 * Full-width loading state with spinner
 */
export function Loading({
  text = 'Loading...',
  type = 'dots',
}: {
  text?: string
  type?: SpinnerType
}) {
  return (
    <Box padding={1}>
      <Spinner text={text} type={type} />
    </Box>
  )
}

/**
 * Inline loading indicator (minimal)
 */
export function InlineSpinner({ color = theme.primary }: { color?: string }) {
  return (
    <Text color={color}>
      <InkSpinner type="dots" />
    </Text>
  )
}
