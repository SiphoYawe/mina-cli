/**
 * Refined Terminal Theme for Mina Bridge CLI
 * Luxurious dark theme optimized for terminal display
 */

export const theme = {
  // Primary palette - Cyber Luxe
  primary: '#7DD3FC',       // Cyan - main accent, bright and attention-grabbing
  primaryDim: '#38BDF8',    // Dimmer cyan for subtle accents
  secondary: '#94A3B8',     // Slate - refined supporting text
  muted: '#64748B',         // Subtle gray - disabled/placeholder

  // Status colors - Vivid & Clear
  success: '#10B981',       // Emerald - completed/success
  error: '#EF4444',         // Red - error/failed
  warning: '#F59E0B',       // Amber - warning/pending

  // UI elements
  border: '#334155',        // Slate border - more visible
  borderLight: '#475569',   // Lighter border for emphasis
  background: '#0F172A',    // Deep navy background

  // Accent colors for visual interest
  accent: '#A78BFA',        // Violet accent
  accentAlt: '#F472B6',     // Pink accent
  info: '#38BDF8',          // Light blue info
  highlight: '#22D3EE',     // Bright cyan for highlights

  // Gradient-like effects (text colors)
  gradientStart: '#7DD3FC',
  gradientEnd: '#A78BFA',
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

  // Round corners (softer look)
  roundTopLeft: '╭',
  roundTopRight: '╮',
  roundBottomLeft: '╰',
  roundBottomRight: '╯',

  // Heavy box (bold appearance)
  heavyHorizontal: '━',
  heavyVertical: '┃',
} as const

/**
 * Status symbols for progress indicators
 */
export const symbols = {
  // Status indicators
  pending: '○',
  active: '◆',
  completed: '✓',
  failed: '✗',

  // Navigation & UI
  bullet: '•',
  arrow: '›',
  arrowRight: '→',
  arrowLeft: '←',
  arrowUp: '↑',
  arrowDown: '↓',
  pointer: '▸',
  pointerFilled: '▶',

  // Checks & crosses
  check: '✔',
  cross: '✘',
  checkCircle: '◉',

  // Misc UI
  search: '⌕',
  star: '★',
  starEmpty: '☆',
  diamond: '◇',
  diamondFilled: '◆',
  circle: '●',
  circleEmpty: '○',
  square: '■',
  squareEmpty: '□',

  // Progress
  progressFull: '█',
  progressMid: '▓',
  progressLight: '░',

  // Separators
  dot: '·',
  pipe: '│',
  dash: '─',
} as const

/**
 * ASCII Art Logo for Mina Bridge
 * Geometric, modern design with proper alignment
 */
export const MINA_LOGO = `╔╦╗╦╔╗╔╔═╗
║║║║║║║╠═╣
╩ ╩╩╝╚╝╩ ╩`

export const MINA_LOGO_LARGE = `
███╗   ███╗██╗███╗   ██╗ █████╗
████╗ ████║██║████╗  ██║██╔══██╗
██╔████╔██║██║██╔██╗ ██║███████║
██║╚██╔╝██║██║██║╚██╗██║██╔══██║
██║ ╚═╝ ██║██║██║ ╚████║██║  ██║
╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝`

export const TAGLINE = 'Cross-chain bridge to Hyperliquid'

/**
 * Decorative elements
 */
export const decorations = {
  headerLine: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  dividerDot: '· · · · · · · · · · · · · · · · · · · ·',
  dividerDash: '─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─',
} as const
