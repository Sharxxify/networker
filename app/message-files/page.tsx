import { MessageFileViewer } from "@/components/message-file-viewer"

export default function MessageFilesPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Message Files</h1>
        <p className="text-muted-foreground">
          View and manage message files organized by message type ID
        </p>
      </div>
      <MessageFileViewer />
    </div>
  )
} 