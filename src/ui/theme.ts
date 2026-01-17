/**
 * Dark Luxe Terminal Theme for Mina Bridge CLI
 * Optimized for terminal display with ANSI color support
 */

export const theme = {
  // Primary colors
  primary: '#7DD3FC',    // Sky blue - main accent
  secondary: '#A1A1AA',  // Gray - supporting text
  muted: '#71717A',      // Dark gray - disabled/placeholder

  // Status colors
  success: '#0ECC83',    // Green - completed/success
  error: '#F87171',      // Red - error/failed
  warning: '#FBBF24',    // Yellow - warning/pending

  // UI elements
  border: '#3F3F46',     // Border gray
  background: '#18181B', // Dark background

  // Additional colors for variety
  accent: '#E879F9',     // Purple accent
  info: '#38BDF8',       // Light blue info
} as const

export type ThemeColor = keyof typeof theme

/**
 * Unicode box-drawing characters for terminal UI
 */
export const borders = {
  // Single line box
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  horizontal: '─',
  vertical: '│',

  // Junctions
  leftT: '├',
  rightT: '┤',
  topT: '┬',
  bottomT: '┴',
  cross: '┼',

  // Double line (for emphasis)
  doubleHorizontal: '═',
  doubleVertical: '║',
  doubleTopLeft: '╔',
  doubleTopRight: '╗',
  doubleBottomLeft: '╚',
  doubleBottomRight: '╝',
} as const

/**
 * Status symbols for progress indicators
 */
export const symbols = {
  pending: '○',
  active: '→',
  completed: '✓',
  failed: '✗',
  spinner: '◐',
  bullet: '•',
  arrow: '›',
  check: '✔',
  cross: '✘',
  search: '⌕',
  star: '★',
} as const

/**
 * ASCII Art Logo for Mina Bridge
 */
export const MINA_LOGO = `
  __  __ ___ _   _    _
 |  \\/  |_ _| \\ | |  / \\
 | |\\/| || ||  \\| | / _ \\
 | |  | || || |\\  |/ ___ \\
 |_|  |_|___|_| \\_/_/   \\_\\
`

export const TAGLINE = 'Cross-chain bridge to Hyperliquid'
