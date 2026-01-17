import React from 'react'
import { Box, Text } from 'ink'
import { theme, MINA_LOGO, TAGLINE } from './theme.js'

export interface HeaderProps {
  /** Whether to show the tagline */
  showTagline?: boolean
  /** Custom tagline to display */
  tagline?: string
  /** Whether to show a compact version */
  compact?: boolean
}

/**
 * ASCII art Mina logo header component
 */
export function Header({
  showTagline = true,
  tagline = TAGLINE,
  compact = false
}: HeaderProps) {
  if (compact) {
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Text color={theme.primary} bold>
          MINA
        </Text>
        {showTagline && (
          <Text color={theme.secondary} dimColor>
            {tagline}
          </Text>
        )}
      </Box>
    )
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color={theme.primary} bold>
        {MINA_LOGO}
      </Text>
      {showTagline && (
        <Box justifyContent="center">
          <Text color={theme.secondary} dimColor>
            {tagline}
          </Text>
        </Box>
      )}
    </Box>
  )
}

export interface SubheaderProps {
  /** Text to display */
  text: string
  /** Icon to show before text */
  icon?: string
}

/**
 * Subheader component for section titles
 */
export function Subheader({ text, icon }: SubheaderProps) {
  return (
    <Box marginY={1}>
      <Text color={theme.primary} bold>
        {icon && `${icon} `}{text}
      </Text>
    </Box>
  )
}
