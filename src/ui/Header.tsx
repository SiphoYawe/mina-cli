import React from 'react'
import { Box, Text } from 'ink'
import { theme, MINA_LOGO, MINA_LOGO_LARGE, TAGLINE, symbols, borders } from './theme.js'

export interface HeaderProps {
  /** Whether to show the tagline */
  showTagline?: boolean
  /** Custom tagline to display */
  tagline?: string
  /** Whether to show a compact version */
  compact?: boolean
  /** Use large logo variant */
  large?: boolean
}

/**
 * Elegant ASCII art Mina logo header component
 * Features proper centering and refined typography
 */
export function Header({
  showTagline = true,
  tagline = TAGLINE,
  compact = false,
  large = false
}: HeaderProps) {
  if (compact) {
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text color={theme.accent}>{symbols.diamond}</Text>
          <Text color={theme.primary} bold> MINA </Text>
          <Text color={theme.accent}>{symbols.diamond}</Text>
        </Box>
        {showTagline && (
          <Text color={theme.muted}>
            {tagline}
          </Text>
        )}
      </Box>
    )
  }

  const logo = large ? MINA_LOGO_LARGE : MINA_LOGO

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Logo - solid blue, clean and bold */}
      <Box flexDirection="column">
        {logo.split('\n').filter(line => line.length > 0).map((line, index) => (
          <Text
            key={index}
            color={theme.primary}
            bold
          >
            {line}
          </Text>
        ))}
      </Box>

      {/* Tagline - simple and clean */}
      {showTagline && (
        <Box marginTop={1}>
          <Text color={theme.muted}>{tagline}</Text>
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
 * Enhanced with decorative elements
 */
export function Subheader({ text, icon }: SubheaderProps) {
  return (
    <Box marginY={1}>
      <Text color={theme.borderLight}>{borders.vertical}</Text>
      <Text color={theme.primary} bold>
        {icon ? ` ${icon} ` : ' '}{text}
      </Text>
    </Box>
  )
}

/**
 * Section divider with optional label
 */
export function SectionDivider({ label }: { label?: string }) {
  if (label) {
    return (
      <Box marginY={1}>
        <Text color={theme.border}>{borders.heavyHorizontal.repeat(3)} </Text>
        <Text color={theme.muted}>{label}</Text>
        <Text color={theme.border}> {borders.heavyHorizontal.repeat(20)}</Text>
      </Box>
    )
  }

  return (
    <Box marginY={1}>
      <Text color={theme.border}>{borders.heavyHorizontal.repeat(40)}</Text>
    </Box>
  )
}
