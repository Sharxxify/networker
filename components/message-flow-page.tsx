"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageFlow } from "@/components/message-flow"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

export function MessageFlowPage() {
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
          <Badge variant="outline">Call ID: CALL-001</Badge>
          <Badge variant="outline">Cell ID: CELL-A123</Badge>
          <Badge variant="outline">8 Messages</Badge>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="call-001">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Call ID" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="call-001">CALL-001</SelectItem>
              <SelectItem value="call-002">CALL-002</SelectItem>
              <SelectItem value="call-003">CALL-003</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">Export Diagram</Button>
          <Button variant="outline">Full Screen</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Network Message Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <MessageFlow />
        </CardContent>
      </Card>
    </div>
  )
}