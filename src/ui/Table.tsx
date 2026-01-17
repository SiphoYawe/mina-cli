import React from 'react'
import { Box, Text } from 'ink'
import { theme, borders } from './theme.js'

export interface Column<T> {
  /** Column header */
  header: string
  /** Key to access data or custom accessor */
  accessor: keyof T | ((row: T) => string | number)
  /** Column width (default: auto based on content) */
  width?: number
  /** Text alignment */
  align?: 'left' | 'center' | 'right'
  /** Header color */
  headerColor?: string
  /** Cell color or function to determine color */
  cellColor?: string | ((value: unknown, row: T) => string)
}

export interface TableProps<T extends object> {
  /** Array of data rows */
  data: T[]
  /** Column definitions */
  columns: Column<T>[]
  /** Show borders around table */
  bordered?: boolean
  /** Border color */
  borderColor?: string
  /** Header background/style */
  headerBold?: boolean
  /** Striped rows */
  striped?: boolean
  /** Max width for the table */
  maxWidth?: number
}

/**
 * Get cell value from row based on accessor
 */
function getCellValue<T>(row: T, accessor: Column<T>['accessor']): string {
  if (typeof accessor === 'function') {
    return String(accessor(row))
  }
  return String(row[accessor] ?? '')
}

/**
 * Calculate column widths based on content
 */
function calculateColumnWidths<T extends object>(
  data: T[],
  columns: Column<T>[],
  maxWidth?: number
): number[] {
  const widths = columns.map((col) => {
    const headerWidth = col.header.length
    const dataWidths = data.map((row) => getCellValue(row, col.accessor).length)
    const maxContentWidth = Math.max(headerWidth, ...dataWidths)
    return col.width ?? Math.min(maxContentWidth, 30) // Cap at 30 chars
  })

  // If maxWidth is set, proportionally reduce widths
  if (maxWidth) {
    const totalWidth = widths.reduce((a, b) => a + b, 0) + (columns.length * 3) + 1
    if (totalWidth > maxWidth) {
      const scale = maxWidth / totalWidth
      return widths.map((w) => Math.floor(w * scale))
    }
  }

  return widths
}

/**
 * Pad text to width with alignment
 */
function padText(text: string, width: number, align: 'left' | 'center' | 'right' = 'left'): string {
  const truncated = text.length > width ? text.slice(0, width - 1) + '…' : text
  const padding = width - truncated.length

  switch (align) {
    case 'right':
      return ' '.repeat(padding) + truncated
    case 'center':
      const leftPad = Math.floor(padding / 2)
      const rightPad = padding - leftPad
      return ' '.repeat(leftPad) + truncated + ' '.repeat(rightPad)
    default:
      return truncated + ' '.repeat(padding)
  }
}

/**
 * Render a horizontal border line
 */
function BorderLine({
  widths,
  position,
  color,
}: {
  widths: number[]
  position: 'top' | 'middle' | 'bottom'
  color: string
}) {
  const chars = {
    top: { left: borders.topLeft, right: borders.topRight, junction: borders.topT },
    middle: { left: borders.leftT, right: borders.rightT, junction: borders.cross },
    bottom: { left: borders.bottomLeft, right: borders.bottomRight, junction: borders.bottomT },
  }

  const { left, right, junction } = chars[position]
  const segments = widths.map((w) => borders.horizontal.repeat(w + 2))
  const line = left + segments.join(junction) + right

  return <Text color={color}>{line}</Text>
}

/**
 * Render a data row
 */
function TableRow<T extends object>({
  row,
  columns,
  widths,
  bordered,
  borderColor,
  isEven,
  striped,
}: {
  row: T
  columns: Column<T>[]
  widths: number[]
  bordered: boolean
  borderColor: string
  isEven: boolean
  striped: boolean
}) {
  return (
    <Box>
      {bordered && <Text color={borderColor}>{borders.vertical}</Text>}
      {columns.map((col, i) => {
        const value = getCellValue(row, col.accessor)
        const colWidth = widths[i] ?? col.header.length
        const paddedValue = padText(value, colWidth, col.align)

        let cellColor: string = theme.secondary
        if (col.cellColor) {
          cellColor = typeof col.cellColor === 'function'
            ? col.cellColor(value, row)
            : col.cellColor
        }

        return (
          <React.Fragment key={i}>
            <Text> </Text>
            <Text color={cellColor} dimColor={striped && isEven}>
              {paddedValue}
            </Text>
            <Text> </Text>
            {bordered && <Text color={borderColor}>{borders.vertical}</Text>}
          </React.Fragment>
        )
      })}
    </Box>
  )
}

/**
 * Data table component with unicode borders
 *
 * Example output:
 * ```
 * ┌─────────────┬──────────┬──────────┐
 * │ Chain       │ ID       │ Type     │
 * ├─────────────┼──────────┼──────────┤
 * │ Ethereum    │ 1        │ Origin   │
 * │ Arbitrum    │ 42161    │ Origin   │
 * └─────────────┴──────────┴──────────┘
 * ```
 */
export function Table<T extends object>({
  data,
  columns,
  bordered = true,
  borderColor = theme.border,
  headerBold = true,
  striped = false,
  maxWidth,
}: TableProps<T>) {
  const widths = calculateColumnWidths(data, columns, maxWidth)

  return (
    <Box flexDirection="column">
      {/* Top border */}
      {bordered && <BorderLine widths={widths} position="top" color={borderColor} />}

      {/* Header row */}
      <Box>
        {bordered && <Text color={borderColor}>{borders.vertical}</Text>}
        {columns.map((col, i) => {
          const colWidth = widths[i] ?? col.header.length
          return (
            <React.Fragment key={i}>
              <Text> </Text>
              <Text color={col.headerColor ?? theme.primary} bold={headerBold}>
                {padText(col.header, colWidth, col.align)}
              </Text>
              <Text> </Text>
              {bordered && <Text color={borderColor}>{borders.vertical}</Text>}
            </React.Fragment>
          )
        })}
      </Box>

      {/* Header separator */}
      {bordered && <BorderLine widths={widths} position="middle" color={borderColor} />}

      {/* Data rows */}
      {data.map((row, rowIndex) => (
        <TableRow
          key={rowIndex}
          row={row}
          columns={columns}
          widths={widths}
          bordered={bordered}
          borderColor={borderColor}
          isEven={rowIndex % 2 === 0}
          striped={striped}
        />
      ))}

      {/* Bottom border */}
      {bordered && <BorderLine widths={widths} position="bottom" color={borderColor} />}
    </Box>
  )
}

/**
 * Simple key-value display (not a full table)
 */
export function KeyValue({
  items,
  keyColor = theme.muted,
  valueColor = theme.secondary,
  separator = ':',
}: {
  items: Array<{ key: string; value: string | number }>
  keyColor?: string
  valueColor?: string
  separator?: string
}) {
  const maxKeyWidth = Math.max(...items.map((item) => item.key.length))

  return (
    <Box flexDirection="column">
      {items.map((item, index) => (
        <Box key={index}>
          <Text color={keyColor}>
            {item.key.padEnd(maxKeyWidth)}
          </Text>
          <Text color={theme.muted}> {separator} </Text>
          <Text color={valueColor}>{item.value}</Text>
        </Box>
      ))}
    </Box>
  )
}
