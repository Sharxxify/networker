"use client"

import { AppLayout } from "@/components/app-layout"
import { Dashboard } from "@/components/dashboard"
import { useSearchParams } from "next/navigation"

export default function Home() {
  const searchParams = useSearchParams()
  const selectedLog = searchParams.get("selectedLog")

  return (
    <AppLayout>
      <Dashboard selectedLog={selectedLog} />
    </AppLayout>
  )
}
