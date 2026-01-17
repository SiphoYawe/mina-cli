import React from 'react'
import { Box as InkBox, Text, type BoxProps as InkBoxProps } from 'ink'
import { theme, borders } from './theme.js'

export interface BoxProps extends Omit<InkBoxProps, 'borderStyle' | 'borderColor'> {
  /** Title to display in the box header */
  title?: string
  /** Border color from theme */
  borderColor?: string
  /** Whether to show border */
  bordered?: boolean
  /** Padding inside the box */
  padding?: number
  children?: React.ReactNode
}

/**
 * Styled border box component with Dark Luxe theme
 */
export function Box({
  title,
  borderColor = theme.border,
  bordered = true,
  padding = 1,
  children,
  ...props
}: BoxProps) {
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
      borderStyle="round"
      borderColor={borderColor}
      paddingX={padding}
      paddingY={padding > 0 ? 1 : 0}
      {...props}
    >
      {title && (
        <InkBox marginBottom={1}>
          <Text color={theme.primary} bold>
            {title}
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
}

/**
 * Horizontal divider component
 */
export function Divider({
  width = 40,
  color = theme.border,
  char = borders.horizontal
}: DividerProps) {
  return (
    <Text color={color}>
      {char.repeat(width)}
    </Text>
  )
}
