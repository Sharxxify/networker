"use client"

import { useState, useEffect, useRef } from "react"
import { ArrowRight, ChevronUp, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useRouter, useSearchParams } from "next/navigation"
import * as htmlToImage from "html-to-image"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Message {
  id: string
  from: string
  to: string
  message: string
  timestamp: string
  status: "success" | "warning" | "error" | "info"
  messageId?: string
  callId?: string
  cellId?: string
}

interface MessageFlowProps {
  filters?: {
    search?: string
    callId?: string
    cellId?: string
    messageType?: string
    status?: string
  }
}

export function MessageFlow({ filters }: MessageFlowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [entities, setEntities] = useState<string[]>([])
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null)
  const [highlightedMessage, setHighlightedMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedLogId = searchParams.get("selectedLog")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [editingPage, setEditingPage] = useState(false)
  const [jumpPage, setJumpPage] = useState("")
  const diagramRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessageFlow()
    // Listen for route changes to reload data
    const handleFocus = () => loadMessageFlow()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [filters])

  useEffect(() => {
    if (selectedLogId) {
      console.log("Selected Log ID:", selectedLogId);
      // Don't set highlighted message when showing single message view
    }
  }, [selectedLogId])

  const loadMessageFlow = async () => {
    setLoading(true)
    try {
      const entries = await (window as any).electronAPI.getLogEntries({});
      if (entries.length === 0) {
        toast({
          title: "No data available",
          description: "Upload and parse some log files first to see message flow.",
        })
        setMessages([])
        // Set default entities for empty state with ECCB as central entity
        setEntities(["UE", "ECCB", "MAC", "PDCP", "S1AP", "MME", "X2AP", "eNB2", "Network"])
        return
      }

      // If a specific log is selected, show only that message
      let filteredEntries = entries;
      if (selectedLogId) {
        // Find the specific log entry by line number
        const selectedEntry = entries.find((e: any) => e.lineNumber.toString() === selectedLogId);
        if (selectedEntry) {
          filteredEntries = [selectedEntry];
          toast({
            title: "Single message view",
            description: "Showing only the selected message in the flow.",
          })
        } else {
          toast({
            title: "Message not found",
            description: "The selected message could not be found.",
            variant: "destructive",
          })
          setMessages([])
          setEntities(["ECCB"])
          setLoading(false)
          return
        }
      } else {
        // Apply filters if provided (only when not showing a single message)
        if (filters) {
          if (filters.callId && filters.callId !== "all") {
            filteredEntries = filteredEntries.filter((e: any) => e.callId === filters.callId);
          }
          if (filters.cellId && filters.cellId !== "all") {
            filteredEntries = filteredEntries.filter((e: any) => e.cellId === filters.cellId);
          }
          if (filters.messageType) {
            filteredEntries = filteredEntries.filter((e: any) => e.msgType === filters.messageType);
          }
          if (filters.status) {
            filteredEntries = filteredEntries.filter((e: any) => e.status === filters.status);
          }
          if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filteredEntries = filteredEntries.filter((e: any) =>
              (e.message && e.message.toLowerCase().includes(searchLower)) ||
              (e.msgType && e.msgType.toLowerCase().includes(searchLower))
            );
          }
        }
      }

      console.log("Raw entries:", entries) // Debug log
      console.log("Filtered entries:", filteredEntries) // Debug log

      // Convert log entries to message flow format with proper entity mapping
      // Only include lines successfully parsed by the main regex (not fallback-parsed lines)
      const flowMessages = filteredEntries
        .filter((entry: any) => entry.direction && entry.msgType && entry.msgName && entry.referenceBlock)
        .map((entry: any, index: number) => {
          // Map protocol names to the correct entity names based on your specifications
          const mapProtocolToEntity = (protocol: string) => {
            const upperProtocol = protocol.toUpperCase();
            switch (upperProtocol) {
              case "UE":
                return "UE"; // UE → UE (replaces RRC)
              case "S1AP":
                return "MME"; // S1AP → MME
              case "X2AP":
              case "S2AP":
                return "ENB2"; // X2AP/S2AP → ENB2
              case "PDCP":
              case "PDCB":
                return "PDCP"; // PDCB → PDCP
              case "GTP":
              case "GTPB":
                return "GTPB";
              case "RLC":
              case "RLCB":
                return "RLCB";
              case "MAC":
              case "MACB":
                return "MACB";
              default:
                return upperProtocol; // Keep normalized
            }
          };

          // Parse direction to determine from/to with ECCB as central entity
          let from = "ECCB";
          let to = "ECCB";

          if (entry.direction.includes("→")) {
            const parts = entry.direction.split("→");
            const fromEntity = parts[0].trim();
            const toEntity = parts[1].trim();
            
            // If ECCB is involved, it's always the central entity
            if (fromEntity.includes("ECCB") || toEntity.includes("ECCB")) {
              if (fromEntity.includes("ECCB")) {
                from = "ECCB";
                to = mapProtocolToEntity(toEntity);
              } else {
                from = mapProtocolToEntity(fromEntity);
                to = "ECCB";
              }
            } else {
              // If ECCB is not explicitly mentioned, assume it's the central entity
              from = mapProtocolToEntity(fromEntity);
              to = "ECCB";
            }
          } else if (entry.direction.includes("<=")) {
            // <= means message coming TO ECCB
            from = mapProtocolToEntity(entry.protocol || entry.msgType || "UE");
            to = "ECCB";
          } else if (entry.direction.includes("=>")) {
            // => means message going FROM ECCB
            from = "ECCB";
            to = mapProtocolToEntity(entry.protocol || entry.msgType || "UE");
          } else if (entry.direction === "Received") {
            from = mapProtocolToEntity(entry.msgType || "Network");
            to = "ECCB";
          } else if (entry.direction === "Transmitted") {
            from = "ECCB";
            to = mapProtocolToEntity(entry.msgType || "Network");
          } else {
            // Default fallback - assume ECCB is central
            from = "ECCB";
            to = mapProtocolToEntity(entry.msgType || "Unknown");
          }

          return {
            id: entry.lineNumber,
            from,
            to,
            // Show message name instead of message number
            message: entry.msgName || entry.message,
            timestamp: entry.timestamp || `Line ${entry.lineNumber}`,
            status: entry.status,
            messageId: entry.msgNum,
            callId: entry.callId,
            cellId: entry.cellId,
            // Add new fields for message details
            msgHexValue: entry.msgHexValue,
            state: entry.state,
            referenceBlock: entry.referenceBlock,
          }
        })

      console.log("Flow messages:", flowMessages) // Debug log

      // Extract unique entities from the log data with ECCB as central entity
      const dynamicEntities: string[] = [];
      
      // Always include ECCB first as the central entity
      dynamicEntities.push("ECCB");
      
      // Add other entities in order of appearance
      flowMessages.forEach((msg: any) => {
        if (msg.from !== "ECCB" && !dynamicEntities.includes(msg.from)) {
          dynamicEntities.push(msg.from);
        }
        if (msg.to !== "ECCB" && !dynamicEntities.includes(msg.to)) {
          dynamicEntities.push(msg.to);
        }
      });

      setMessages(flowMessages)
      setEntities(dynamicEntities)

      console.log('All message flow IDs:', flowMessages.map((m: any) => m.id));

      if (flowMessages.length > 0) {
        toast({
          title: "Message flow loaded",
          description: `Displaying ${flowMessages.length} messages across ${dynamicEntities.length} entities.`,
        })
      }
    } catch (error) {
      console.error("Failed to load message flow:", error)
      toast({
        title: "Error loading message flow",
        description: "Failed to load message flow from parsed data.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const cleanMessageName = (message: string) => {
    return message
      .replace(/^msg/, "")
      .replace(/STD/, "")
      .replace(/Rrc/, "RRC ")
      .replace(/Mac/, "MAC ")
      .replace(/Pdcp/, "PDCP ")
      .replace(/S1ap/, "S1AP ")
      .replace(/([a-z])([A-Z])/g, "$1 $2") // Add spaces between camelCase
      .trim()
  }

  const handleMessageClick = async (messageId: string) => {
    try {
      // Find the message details
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      // Check if we have the required fields for message dump lookup
      if (message.messageId && message.direction && message.message) {
        const api = typeof window !== "undefined" ? (window as any).electronAPI : undefined;
        if (api?.searchMessageDump) {
          // Determine direction for file naming
          const fileDirection = message.direction.includes("<=") ? "Rx" : "Tx";
          
          // Search for the dump file
          const dumpFile = await api.searchMessageDump({
            msgNum: message.messageId,
            direction: fileDirection,
            msgName: message.message,
            dumpDirectory: "" // Will use default from config
          });

          if (dumpFile && dumpFile.found) {
            toast({
              title: "Message dump found",
              description: `Found dump file: ${dumpFile.fileName}`,
            });
            
            // Open the dump file in a new window or display it
            // For now, redirect to log analysis with the message ID
            router.push(`/?selectedLog=${messageId}`);
          } else {
            toast({
              title: "Message dump not found",
              description: `No dump file found for message ${message.messageId}`,
              variant: "destructive",
            });
            
            // Still redirect to log analysis for the message details
            router.push(`/?selectedLog=${messageId}`);
          }
        } else {
          // Fallback: redirect to log analysis page
          router.push(`/?selectedLog=${messageId}`);
        }
      } else {
        // Fallback: redirect to log analysis page
        router.push(`/?selectedLog=${messageId}`);
      }
    } catch (error) {
      console.error("Error handling message click:", error);
      // Fallback: redirect to log analysis page
      router.push(`/?selectedLog=${messageId}`);
    }
  }

  console.log('Current highlightedMessage:', highlightedMessage);

  // Pagination logic
  const totalPages = Math.ceil(messages.length / pageSize)
  const paginatedMessages = messages.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const startIdx = messages.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endIdx = Math.min(currentPage * pageSize, messages.length)

  const exportImage = async () => {
    if (diagramRef.current) {
      const dataUrl = await htmlToImage.toPng(diagramRef.current)
      const link = document.createElement("a")
      link.download = "message-flow.png"
      link.href = dataUrl
      link.click()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading message flow from parsed data...</p>
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <ArrowRight className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Message Flow Available</h3>
            <p className="text-muted-foreground mb-4">
              Upload and parse some log files first to see the message flow visualization.
            </p>
            <Button onClick={loadMessageFlow}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {selectedLogId ? (
            <>Showing single message view</>
          ) : (
            <>Showing {messages.length} messages from your parsed log data</>
          )}
        </div>
        <div className="flex space-x-2">
          {selectedLogId && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                router.push('/')
              }}
            >
              ← Back to All Messages
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={loadMessageFlow}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportImage}>
            Export
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]" ref={diagramRef}>
          {/* Entity Headers */}
          <div className="flex justify-between mb-4">
            {entities.map((entity) => (
              <div key={entity} className="flex-1 text-center font-medium bg-secondary p-2 rounded-md mx-1">
                {entity}
              </div>
            ))}
          </div>

          {/* Vertical Lines */}
          <div className="relative">
            <div className="absolute top-0 bottom-0 left-0 right-0 flex justify-between pointer-events-none">
              {entities.map((entity, index) => (
                <div key={index} className="flex-1 flex justify-center">
                  <div className="w-0.5 h-full bg-border" />
                </div>
              ))}
            </div>

            {/* Messages */}
            <div className="space-y-8 py-4 relative">
              <TooltipProvider>
                {paginatedMessages.map((msg: Message, msgIndex: number) => {
                  const fromIdx = entities.indexOf(msg.from)
                  const toIdx = entities.indexOf(msg.to)

                  if (fromIdx === -1 || toIdx === -1) {
                    console.log(`Skipping message: ${msg.message}, from: ${msg.from}, to: ${msg.to}`)
                    return null
                  }

                  const isLeftToRight = fromIdx < toIdx
                  // When showing single message, no highlighting or fading needed
                  const isSingleMessage = selectedLogId !== null

                  // Calculate left positions for from and to entities (in %)
                  const fromCenter = ((fromIdx + 0.5) / entities.length) * 100
                  const toCenter = ((toIdx + 0.5) / entities.length) * 100
                  
                  const top = 16 // vertical offset for the arrow row

                  return (
                    <div key={`${msg.id}-${msgIndex}`} className="relative h-8 w-full" style={{ marginBottom: selectedMessage === msg.id ? "100px" : "16px", zIndex: selectedMessage === msg.id ? 10 : 1 }}>
                      {/* Message Arrow (SVG for pixel-perfect alignment) */}
                      <svg
                        className="absolute left-0 top-0"
                        style={{ width: '100%', height: '32px', pointerEvents: 'none' }}
                        width="100%" height="32"
                      >
                        <line
                          x1={`${fromCenter}%`} y1={top}
                          x2={`${toCenter}%`} y2={top}
                          stroke={
                            msg.status === "success"
                              ? "#22c55e"
                              : msg.status === "warning"
                                ? "#eab308"
                                : msg.status === "error"
                                  ? "#ef4444"
                                  : "#3b82f6"
                          }
                          strokeWidth="3"
                          opacity={1}
                        />
                        <defs>
                          <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto" markerUnits="strokeWidth">
                            <polygon points="0 0, 8 4, 0 8" fill={
                              msg.status === "success"
                                ? "#22c55e"
                                : msg.status === "warning"
                                  ? "#eab308"
                                  : msg.status === "error"
                                    ? "#ef4444"
                                    : "#3b82f6"
                            } />
                          </marker>
                        </defs>
                      </svg>

                      {/* Message Label (centered between from and to columns) */}
                      <div
                        className="absolute text-xs font-medium"
                        style={{
                          left: `${(fromCenter + toCenter) / 2}%`,
                          transform: "translateX(-50%) translateY(-20px)",
                          maxWidth: "200px",
                          textAlign: "center",
                        }}
                      >
                        <div className="truncate bg-background px-2 py-1 rounded border" title={msg.message}>
                          {msg.message}
                        </div>
                      </div>

                      {/* Arrowhead Button (interactive, at the end) */}
                      <div
                        className="absolute"
                        style={{
                          left: `${toCenter}%`,
                          top: `${top - 12}px`,
                          transform: "translateX(-50%)",
                          zIndex: 2,
                        }}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-6 w-6 rounded-full transition-all duration-200 ${
                                msg.status === "success"
                                  ? "bg-green-500 hover:bg-green-600"
                                  : msg.status === "warning"
                                    ? "bg-yellow-500 hover:bg-yellow-600"
                                    : msg.status === "error"
                                      ? "bg-red-500 hover:bg-red-600"
                                      : "bg-blue-500 hover:bg-blue-600"
                              } text-white`}
                              onClick={() => handleMessageClick(msg.id)}
                            >
                              {isLeftToRight ? (
                                <ArrowRight className="h-3 w-3" />
                              ) : (
                                <ArrowRight className="h-3 w-3 rotate-180" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">
                              {msg.from} → {msg.to}
                            </p>
                            <p>{msg.message}</p>
                            <p className="text-xs text-muted-foreground">{msg.timestamp}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Expanded Message Details */}
                      {selectedMessage === msg.id && (
                        <div
                          className="absolute bg-card border rounded-md p-4 shadow-lg z-20 w-80"
                          style={{
                            top: "40px",
                            left: `${(fromCenter + toCenter) / 2}%`,
                            transform: "translateX(-50%)",
                          }}
                        >
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-medium">Message Details</h4>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setSelectedMessage(null)}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="text-muted-foreground">From:</div>
                            <div className="font-medium">{msg.from}</div>
                            <div className="text-muted-foreground">To:</div>
                            <div className="font-medium">{msg.to}</div>
                            <div className="text-muted-foreground">Message:</div>
                            <div className="break-words col-span-2">{msg.message}</div>
                            <div className="text-muted-foreground">Timestamp:</div>
                            <div>{msg.timestamp}</div>
                            <div className="text-muted-foreground">Status:</div>
                            <div className="capitalize">{msg.status}</div>
                            {msg.messageId && (
                              <>
                                <div className="text-muted-foreground">Message ID:</div>
                                <div>{msg.messageId}</div>
                              </>
                            )}
                            {msg.callId && (
                              <>
                                <div className="text-muted-foreground">Call ID:</div>
                                <div>{msg.callId}</div>
                              </>
                            )}
                            {msg.cellId && (
                              <>
                                <div className="text-muted-foreground">Cell ID:</div>
                                <div>{msg.cellId}</div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>
      {/* Pagination Controls - match parsed logs style */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            {messages.length > 0 ? (
              <>
                Showing {startIdx} to {endIdx} of {messages.length} entries
              </>
            ) : (
              "No entries to display"
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Select
              value={pageSize.toString()}
              onValueChange={value => {
                setPageSize(Number(value))
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="20">20 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
                <SelectItem value="100">100 / page</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
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
                  max={totalPages}
                  autoFocus
                  value={jumpPage}
                  onChange={e => setJumpPage(e.target.value.replace(/[^0-9]/g, ""))}
                  onBlur={() => {
                    const page = Math.max(1, Math.min(totalPages, Number(jumpPage)))
                    if (jumpPage && Number(jumpPage) !== currentPage && Number(jumpPage) >= 1 && Number(jumpPage) <= totalPages) {
                      setCurrentPage(page)
                    }
                    setEditingPage(false)
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      const page = Math.max(1, Math.min(totalPages, Number(jumpPage)))
                      if (jumpPage && Number(jumpPage) !== currentPage && Number(jumpPage) >= 1 && Number(jumpPage) <= totalPages) {
                        setCurrentPage(page)
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
                    setJumpPage(currentPage.toString())
                  }}
                  title="Click to jump to page"
                >
                  {currentPage}
                </span>
              )}
              {" "}of {Math.max(1, totalPages)}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}