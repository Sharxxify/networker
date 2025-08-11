"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { FileText, Folder, Trash2, RefreshCw, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface MessageFile {
  id: string
  content: string
  exists: boolean
}

export function MessageFileViewer() {
  const [messageTypes, setMessageTypes] = useState<string[]>([])
  const [selectedMessage, setSelectedMessage] = useState<MessageFile | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    loadMessageTypes()
  }, [])

  const loadMessageTypes = async () => {
    setLoading(true)
    try {
      const types = await (window as any).electronAPI.listMessageTypes()
      setMessageTypes(types)
    } catch (error) {
      console.error('Error loading message types:', error)
      toast({
        title: "Error",
        description: "Failed to load message types",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadMessageContent = async (messageTypeId: string) => {
    try {
      const content = await (window as any).electronAPI.readMessageFile(messageTypeId)
      const exists = await (window as any).electronAPI.messageFileExists(messageTypeId)
      
      setSelectedMessage({
        id: messageTypeId,
        content: content || "Message file not found",
        exists
      })
    } catch (error) {
      console.error('Error loading message content:', error)
      toast({
        title: "Error",
        description: "Failed to load message content",
        variant: "destructive",
      })
    }
  }

  const deleteMessageFile = async (messageTypeId: string) => {
    try {
      const success = await (window as any).electronAPI.deleteMessageFile(messageTypeId)
      if (success) {
        toast({
          title: "Success",
          description: `Message file ${messageTypeId} deleted successfully`,
        })
        loadMessageTypes()
        if (selectedMessage?.id === messageTypeId) {
          setSelectedMessage(null)
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to delete message file",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting message file:', error)
      toast({
        title: "Error",
        description: "Failed to delete message file",
        variant: "destructive",
      })
    }
  }

  const formatMessageContent = (content: string) => {
    return content.split('\n').map((line, index) => (
      <div key={index} className="text-sm">
        {line}
      </div>
    ))
  }

  return (
    <div className="space-y-4">
      {/* Back Button */}
      <div className="flex items-center">
        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex h-full gap-4">
        {/* Message Types List */}
        <Card className="w-1/3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              Message Types
              <Button
                variant="ghost"
                size="sm"
                onClick={loadMessageTypes}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {messageTypes.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Folder className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No message types found</p>
                  <p className="text-sm">Upload and parse log files to generate message files</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {messageTypes.map((typeId) => (
                    <div
                      key={typeId}
                      className="flex items-center justify-between p-2 rounded-lg border hover:bg-accent cursor-pointer"
                      onClick={() => loadMessageContent(typeId)}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="font-mono">Message {typeId}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteMessageFile(typeId)
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Message Content Viewer */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedMessage ? `Message ${selectedMessage.id}` : "Message Content"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedMessage ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant={selectedMessage.exists ? "default" : "secondary"}>
                    {selectedMessage.exists ? "File Exists" : "File Not Found"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    messages/{selectedMessage.id}/{selectedMessage.id}.txt
                  </span>
                </div>
                <Separator />
                <ScrollArea className="h-96">
                  <div className="font-mono text-sm bg-muted p-4 rounded-lg">
                    {formatMessageContent(selectedMessage.content)}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Select a message type to view its content</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 