"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Upload, FileText, GitBranch, Filter, Terminal, AlertTriangle, Settings, HelpCircle } from "lucide-react"
import {
  Sidebar as SidebarComponent,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar"

export function Sidebar() {
  const pathname = usePathname()

  const menuItems = [
    {
      id: "upload-logs",
      label: "Upload Logs",
      icon: Upload,
      href: "/upload",
    },
    {
      id: "parsed-logs",
      label: "Parsed Logs",
      icon: FileText,
      href: "/",
    },
    {
      id: "message-flow",
      label: "Message Flow View",
      icon: GitBranch,
      href: "/message-flow",
    },
    {
      id: "filters",
      label: "Filters and Debugs",
      icon: Filter,
      href: "/filters",
    },
    {
      id: "error-detection",
      label: "Error Detection",
      icon: AlertTriangle,
      href: "/errors",
    },
  ]

  return (
    <SidebarComponent>
      <SidebarHeader className="flex items-center justify-center py-4">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
            4G
          </div>
          <span className="text-lg font-semibold">Log Analyzer</span>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton asChild isActive={pathname === item.href}>
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/settings">
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/help">
                <HelpCircle className="h-5 w-5" />
                <span>Help</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </SidebarComponent>
  )
}
