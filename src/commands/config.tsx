import React, { useState, useEffect } from 'react'
import { Box, Text, useApp } from 'ink'
import {
  Header,
  Table,
  theme,
  symbols,
  Box as StyledBox,
  type Column,
} from '../ui/index.js'
import {
  getConfig,
  getConfigValue,
  setConfig,
  getConfigList,
  parseValue,
  isValidKey,
  getConfigPath,
} from '../lib/config.js'

/**
 * Config command action types
 */
type ConfigAction = 'list' | 'get' | 'set' | 'path'

/**
 * Props for the ConfigCommand component
 */
interface ConfigCommandProps {
  action?: ConfigAction
  key?: string
  value?: string
}

/**
 * Config row type for table display
 */
interface ConfigRow {
  setting: string
  value: string
  isDefault: boolean
}

/**
 * List all configuration values
 */
function ConfigList() {
  const { exit } = useApp()
  const [items, setItems] = useState<ConfigRow[]>([])

  useEffect(() => {
    const configItems = getConfigList()
    setItems(
      configItems.map((item) => ({
        setting: item.key,
        value: item.value,
        isDefault: item.isDefault,
      }))
    )
    // Exit after rendering
    setTimeout(() => exit(), 100)
  }, [exit])

  const columns: Column<ConfigRow>[] = [
    {
      header: 'Setting',
      accessor: 'setting',
      headerColor: theme.primary,
      cellColor: theme.secondary,
    },
    {
      header: 'Value',
      accessor: 'value',
      headerColor: theme.primary,
      cellColor: (value, row) =>
        row.isDefault ? theme.muted : theme.success,
    },
  ]

  return (
    <Box flexDirection="column" padding={1}>
      <Header compact showTagline={false} />

      <Box marginBottom={1}>
        <Text color={theme.secondary}>
          {symbols.arrow} Configuration Settings
        </Text>
      </Box>

      <Table data={items} columns={columns} bordered borderColor={theme.border} />

      <Box marginTop={1}>
        <Text color={theme.muted} dimColor>
          Values in gray are defaults. Use 'mina config set &lt;key&gt; &lt;value&gt;' to customize.
        </Text>
      </Box>
    </Box>
  )
}

/**
 * Get a single configuration value
 */
function ConfigGet({ configKey }: { configKey: string }) {
  const { exit } = useApp()
  const [value, setValue] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isValidKey(configKey)) {
      setError(`Unknown config key: ${configKey}`)
    } else {
      const val = getConfigValue(configKey)
      setValue(val === undefined || val === null ? '(not set)' : String(val))
    }
    setTimeout(() => exit(), 100)
  }, [configKey, exit])

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Header compact showTagline={false} />
        <Box>
          <Text color={theme.error}>{symbols.failed} {error}</Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Header compact showTagline={false} />
      <Box>
        <Text color={theme.secondary}>{configKey}</Text>
        <Text color={theme.muted}> = </Text>
        <Text color={theme.primary}>{value}</Text>
      </Box>
    </Box>
  )
}

/**
 * Set a configuration value
 */
function ConfigSet({ configKey, configValue }: { configKey: string; configValue: string }) {
  const { exit } = useApp()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsedValue, setParsedValue] = useState<string | number | boolean | null>(null)

  useEffect(() => {
    if (!isValidKey(configKey)) {
      setError(`Unknown config key: ${configKey}`)
    } else {
      try {
        const parsed = parseValue(configValue)
        setParsedValue(parsed)
        setConfig(configKey, parsed)
        setSuccess(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to set value')
      }
    }
    setTimeout(() => exit(), 100)
  }, [configKey, configValue, exit])

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Header compact showTagline={false} />
        <Box>
          <Text color={theme.error}>{symbols.failed} {error}</Text>
        </Box>
      </Box>
    )
  }

  if (success) {
    return (
      <Box flexDirection="column" padding={1}>
        <Header compact showTagline={false} />
        <Box>
          <Text color={theme.success}>{symbols.completed} </Text>
          <Text color={theme.secondary}>Set </Text>
          <Text color={theme.primary}>{configKey}</Text>
          <Text color={theme.muted}> = </Text>
          <Text color={theme.success}>{String(parsedValue)}</Text>
        </Box>
      </Box>
    )
  }

  return null
}

/**
 * Show config file path
 */
function ConfigPath() {
  const { exit } = useApp()

  useEffect(() => {
    setTimeout(() => exit(), 100)
  }, [exit])

  return (
    <Box flexDirection="column" padding={1}>
      <Header compact showTagline={false} />
      <Box>
        <Text color={theme.muted}>Config file: </Text>
        <Text color={theme.secondary}>{getConfigPath()}</Text>
      </Box>
    </Box>
  )
}

/**
 * Show config help/usage
 */
function ConfigHelp() {
  const { exit } = useApp()

  useEffect(() => {
    setTimeout(() => exit(), 100)
  }, [exit])

  return (
    <Box flexDirection="column" padding={1}>
      <Header compact showTagline={false} />

      <StyledBox bordered title="Config Usage" padding={1}>
        <Box flexDirection="column">
          <Text color={theme.secondary}>mina config list</Text>
          <Text color={theme.muted}>  Show all settings</Text>
          <Text> </Text>

          <Text color={theme.secondary}>mina config get &lt;key&gt;</Text>
          <Text color={theme.muted}>  Show single value</Text>
          <Text> </Text>

          <Text color={theme.secondary}>mina config set &lt;key&gt; &lt;value&gt;</Text>
          <Text color={theme.muted}>  Set a value</Text>
          <Text> </Text>

          <Text color={theme.secondary}>mina config path</Text>
          <Text color={theme.muted}>  Show config file location</Text>
        </Box>
      </StyledBox>

      <Box marginTop={1}>
        <StyledBox bordered title="Available Settings" padding={1}>
          <Box flexDirection="column">
            <Box>
              <Text color={theme.primary} bold>slippage</Text>
              <Text color={theme.muted}> - Default slippage tolerance (e.g., 0.5)</Text>
            </Box>
            <Box>
              <Text color={theme.primary} bold>autoDeposit</Text>
              <Text color={theme.muted}> - Auto-deposit to Hyperliquid (true/false)</Text>
            </Box>
            <Box>
              <Text color={theme.primary} bold>defaultChain</Text>
              <Text color={theme.muted}> - Default source chain (e.g., arbitrum)</Text>
            </Box>
            <Box>
              <Text color={theme.primary} bold>rpc.&lt;chain&gt;</Text>
              <Text color={theme.muted}> - Custom RPC URL for a chain</Text>
            </Box>
          </Box>
        </StyledBox>
      </Box>

      <Box marginTop={1}>
        <StyledBox bordered title="Examples" padding={1}>
          <Box flexDirection="column">
            <Text color={theme.secondary}>mina config set slippage 0.5</Text>
            <Text color={theme.secondary}>mina config set autoDeposit false</Text>
            <Text color={theme.secondary}>mina config set rpc.arbitrum https://arb1.example.com</Text>
            <Text color={theme.secondary}>mina config get slippage</Text>
          </Box>
        </StyledBox>
      </Box>
    </Box>
  )
}

/**
 * Main Config command component
 */
export function ConfigCommand({ action, key: configKey, value }: ConfigCommandProps) {
  // Determine what to render based on action
  switch (action) {
    case 'list':
      return <ConfigList />

    case 'get':
      if (!configKey) {
        return <ConfigHelp />
      }
      return <ConfigGet configKey={configKey} />

    case 'set':
      if (!configKey || value === undefined) {
        return <ConfigHelp />
      }
      return <ConfigSet configKey={configKey} configValue={value} />

    case 'path':
      return <ConfigPath />

    default:
      // No action or unknown action - show help
      return <ConfigHelp />
  }
}

/**
 * Config command handler for commander
 */
export async function configCommand(
  action?: string,
  key?: string,
  value?: string
): Promise<void> {
  const { render } = await import('ink')
  const React = await import('react')

  render(
    React.createElement(ConfigCommand, {
      action: action as ConfigAction,
      key: key,
      value: value,
    })
  )
}

export default ConfigCommand
