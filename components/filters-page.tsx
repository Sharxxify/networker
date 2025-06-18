"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { X, Filter, Search, RefreshCw, FileText, Bug, Eye, Info, HelpCircle, Terminal } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface FilterState {
  callIds: string[]
  cellIds: string[]
  messageTypes: string[]
  timeRange: { start: string; end: string }
  statusTypes: string[]
}

interface FilterOptions {
  callIds: string[]
  cellIds: string[]
  messageTypes: string[]
  statusTypes: string[]
}

interface UploadedFile {
  id: number
  filename: string
  original_name: string
  file_size: number
  upload_status: string
  created_at: string
}

interface DebugPrint {
  id: string
  timestamp: string
  level: "debug" | "info" | "warning" | "error"
  message: string
  context: string
  lineNumber: number
}

export function FiltersPage() {
  const [allLogEntries, setAllLogEntries] = useState<any[]>([])
  const [messageTypes, setMessageTypes] = useState<string[]>([])
  const [statuses, setStatuses] = useState<string[]>([])
  const [selectedMessageType, setSelectedMessageType] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [startLogIdx, setStartLogIdx] = useState<number | null>(null)
  const [endLogIdx, setEndLogIdx] = useState<number | null>(null)

  useEffect(() => {
    loadAllLogEntries()
  }, [])

  const loadAllLogEntries = async () => {
    try {
      const entries = await (window as any).electronAPI.getLogEntries({})
      setAllLogEntries(entries || [])
      // Debug: print all loaded entries
      console.log('Loaded log entries:', entries)
      // Extract unique message types and statuses
      const msgTypes = (entries || []).map((e: any) => e.msgType).filter(Boolean)
      const statusTypes = (entries || []).map((e: any) => e.status).filter(Boolean)
      setMessageTypes([...new Set(msgTypes)] as string[])
      setStatuses([...new Set(statusTypes)] as string[])
    } catch (error) {
      setAllLogEntries([])
      setMessageTypes([])
      setStatuses([])
    }
  }

  // Filtered logs for display
  const isDebugPrint = (entry: any) => typeof entry.rawLine === "string" && entry.rawLine.toLowerCase().includes("debug")
  const filteredLogs = allLogEntries.filter((entry) => {
    let match = true
    if (selectedMessageType !== "all") {
      match = match && entry.msgType === selectedMessageType
    }
    if (selectedStatus !== "all") {
      match = match && entry.status === selectedStatus
    }
    if (searchTerm) {
      match = match && (
        (entry.message && entry.message.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (entry.rawLine && entry.rawLine.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }
    return match
  })

  // Debug prints between selected logs
  const debugPrintsBetween = () => {
    if (startLogIdx == null || endLogIdx == null) return []
    if (startLogIdx >= filteredLogs.length || endLogIdx >= filteredLogs.length) return []
    const from = Math.min(startLogIdx, endLogIdx)
    const to = Math.max(startLogIdx, endLogIdx)
    return filteredLogs.slice(from, to + 1).filter(isDebugPrint)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Filters & Debugs</h1>
        <p className="text-muted-foreground mt-2">
          View all logs, filter them, and find debug prints between any range of logs
        </p>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <Label>Message Type</Label>
          <Select value={selectedMessageType} onValueChange={setSelectedMessageType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {messageTypes.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <Label>Search</Label>
          <Input
            type="search"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Find Debug Prints Between Two Logs - Side by Side Layout */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Find Debug Prints Between Any Range of Logs</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Select a start and end log entry to see all debug-level log lines that occurred between them.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left: Log selection controls */}
            <div className="flex-1 min-w-[260px] max-w-[340px]">
              <div className="mb-2 text-muted-foreground text-sm">
                Select a <b>start</b> and <b>end</b> log entry below to see all debug-level log lines that occurred between them.
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block mb-1 font-medium">Start Log</label>
                  <TooltipProvider>
                    <Select value={startLogIdx !== null ? String(startLogIdx) : ""} onValueChange={(v) => setStartLogIdx(Number(v))}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select start log" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredLogs.map((entry, idx) => (
                          <Tooltip key={idx}>
                            <TooltipTrigger asChild>
                              <SelectItem value={String(idx)}>
                                #{idx + 1} | {entry.timestamp || "N/A"} | {entry.message?.slice(0, 30)}
                              </SelectItem>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="font-mono text-xs whitespace-pre-wrap">{entry.rawLine}</div>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </SelectContent>
                    </Select>
                  </TooltipProvider>
                </div>
                <div>
                  <label className="block mb-1 font-medium">End Log</label>
                  <TooltipProvider>
                    <Select value={endLogIdx !== null ? String(endLogIdx) : ""} onValueChange={(v) => setEndLogIdx(Number(v))}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select end log" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredLogs.map((entry, idx) => (
                          <Tooltip key={idx}>
                            <TooltipTrigger asChild>
                              <SelectItem value={String(idx)}>
                                #{idx + 1} | {entry.timestamp || "N/A"} | {entry.message?.slice(0, 30)}
                              </SelectItem>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="font-mono text-xs whitespace-pre-wrap">{entry.rawLine}</div>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </SelectContent>
                    </Select>
                  </TooltipProvider>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px bg-border mx-2" />

            {/* Right: Debug prints between logs */}
            <div className="flex-1 min-w-[260px]">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Terminal className="h-4 w-4 text-muted-foreground" /> Debug Prints
              </h4>
              {(startLogIdx !== null && endLogIdx !== null) ? (
                debugPrintsBetween().length > 0 ? (
                  <ScrollArea className="h-56">
                    <div className="space-y-1">
                      {debugPrintsBetween().map((debug, idx) => (
                        <div key={debug.id || idx} className="p-2 border rounded bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-xs text-muted-foreground">#{idx + 1}</span>
                                <span className="font-mono text-xs">{debug.timestamp || "N/A"}</span>
                                <Badge variant="outline" className="text-xs px-1.5 py-0">
                                  {debug.status}
                                </Badge>
                              </div>
                              <div className="text-sm break-words leading-relaxed">
                                {debug.message}
                              </div>
                              {debug.rawLine && (
                                <div className="font-mono text-xs text-muted-foreground mt-1 p-1 bg-background rounded border whitespace-pre-wrap">
                                  {debug.rawLine}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-muted-foreground text-xs mt-4">No debug prints found between the selected logs.</div>
                )
              ) : (
                <div className="text-muted-foreground text-xs mt-4">Select both a start and end log to view debug prints in between.</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* All Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            All Log Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {filteredLogs.length === 0 ? (
                <p className="text-muted-foreground">No log entries found. Upload and parse log files to see data here.</p>
              ) : (
                filteredLogs.map((entry, idx) => {
                  // Highlight if in selected range
                  let inRange = false
                  if (startLogIdx !== null && endLogIdx !== null) {
                    const from = Math.min(startLogIdx, endLogIdx)
                    const to = Math.max(startLogIdx, endLogIdx)
                    inRange = idx >= from && idx <= to
                  }
                  return (
                    <div
                      key={entry.id || idx}
                      className={`p-3 border rounded-lg bg-background ${inRange ? "bg-blue-500/10 border-blue-500" : ""}`}
                    >
                      {entry.rawLine && (
                        <div className="font-mono text-xs text-muted-foreground mb-1 whitespace-pre-wrap">
                          {entry.rawLine}
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-xs text-muted-foreground">#{idx + 1}</span>
                        <span className="font-mono text-xs">{entry.timestamp || "N/A"}</span>
                        <span className="font-semibold">{entry.msgType || ""}</span>
                        <span className="text-xs">{entry.status}</span>
                      </div>
                      <div className="mt-1 text-sm break-words">
                        {entry.message}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
