"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

type ThemeProviderProps = {
  children: React.ReactNode
  attribute?: "class" | "data-theme"
  defaultTheme?: string
  enableSystem?: boolean
  storageKey?: string
}

/**
 * テーマプロバイダーコンポーネント
 * next-themesを使用してダーク/ライトモードを管理
 */
export const ThemeProvider = ({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  storageKey = "sd-ui-theme",
  ...props
}: ThemeProviderProps): React.ReactNode => (
  <NextThemesProvider
    attribute={attribute}
    defaultTheme={defaultTheme}
    enableSystem={enableSystem}
    storageKey={storageKey}
    {...props}
  >
    {children}
  </NextThemesProvider>
)
