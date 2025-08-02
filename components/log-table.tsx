"use client"

import { useState, useEffect, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, ChevronRight, Search, RefreshCw, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRouter } from "next/navigation"
import { MessageDetailsPanel } from "@/components/message-details-panel"

interface LogEntry {
  id: string
  timestamp: string
  callId?: string
  cellId?: string
  msgType: string
  direction: string
  status: "success" | "warning" | "error" | "info"
  message: string
  messageId?: string
  protocol?: string
  lineNumber: number
  rawLine: string
  messageNumber?: string
}

interface LogTableProps {
  filters?: {
    search?: string
    callId?: string
    cellId?: string
    messageType?: string
    status?: string
  }
  selectedLog?: string | null
}

const columns: ColumnDef<LogEntry>[] = [
  {
    accessorKey: "lineNumber",
    header: "Line",
    cell: ({ row }) => <div className="w-16 text-center font-mono text-sm">{row.getValue("lineNumber")}</div>,
  },
  {
    accessorKey: "timestamp",
    header: "Timestamp",
    cell: ({ row }) => {
      const timestamp = row.getValue("timestamp") as string
      return <div className="font-mono text-sm">{timestamp || "N/A"}</div>
    },
  },
  {
    accessorKey: "messageId",
    header: "Msg ID",
    cell: ({ row }) => {
      const messageId = row.getValue("messageId") as string
      return <div className="w-16 text-center font-mono text-sm">{messageId || "N/A"}</div>
    },
  },
  {
    accessorKey: "callId",
    header: "Call ID",
    cell: ({ row }) => {
      const callId = row.getValue("callId") as string
      return <div className="font-mono text-sm">{callId || "N/A"}</div>
    },
  },
  {
    accessorKey: "cellId",
    header: "Cell ID",
    cell: ({ row }) => {
      const cellId = row.getValue("cellId") as string
      return <div className="font-mono text-sm">{cellId || "N/A"}</div>
    },
  },
  {
    accessorKey: "msgType",
    header: "Protocol",
    cell: ({ row }) => {
      const msgType = row.getValue("msgType") as string
      return <div className="font-semibold">{msgType}</div>
    },
  },
  {
    accessorKey: "direction",
    header: "Direction",
    cell: ({ row }) => {
      const direction = row.getValue("direction") as string
      return <div className="text-sm">{direction}</div>
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <div className="flex items-center">
          <div
            className={`mr-2 h-2 w-2 rounded-full ${
              status === "success"
                ? "bg-green-500"
                : status === "warning"
                  ? "bg-yellow-500"
                  : status === "error"
                    ? "bg-red-500"
                    : "bg-blue-500"
            }`}
          />
          <span className="capitalize text-sm">{status}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "message",
    header: "Message",
    cell: ({ row }) => {
      const message = row.getValue("message") as string
      const rawLine = row.original.rawLine
      return (
        <div className="max-w-md">
          <div className="truncate font-mono text-sm" title={message}>
            {message}
          </div>
          {rawLine && (
            <div className="text-xs text-muted-foreground mt-1 truncate" title={rawLine}>
              Raw: {rawLine}
            </div>
          )}
        </div>
      )
    },
  },
]

export function LogTable({ filters, selectedLog }: LogTableProps) {
  const [data, setData] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [globalFilter, setGlobalFilter] = useState("")
  const [errors, setErrors] = useState<string[]>([])
  const { toast } = useToast()
  const router = useRouter()
  const [jumpPage, setJumpPage] = useState("")
  const [editingPage, setEditingPage] = useState(false)
  
  // Side panel state
  const [isMessagePanelOpen, setIsMessagePanelOpen] = useState(false)
  const [selectedMessageNumber, setSelectedMessageNumber] = useState<string | null>(null)
  const [selectedLogEntry, setSelectedLogEntry] = useState<LogEntry | null>(null)

  // Apply filters to data
  const filteredData = useMemo(() => {
    let filtered = [...data]

    if (filters) {
      console.log("Applying filters:", filters)

      // Apply search filter
      if (filters.search) {
        filtered = filtered.filter(
          (entry) =>
            entry.message.toLowerCase().includes(filters.search!.toLowerCase()) ||
            entry.msgType.toLowerCase().includes(filters.search!.toLowerCase()) ||
            (entry.rawLine && entry.rawLine.toLowerCase().includes(filters.search!.toLowerCase())),
        )
      }

      // Apply call ID filter
      if (filters.callId) {
        filtered = filtered.filter((entry) => entry.callId === filters.callId)
      }

      // Apply cell ID filter
      if (filters.cellId) {
        filtered = filtered.filter((entry) => entry.cellId === filters.cellId)
      }

      // Apply message type filter
      if (filters.messageType) {
        filtered = filtered.filter((entry) => entry.msgType === filters.messageType)
      }

      // Apply status filter
      if (filters.status) {
        filtered = filtered.filter((entry) => entry.status === filters.status)
      }
    }

    console.log(`Filtered from ${data.length} to ${filtered.length} entries`)
    return filtered
  }, [data, filters])

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: "includesString",
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  const loadLogEntries = async () => {
    setLoading(true)
    setErrors([])
    try {
      const entries = await window.electronAPI.getLogEntries({});
      setData(entries)
      setErrors([])
      if (entries.length === 0) {
        toast({
          title: "No log entries found",
          description: "Upload and parse some log files to see data here.",
        })
      } else {
        toast({
          title: "Logs loaded successfully",
          description: `Loaded ${entries.length} log entries.`,
        })
      }
    } catch (error) {
      console.error("Error loading log entries:", error)
      toast({
        title: "Error loading logs",
        description: "Failed to load log entries. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogClick = (logEntry: LogEntry) => {
    if (logEntry.messageNumber) {
      setSelectedMessageNumber(logEntry.messageNumber)
      setSelectedLogEntry(logEntry)
      setIsMessagePanelOpen(true)
    } else {
      // Fallback to message flow if no message number
      router.push(`/message-flow?selectedLog=${logEntry.lineNumber}`)
    }
  }

  useEffect(() => {
    loadLogEntries()
  }, [])

  // Scroll to selected log when component mounts or selectedLog changes
  useEffect(() => {
    if (selectedLog && data.length > 0) {
      // Find the selected log entry
      const selectedEntry = data.find(entry => entry.lineNumber.toString() === selectedLog)
      if (selectedEntry) {
        // Highlight the selected entry by adding a CSS class or scroll to it
        const element = document.querySelector(`[data-line-number="${selectedEntry.lineNumber}"]`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    }
  }, [selectedLog, data])

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">Parsing Errors ({errors.length}):</div>
            <div className="text-sm space-y-1 max-h-32 overflow-y-auto">
              {errors.slice(0, 5).map((error, index) => (
                <div key={index} className="font-mono text-xs">
                  {error}
                </div>
              ))}
              {errors.length > 5 && <div className="text-xs">...and {errors.length - 5} more errors</div>}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search in table..."
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-8 w-[300px]"
            />
          </div>
          <Button variant="outline" size="icon" onClick={loadLogEntries} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredData.length} of {data.length} entries
          {filters && Object.values(filters).some((v) => v) && " (filtered)"}
          {selectedLog && (
            <span className="ml-2 text-blue-600 font-medium">
              • Selected log: {selectedLog}
            </span>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="font-semibold">
                    {header.isPlaceholder ? null : (
                      <div
                        className={header.column.getCanSort() ? "cursor-pointer select-none" : ""}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: " ↑",
                          desc: " ↓",
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow 
                  key={row.id} 
                  data-state={row.getIsSelected() && "selected"} 
                  data-line-number={row.original.lineNumber}
                  className={`hover:bg-muted/50 ${
                    selectedLog && row.original.lineNumber.toString() === selectedLog 
                      ? "bg-blue-50 border-l-4 border-l-blue-500" 
                      : ""
                  }`}
                  onClick={() => handleLogClick(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Loading log entries...
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      {data.length === 0
                        ? "No log entries found. Upload and parse log files to see data here."
                        : "No entries match the current filters."}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {filteredData.length > 0 ? (
            <>
              Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length,
              )}{" "}
              of {table.getFilteredRowModel().rows.length} entries
            </>
          ) : (
            "No entries to display"
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="text-sm">
            Page {" "}
            {editingPage ? (
              <input
                type="number"
                min={1}
                max={table.getPageCount()}
                autoFocus
                value={jumpPage}
                onChange={e => setJumpPage(e.target.value.replace(/[^0-9]/g, ""))}
                onBlur={() => {
                  const page = Math.max(1, Math.min(table.getPageCount(), Number(jumpPage)))
                  if (jumpPage && Number(jumpPage) !== table.getState().pagination.pageIndex + 1 && Number(jumpPage) >= 1 && Number(jumpPage) <= table.getPageCount()) {
                    table.setPageIndex(page - 1)
                  }
                  setEditingPage(false)
                }}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    const page = Math.max(1, Math.min(table.getPageCount(), Number(jumpPage)))
                    if (jumpPage && Number(jumpPage) !== table.getState().pagination.pageIndex + 1 && Number(jumpPage) >= 1 && Number(jumpPage) <= table.getPageCount()) {
                      table.setPageIndex(page - 1)
                    }
                    setEditingPage(false)
                  } else if (e.key === "Escape") {
                    setEditingPage(false)
                  }
                }}
                className="w-14 px-2 py-1 border rounded text-center text-sm mx-1"
              />
            ) : (
              <span
                className="cursor-pointer underline mx-1"
                onClick={() => {
                  setEditingPage(true)
                  setJumpPage((table.getState().pagination.pageIndex + 1).toString())
                }}
                title="Click to jump to page"
              >
                {table.getState().pagination.pageIndex + 1}
              </span>
            )}
            {" "}of {Math.max(1, table.getPageCount())}
          </div>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Message Details Side Panel */}
      <MessageDetailsPanel
        isOpen={isMessagePanelOpen}
        onClose={() => {
          setIsMessagePanelOpen(false)
          setSelectedMessageNumber(null)
          setSelectedLogEntry(null)
        }}
        messageNumber={selectedMessageNumber}
        logEntry={selectedLogEntry}
      />
    </div>
  )
}
