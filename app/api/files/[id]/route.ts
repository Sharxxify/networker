import { type NextRequest, NextResponse } from "next/server"

// Mock database connection
const mockDatabase = {
  uploadedFiles: [] as any[],

  async deleteFile(id: number) {
    const index = this.uploadedFiles.findIndex((f) => f.id === id)
    if (index > -1) {
      const file = this.uploadedFiles[index]
      this.uploadedFiles.splice(index, 1)
      return file
    }
    return null
  },
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const deletedFile = await mockDatabase.deleteFile(id)

    if (!deletedFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, file: deletedFile })
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json({ error: "Delete failed" }, { status: 500 })
  }
}
