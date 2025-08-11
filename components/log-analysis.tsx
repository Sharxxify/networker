"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Play, FileText, ArrowRight, ArrowLeft, Filter, RefreshCw, Upload, FolderOpen } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Type declaration for electronAPI
declare global {
  interface Window {
    electronAPI: any
  }
}

interface LogEntry {
  id: number
  fileId: number
  timestamp: string
  callId: string
  cellId: string
  msgType: string
  messageTypeId: string
  direction: string
  status: string
  message: string
  rawLine: string
  lineNumber: number
  messageNumber: string
  createdAt: string
}

interface MessageFlow {
  messageId: string
  direction: string
  source: string
  destination: string
  timestamp: string
  content?: string
}

export function LogAnalysis() {
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<LogEntry[]>([])
  const [messageFlow, setMessageFlow] = useState<MessageFlow[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [selectedFileId, setSelectedFileId] = useState<string>("")
  const [files, setFiles] = useState<any[]>([])
  
  // Filter states
  const [selectedDirection, setSelectedDirection] = useState<string>("all")
  const [selectedProtocols, setSelectedProtocols] = useState<string[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(false)
  
  const { toast } = useToast()
  const [externalMessagesDir, setExternalMessagesDir] = useState<string>("")

  // Load files on component mount
  useEffect(() => {
    loadFiles()
    
    // Test if electron API is working
    if (window.electronAPI) {
      window.electronAPI.getFiles().then((files: any) => {
        console.log('Files in database:', files)
      }).catch((err: any) => {
        console.error('Failed to get files:', err)
      })
    }
  }, [])

  const loadFiles = async () => {
    try {
      const data = await window.electronAPI.getFiles()
      setFiles(data)
      
      if (data.length === 0) {
        toast({
          title: "No files found",
          description: "No log files have been uploaded yet. Please upload some log files first.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error loading files",
        description: "Failed to load log files from database",
        variant: "destructive",
      })
    }
  }

  const loadLogEntries = useCallback(async (fileId: string) => {
    setIsLoading(true)
    try {
      const entries = await window.electronAPI.getLogEntries({ fileId })
      // Map database fields to interface fields
      const mappedEntries = entries.map((entry: any) => ({
        id: entry.id,
        fileId: entry.file_id,
        timestamp: entry.timestamp,
        callId: entry.call_id || entry.callId,
        cellId: entry.cell_id || entry.cellId,
        msgType: entry.message_type || entry.msgType,
        messageTypeId: entry.message_type_id || entry.messageTypeId,
        direction: entry.direction,
        status: entry.status,
        message: entry.message,
        rawLine: entry.raw_line || entry.rawLine,
        lineNumber: entry.line_number || entry.lineNumber,
        messageNumber: entry.message_number || entry.messageNumber,
        createdAt: entry.created_at || entry.createdAt
      }))
      setLogEntries(mappedEntries)
      setFilteredEntries(mappedEntries)
    } catch (error) {
      console.error('Error loading log entries:', error)
      toast({
        title: "Error",
        description: "Failed to load log entries.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedFileId) {
      loadLogEntries(selectedFileId)
    }
  }, [selectedFileId, loadLogEntries])

  const filterEntries = (source: LogEntry[]): LogEntry[] => {
    let filtered = source
    console.log('Applying filters with:', { selectedDirection, selectedProtocols, selectedStatus, totalEntries: source.length })

    // Filter by direction
    if (selectedDirection !== "all") {
      filtered = filtered.filter(entry => {
        if (!entry.direction) return false
        if (selectedDirection === "incoming") return entry.direction.includes("→ ECCB")
        if (selectedDirection === "outgoing") return entry.direction.includes("ECCB →")
        return true
      })
      console.log('After direction filter:', filtered.length, 'entries')
    }

    // Filter by protocols (strict equality, case-insensitive)
    if (selectedProtocols.length > 0) {
      const wanted = selectedProtocols.map(p => p.toUpperCase())
      filtered = filtered.filter(entry => {
        if (!entry.msgType) return false
        const entryMsgType = (entry.msgType || '').toUpperCase()
        const hasMatch = wanted.includes(entryMsgType)
        if (!hasMatch) {
          console.log('Filtered out entry (protocol):', { msgType: entry.msgType })
        }
        return hasMatch
      })
      console.log('After protocol filter:', filtered.length, 'entries')
    }

    // Filter by status (strict equality)
    if (selectedStatus !== "all") {
      filtered = filtered.filter(entry => (entry.status || '').toLowerCase() === selectedStatus.toLowerCase())
      console.log('After status filter:', filtered.length, 'entries')
    }

    console.log('Final filtered result:', filtered.length, 'entries')
    return filtered
  }

  const applyFilters = () => {
    setFilteredEntries(filterEntries(logEntries))
  }

  const analyzeMessageFlow = async () => {
    const working = filterEntries(logEntries)
    if (working.length === 0) {
      toast({
        title: "No entries to analyze",
        description: "Please select a log file and ensure it has entries to analyze.",
        variant: "destructive",
      })
      return
    }

    setIsAnalyzing(true)
    try {
      // Group entries by call ID to analyze message flow
      const callGroups = new Map<string, LogEntry[]>()

      working.forEach(entry => {
        const callId = entry.callId || 'unknown'
        if (!callGroups.has(callId)) {
          callGroups.set(callId, [])
        }
        callGroups.get(callId)!.push(entry)
      })

      // Create message flow visualization
      const flows: MessageFlow[] = []

      for (const [callId, entries] of callGroups.entries()) {
        // Sort entries by timestamp
        const sortedEntries = entries.sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )

        // Create flow entries
        for (let index = 0; index < sortedEntries.length; index++) {
          const entry = sortedEntries[index]
          let content: string | undefined = undefined
          const numericId = (entry.message || entry.messageNumber || '').toString()
          if (externalMessagesDir && /^\d+$/.test(numericId)) {
            try {
              content = await (window as any).electronAPI.readMessageFromDir({ baseDir: externalMessagesDir, messageTypeId: numericId })
            } catch {}
          }

          flows.push({
            messageId: `${callId}-${index + 1}`,
            direction: entry.direction || 'Unknown',
            source: entry.msgType || 'Unknown',
            destination: entry.direction && entry.direction.includes('→ ECCB') ? 'ECCB' : 'Network',
            timestamp: entry.timestamp,
            content: content || entry.message
          })
        }
      }

      setMessageFlow(flows)

      toast({
        title: "Analysis Complete",
        description: `Analyzed ${flows.length} messages across ${callGroups.size} call sessions.`,
      })
    } catch (error) {
      console.error('Analysis error:', error)
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze message flow. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleFileChange = (fileId: string) => {
    setSelectedFileId(fileId)
    if (fileId) {
      loadLogEntries(fileId)
    } else {
      setLogEntries([])
      setFilteredEntries([])
    }
  }

  const getDirectionIcon = (direction: string) => {
    if (!direction) {
      return <ArrowRight className="h-4 w-4 text-gray-500" />
    }
    
    if (direction.includes("→ ECCB")) {
      return <ArrowLeft className="h-4 w-4 text-blue-500" />
    } else {
      return <ArrowRight className="h-4 w-4 text-green-500" />
    }
  }

  const getStatusColor = (status: string) => {
    if (!status) {
      return "bg-gray-100 text-gray-800"
    }
    
    switch (status.toLowerCase()) {
      case "success": return "bg-green-100 text-green-800"
      case "error": return "bg-red-100 text-red-800"
      case "warning": return "bg-yellow-100 text-yellow-800"
      case "debug": return "bg-gray-100 text-gray-800"
      default: return "bg-blue-100 text-blue-800"
    }
  }

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              // Navigate back to main dashboard
              window.history.back()
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          Log Analysis & Message Flow
        </div>
      </div>

      {/* File Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Log File</CardTitle>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-6">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Log Files Available</h3>
              <p className="text-muted-foreground mb-4">
                No log files have been uploaded and parsed yet.
              </p>
              <div className="flex gap-2 justify-center">
                <Button 
                  onClick={() => loadFiles()} 
                  variant="outline"
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh Files
                </Button>
                <Button 
                  onClick={() => {
                    // Navigate to upload tab
                    const event = new CustomEvent('navigateToTab', { detail: 'upload' })
                    window.dispatchEvent(event)
                  }} 
                  variant="default"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Logs
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Select value={selectedFileId} onValueChange={handleFileChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a log file to analyze" />
                  </SelectTrigger>
                  <SelectContent>
                    {files.map((file) => (
                      <SelectItem key={file.id} value={file.id.toString()}>
                        {file.original_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={() => loadFiles()} 
                  variant="outline" 
                  size="icon"
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
                {selectedFileId && (
                  <Button 
                    onClick={() => loadLogEntries(selectedFileId)} 
                    variant="outline"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Load Entries
                      </>
                    )}
                  </Button>
                )}
              </div>
              
              {/* Status indicator */}
              <div className="text-sm text-muted-foreground">
                {selectedFileId ? (
                  <span>✅ File selected: {files.find(f => f.id.toString() === selectedFileId)?.original_name}</span>
                ) : (
                  <span>⚠️ Please select a log file above</span>
                )}
                {logEntries.length > 0 && (
                  <span className="ml-4">📊 {logEntries.length} log entries loaded</span>
                )}
              </div>
              
              {/* Debug info for protocols */}
              {logEntries.length > 0 && (
                <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
                  <div className="font-medium mb-1">Available Protocols in Data:</div>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(new Set(logEntries.map(e => e.msgType).filter(Boolean))).sort().map(protocol => (
                      <Badge key={protocol} variant="outline" className="text-xs">
                        {protocol}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Quick test button */}
              <Button 
                onClick={async () => {
                  try {
                    const testFiles = await window.electronAPI.getFiles()
                    alert(`Database test: Found ${testFiles.length} files`)
                  } catch (error) {
                    alert(`Database error: ${error}`)
                  }
                }}
                variant="outline"
                size="sm"
              >
                Test Database
              </Button>

              {/* Optional external message directory selection */}
              <div className="mt-4 flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    const dir = await (window as any).electronAPI.openDirectory()
                    if (dir) setExternalMessagesDir(dir)
                  }}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Choose Message Folder (optional)
                </Button>
                {externalMessagesDir && (
                  <span className="text-xs text-muted-foreground truncate">{externalMessagesDir}</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Direction Filter */}
            <div className="space-y-2">
              <Label>Direction</Label>
              <Select value={selectedDirection} onValueChange={setSelectedDirection}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Directions</SelectItem>
                  <SelectItem value="incoming">Incoming (→ ECCB)</SelectItem>
                  <SelectItem value="outgoing">Outgoing (ECCB →)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Protocol Filter */}
            <div className="space-y-2">
              <Label>Protocols</Label>
              <div className="text-xs text-muted-foreground mb-2">
                Select protocols to filter log entries. The filter will match any entry containing the selected protocol.
              </div>
              <div className="space-y-2">
                {["BE", "MME", "ENB2", "PDCP", "GTPB", "RLCB", "MACB"].map((protocol) => (
                  <div key={protocol} className="flex items-center space-x-2">
                    <Checkbox
                      id={protocol}
                      checked={selectedProtocols.includes(protocol)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedProtocols([...selectedProtocols, protocol])
                        } else {
                          setSelectedProtocols(selectedProtocols.filter(p => p !== protocol))
                        }
                      }}
                    />
                    <Label htmlFor={protocol} className="text-sm">{protocol}</Label>
                  </div>
                ))}
              </div>
              {selectedProtocols.length > 0 && (
                <div className="text-xs text-blue-600">
                  Selected: {selectedProtocols.join(', ')}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={applyFilters} variant="outline">
              Apply Filters
            </Button>
            <Button 
              onClick={() => {
                setSelectedDirection("all")
                setSelectedProtocols([])
                setSelectedStatus("all")
                setFilteredEntries(logEntries)
              }} 
              variant="outline"
            >
              Clear Filters
            </Button>
            
            <Button 
              onClick={() => {
                console.log('Current filter state:', {
                  selectedDirection,
                  selectedProtocols,
                  selectedStatus,
                  totalEntries: logEntries.length,
                  availableProtocols: Array.from(new Set(logEntries.map(e => e.msgType).filter(Boolean)))
                })
                toast({
                  title: "Filter Debug Info",
                  description: `Check console for detailed filter information. Available protocols: ${Array.from(new Set(logEntries.map(e => e.msgType).filter(Boolean))).join(', ')}`,
                })
              }}
              variant="outline"
              size="sm"
            >
              Debug Filters
            </Button>
            
            <Button 
              onClick={analyzeMessageFlow} 
              disabled={filteredEntries.length === 0 || isAnalyzing}
              variant="default"
            >
              {isAnalyzing ? "Analyzing..." : "Analyze Message Flow"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {filteredEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Filtered Entries ({filteredEntries.length} of {logEntries.length})
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {logEntries.length > 0 && (
                <div className="flex gap-4">
                  <span>Total entries: {logEntries.length}</span>
                  <span>Filtered: {filteredEntries.length}</span>
                  <span>With message IDs: {filteredEntries.filter(e => e.messageNumber).length}</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {filteredEntries
                  .filter(entry => entry.direction) // Only show entries with direction
                  .map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      {getDirectionIcon(entry.direction)}
                      {/* Only print the message type ID */}
                      <Badge variant="outline">{entry.message || entry.messageNumber || "N/A"}</Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{entry.msgType}</span>
                        <span className="text-sm text-muted-foreground">{entry.direction}</span>
                        <Badge className={getStatusColor(entry.status)}>{entry.status}</Badge>
                      </div>
                      {/* Show only the cleaned message name if available in DB (from parser's messageName) */}
                      <p className="text-sm text-muted-foreground truncate">{(entry as any).messageName || entry.message || entry.messageNumber || ""}</p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {entry.timestamp}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Message Flow Analysis */}
      {messageFlow.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Message Flow Analysis Results</CardTitle>
            <div className="text-sm text-muted-foreground">
              Showing {messageFlow.length} messages in chronological order
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {messageFlow.map((flow, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-sm">
                        {index + 1}
                      </Badge>
                      {getDirectionIcon(flow.direction)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium text-blue-600">{flow.source}</span>
                        <span className="text-sm text-gray-500">→</span>
                        <span className="text-sm text-gray-600">{flow.destination}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {flow.timestamp} • Call: {flow.messageId.split('-')[0]}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 