"use client"

import { MapViewer, canSee, type MapViewerProps } from "./map-viewer"
import { MapViewerGL } from "./map-viewer-gl"

// Solo asesor/analista tienen permiso de dibujo (círculo/rectángulo/polígono
// + cálculo de área) — esa función solo existe hoy en el mapa Leaflet, así
// que esos roles siguen ahí. El resto (admin, agricultor, campesino, o sin
// rol) ya usa el mapa MapLibre (Fase 1: capas + clustering + selección de
// predio, sin dibujo ni remapeo NDVI todavía).
export function MapViewerSwitch(props: MapViewerProps) {
  if (canSee(props.role, 'draw')) {
    return <MapViewer {...props} />
  }
  return <MapViewerGL {...props} />
}
