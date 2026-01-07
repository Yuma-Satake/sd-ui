import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Stable Diffusion WebUI",
  description: "Local Stable Diffusion image generation interface",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className="dark">
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  )
}
