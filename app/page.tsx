"use client";

import { AppLayout } from "@/components/app-layout";
import { Dashboard } from "@/components/dashboard";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const selectedLog = searchParams.get("selectedLog");

  return (
    <AppLayout>
      <Dashboard selectedLog={selectedLog} />
    </AppLayout>
  );
}
