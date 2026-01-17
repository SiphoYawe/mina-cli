/**
 * Mina Bridge CLI UI Components
 *
 * Refined terminal components built with Ink
 * Featuring a luxurious dark theme with cyber aesthetics
 */

// Theme and constants
export {
  theme,
  borders,
  symbols,
  decorations,
  MINA_LOGO,
  MINA_LOGO_LARGE,
  TAGLINE,
  type ThemeColor,
} from './theme.js'

// Box component
export {
  Box,
  Divider,
  SectionBreak,
  type BoxProps,
  type DividerProps,
} from './Box.js'

// Header component
export {
  Header,
  Subheader,
  SectionDivider,
  type HeaderProps,
  type SubheaderProps,
} from './Header.js'

// Select component
export {
  Select,
  ChainSelect,
  TokenSelect,
  type SelectItem,
  type SelectProps,
  type ChainSelectItem,
  type TokenSelectItem,
} from './Select.js'

// Progress steps component
export {
  ProgressSteps,
  BridgeProgress,
  type Step,
  type StepStatus,
  type ProgressStepsProps,
} from './ProgressSteps.js'

// Spinner component
export {
  Spinner,
  Loading,
  InlineSpinner,
  type SpinnerProps,
  type SpinnerType,
} from './Spinner.js'

// Table component
export {
  Table,
  KeyValue,
  type Column,
  type TableProps,
} from './Table.js'

// Searchable list component
export {
  SearchableList,
  CompactList,
  type ListItem,
  type SearchableListProps,
} from './SearchableList.js'
