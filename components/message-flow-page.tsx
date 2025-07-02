"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageFlow } from "@/components/message-flow"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

export function MessageFlowPage() {
  const [filters, setFilters] = useState({
    callId: "all",
    cellId: "all",
  })
  const [callIdOptions, setCallIdOptions] = useState<string[]>([])
  const [cellIdOptions, setCellIdOptions] = useState<string[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)

  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true)
      try {
        const entries = await (window as any).electronAPI.getLogEntries({})
        const callIds = Array.from(new Set((entries as any[]).map((e: any) => e.callId).filter(Boolean) as string[])).sort()
        const cellIds = Array.from(new Set((entries as any[]).map((e: any) => e.cellId).filter(Boolean) as string[])).sort()
        setCallIdOptions(callIds)
        setCellIdOptions(cellIds)
      } catch (err) {
        setCallIdOptions([])
        setCellIdOptions([])
      } finally {
        setLoadingOptions(false)
      }
    }
    loadOptions()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Message Flow View</h1>
        <p className="text-muted-foreground mt-2">
          Visualize the message flow between network entities in a swimlane diagram
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Call ID: {filters.callId === "all" ? "(All)" : filters.callId}</Badge>
          <Badge variant="outline">Cell ID: {filters.cellId === "all" ? "(All)" : filters.cellId}</Badge>
        </div>
        <div className="flex gap-2">
          <Select
            value={filters.callId}
            onValueChange={value => setFilters(f => ({ ...f, callId: value }))}
            disabled={loadingOptions}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Call ID" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Calls</SelectItem>
              {callIdOptions.map((id) => (
                <SelectItem key={id} value={id}>{id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.cellId}
            onValueChange={value => setFilters(f => ({ ...f, cellId: value }))}
            disabled={loadingOptions}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Cell ID" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cells</SelectItem>
              {cellIdOptions.map((id) => (
                <SelectItem key={id} value={id}>{id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline">Full Screen</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Network Message Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <MessageFlow filters={filters} />
        </CardContent>
      </Card>
    </div>
  )
}