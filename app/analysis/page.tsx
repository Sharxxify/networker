import { AppLayout } from "@/components/app-layout"
import { LogAnalysis } from "@/components/log-analysis"

export default function AnalysisPage() {
  return (
    <AppLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Analysis</h1>
          <p className="text-muted-foreground">Analyze message flow with ECCB as the reference point. Filter by direction, status, and protocol, then click Analyze.</p>
        </div>
        <LogAnalysis />
      </div>
    </AppLayout>
  )
}


