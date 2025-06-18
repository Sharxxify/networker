"use client"

import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Upload, Bell, Settings } from "lucide-react"

export function Navbar() {
  return (
    <header className="sticky top-0 z-10 flex h-14 w-full items-center border-b bg-background px-4 lg:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <h1 className="text-lg font-semibold">4G Log Analyzer</h1>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Upload Log
        </Button>
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
        <ModeToggle />
      </div>
    </header>
  )
}
