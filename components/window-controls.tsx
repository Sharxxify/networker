"use client"
import { useEffect, useState } from "react"
import { Minus, Square, X } from "lucide-react"

export function WindowControls() {
  const [platform, setPlatform] = useState<string>("")

  useEffect(() => {
    if (typeof window !== "undefined" && window.electronAPI) {
      setPlatform(window.electronAPI.platform)
    }
  }, [])

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 1000,
        display: "flex",
        gap: 8,
        background: "rgba(30, 41, 59, 0.8)",
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        padding: "6px 10px",
        alignItems: "center",
        backdropFilter: "blur(4px)",
      }}
    >
      <button
        title="Minimize"
        style={{
          background: "none",
          border: "none",
          color: "#fbbf24",
          cursor: "pointer",
          padding: 4,
          borderRadius: 4,
        }}
        onClick={() => window.electronAPI?.minimize()}
      >
        <Minus size={18} />
      </button>
      <button
        title="Maximize/Restore"
        style={{
          background: "none",
          border: "none",
          color: "#60a5fa",
          cursor: "pointer",
          padding: 4,
          borderRadius: 4,
        }}
        onClick={() => window.electronAPI?.maximize()}
      >
        <Square size={18} />
      </button>
      <button
        title="Close"
        style={{
          background: "none",
          border: "none",
          color: "#ef4444",
          cursor: "pointer",
          padding: 4,
          borderRadius: 4,
        }}
        onClick={() => window.electronAPI?.close()}
      >
        <X size={18} />
      </button>
    </div>
  )
} 