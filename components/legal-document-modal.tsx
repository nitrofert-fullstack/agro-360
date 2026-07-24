"use client"

import { useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"

interface LegalDocumentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  documentUrl: string
  onAccept?: () => void
  showAcceptButton?: boolean
  beneficiarioNombre?: string
  beneficiarioDoc?: string
  fechaFormulario?: string
  beneficiarioFirma?: string
}

export function LegalDocumentModal({
  open,
  onOpenChange,
  title,
  description,
  documentUrl,
  onAccept,
  showAcceptButton = true,
  beneficiarioNombre,
  beneficiarioDoc,
  fechaFormulario,
  beneficiarioFirma,
}: LegalDocumentModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const isPdf = documentUrl.toLowerCase().endsWith('.pdf')

  const iframeSrc = (() => {
    const params = new URLSearchParams()
    if (beneficiarioNombre) params.set('nombre', beneficiarioNombre)
    if (beneficiarioDoc)    params.set('doc', beneficiarioDoc)
    const fecha = fechaFormulario || new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
    params.set('fecha', fecha)
    const qs = params.toString()
    return qs ? `${documentUrl}?${qs}` : documentUrl
  })()

  // Los PDF no se previsualizan de forma confiable en iframe (bloqueos de conexión en algunos hostings);
  // se abren directo en una pestaña nueva y el modal no llega a mostrarse.
  useEffect(() => {
    if (open && isPdf) {
      window.open(iframeSrc, '_blank', 'noopener,noreferrer')
      onOpenChange(false)
    }
  }, [open, isPdf, iframeSrc, onOpenChange])

  // Envía la firma al iframe vía postMessage una vez que cargue
  useEffect(() => {
    if (!open || !beneficiarioFirma) return
    const iframe = iframeRef.current
    if (!iframe) return
    const send = () => {
      iframe.contentWindow?.postMessage({ type: 'legal_firma', src: beneficiarioFirma }, window.location.origin)
    }
    iframe.addEventListener('load', send)
    return () => iframe.removeEventListener('load', send)
  }, [open, beneficiarioFirma, iframeSrc])

  if (isPdf) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-hidden">
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            title={title}
            className="w-full h-full border-0"
          />
        </div>
        <DialogFooter className="px-6 py-4 border-t shrink-0 gap-2 sm:gap-2">
          <Button variant="outline" asChild>
            <a href={documentUrl} target="_blank" rel="noopener noreferrer">
              Abrir en nueva pestaña
            </a>
          </Button>
          {showAcceptButton && onAccept && (
            <Button
              onClick={() => {
                onAccept()
                onOpenChange(false)
              }}
            >
              He leído y acepto
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Catálogo de los 4 documentos legales de COA
export const LEGAL_DOCUMENTS = {
  politicaTratamientoDatos: {
    id: "politicaTratamientoDatos",
    title: "Política de Tratamiento de Datos Personales",
    description: "Manual general del tratamiento de datos personales por parte de COA (Ley 1581/2012).",
    url: "/legal/politica-tratamiento-datos-coa.pdf",
  },
  avisoPrivacidad: {
    id: "avisoPrivacidad",
    title: "Aviso de Privacidad",
    description: "Resumen del tratamiento de datos publicado en la página web de COA.",
    url: "/legal/aviso-privacidad.html",
  },
  autorizacionTratamientoDatos: {
    id: "autorizacionTratamientoDatos",
    title: "Autorización de Tratamiento de Datos Personales",
    description: "Texto de autorización que el productor acepta al suministrar sus datos.",
    url: "/legal/formato-recoleccion-datos.pdf",
  },
  autorizacionUsoImagen: {
    id: "autorizacionUsoImagen",
    title: "Autorización de Uso de Imagen",
    description: "Autorización para el uso público de fotografías del productor en materiales de COA.",
    url: "/legal/autorizacion-uso-imagen.html",
  },
} as const
