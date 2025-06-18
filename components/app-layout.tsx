"use client"

import type React from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/sidebar"
import { Toaster } from "@/components/toaster"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full flex-col">
        <Navbar />
        <div className="flex flex-1 w-full overflow-hidden">
          <Sidebar />
          <main className="flex-1 w-full overflow-auto p-4">{children}</main>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  )
}
