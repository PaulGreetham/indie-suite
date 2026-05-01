"use client"

import * as React from "react"

type FirmaTemplateEditorInstance = {
  destroy?: () => void
  triggerClose?: () => void
}

type FirmaTemplateEditorConstructor = new (options: {
  container: HTMLElement
  jwt: string
  templateId: string
  theme?: "dark" | "light"
  readOnly?: boolean
  width?: string
  height?: string
  showCloseButton?: boolean
  onSave?: (data: unknown) => void
  onClose?: (data: unknown) => void
  onError?: (error: unknown) => void
  onLoad?: (template: unknown) => void
}) => FirmaTemplateEditorInstance

declare global {
  interface Window {
    FirmaTemplateEditor?: FirmaTemplateEditorConstructor
  }
}

export function FirmaTemplateEditor({
  jwt,
  templateId,
  onSave,
  onError,
}: {
  jwt: string
  templateId: string
  onSave?: (data: unknown) => void
  onError?: (error: unknown) => void
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const editorRef = React.useRef<FirmaTemplateEditorInstance | null>(null)
  const [loaded, setLoaded] = React.useState(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (window.FirmaTemplateEditor) {
      setLoaded(true)
      return
    }

    const existing = document.getElementById("firma-template-editor-script") as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener("load", () => setLoaded(true), { once: true })
      existing.addEventListener("error", () => setLoadError("Failed to load Firma editor"), { once: true })
      return
    }

    const script = document.createElement("script")
    script.id = "firma-template-editor-script"
    script.src = "https://api.firma.dev/functions/v1/embed-proxy/template-editor.js"
    script.async = true
    script.onload = () => setLoaded(true)
    script.onerror = () => setLoadError("Failed to load Firma editor")
    document.body.appendChild(script)
  }, [])

  React.useEffect(() => {
    if (!loaded || !containerRef.current || !jwt || !templateId || !window.FirmaTemplateEditor) return

    editorRef.current?.destroy?.()
    editorRef.current = new window.FirmaTemplateEditor({
      container: containerRef.current,
      jwt,
      templateId,
      theme: "dark",
      readOnly: false,
      width: "100%",
      height: "72vh",
      showCloseButton: false,
      onSave,
      onError,
    })

    return () => {
      editorRef.current?.destroy?.()
      editorRef.current = null
    }
  }, [jwt, loaded, onError, onSave, templateId])

  if (loadError) return <div className="text-sm text-destructive">{loadError}</div>

  return (
    <div className="min-h-[72vh] overflow-hidden rounded-lg border bg-background">
      {!loaded ? <div className="p-4 text-sm text-muted-foreground">Loading Firma editor…</div> : null}
      <div ref={containerRef} className="h-[72vh] w-full" />
    </div>
  )
}
