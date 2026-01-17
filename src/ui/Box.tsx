import React from 'react'
import { Box as InkBox, Text, type BoxProps as InkBoxProps } from 'ink'
import { theme, borders, symbols } from './theme.js'

export interface BoxProps extends Omit<InkBoxProps, 'borderStyle' | 'borderColor'> {
  /** Title to display in the box header */
  title?: string
  /** Border color from theme */
  borderColor?: string
  /** Whether to show border */
  bordered?: boolean
  /** Padding inside the box */
  padding?: number
  /** Use accent styling for emphasis */
  accent?: boolean
  /** Use double-line border for emphasis */
  emphasis?: boolean
  children?: React.ReactNode
}

/**
 * Styled border box component with refined visual design
 */
export function Box({
  title,
  borderColor = theme.border,
  bordered = true,
  padding = 1,
  accent = false,
  emphasis = false,
  children,
  ...props
}: BoxProps) {
  const effectiveBorderColor = accent ? theme.primary : borderColor

  if (!bordered) {
    return (
      <InkBox padding={padding} {...props}>
        {children}
      </InkBox>
    )
  }

  return (
    <InkBox
      flexDirection="column"
      borderStyle={emphasis ? 'double' : 'round'}
      borderColor={effectiveBorderColor}
      paddingX={padding}
      paddingY={padding > 0 ? 1 : 0}
      {...props}
    >
      {title && (
        <InkBox marginBottom={1}>
          <Text color={accent ? theme.primary : theme.secondary} bold>
            {symbols.diamond} {title}
          </Text>
        </InkBox>
      )}
      {children}
    </InkBox>
  )
}

export interface DividerProps {
  /** Width of the divider */
  width?: number
  /** Color of the divider */
  color?: string
  /** Character to use for the divider */
  char?: string
  /** Optional label in the middle */
  label?: string
  /** Use heavy line style */
  heavy?: boolean
}

/**
 * Horizontal divider component
 * Enhanced with optional label and style variants
 */
export function Divider({
  width = 40,
  color = theme.border,
  char,
  label,
  heavy = false,
}: DividerProps) {
  const dividerChar = char || (heavy ? borders.heavyHorizontal : borders.horizontal)

  if (label) {
    const labelLength = label.length + 2 // +2 for spacing
    const sideWidth = Math.max(3, Math.floor((width - labelLength) / 2))

    return (
      <InkBox>
        <Text color={color}>{dividerChar.repeat(sideWidth)}</Text>
        <Text color={theme.muted}> {label} </Text>
        <Text color={color}>{dividerChar.repeat(sideWidth)}</Text>
      </InkBox>
    )
  }

  return (
    <Text color={color}>
      {dividerChar.repeat(width)}
    </Text>
  )
}

/**
 * Decorative section break with visual flair
 */
export function SectionBreak({ style = 'dots' }: { style?: 'dots' | 'dash' | 'line' }) {
  const patterns = {
    dots: `${symbols.dot} ${symbols.dot} ${symbols.dot}`,
    dash: `${borders.horizontal}${borders.horizontal}${borders.horizontal}`,
    line: borders.heavyHorizontal.repeat(20),
  }

  return (
    <InkBox marginY={1} justifyContent="center">
      <Text color={theme.border}>{patterns[style]}</Text>
    </InkBox>
  )
}
