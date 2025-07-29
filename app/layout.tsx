import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Drug Pricing App',
  description: 'Modern drug pricing and shortage tracker',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta name="theme-color" content="#6D28D9" />
      </head>
      <body className={inter.className + ' overflow-x-hidden bg-gray-50'}>{children}</body>
    </html>
  )
}
