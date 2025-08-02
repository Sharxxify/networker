"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

declare global {
  interface Window {
    electronAPI: any;
  }
}

interface ErrorPattern {
  id: string
  type: "connection_failure" | "timeout" | "authentication_error" | "handover_failure" | "bearer_setup_failure" | "other"
  severity: "critical" | "high" | "medium" | "low"
  count: number
  affectedCalls: string[]
  affectedCells: string[]
  description: string
  firstOccurrence: string
  lastOccurrence: string
  trend: "increasing" | "decreasing" | "stable"
}

interface ErrorInstance {
  id: string
  timestamp: string
  callId: string
  cellId: string
  errorType: string
  severity: "critical" | "high" | "medium" | "low"
  message: string
  context: string
}

export function ErrorDetectionPage() {
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null)
  const [errorPatterns, setErrorPatterns] = useState<ErrorPattern[]>([])
  const [errorInstances, setErrorInstances] = useState<ErrorInstance[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const analyzeErrors = async () => {
      setLoading(true)
      try {
        const entries = await (window as any).electronAPI.getLogEntries({})
        // Filter only error entries
        const errors = entries.filter((e: any) => e.status === "error")
        // Group by error type (simple heuristics based on message)
        const patternMap: { [key: string]: ErrorPattern } = {}
        const instances: ErrorInstance[] = []
        errors.forEach((e: any, idx: number) => {
          // Heuristic: classify error type
          let type: ErrorPattern["type"] = "other"
          let description = e.message || "Unknown error"
          let severity: ErrorPattern["severity"] = "medium"
          if (/connection/i.test(e.message)) {
            type = "connection_failure"
            severity = "critical"
            description = "Connection failure detected"
          } else if (/auth/i.test(e.message)) {
            type = "authentication_error"
            severity = "high"
            description = "Authentication error detected"
          } else if (/handover/i.test(e.message)) {
            type = "handover_failure"
            severity = "medium"
            description = "Handover failure detected"
          } else if (/timeout/i.test(e.message)) {
            type = "timeout"
            severity = "high"
            description = "Timeout error detected"
          } else if (/bearer/i.test(e.message)) {
            type = "bearer_setup_failure"
            severity = "medium"
            description = "Bearer setup failure detected"
          }
          // Add to pattern map
          if (!patternMap[type]) {
            patternMap[type] = {
              id: type,
              type,
              severity,
              count: 0,
              affectedCalls: [],
              affectedCells: [],
              description,
              firstOccurrence: e.timestamp,
              lastOccurrence: e.timestamp,
              trend: "stable",
            }
          }
          patternMap[type].count++
          if (e.callId && !patternMap[type].affectedCalls.includes(e.callId)) {
            patternMap[type].affectedCalls.push(e.callId)
          }
          if (e.cellId && !patternMap[type].affectedCells.includes(e.cellId)) {
            patternMap[type].affectedCells.push(e.cellId)
          }
          // Update first/last occurrence
          if (e.timestamp < patternMap[type].firstOccurrence) patternMap[type].firstOccurrence = e.timestamp
          if (e.timestamp > patternMap[type].lastOccurrence) patternMap[type].lastOccurrence = e.timestamp
          // Add to instances
          instances.push({
            id: String(idx + 1),
            timestamp: e.timestamp,
            callId: e.callId || "",
            cellId: e.cellId || "",
            errorType: type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            severity,
            message: e.message,
            context: e.rawLine || "",
          })
        })
        setErrorPatterns(Object.values(patternMap))
        setErrorInstances(instances)
      } catch (err) {
        setErrorPatterns([])
        setErrorInstances([])
      } finally {
        setLoading(false)
      }
    }
    analyzeErrors()
  }, [])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      case "high":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20"
      case "medium":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      case "low":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20"
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "increasing":
        return <TrendingUp className="h-4 w-4 text-red-500" />
      case "decreasing":
        return <TrendingUp className="h-4 w-4 text-green-500 rotate-180" />
      case "stable":
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return null
    }
  }

  const totalErrors = errorPatterns.reduce((sum, pattern) => sum + pattern.count, 0)
  const criticalErrors = errorPatterns
    .filter((p) => p.severity === "critical")
    .reduce((sum, pattern) => sum + pattern.count, 0)
  const highErrors = errorPatterns.filter((p) => p.severity === "high").reduce((sum, pattern) => sum + pattern.count, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Error Detection</h1>
        <p className="text-muted-foreground mt-2">
          Automated detection and analysis of network errors and failure patterns
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Errors</p>
                <p className="text-2xl font-bold">{totalErrors}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-red-500">{criticalErrors}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Priority</p>
                <p className="text-2xl font-bold text-orange-500">{highErrors}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="patterns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="patterns">Error Patterns</TabsTrigger>
          <TabsTrigger value="instances">Error Instances</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detected Error Patterns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {errorPatterns.map((pattern) => (
                  <div
                    key={pattern.id}
                    className={`rounded-lg border p-4 cursor-pointer transition-colors ${
                      selectedPattern === pattern.id ? "bg-muted" : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedPattern(selectedPattern === pattern.id ? null : pattern.id)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge className={getSeverityColor(pattern.severity)}>{pattern.severity.toUpperCase()}</Badge>
                        <span className="font-medium">{pattern.description}</span>
                        {getTrendIcon(pattern.trend)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{pattern.count} occurrences</Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Affected Calls:</span>
                        <div className="mt-1">
                          {pattern.affectedCalls.slice(0, 2).map((call) => (
                            <Badge key={call} variant="secondary" className="mr-1 text-xs">
                              {call}
                            </Badge>
                          ))}
                          {pattern.affectedCalls.length > 2 && (
                            <span className="text-muted-foreground">+{pattern.affectedCalls.length - 2} more</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Affected Cells:</span>
                        <div className="mt-1">
                          {pattern.affectedCells.map((cell) => (
                            <Badge key={cell} variant="secondary" className="mr-1 text-xs">
                              {cell}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">First Seen:</span>
                        <div className="mt-1 text-xs">{pattern.firstOccurrence}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Last Seen:</span>
                        <div className="mt-1 text-xs">{pattern.lastOccurrence}</div>
                      </div>
                    </div>

                    {selectedPattern === pattern.id && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-medium mb-2">Pattern Analysis</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Error Type:</span>
                            <div className="mt-1 capitalize">{pattern.type.replace("_", " ")}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Trend:</span>
                            <div className="mt-1 flex items-center gap-1 capitalize">
                              {getTrendIcon(pattern.trend)}
                              {pattern.trend}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3">
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                          <Button size="sm" variant="outline" className="ml-2">
                            Export Report
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Error Instances</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {errorInstances.map((instance) => (
                    <div key={instance.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Badge className={getSeverityColor(instance.severity)}>
                            {instance.severity.toUpperCase()}
                          </Badge>
                          <span className="font-medium">{instance.errorType}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{instance.callId}</Badge>
                          <Badge variant="outline">{instance.cellId}</Badge>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Timestamp:</span>
                          <span className="ml-2 font-mono">{instance.timestamp}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Message:</span>
                          <div className="mt-1 p-2 bg-muted rounded text-xs font-mono">{instance.message}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Context:</span>
                          <div className="mt-1 text-xs">{instance.context}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Error Distribution by Severity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Critical</span>
                    <span className="text-sm font-medium">{criticalErrors}</span>
                  </div>
                  <Progress value={(criticalErrors / totalErrors) * 100} className="h-2" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">High</span>
                    <span className="text-sm font-medium">{highErrors}</span>
                  </div>
                  <Progress value={(highErrors / totalErrors) * 100} className="h-2" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Medium</span>
                    <span className="text-sm font-medium">5</span>
                  </div>
                  <Progress value={(5 / totalErrors) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Affected Components</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">RRC Layer</div>
                      <div className="text-sm text-muted-foreground">Connection failures</div>
                    </div>
                    <Badge variant="destructive">15 errors</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">S1AP Interface</div>
                      <div className="text-sm text-muted-foreground">Authentication issues</div>
                    </div>
                    <Badge variant="destructive">8 errors</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">X2 Handover</div>
                      <div className="text-sm text-muted-foreground">Inter-cell mobility</div>
                    </div>
                    <Badge className="bg-yellow-500/10 text-yellow-500">5 errors</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 border rounded">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Critical: RRC Connection Failures</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Investigate PUCCH resource allocation in CELL-A123. Consider increasing resource pool or load
                      balancing.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded">
                  <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <div className="font-medium">High: S1AP Authentication Timeouts</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Check MME connectivity and response times. Consider adjusting timeout parameters.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Improving: X2 Handover Success Rate</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Recent optimizations showing positive results. Continue monitoring.
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
