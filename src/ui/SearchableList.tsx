import React, { useState, useMemo } from 'react'
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
  displayedItemsLength,
  selectedIndex,
  setSelectedIndex,
  setQuery,
  setShowAll,
  hasMore,
  onSelect,
  displayedItems,
}: {
  searchable: boolean
  displayedItemsLength: number
  selectedIndex: number
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
  setQuery: React.Dispatch<React.SetStateAction<string>>
  setShowAll: React.Dispatch<React.SetStateAction<boolean>>
  hasMore: boolean
  onSelect?: (item: ListItem) => void
  displayedItems: ListItem[]
}) {
  useInput((input, key) => {
    if (searchable) {
      if (key.backspace || key.delete) {
        setQuery((q) => q.slice(0, -1))
        setSelectedIndex(0)
      } else if (input && !key.ctrl && !key.meta && input.length === 1 && input.match(/[a-zA-Z0-9 -]/)) {
        setQuery((q) => q + input)
        setSelectedIndex(0)
      }
    }

    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1))
    } else if (key.downArrow) {
      setSelectedIndex((i) => Math.min(displayedItemsLength - 1, i + 1))
    } else if (key.return && onSelect && displayedItems[selectedIndex]) {
      onSelect(displayedItems[selectedIndex])
    } else if (input === 'm' && hasMore) {
      setShowAll(true)
    }
  })

  return null
}

/**
 * Interactive searchable list with keyboard navigation
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
  maxDisplay = 15,
}: SearchableListProps) {
  const { isRawModeSupported } = useStdin()
  const isInteractive = isRawModeSupported

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showAll, setShowAll] = useState(false)

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

  // Paginate
  const displayLimit = showAll ? filteredItems.length : Math.min(maxDisplay, filteredItems.length)
  const displayedItems = filteredItems.slice(0, displayLimit)
  const hasMore = filteredItems.length > displayLimit

  // Keep selected index in bounds
  const safeIndex = Math.min(selectedIndex, Math.max(0, displayedItems.length - 1))

  return (
    <Box flexDirection="column">
      {/* Keyboard handler - only mount when interactive */}
      {isInteractive && (
        <KeyboardHandler
          searchable={searchable}
          displayedItemsLength={displayedItems.length}
          selectedIndex={selectedIndex}
          setSelectedIndex={setSelectedIndex}
          setQuery={setQuery}
          setShowAll={setShowAll}
          hasMore={hasMore}
          onSelect={onSelect}
          displayedItems={displayedItems}
        />
      )}

      {/* Title */}
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

      {/* List items */}
      <Box flexDirection="column">
        {displayedItems.map((item, index) => {
          const isSelected = isInteractive && index === safeIndex
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

        {/* Show more hint */}
        {hasMore && !showAll && (
          <Box marginTop={1}>
            <Text color={theme.muted} dimColor>
              +{filteredItems.length - displayLimit} more
              {isInteractive && ' — press '}
            </Text>
            {isInteractive && (
              <>
                <Text color={theme.accent}>m</Text>
                <Text color={theme.muted} dimColor> to show all</Text>
              </>
            )}
          </Box>
        )}
      </Box>

      {/* Help text - only show in interactive mode */}
      {isInteractive && (
        <Box marginTop={1}>
          <Text color={theme.muted} dimColor>
            ↑↓ navigate{onSelect ? ' • Enter select' : ''}{searchable ? ' • Type to filter' : ''}
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
