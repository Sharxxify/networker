"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { FolderOpen, Search, FileText } from "lucide-react"

interface MessageDumpConfigProps {
  onMessageSelect?: (messageInfo: { msgNum: string; direction: string; msgName: string }) => void
}

export function MessageDumpConfig({ onMessageSelect }: MessageDumpConfigProps) {
  const [dumpDirectory, setDumpDirectory] = useState("")
  const [isConfiguring, setIsConfiguring] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadDumpDirectory()
  }, [])

  const loadDumpDirectory = async () => {
    try {
      const api = typeof window !== "undefined" ? (window as any).electronAPI : undefined
      if (api?.getDumpDirectory) {
        const dir = await api.getDumpDirectory()
        setDumpDirectory(dir || "")
      }
    } catch (error) {
      console.error("Failed to load dump directory:", error)
    }
  }

  const selectDumpDirectory = async () => {
    try {
      const api = typeof window !== "undefined" ? (window as any).electronAPI : undefined
      if (api?.selectDumpDirectory) {
        const dir = await api.selectDumpDirectory()
        if (dir) {
          setDumpDirectory(dir)
          await saveDumpDirectory(dir)
          toast({
            title: "Directory selected",
            description: `Message dump directory set to: ${dir}`,
          })
        }
      } else {
        toast({
          title: "Not available",
          description: "Please run the desktop app to configure dump directory.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to select dump directory.",
        variant: "destructive",
      })
    }
  }

  const saveDumpDirectory = async (dir: string) => {
    try {
      const api = typeof window !== "undefined" ? (window as any).electronAPI : undefined
      if (api?.saveDumpDirectory) {
        await api.saveDumpDirectory(dir)
      }
    } catch (error) {
      console.error("Failed to save dump directory:", error)
    }
  }

  const handleDirectoryChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const dir = e.target.value
    setDumpDirectory(dir)
    await saveDumpDirectory(dir)
  }

  const searchMessageDump = async (msgNum: string, direction: string, msgName: string) => {
    try {
      const api = typeof window !== "undefined" ? (window as any).electronAPI : undefined
      if (!api?.searchMessageDump) {
        toast({
          title: "Not available",
          description: "Please run the desktop app to search message dumps.",
          variant: "destructive",
        })
        return
      }

      // Determine direction for file naming
      const fileDirection = direction.includes("<=") ? "Rx" : "Tx"
      
      // Search for the dump file
      const dumpFile = await api.searchMessageDump({
        msgNum,
        direction: fileDirection,
        msgName,
        dumpDirectory
      })

      if (dumpFile && dumpFile.found) {
        toast({
          title: "Message dump found",
          description: `Found dump file: ${dumpFile.fileName}`,
        })
        
        // Notify parent component about the message selection
        if (onMessageSelect) {
          onMessageSelect({ msgNum, direction, msgName })
        }
      } else {
        toast({
          title: "Message dump not found",
          description: `No dump file found for message ${msgNum}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Search failed",
        description: "Failed to search for message dump.",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Message Dump Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="dump-directory">Message Dump Directory</Label>
          <div className="flex gap-2">
            <Input
              id="dump-directory"
              value={dumpDirectory}
              onChange={handleDirectoryChange}
              placeholder="Select directory containing message dump files"
              className="flex-1"
            />
            <Button
              onClick={selectDumpDirectory}
              variant="outline"
              size="icon"
              disabled={isConfiguring}
            >
              <FolderOpen className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            This directory should contain message dump files in the format: MsgNum_Direction_msgName
          </p>
        </div>

        <div className="space-y-2">
          <Label>Example Message Dump Files</Label>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>• 187_Rx_STDRrcRRCConnectionRequestUeEccb</div>
            <div>• 188_Tx_STDRrcRRCConnectionSetupEccbUe</div>
            <div>• 189_Rx_STDRrcRRCConnectionSetupCompleteEccbUe</div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2">Quick Test</h4>
          <div className="flex gap-2">
            <Button
              onClick={() => searchMessageDump("187", "<=", "msgSTDRrcRRCConnectionRequestUeEccb")}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Test Message 187
            </Button>
            <Button
              onClick={() => searchMessageDump("188", "=>", "msgSTDRrcRRCConnectionSetupEccbUe")}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Test Message 188
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

