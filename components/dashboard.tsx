"use client"

import { useState, useCallback, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogTable } from "@/components/log-table"
import { MessageFlow } from "@/components/message-flow"
import { FilterBar } from "@/components/filter-bar"
import { TodoList } from "@/components/todo-list"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("table-view")
  const [filters, setFilters] = useState<any>({})
  const [hasData, setHasData] = useState(false)

  // Check if we have data on mount
  useEffect(() => {
    checkForData()
  }, [])

  const checkForData = async () => {
    try {
      const response = await (window as any).electronAPI.getLogEntries({})
      setHasData((response as any[]).length > 0)
    } catch (error) {
      console.error("Failed to check for data:", error)
    }
  }

  const handleFiltersChange = useCallback((newFilters: any) => {
    console.log("Filters applied:", newFilters)
    setFilters(newFilters)
  }, [])

  const getActiveFilterCount = () => {
    if (!filters) return 0
    return Object.values(filters).filter((value) => value && value !== "all" && value !== "").length
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Log Analysis</h2>
              {getActiveFilterCount() > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {getActiveFilterCount()} filter{getActiveFilterCount() > 1 ? "s" : ""} active
                </Badge>
              )}
            </div>
            <FilterBar onFiltersChange={handleFiltersChange} />
            <div className="mt-4">
              <LogTable filters={filters} />
            </div>
          </Card>
        </div>
        <div className="w-full lg:w-80">
          <TodoList />
        </div>
      </div>
    </div>
  )
}
