import React from 'react'
import { Box, Text } from 'ink'
import InkSelectInput from 'ink-select-input'
import { theme, symbols, borders } from './theme.js'

// Define InkItem type to match ink-select-input's expected format
interface InkItem<V> {
  key?: string
  label: string
  value: V
}

export interface SelectItem<V = string> {
  label: string
  value: V
  description?: string
  disabled?: boolean
}

export interface SelectProps<V = string> {
  /** Items to display in the selector */
  items: SelectItem<V>[]
  /** Callback when an item is selected */
  onSelect: (item: SelectItem<V>) => void
  /** Callback when highlighted item changes */
  onHighlight?: (item: SelectItem<V>) => void
  /** Initially selected item index */
  initialIndex?: number
  /** Whether the select is disabled */
  disabled?: boolean
  /** Label to show above the select */
  label?: string
  /** Limit visible items (for scrolling) */
  limit?: number
}

/**
 * Styled chain/token selector component
 * Enhanced with refined visual design
 */
export function Select<V = string>({
  items,
  onSelect,
  onHighlight,
  initialIndex = 0,
  disabled = false,
  label,
  limit,
}: SelectProps<V>) {
  // Transform items to ink-select-input format with unique keys
  const inkItems: InkItem<SelectItem<V>>[] = items.map((item, index) => ({
    key: `${item.label}-${String(item.value)}-${index}`,
    label: item.label,
    value: item,
  }))

  const handleSelect = (item: InkItem<SelectItem<V>>) => {
    if (!item.value.disabled) {
      onSelect(item.value)
    }
  }

  const handleHighlight = (item: InkItem<SelectItem<V>>) => {
    onHighlight?.(item.value)
  }

  // Custom item component for enhanced theming
  const itemComponent = ({ isSelected, label }: { isSelected?: boolean; label: string }) => {
    const item = items.find(i => i.label === label)
    const isDisabled = item?.disabled

    return (
      <Box>
        {/* Selection indicator with visual enhancement */}
        <Text color={isSelected ? theme.primary : theme.border}>
          {isSelected ? symbols.pointerFilled : ' '}
        </Text>
        <Text> </Text>
        {/* Main label with highlight effect */}
        <Text
          color={isSelected ? theme.primary : isDisabled ? theme.muted : theme.secondary}
          bold={isSelected}
        >
          {label}
        </Text>
        {/* Description with separator */}
        {item?.description && (
          <>
            <Text color={theme.border}> {symbols.dash} </Text>
            <Text color={theme.muted} dimColor>
              {item.description}
            </Text>
          </>
        )}
      </Box>
    )
  }

  // Custom indicator component - hidden since we handle it in itemComponent
  const indicatorComponent = () => <Text> </Text>

  if (disabled) {
    return (
      <Box flexDirection="column">
        {label && (
          <Text color={theme.muted} dimColor>
            {label}
          </Text>
        )}
        <Box>
          <Text color={theme.muted} dimColor>
            {symbols.circleEmpty} (disabled)
          </Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      {label && (
        <Box marginBottom={1}>
          <Text color={theme.borderLight}>{borders.vertical}</Text>
          <Text color={theme.secondary}> {label}</Text>
        </Box>
      )}
      <InkSelectInput
        items={inkItems}
        onSelect={handleSelect}
        onHighlight={handleHighlight}
        initialIndex={initialIndex}
        itemComponent={itemComponent}
        indicatorComponent={indicatorComponent}
        limit={limit}
      />
    </Box>
  )
}

export interface ChainSelectItem extends SelectItem<number> {
  chainId: number
  type: 'origin' | 'destination'
}

/**
 * Pre-configured chain selector with scrolling
 */
export function ChainSelect({
  chains,
  onSelect,
  label = 'Select Chain:',
  limit = 8,
}: {
  chains: ChainSelectItem[]
  onSelect: (chain: ChainSelectItem) => void
  label?: string
  /** Max visible items before scrolling (default: 8) */
  limit?: number
}) {
  return (
    <Select<number>
      items={chains}
      onSelect={(item) => onSelect(item as ChainSelectItem)}
      label={label}
      limit={limit}
    />
  )
}

export interface TokenSelectItem extends SelectItem<string> {
  symbol: string
  balance?: string
}

/**
 * Pre-configured token selector with scrolling
 */
export function TokenSelect({
  tokens,
  onSelect,
  label = 'Select Token:',
  limit = 10,
}: {
  tokens: TokenSelectItem[]
  onSelect: (token: TokenSelectItem) => void
  label?: string
  /** Max visible items before scrolling (default: 10) */
  limit?: number
}) {
  return (
    <Select<string>
      items={tokens}
      onSelect={(item) => onSelect(item as TokenSelectItem)}
      label={label}
      limit={limit}
    />
  )
}
