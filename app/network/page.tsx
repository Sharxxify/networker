import { AppLayout } from "@/components/app-layout"
import { SocketCommunication } from "@/components/socket-communication"

export default function NetworkPage() {
  return (
    <AppLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Network</h1>
          <p className="text-muted-foreground">Start a TCP/UDP server or connect as a client. Send/receive logs and process them in real-time.</p>
        </div>
        <SocketCommunication />
      </div>
    </AppLayout>
  )
}


