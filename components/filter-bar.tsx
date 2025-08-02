"use client"

import { useState, useEffect } from "react"
import { Search, Filter, RefreshCw, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

interface FilterOptions {
  callIds: string[]
  cellIds: string[]
  messageTypes: string[]
  statusTypes: string[]
}

interface FilterBarProps {
  onFiltersChange?: (filters: any) => void
}

export function FilterBar({ onFiltersChange }: FilterBarProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCallId, setSelectedCallId] = useState("all")
  const [selectedCellId, setSelectedCellId] = useState("all")
  const [selectedMessageType, setSelectedMessageType] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    callIds: [],
    cellIds: [],
    messageTypes: [],
    statusTypes: [],
  })
  const [loading, setLoading] = useState(false)

  // Load filter options from parsed data
  useEffect(() => {
    loadFilterOptions()
  }, [])

  // Trigger filter change whenever any filter value changes
  useEffect(() => {
    const filters = {
      search: searchTerm,
      callId: selectedCallId === "all" ? null : selectedCallId,
      cellId: selectedCellId === "all" ? null : selectedCellId,
      messageType: selectedMessageType === "all" ? null : selectedMessageType,
      status: selectedStatus === "all" ? null : selectedStatus,
    }
    onFiltersChange?.(filters)
  }, [searchTerm, selectedCallId, selectedCellId, selectedMessageType, selectedStatus])

  const loadFilterOptions = async () => {
    setLoading(true)
    try {
      const entries = await window.electronAPI.getLogEntries({});

      console.log("Loading filter options from", entries.length, "entries")

      // Extract unique values from parsed data
      const callIds = Array.from(new Set(entries.map((e: any) => e.callId).filter(Boolean))).sort() as string[]
      const cellIds = Array.from(new Set(entries.map((e: any) => e.cellId).filter(Boolean))).sort() as string[]
      const messageTypes = Array.from(new Set(entries.map((e: any) => e.msgType).filter(Boolean))).sort() as string[]
      const statusTypes = Array.from(new Set(entries.map((e: any) => e.status).filter(Boolean))).sort() as string[]

      console.log("Filter options:", {
        callIds,
        cellIds,
        messageTypes,
        statusTypes,
      })

      setFilterOptions({
        callIds,
        cellIds,
        messageTypes,
        statusTypes,
      })
    } catch (error) {
      console.error("Failed to load filter options:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleClearFilters = () => {
    setSearchTerm("")
    setSelectedCallId("all")
    setSelectedCellId("all")
    setSelectedMessageType("all")
    setSelectedStatus("all")
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (searchTerm) count++
    if (selectedCallId !== "all") count++
    if (selectedCellId !== "all") count++
    if (selectedMessageType !== "all") count++
    if (selectedStatus !== "all") count++
    return count
  }

  if (
    filterOptions.callIds.length === 0 &&
    filterOptions.cellIds.length === 0 &&
    filterOptions.messageTypes.length === 0 &&
    !loading
  ) {
    return (
      <Card className="p-4 text-center">
        <div className="flex flex-col items-center justify-center py-4">
          <Filter className="h-10 w-10 text-muted-foreground mb-2" />
          <h3 className="text-lg font-medium mb-2">No Filter Options Available</h3>
          <p className="text-muted-foreground mb-4">Upload and parse log files to enable filtering.</p>
          <Button onClick={loadFilterOptions} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading..." : "Refresh Filters"}
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Filter Log Data</h3>
        {getActiveFilterCount() > 0 && (
          <Badge variant="secondary">
            {getActiveFilterCount()} filter{getActiveFilterCount() > 1 ? "s" : ""} active
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by message, protocol, call ID, cell ID, or any log content..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <div className="absolute right-2 top-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4"
                onClick={() => setSearchTerm("")}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        <Select value={selectedCallId} onValueChange={setSelectedCallId}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Call ID" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Call IDs</SelectItem>
            {filterOptions.callIds.map((callId) => (
              <SelectItem key={callId} value={callId}>
                {callId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedCellId} onValueChange={setSelectedCellId}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Cell ID" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cell IDs</SelectItem>
            {filterOptions.cellIds.map((cellId) => (
              <SelectItem key={cellId} value={cellId}>
                {cellId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedMessageType} onValueChange={setSelectedMessageType}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Message Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {filterOptions.messageTypes.map((msgType) => (
              <SelectItem key={msgType} value={msgType}>
                {msgType}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {filterOptions.statusTypes.map((status) => (
              <SelectItem key={status} value={status}>
                <span className="capitalize">{status}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleClearFilters}>
          Clear
        </Button>
      </div>
    </div>
  )
}
