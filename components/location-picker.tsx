"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type L from "leaflet"
import { Button } from "@/components/ui/button"
import { MapPin, Pentagon, Trash2, Check } from "lucide-react"

interface LocationPickerProps {
  onLocationChange: (data: {
    latitud: number
    longitud: number
    poligono?: [number, number][]
    tipoUbicacion: "punto" | "poligono"
  }) => void
  initialLocation?: {
    latitud: number
    longitud: number
    poligono?: [number, number][]
    tipoUbicacion: "punto" | "poligono"
  }
}

export function LocationPicker({ onLocationChange, initialLocation }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const polygonRef = useRef<L.Polygon | null>(null)
  const tempMarkersRef = useRef<L.CircleMarker[]>([])
  const tempLineRef = useRef<L.Polyline | null>(null)
  const leafletRef = useRef<typeof L | null>(null)

  const [mode, setMode] = useState<"punto" | "poligono">(initialLocation?.tipoUbicacion || "punto")
  const [isDrawing, setIsDrawing] = useState(false)
  const [polygonPoints, setPolygonPoints] = useState<[number, number][]>(initialLocation?.poligono || [])
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number }>({
    lat: initialLocation?.latitud || 7.1254,
    lng: initialLocation?.longitud || -73.1198,
  })
  const [isMapReady, setIsMapReady] = useState(false)
  const isInitializingRef = useRef(false)

  const getCustomIcon = useCallback(() => {
    const L = leafletRef.current
    if (!L) return null
    return L.divIcon({
      html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#22c55e" stroke="#166534" strokeWidth="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3" fill="white"></circle>
      </svg>`,
      className: "custom-marker",
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    })
  }, [])

  // Initialize map with dynamic Leaflet import
  useEffect(() => {
    if (!mapRef.current) return
    if (mapInstanceRef.current) return
    if (isInitializingRef.current) return

    let mounted = true
    isInitializingRef.current = true

    const initMap = async () => {
      try {
        // Double check not already initialized
        if (mapInstanceRef.current) {
          isInitializingRef.current = false
          return
        }

        const L = await import("leaflet")
        await import("leaflet/dist/leaflet.css")
        
        if (!mounted) {
          isInitializingRef.current = false
          return
        }

        leafletRef.current = L.default

        const santanderBounds = L.default.latLngBounds(
          L.default.latLng(5.7, -74.5),
          L.default.latLng(8.2, -72.4)
        )

        if (!mapRef.current) {
          isInitializingRef.current = false
          return
        }

        // Completely clear the container
        mapRef.current.innerHTML = ''

        const map = L.default.map(mapRef.current, {
          center: [currentLocation.lat, currentLocation.lng],
          zoom: 10,
          maxBounds: santanderBounds,
          maxBoundsViscosity: 1.0,
          minZoom: 8,
          maxZoom: 18,
        })

        // Base layer
        L.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "OpenStreetMap",
        }).addTo(map)

        // Add Santander bounds visualization
        L.default.rectangle(santanderBounds, {
          color: "#22c55e",
          weight: 2,
          fill: false,
          dashArray: "5, 10",
        }).addTo(map)

        mapInstanceRef.current = map

        const customIcon = L.default.divIcon({
          html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#22c55e" stroke="#166534" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3" fill="white"></circle>
          </svg>`,
          className: "custom-marker",
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        })

        // Add initial marker if exists
        if (initialLocation?.tipoUbicacion === "punto") {
          const marker = L.default.marker([initialLocation.latitud, initialLocation.longitud], {
            icon: customIcon,
            draggable: true,
          }).addTo(map)
          
          marker.on("dragend", () => {
            const pos = marker.getLatLng()
            setCurrentLocation({ lat: pos.lat, lng: pos.lng })
            onLocationChange({
              latitud: pos.lat,
              longitud: pos.lng,
              tipoUbicacion: "punto",
            })
          })
          
          markerRef.current = marker
        }

        // Add initial polygon if exists
        if (initialLocation?.tipoUbicacion === "poligono" && initialLocation.poligono) {
          const polygon = L.default.polygon(initialLocation.poligono, {
            color: "#22c55e",
            fillColor: "#22c55e",
            fillOpacity: 0.3,
            weight: 2,
          }).addTo(map)
          polygonRef.current = polygon
          map.fitBounds(polygon.getBounds())
        }

        setIsMapReady(true)
        isInitializingRef.current = false
      } catch (error) {
        console.error("[v0] Error initializing map:", error)
        isInitializingRef.current = false
      }
    }

    initMap()

    return () => {
      mounted = false
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      isInitializingRef.current = false
    }
  }, [])

  // Handle click for point mode
  const handlePointClick = useCallback((e: L.LeafletMouseEvent) => {
    const L = leafletRef.current
    if (mode !== "punto" || !mapInstanceRef.current || !L) return

    const { lat, lng } = e.latlng
    setCurrentLocation({ lat, lng })

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.remove()
    }

    const customIcon = getCustomIcon()
    if (!customIcon) return

    // Add new marker
    const marker = L.marker([lat, lng], {
      icon: customIcon,
      draggable: true,
    }).addTo(mapInstanceRef.current)

    marker.on("dragend", () => {
      const pos = marker.getLatLng()
      setCurrentLocation({ lat: pos.lat, lng: pos.lng })
      onLocationChange({
        latitud: pos.lat,
        longitud: pos.lng,
        tipoUbicacion: "punto",
      })
    })

    markerRef.current = marker
    onLocationChange({
      latitud: lat,
      longitud: lng,
      tipoUbicacion: "punto",
    })
  }, [mode, onLocationChange, getCustomIcon])

  // Handle click for polygon mode
  const handlePolygonClick = useCallback((e: L.LeafletMouseEvent) => {
    const L = leafletRef.current
    if (mode !== "poligono" || !isDrawing || !mapInstanceRef.current || !L) return

    const { lat, lng } = e.latlng
    const newPoints: [number, number][] = [...polygonPoints, [lat, lng]]
    setPolygonPoints(newPoints)

    // Add temp marker
    const circleMarker = L.circleMarker([lat, lng], {
      radius: 6,
      color: "#22c55e",
      fillColor: "#22c55e",
      fillOpacity: 1,
    }).addTo(mapInstanceRef.current)
    tempMarkersRef.current.push(circleMarker)

    // Update temp line
    if (tempLineRef.current) {
      tempLineRef.current.remove()
    }
    if (newPoints.length > 1) {
      tempLineRef.current = L.polyline(newPoints, {
        color: "#22c55e",
        weight: 2,
        dashArray: "5, 5",
      }).addTo(mapInstanceRef.current)
    }
  }, [mode, isDrawing, polygonPoints])

  // Setup click handlers
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    const clickHandler = (e: L.LeafletMouseEvent) => {
      if (mode === "punto") {
        handlePointClick(e)
      } else if (mode === "poligono" && isDrawing) {
        handlePolygonClick(e)
      }
    }

    map.on("click", clickHandler)
    return () => {
      map.off("click", clickHandler)
    }
  }, [mode, isDrawing, handlePointClick, handlePolygonClick])

  // Clear drawing
  const clearDrawing = () => {
    // Clear temp markers
    tempMarkersRef.current.forEach((m) => m.remove())
    tempMarkersRef.current = []

    // Clear temp line
    if (tempLineRef.current) {
      tempLineRef.current.remove()
      tempLineRef.current = null
    }

    // Clear polygon
    if (polygonRef.current) {
      polygonRef.current.remove()
      polygonRef.current = null
    }

    // Clear marker
    if (markerRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }

    setPolygonPoints([])
    setIsDrawing(false)
  }

  // Start polygon drawing
  const startPolygonDrawing = () => {
    clearDrawing()
    setMode("poligono")
    setIsDrawing(true)
  }

  // Finish polygon drawing
  const finishPolygonDrawing = () => {
    const L = leafletRef.current
    if (polygonPoints.length < 3 || !mapInstanceRef.current || !L) return

    // Clear temp elements
    tempMarkersRef.current.forEach((m) => m.remove())
    tempMarkersRef.current = []
    if (tempLineRef.current) {
      tempLineRef.current.remove()
      tempLineRef.current = null
    }

    // Create final polygon
    const polygon = L.polygon(polygonPoints, {
      color: "#22c55e",
      fillColor: "#22c55e",
      fillOpacity: 0.3,
      weight: 2,
    }).addTo(mapInstanceRef.current)
    polygonRef.current = polygon

    // Calculate center
    const bounds = polygon.getBounds()
    const center = bounds.getCenter()

    setIsDrawing(false)
    onLocationChange({
      latitud: center.lat,
      longitud: center.lng,
      poligono: polygonPoints,
      tipoUbicacion: "poligono",
    })
  }

  // Switch to point mode
  const switchToPointMode = () => {
    clearDrawing()
    setMode("punto")
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={mode === "punto" && !isDrawing ? "default" : "outline"}
          size="sm"
          onClick={switchToPointMode}
          className="gap-2"
        >
          <MapPin className="h-4 w-4" />
          Marcar Punto
        </Button>
        <Button
          type="button"
          variant={mode === "poligono" ? "default" : "outline"}
          size="sm"
          onClick={startPolygonDrawing}
          className="gap-2"
        >
          <Pentagon className="h-4 w-4" />
          Dibujar Poligono
        </Button>
        {isDrawing && polygonPoints.length >= 3 && (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={finishPolygonDrawing}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4" />
            Finalizar ({polygonPoints.length} puntos)
          </Button>
        )}
        {(polygonPoints.length > 0 || markerRef.current) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearDrawing}
            className="gap-2 text-destructive hover:text-destructive bg-transparent"
          >
            <Trash2 className="h-4 w-4" />
            Limpiar
          </Button>
        )}
      </div>

      {isDrawing && (
        <div className="rounded-md bg-primary/10 p-2 text-xs text-primary">
          Haz clic en el mapa para agregar puntos al poligono. Minimo 3 puntos.
        </div>
      )}

      <div 
        ref={mapRef} 
        className="h-[300px] w-full rounded-lg border border-border"
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {mode === "punto" 
            ? `Ubicacion: ${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`
            : polygonPoints.length > 0 
              ? `Poligono: ${polygonPoints.length} puntos`
              : "Dibuja un poligono en el mapa"
          }
        </span>
        <span>Santander, Colombia</span>
      </div>
    </div>
  )
}
