"use client"

import { useState, useEffect } from "react"
import { ArrowRight, ChevronUp, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useRouter, useSearchParams } from "next/navigation"

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
      setHighlightedMessage(selectedLogId)
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
        // Set default entities for empty state
        setEntities(["UE", "RRC", "MAC", "PDCP", "eNB", "S1AP", "MME", "HSS", "SGW", "PGW", "Network"])
        return
      }

      // Apply filters if provided
      let filteredEntries = entries;
      if (filters) {
        if (filters.callId) {
          filteredEntries = filteredEntries.filter((e: any) => e.callId === filters.callId);
        }
        if (filters.cellId) {
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

      console.log("Raw entries:", entries) // Debug log
      console.log("Filtered entries:", filteredEntries) // Debug log

      // Always use the five main entities as columns
      const fixedEntities = ["UE", "RRC", "eNB", "S1AP", "Network"];

      // Helper to map any entity to the closest main entity
      const mapToMainEntity = (entity: string) => {
        if (!entity) return "Network";
        const normalized = entity.trim().toUpperCase();
        if (normalized.includes("UE")) return "UE";
        if (normalized.includes("RRC")) return "RRC";
        if (normalized.includes("ENB")) return "eNB";
        if (normalized.includes("S1AP")) return "S1AP";
        if (normalized.includes("NETWORK")) return "Network";
        return "Network";
      };

      // Convert log entries to message flow format, mapping from/to to main entities
      const flowMessages = filteredEntries
        .filter((entry: any) => entry.direction && entry.msgType)
        .map((entry: any, index: number) => {
          // Parse direction to determine from/to
          let from = "UE"
          let to = "eNB"

          // Better direction parsing
          if (entry.direction.includes("→")) {
            const parts = entry.direction.split("→")
            from = parts[0].trim()
            to = parts[1].trim()
          } else if (entry.direction.includes("<=")) {
            from = "UE"
            to = entry.msgType || "eNB"
          } else if (entry.direction.includes("=>")) {
            from = entry.msgType || "eNB"
            to = "UE"
          } else if (entry.direction === "Received") {
            from = "Network"
            to = entry.msgType || "UE"
          } else if (entry.direction === "Transmitted") {
            from = entry.msgType || "UE"
            to = "Network"
          } else {
            // Default fallback
            from = entry.msgType || "Unknown"
            to = "Network"
          }

          // Map to main entities
          from = mapToMainEntity(from);
          to = mapToMainEntity(to);

          return {
            id: entry.lineNumber,
            from,
            to,
            message: cleanMessageName(entry.message),
            timestamp: entry.timestamp || `Line ${entry.lineNumber}`,
            status: entry.status,
            messageId: entry.messageId,
            callId: entry.callId,
            cellId: entry.cellId,
          }
        })
        .slice(0, 15) // Limit to first 15 messages for better visualization

      console.log("Flow messages:", flowMessages) // Debug log

      // Extract unique entities and order them logically
      const allEntities = new Set<string>()
      flowMessages.forEach((msg: any) => {
        allEntities.add(msg.from)
        allEntities.add(msg.to)
      })

      // Order entities in typical 4G flow
      const orderedEntities = [
        "UE",
        "RRC",
        "MAC",
        "PDCP",
        "eNB",
        "S1AP",
        "MME",
        "HSS",
        "SGW",
        "PGW",
        "Network",
      ].filter((e) => allEntities.has(e))

      // Add any remaining entities
      Array.from(allEntities).forEach((entity) => {
        if (!orderedEntities.includes(entity)) {
          orderedEntities.push(entity)
        }
      })

      console.log("Entities:", orderedEntities) // Debug log

      setMessages(flowMessages)
      setEntities(fixedEntities)

      console.log('All message flow IDs:', flowMessages.map((m: any) => m.id));

      if (flowMessages.length > 0) {
        toast({
          title: "Message flow loaded",
          description: `Displaying ${flowMessages.length} messages across ${orderedEntities.length} entities.`,
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

  const handleMessageClick = (messageId: string) => {
    setHighlightedMessage(highlightedMessage === messageId ? null : messageId)
  }

  console.log('Current highlightedMessage:', highlightedMessage);

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
          Showing {messages.length} messages from your parsed log data
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={loadMessageFlow}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            Export
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
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
                {messages.map((msg: Message, msgIndex: number) => {
                  const fromIdx = entities.indexOf(msg.from)
                  const toIdx = entities.indexOf(msg.to)

                  if (fromIdx === -1 || toIdx === -1) {
                    console.log(`Skipping message: ${msg.message}, from: ${msg.from}, to: ${msg.to}`)
                    return null
                  }

                  const isLeftToRight = fromIdx < toIdx
                  const isHighlighted = String(highlightedMessage) === String(msg.id)
                  const isFaded = highlightedMessage && !isHighlighted

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
                          opacity={isFaded ? 0.3 : 1}
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
                        className={`absolute text-xs font-medium transition-opacity duration-200 ${isFaded ? "opacity-30" : ""} ${isHighlighted ? "opacity-100" : ""}`}
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
                              } text-white ${isFaded ? "opacity-30" : ""} ${isHighlighted ? "opacity-100 scale-110" : ""}`}
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
    </div>
  )
}