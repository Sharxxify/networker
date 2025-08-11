"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Wifi, WifiOff, Send, Download, Upload, Server, Monitor, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SocketMessage {
  id: string
  timestamp: string
  type: "log" | "analysis" | "command" | "response"
  data: any
  source: string
}

interface SocketConfig {
  host: string
  port: number
  protocol: "tcp" | "udp"
  mode: "client" | "server"
}

export function SocketCommunication() {
  const [isConnected, setIsConnected] = useState(false)
  const [socketConfig, setSocketConfig] = useState<SocketConfig>({
    host: "localhost",
    port: 8080,
    protocol: "tcp",
    mode: "client"
  })
  const [messages, setMessages] = useState<SocketMessage[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [receivedLogs, setReceivedLogs] = useState<string[]>([])
  const [autoProcess, setAutoProcess] = useState(false)
  
  const { toast } = useToast()
  const socketRef = useRef<any>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Remove socket message listeners
      window.electronAPI.removeAllListeners('socket:message')
    }
  }, [])

  // Initialize socket connection
  const initializeSocket = async () => {
    try {
      console.log('Initializing socket with config:', socketConfig)
      
      // Set up message listener first
      window.electronAPI.onSocketMessage((message: SocketMessage) => {
        console.log('Received socket message:', message)
        handleIncomingMessage(message)
      })

      if (socketConfig.mode === "server") {
        console.log('Starting server...')
        // Start server
        await window.electronAPI.startSocketServer({
          port: socketConfig.port,
          protocol: socketConfig.protocol
        })
        setIsConnected(true)
        toast({
          title: "Server started",
          description: `Listening on ${socketConfig.protocol.toUpperCase()} port ${socketConfig.port}`,
        })
      } else {
        console.log('Connecting as client...')
        // Connect as client
        await window.electronAPI.connectSocketClient({
          host: socketConfig.host,
          port: socketConfig.port,
          protocol: socketConfig.protocol
        })
        setIsConnected(true)
        toast({
          title: "Connected",
          description: `Connected to ${socketConfig.host}:${socketConfig.port}`,
        })
      }

    } catch (error) {
      console.error("Socket connection failed:", error)
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Failed to establish connection",
        variant: "destructive",
      })
    }
  }

  const disconnectSocket = async () => {
    try {
      await window.electronAPI.disconnectSocket()
      setIsConnected(false)
      // Remove message listeners
      window.electronAPI.removeAllListeners('socket:message')
      toast({
        title: "Disconnected",
        description: "Socket connection closed",
      })
    } catch (error) {
      console.error("Disconnect failed:", error)
    }
  }

  const handleIncomingMessage = (message: SocketMessage) => {
    setMessages(prev => [...prev, message])
    
    if (message.type === "log") {
      setReceivedLogs(prev => [...prev, message.data])
      
      if (autoProcess) {
        // Auto-process received logs
        processReceivedLog(message.data)
      }
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim()) return

    try {
      const message: SocketMessage = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: "command",
        data: inputMessage,
        source: socketConfig.mode
      }

      await window.electronAPI.sendSocketMessage(message)
      setMessages(prev => [...prev, message])
      setInputMessage("")
      
      toast({
        title: "Message sent",
        description: "Message sent successfully",
      })
    } catch (error) {
      console.error("Failed to send message:", error)
      toast({
        title: "Send failed",
        description: "Failed to send message",
        variant: "destructive",
      })
    }
  }

  const sendAnalysisResults = async (analysisData: any) => {
    try {
      const message: SocketMessage = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: "analysis",
        data: analysisData,
        source: socketConfig.mode
      }

      await window.electronAPI.sendSocketMessage(message)
      setMessages(prev => [...prev, message])
      
      toast({
        title: "Analysis sent",
        description: "Analysis results sent successfully",
      })
    } catch (error) {
      console.error("Failed to send analysis:", error)
      toast({
        title: "Send failed",
        description: "Failed to send analysis results",
        variant: "destructive",
      })
    }
  }

  const processReceivedLog = async (logData: string) => {
    try {
      // Process the received log data
      const result = await window.electronAPI.processLogData(logData)
      
      // Send processed results back
      await sendAnalysisResults(result)
      
      toast({
        title: "Log processed",
        description: "Received log processed and results sent",
      })
    } catch (error) {
      console.error("Failed to process log:", error)
    }
  }

  const exportMessages = () => {
    const dataStr = JSON.stringify(messages, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `socket-messages-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const clearMessages = () => {
    setMessages([])
    setReceivedLogs([])
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
          Network Communication
        </div>
      </div>

      {/* Connection Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isConnected ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-red-500" />}
            Socket Communication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select 
                value={socketConfig.mode} 
                onValueChange={(value: "client" | "server") => 
                  setSocketConfig(prev => ({ ...prev, mode: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      Client
                    </div>
                  </SelectItem>
                  <SelectItem value="server">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4" />
                      Server
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Protocol</Label>
              <Select 
                value={socketConfig.protocol} 
                onValueChange={(value: "tcp" | "udp") => 
                  setSocketConfig(prev => ({ ...prev, protocol: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tcp">TCP</SelectItem>
                  <SelectItem value="udp">UDP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Host</Label>
              <Input
                value={socketConfig.host}
                onChange={(e) => setSocketConfig(prev => ({ ...prev, host: e.target.value }))}
                placeholder="localhost"
                disabled={socketConfig.mode === "server"}
              />
            </div>

            <div className="space-y-2">
              <Label>Port</Label>
              <Input
                type="number"
                value={socketConfig.port}
                onChange={(e) => setSocketConfig(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                placeholder="8080"
              />
            </div>
          </div>

          <div className="flex gap-2">
            {!isConnected ? (
              <Button onClick={initializeSocket} className="flex items-center gap-2">
                {socketConfig.mode === "server" ? (
                  <>
                    <Server className="h-4 w-4" />
                    Start Server
                  </>
                ) : (
                  <>
                    <Wifi className="h-4 w-4" />
                    Connect
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={disconnectSocket} variant="destructive" className="flex items-center gap-2">
                <WifiOff className="h-4 w-4" />
                Disconnect
              </Button>
            )}
            <Button 
              onClick={() => {
                console.log('Testing electronAPI:', window.electronAPI)
                toast({
                  title: "Debug",
                  description: "Check console for electronAPI info",
                })
              }} 
              variant="outline" 
              size="sm"
            >
              Test API
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Message Sending */}
      <Card>
        <CardHeader>
          <CardTitle>Send Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Enter message to send..."
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <Button onClick={sendMessage} disabled={!isConnected} className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Send
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoProcess"
              checked={autoProcess}
              onChange={(e) => setAutoProcess(e.target.checked)}
            />
            <Label htmlFor="autoProcess">Auto-process received logs</Label>
          </div>
        </CardContent>
      </Card>

      {/* Received Logs */}
      {receivedLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Received Logs ({receivedLogs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {receivedLogs.map((log, index) => (
                  <div key={index} className="p-2 bg-muted rounded text-sm font-mono">
                    {log}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Message History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Message History ({messages.length})</span>
            <div className="flex gap-2">
              <Button onClick={exportMessages} variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={clearMessages} variant="outline" size="sm">
                Clear
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {messages.map((message) => (
                <div key={message.id} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{message.type}</Badge>
                    <span className="text-sm text-muted-foreground">{message.source}</span>
                    <span className="text-sm text-muted-foreground ml-auto">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-sm">
                    {typeof message.data === 'string' ? (
                      <p>{message.data}</p>
                    ) : (
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(message.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
} 