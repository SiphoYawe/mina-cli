import React, { useState, useMemo, useEffect } from 'react'
import { Box, Text, useInput, useStdin } from 'ink'
import { theme, symbols, borders } from './theme.js'

export interface ListItem {
  id: string | number
  label: string
  sublabel?: string
  badge?: string
  badgeColor?: string
}

export interface SearchableListProps {
  items: ListItem[]
  title?: string
  placeholder?: string
  /** Number of items to show initially */
  pageSize?: number
  /** Highlight popular items */
  popularIds?: (string | number)[]
  /** Called when user selects an item (Enter key) */
  onSelect?: (item: ListItem) => void
  /** Show search input */
  searchable?: boolean
  /** Max items to display (with "show more" hint) */
  maxDisplay?: number
}

/**
 * Fuzzy search filter
 */
function fuzzyMatch(query: string, text: string): boolean {
  const lowerQuery = query.toLowerCase()
  const lowerText = text.toLowerCase()

  // Exact substring match
  if (lowerText.includes(lowerQuery)) return true

  // Fuzzy: check if query chars appear in order
  let queryIndex = 0
  for (const char of lowerText) {
    if (char === lowerQuery[queryIndex]) {
      queryIndex++
      if (queryIndex === lowerQuery.length) return true
    }
  }

  return false
}

/**
 * Sort items with popular first, then alphabetically
 */
function sortItems(items: ListItem[], popularIds: (string | number)[]): ListItem[] {
  return [...items].sort((a, b) => {
    const aPopular = popularIds.includes(a.id)
    const bPopular = popularIds.includes(b.id)
    if (aPopular && !bPopular) return -1
    if (!aPopular && bPopular) return 1
    return a.label.localeCompare(b.label)
  })
}

/**
 * Interactive keyboard handler component
 * Only rendered when stdin supports raw mode
 */
function KeyboardHandler({
  searchable,
  totalItemsLength,
  selectedIndex,
  setSelectedIndex,
  setQuery,
  setViewportStart,
  onSelect,
  filteredItems,
}: {
  searchable: boolean
  totalItemsLength: number
  selectedIndex: number
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
  setQuery: React.Dispatch<React.SetStateAction<string>>
  setViewportStart: React.Dispatch<React.SetStateAction<number>>
  onSelect?: (item: ListItem) => void
  filteredItems: ListItem[]
}) {
  useInput((input, key) => {
    if (searchable) {
      if (key.backspace || key.delete) {
        setQuery((q) => q.slice(0, -1))
        setSelectedIndex(0)
        setViewportStart(0)
      } else if (input && !key.ctrl && !key.meta && input.length === 1 && input.match(/[a-zA-Z0-9 -]/)) {
        setQuery((q) => q + input)
        setSelectedIndex(0)
        setViewportStart(0)
      }
    }

    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1))
    } else if (key.downArrow) {
      setSelectedIndex((i) => Math.min(totalItemsLength - 1, i + 1))
    } else if (key.return && onSelect && filteredItems[selectedIndex]) {
      onSelect(filteredItems[selectedIndex])
    }
  })

  return null
}

/**
 * Interactive searchable list with keyboard navigation and sliding window
 * Falls back to static list when running non-interactively
 */
export function SearchableList({
  items,
  title,
  placeholder = 'Type to search...',
  pageSize = 8,
  popularIds = [],
  onSelect,
  searchable = true,
  maxDisplay = 10,
}: SearchableListProps) {
  const { isRawModeSupported } = useStdin()
  const isInteractive = isRawModeSupported

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [viewportStart, setViewportStart] = useState(0)

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = items

    // Apply search filter
    if (query) {
      result = items.filter(
        (item) =>
          fuzzyMatch(query, item.label) ||
          (item.sublabel && fuzzyMatch(query, item.sublabel))
      )
    }

    return sortItems(result, popularIds)
  }, [items, query, popularIds])

  // Calculate viewport size - sliding window that follows the cursor
  const viewportSize = Math.min(maxDisplay, filteredItems.length)

  // Adjust viewport when selected index moves outside the visible window
  useEffect(() => {
    if (selectedIndex < viewportStart) {
      setViewportStart(selectedIndex)
    } else if (selectedIndex >= viewportStart + viewportSize) {
      setViewportStart(Math.max(0, selectedIndex - viewportSize + 1))
    }
  }, [selectedIndex, viewportStart, viewportSize])

  // Get visible items based on viewport
  const displayedItems = filteredItems.slice(viewportStart, viewportStart + viewportSize)
  const hasMoreAbove = viewportStart > 0
  const hasMoreBelow = viewportStart + viewportSize < filteredItems.length

  // Keep selected index in bounds
  const safeIndex = Math.min(selectedIndex, Math.max(0, filteredItems.length - 1))
  // Convert global index to viewport-relative index for display
  const viewportSelectedIndex = safeIndex - viewportStart

  return (
    <Box flexDirection="column">
      {/* Keyboard handler - only mount when interactive */}
      {isInteractive && (
        <KeyboardHandler
          searchable={searchable}
          totalItemsLength={filteredItems.length}
          selectedIndex={selectedIndex}
          setSelectedIndex={setSelectedIndex}
          setQuery={setQuery}
          setViewportStart={setViewportStart}
          onSelect={onSelect}
          filteredItems={filteredItems}
        />
      )}

      {/* Title with count */}
      {title && (
        <Box marginBottom={1}>
          <Text color={theme.secondary}>
            {symbols.arrow} {title}
          </Text>
          <Text color={theme.muted}> ({filteredItems.length})</Text>
        </Box>
      )}

      {/* Search input - only show when interactive */}
      {searchable && isInteractive && (
        <Box marginBottom={1}>
          <Text color={theme.border}>{borders.vertical}</Text>
          <Text color={theme.muted}> {symbols.search} </Text>
          {query ? (
            <Text color={theme.primary}>{query}</Text>
          ) : (
            <Text color={theme.muted} dimColor>
              {placeholder}
            </Text>
          )}
          <Text color={theme.accent}>▌</Text>
        </Box>
      )}

      {/* Scroll indicator - above */}
      {hasMoreAbove && isInteractive && (
        <Box>
          <Text color={theme.accent}>  ▲</Text>
          <Text color={theme.muted} dimColor> {viewportStart} more above</Text>
        </Box>
      )}

      {/* List items - sliding window viewport */}
      <Box flexDirection="column">
        {displayedItems.map((item, index) => {
          const isSelected = isInteractive && index === viewportSelectedIndex
          const isPopular = popularIds.includes(item.id)

          return (
            <Box key={item.id}>
              {isInteractive && (
                <Text color={isSelected ? theme.accent : theme.border}>
                  {isSelected ? symbols.arrow : ' '}
                </Text>
              )}
              <Text> </Text>

              {/* Popular indicator */}
              {isPopular && (
                <Text color={theme.warning}>★ </Text>
              )}

              {/* Main label */}
              <Text
                color={isSelected ? theme.primary : theme.secondary}
                bold={isSelected}
              >
                {item.label}
              </Text>

              {/* Sublabel */}
              {item.sublabel && (
                <Text color={theme.muted} dimColor>
                  {' '}({item.sublabel})
                </Text>
              )}

              {/* Badge */}
              {item.badge && (
                <Text color={item.badgeColor || theme.accent}>
                  {' '}[{item.badge}]
                </Text>
              )}
            </Box>
          )
        })}

        {/* Empty state */}
        {displayedItems.length === 0 && (
          <Box>
            <Text color={theme.muted} dimColor>
              No matches for "{query}"
            </Text>
          </Box>
        )}
      </Box>

      {/* Scroll indicator - below */}
      {hasMoreBelow && isInteractive && (
        <Box>
          <Text color={theme.accent}>  ▼</Text>
          <Text color={theme.muted} dimColor> {filteredItems.length - viewportStart - viewportSize} more below</Text>
        </Box>
      )}

      {/* Help text with position indicator - only show in interactive mode */}
      {isInteractive && (
        <Box marginTop={1}>
          <Text color={theme.muted} dimColor>
            ↑↓ scroll{onSelect ? ' • Enter select' : ''}{searchable ? ' • Type to filter' : ''}
            {filteredItems.length > viewportSize && ` • ${safeIndex + 1}/${filteredItems.length}`}
          </Text>
        </Box>
      )}
    </Box>
  )
}

/**
 * Compact list without interactivity - for display only
 */
export function CompactList({
  items,
  title,
  columns = 3,
  maxItems = 12,
  popularIds = [],
}: {
  items: ListItem[]
  title?: string
  columns?: number
  maxItems?: number
  popularIds?: (string | number)[]
}) {
  const sortedItems = sortItems(items, popularIds)
  const displayItems = sortedItems.slice(0, maxItems)
  const hasMore = items.length > maxItems

  // Group into rows
  const rows: ListItem[][] = []
  for (let i = 0; i < displayItems.length; i += columns) {
    rows.push(displayItems.slice(i, i + columns))
  }

  return (
    <Box flexDirection="column">
      {title && (
        <Box marginBottom={1}>
          <Text color={theme.secondary}>
            {symbols.arrow} {title}
          </Text>
          <Text color={theme.muted}> ({items.length})</Text>
        </Box>
      )}

      {rows.map((row, rowIndex) => (
        <Box key={rowIndex} gap={2}>
          {row.map((item) => {
            const isPopular = popularIds.includes(item.id)
            return (
              <Box key={item.id} minWidth={20}>
                {isPopular && <Text color={theme.warning}>★ </Text>}
                <Text color={theme.primary}>{item.label}</Text>
                {item.sublabel && (
                  <Text color={theme.muted} dimColor>
                    {' '}{item.sublabel}
                  </Text>
                )}
              </Box>
            )
          })}
        </Box>
      ))}

      {hasMore && (
        <Box marginTop={1}>
          <Text color={theme.muted} dimColor>
            +{items.length - maxItems} more
          </Text>
        </Box>
      )}
    </Box>
  )
}

export default SearchableList
