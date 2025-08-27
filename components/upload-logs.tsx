"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, File, X, CheckCircle, AlertCircle, Loader2, Play } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"

interface UploadedFile {
  id: string
  name: string
  size: number
  status: "uploading" | "completed" | "error" | "parsing" | "parsed"
  progress: number
  type: string
  file?: File
  serverFile?: any
  parsedEntries?: number
}

export function UploadLogs() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Load existing files on component mount
  useEffect(() => {
    loadExistingFiles()
  }, [])

  const loadExistingFiles = async () => {
    try {
      const api = typeof window !== "undefined" ? (window as any).electronAPI : undefined
      if (!api?.getFiles) {
        console.warn("electronAPI.getFiles is not available. Are you running outside Electron?")
        setFiles([])
        return
      }
      const data = await api.getFiles()
      const existingFiles = data.map((file: any) => ({
        id: file.id.toString(),
        name: file.original_name,
        size: file.file_size,
        status: "completed" as const,
        progress: 100,
        type: file.mime_type,
        serverFile: file,
      }))
      setFiles(existingFiles)
    } catch (error) {
      console.error("Failed to load existing files:", error)
    }
  }

  const uploadFile = async (file: File, fileId: string) => {
    try {
      const api = typeof window !== "undefined" ? (window as any).electronAPI : undefined
      if (!api?.uploadFile) {
        setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "error", progress: 0 } : f)))
        toast({
          title: "Upload not available",
          description: "Electron API is not available. Please run the desktop app to upload files.",
          variant: "destructive",
        })
        return
      }

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) => {
            if (f.id === fileId && f.progress < 90) {
              return { ...f, progress: Math.min(f.progress + Math.random() * 20, 90) }
            }
            return f
          }),
        )
      }, 200)

      // Read file as ArrayBuffer
      const buffer = await file.arrayBuffer()
      const data = await api.uploadFile({
        name: file.name,
        buffer: Array.from(new Uint8Array(buffer)),
        type: file.type,
        size: file.size,
      })

      clearInterval(progressInterval)

      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, status: "completed", progress: 100, serverFile: data } : f)),
      )

      toast({
        title: "Upload successful",
        description: `${file.name} has been uploaded successfully.`,
      })
    } catch (error) {
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "error", progress: 0 } : f)))
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred during upload.",
        variant: "destructive",
      })
    }
  }

  const parseFile = async (fileData: UploadedFile) => {
    if (!fileData.serverFile) return
    setFiles((prev) => prev.map((f) => (f.id === fileData.id ? { ...f, status: "parsing" } : f)))
    try {
      const api = typeof window !== "undefined" ? (window as any).electronAPI : undefined
      if (!api?.parseFile) {
        setFiles((prev) => prev.map((f) => (f.id === fileData.id ? { ...f, status: "completed" } : f)))
        toast({
          title: "Parsing not available",
          description: "Electron API is not available. Please run the desktop app to parse files.",
          variant: "destructive",
        })
        return
      }
      const result = await api.parseFile({
        fileId: fileData.serverFile.id,
        filePath: fileData.serverFile.file_path,
      })
      setFiles((prev) =>
        prev.map((f) => (f.id === fileData.id ? { ...f, status: "parsed", parsedEntries: result.parsedEntries } : f)),
      )
      toast({
        title: "Parsing successful",
        description: `Parsed ${result.parsedEntries} log entries from ${result.totalLines} lines.`,
      })
    } catch (error) {
      setFiles((prev) => prev.map((f) => (f.id === fileData.id ? { ...f, status: "completed" } : f)))
      toast({
        title: "Parsing failed",
        description: error instanceof Error ? error.message : "An error occurred during parsing.",
        variant: "destructive",
      })
    }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      status: "uploading" as const,
      progress: 0,
      type: file.type || "text/plain",
      file,
    }))
    setFiles((prev) => [...prev, ...newFiles])
    // Upload each file
    newFiles.forEach((fileData) => {
      if (fileData.file) {
        uploadFile(fileData.file, fileData.id)
      }
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".txt", ".log"],
      "application/octet-stream": [".log"],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
  })

  const removeFile = async (id: string) => {
    const file = files.find((f) => f.id === id)
    if (file?.serverFile) {
      try {
        const api = typeof window !== "undefined" ? (window as any).electronAPI : undefined
        if (!api?.deleteFile) {
          toast({
            title: "Delete not available",
            description: "Electron API is not available. Please run the desktop app to delete files.",
            variant: "destructive",
          })
        } else {
          await api.deleteFile({ fileId: file.serverFile.id })
          toast({
            title: "File deleted",
            description: `${file.name} has been deleted successfully.`,
          })
        }
      } catch (error) {
        toast({
          title: "Delete failed",
          description: "Failed to delete file from database.",
          variant: "destructive",
        })
        return
      }
    }
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const parseAllFiles = async () => {
    const completedFiles = files.filter((f) => f.status === "completed")
    if (completedFiles.length === 0) {
      toast({
        title: "No files to parse",
        description: "Please upload some files first.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      for (const file of completedFiles) {
        await parseFile(file)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const completedFiles = files.filter((f) => f.status === "completed")
  const uploadingFiles = files.filter((f) => f.status === "uploading")
  const errorFiles = files.filter((f) => f.status === "error")
  const parsedFiles = files.filter((f) => f.status === "parsed")
  const parsingFiles = files.filter((f) => f.status === "parsing")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Upload Logs</h1>
        <p className="text-muted-foreground mt-2">
          Upload your 4G network log files for analysis. Supported formats: .txt, .log (max 100MB each)
        </p>
      </div>

      {/* Upload Statistics */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Files</p>
                <p className="text-2xl font-bold">{files.length}</p>
              </div>
              <File className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Uploaded</p>
                <p className="text-2xl font-bold text-green-500">{completedFiles.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Parsed</p>
                <p className="text-2xl font-bold text-blue-500">{parsedFiles.length}</p>
              </div>
              <Play className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Processing</p>
                <p className="text-2xl font-bold text-yellow-500">{uploadingFiles.length + parsingFiles.length}</p>
              </div>
              <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Errors</p>
                <p className="text-2xl font-bold text-red-500">{errorFiles.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>File Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            {isDragActive ? (
              <p className="text-lg">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-lg mb-2">Drag & drop log files here, or click to select</p>
                <p className="text-sm text-muted-foreground">
                  Supports .txt and .log files up to 100MB each
                  <br />
                  Expected format: [timestamp|system|id] [hex] direction protocol [data] message
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Files ({files.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <File className="h-8 w-8 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={
                              file.status === "completed" || file.status === "parsed"
                                ? "default"
                                : file.status === "error"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {file.status}
                          </Badge>
                          {file.status === "completed" && (
                            <Button variant="outline" size="sm" onClick={() => parseFile(file)} disabled={isLoading}>
                              Parse
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(file.id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-2">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span>{file.type}</span>
                        {file.serverFile && (
                          <>
                            <span>•</span>
                            <span>ID: {file.serverFile.id}</span>
                          </>
                        )}
                        {file.parsedEntries && (
                          <>
                            <span>•</span>
                            <span>{file.parsedEntries} entries parsed</span>
                          </>
                        )}
                      </div>
                      {(file.status === "uploading" || file.status === "parsing") && (
                        <div className="space-y-1">
                          <Progress value={file.status === "uploading" ? file.progress : 50} className="h-2" />
                          <p className="text-xs text-muted-foreground">
                            {file.status === "uploading"
                              ? `${Math.round(file.progress)}% uploaded`
                              : "Parsing log entries..."}
                          </p>
                        </div>
                      )}
                      {(file.status === "completed" || file.status === "parsed") && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-xs">
                            {file.status === "parsed" ? "Parsed successfully" : "Upload completed"}
                          </span>
                        </div>
                      )}
                      {file.status === "error" && (
                        <div className="flex items-center space-x-1 text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-xs">Upload failed</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {completedFiles.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Ready for Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  {completedFiles.length} files ready to parse • {parsedFiles.length} files already parsed
                </p>
              </div>
              <Button onClick={parseAllFiles} disabled={isLoading || completedFiles.length === 0}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  "Parse All Files"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
