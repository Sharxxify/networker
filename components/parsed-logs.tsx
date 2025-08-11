"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Eye, 
  BarChart3, 
  ArrowLeft,
  RefreshCw,
  Database,
  FileSpreadsheet
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ParsedFile {
  id: string
  original_name: string
  file_size: number
  created_at: string
  parsed_entries?: number
  status: string
}

interface ParsedLogEntry {
  id: string
  timestamp: string
  callId: string
  cellId: string
  msgType: string
  direction: string
  status: string
  message: string
  messageNumber?: string
  lineNumber: number
}

export function ParsedLogs() {
  const [files, setFiles] = useState<ParsedFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string>("")
  const [logEntries, setLogEntries] = useState<ParsedLogEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<ParsedLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [protocolFilter, setProtocolFilter] = useState("all")
  const [directionFilter, setDirectionFilter] = useState("all")
  
  const { toast } = useToast()

  useEffect(() => {
    loadParsedFiles()
  }, [])

  useEffect(() => {
    if (selectedFile) {
      loadLogEntries(selectedFile)
    }
  }, [selectedFile])

  const loadParsedFiles = async () => {
    setIsLoading(true)
    try {
      const data = await window.electronAPI.getFiles()
      // Filter to show only files that have been parsed
      const parsedFiles = data.filter((file: any) => {
        // Check if file has log entries
        return true // For now, show all files
      })
      setFiles(parsedFiles)
    } catch (error) {
      console.error("Failed to load parsed files:", error)
      toast({
        title: "Error",
        description: "Failed to load parsed files",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadLogEntries = async (fileId: string) => {
    setIsLoading(true)
    try {
      const entries = await window.electronAPI.getLogEntries({ fileId })
      setLogEntries(entries)
      setFilteredEntries(entries)
      toast({
        title: "Success",
        description: `Loaded ${entries.length} log entries`,
      })
    } catch (error) {
      console.error("Failed to load log entries:", error)
      toast({
        title: "Error",
        description: "Failed to load log entries",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = logEntries

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(entry => 
        entry.message.toLowerCase().includes(searchLower) ||
        entry.msgType.toLowerCase().includes(searchLower) ||
        entry.callId.toLowerCase().includes(searchLower) ||
        entry.cellId.toLowerCase().includes(searchLower)
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(entry => entry.status === statusFilter)
    }

    // Protocol filter
    if (protocolFilter !== "all") {
      filtered = filtered.filter(entry => entry.msgType === protocolFilter)
    }

    // Direction filter
    if (directionFilter !== "all") {
      if (directionFilter === "incoming") {
        filtered = filtered.filter(entry => entry.direction.includes("→ ECCB"))
      } else if (directionFilter === "outgoing") {
        filtered = filtered.filter(entry => entry.direction.includes("ECCB →"))
      }
    }

    setFilteredEntries(filtered)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setProtocolFilter("all")
    setDirectionFilter("all")
    setFilteredEntries(logEntries)
  }

  const exportLogEntries = () => {
    const dataStr = JSON.stringify(filteredEntries, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `parsed-logs-${selectedFile}-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast({
      title: "Exported",
      description: "Log entries exported successfully",
    })
  }

  const deleteFile = async (fileId: string) => {
    try {
      await window.electronAPI.deleteFile({ fileId })
      toast({
        title: "Deleted",
        description: "File deleted successfully",
      })
      loadParsedFiles()
      if (selectedFile === fileId) {
        setSelectedFile("")
        setLogEntries([])
        setFilteredEntries([])
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success": return "bg-green-100 text-green-800"
      case "error": return "bg-red-100 text-red-800"
      case "warning": return "bg-yellow-100 text-yellow-800"
      case "debug": return "bg-gray-100 text-gray-800"
      default: return "bg-blue-100 text-blue-800"
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getUniqueProtocols = () => {
    const protocols = new Set(logEntries.map(entry => entry.msgType))
    return Array.from(protocols).sort()
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
              window.history.back()
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          Parsed Logs Management
        </div>
      </div>

      {/* File Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Parsed Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Select value={selectedFile} onValueChange={setSelectedFile}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a parsed file to view" />
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
              onClick={loadParsedFiles} 
              variant="outline" 
              size="icon"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      {selectedFile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search messages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
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

              <div className="space-y-2">
                <label className="text-sm font-medium">Protocol</label>
                <Select value={protocolFilter} onValueChange={setProtocolFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Protocols</SelectItem>
                    {getUniqueProtocols().map(protocol => (
                      <SelectItem key={protocol} value={protocol}>{protocol}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Direction</label>
                <Select value={directionFilter} onValueChange={setDirectionFilter}>
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
            </div>

            <div className="flex gap-2">
              <Button onClick={applyFilters} className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Apply Filters
              </Button>
              <Button onClick={clearFilters} variant="outline">
                Clear Filters
              </Button>
              <Button onClick={exportLogEntries} variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log Entries */}
      {selectedFile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Log Entries ({filteredEntries.length} of {logEntries.length})
              </div>
              <div className="text-sm text-muted-foreground">
                {logEntries.length > 0 && (
                  <div className="flex gap-4">
                    <span>Total: {logEntries.length}</span>
                    <span>Filtered: {filteredEntries.length}</span>
                    <span>With message IDs: {logEntries.filter(e => e.messageNumber).length}</span>
                  </div>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {filteredEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center space-x-4 p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      {entry.messageNumber && (
                        <Badge variant="outline" className="font-mono">
                          {entry.messageNumber}
                        </Badge>
                      )}
                      <Badge className={getStatusColor(entry.status)}>
                        {entry.status}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium truncate">{entry.message}</p>
                        <span className="text-xs text-muted-foreground">{entry.timestamp}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <span>{entry.msgType}</span>
                        <span>•</span>
                        <span>{entry.direction}</span>
                        <span>•</span>
                        <span>{entry.callId}</span>
                        <span>•</span>
                        <span>{entry.cellId}</span>
                        <span>•</span>
                        <span>Line {entry.lineNumber}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* File Management */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>File Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium truncate">{file.original_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-red-500 hover:text-red-700"
                    onClick={() => deleteFile(file.id.toString())}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedFile && files.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Parsed Files</h3>
              <p className="text-muted-foreground mb-4">
                Upload and parse some log files first to view them here.
              </p>
              <Button onClick={loadParsedFiles}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 