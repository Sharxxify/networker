"use client"

import { useState, useEffect } from "react"
import { X, FileText, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

interface MessageDetailsPanelProps {
  isOpen: boolean
  onClose: () => void
  messageNumber: string | null
  logEntry: any | null
}

export function MessageDetailsPanel({ isOpen, onClose, messageNumber, logEntry }: MessageDetailsPanelProps) {
  const [messageContent, setMessageContent] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && messageNumber) {
      loadMessageContent(messageNumber)
    }
  }, [isOpen, messageNumber])

  const loadMessageContent = async (msgNumber: string) => {
    setLoading(true)
    setError(null)
    try {
      // Try to read the message file from the messages directory
      const content = await (window as any).electronAPI.readMessageFile(`message_${msgNumber}.txt`)
      setMessageContent(content || "No message file found for this message number.")
    } catch (err) {
      setError("Failed to load message content")
      setMessageContent("")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-background border-l shadow-lg z-50">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <CardTitle className="text-lg">
              Message Details
              {messageNumber && (
                <span className="text-sm text-muted-foreground ml-2">
                  #{messageNumber}
                </span>
              )}
            </CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          {logEntry && (
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Log Entry</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Line:</span> {logEntry.lineNumber}
                  </div>
                  <div>
                    <span className="font-medium">Timestamp:</span> {logEntry.timestamp}
                  </div>
                  <div>
                    <span className="font-medium">Protocol:</span> {logEntry.msgType}
                  </div>
                  <div>
                    <span className="font-medium">Direction:</span> {logEntry.direction}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> {logEntry.status}
                  </div>
                  {logEntry.callId && (
                    <div>
                      <span className="font-medium">Call ID:</span> {logEntry.callId}
                    </div>
                  )}
                  {logEntry.cellId && (
                    <div>
                      <span className="font-medium">Cell ID:</span> {logEntry.cellId}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Message Content</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <span className="ml-2 text-sm text-muted-foreground">Loading message content...</span>
                </div>
              ) : error ? (
                <div className="flex items-center space-x-2 text-red-600 py-4">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              ) : (
                <ScrollArea className="h-64">
                  <pre className="text-sm font-mono whitespace-pre-wrap text-muted-foreground">
                    {messageContent}
                  </pre>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 