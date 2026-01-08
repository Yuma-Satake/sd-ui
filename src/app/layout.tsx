import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "Stable Diffusion WebUI",
  description: "Local Stable Diffusion image generation interface",
}

/**
 * ルートレイアウトコンポーネント
 */
export default function RootLayout({ children }: { children: React.ReactNode }): React.ReactNode {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="sd-ui-theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
