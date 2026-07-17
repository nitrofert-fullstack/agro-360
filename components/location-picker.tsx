"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type L from "leaflet"
import { Button } from "@/components/ui/button"
import { MapPin, Pentagon, Trash2, Check, LocateFixed, Loader2 } from "lucide-react"

const MUNICIPIOS_SANTANDER_COORDS: Record<string, [number, number]> = {
  // Coordenadas de centroide por municipio (87 oficiales DANE)
  "Aguada":                  [6.1606,  -73.5236],
  "Albania":                 [5.7586,  -73.9136],
  "Aratoca":                 [6.6942,  -73.0172],
  "Barbosa":                 [5.9317,  -73.6153],
  "Barichara":               [6.6353,  -73.2225],
  "Barrancabermeja":         [7.0653,  -73.8547],
  "Betulia":                 [6.8994,  -73.2831],
  "Bolívar":                 [6.0375,  -73.7706],
  "Bucaramanga":             [7.1193,  -73.1227],
  "Cabrera":                 [6.5625,  -73.2433],
  "California":              [7.3478,  -72.9597],
  "Capitanejo":              [6.5292,  -72.6950],
  "Carcasí":                 [6.7267,  -72.6269],
  "Cepitá":                  [6.7556,  -72.9739],
  "Cerrito":                 [6.8436,  -72.6933],
  "Charalá":                 [6.2847,  -73.1478],
  "Charta":                  [7.2808,  -72.9669],
  "Chima":                   [6.3414,  -73.3756],
  "Chipatá":                 [6.0614,  -73.6375],
  "Cimitarra":               [6.3142,  -73.9492],
  "Concepción":              [6.7669,  -72.6939],
  "Confines":                [6.3569,  -73.2428],
  "Contratación":            [6.2928,  -73.4728],
  "Coromoro":                [6.2944,  -73.0406],
  "Curití":                  [6.6058,  -73.0672],
  "El Carmen de Chucurí":    [6.6989,  -73.5111],
  "El Guacamayo":            [6.2467,  -73.4967],
  "El Peñón":                [6.0556,  -73.8189],
  "El Playón":               [7.4764,  -73.2036],
  "Encino":                  [6.1364,  -73.0989],
  "Enciso":                  [6.6472,  -72.7014],
  "Florián":                 [5.8044,  -73.9703],
  "Floridablanca":           [7.0623,  -73.0859],
  "Galán":                   [6.6372,  -73.2897],
  "Gámbita":                 [6.2358,  -73.3444],
  "Girón":                   [7.0692,  -73.1697],
  "Guaca":                   [6.8756,  -72.8572],
  "Guadalupe":               [6.2461,  -73.4181],
  "Guapotá":                 [6.3083,  -73.3228],
  "Guavatá":                 [5.9550,  -73.7008],
  "Güepsa":                  [6.0244,  -73.5717],
  "Hato":                    [6.5617,  -73.3625],
  "Jesús María":             [5.8722,  -73.7817],
  "Jordán":                  [6.7328,  -73.0936],
  "La Belleza":              [5.8611,  -73.9611],
  "La Paz":                  [6.1789,  -73.5853],
  "Landázuri":               [6.2186,  -73.8133],
  "Lebrija":                 [7.1133,  -73.2178],
  "Los Santos":              [6.7978,  -73.1042],
  "Macaravita":              [6.5053,  -72.5917],
  "Málaga":                  [6.6997,  -72.7322],
  "Matanza":                 [7.3536,  -73.0539],
  "Mogotes":                 [6.4744,  -72.9706],
  "Molagavita":              [6.6725,  -72.8094],
  "Ocamonte":                [6.3392,  -73.1222],
  "Oiba":                    [6.2631,  -73.2981],
  "Onzaga":                  [6.3456,  -72.8153],
  "Palmar":                  [6.5219,  -73.2806],
  "Palmas del Socorro":      [6.4067,  -73.2889],
  "Páramo":                  [6.4383,  -73.1706],
  "Piedecuesta":             [6.9879,  -73.0495],
  "Pinchote":                [6.5333,  -73.1667],
  "Puente Nacional":         [5.8775,  -73.6783],
  "Puerto Parra":            [6.6511,  -73.9469],
  "Puerto Wilches":          [7.3481,  -73.8967],
  "Rionegro":                [7.2644,  -73.1508],
  "Sabana de Torres":        [7.3914,  -73.4958],
  "San Andrés":              [6.8119,  -72.8486],
  "San Benito":              [6.1278,  -73.5119],
  "San Gil":                 [6.5556,  -73.1331],
  "San Joaquín":             [6.4656,  -72.8486],
  "San José de Miranda":     [6.6319,  -72.7317],
  "San Miguel":              [6.5758,  -72.6483],
  "San Vicente de Chucurí":  [6.8819,  -73.4094],
  "Santa Bárbara":           [6.9914,  -72.9075],
  "Santa Helena del Opón":   [6.3392,  -73.6183],
  "Simacota":                [6.4428,  -73.3369],
  "Socorro":                 [6.4681,  -73.2600],
  "Suaita":                  [6.0914,  -73.4428],
  "Sucre":                   [5.9181,  -73.7939],
  "Suratá":                  [7.3669,  -72.9833],
  "Tona":                    [7.2025,  -72.9653],
  "Valle de San José":       [6.4194,  -73.1431],
  "Vélez":                   [6.0106,  -73.6736],
  "Vetas":                   [7.3108,  -72.8683],
  "Villanueva":              [6.6719,  -73.1744],
  "Zapatoca":                [6.8153,  -73.2683],

  // Variantes sin tilde (fallback para datos guardados previamente)
  "Bolivar":                 [6.0375,  -73.7706],
  "Carcasi":                 [6.7267,  -72.6269],
  "Charala":                 [6.2847,  -73.1478],
  "Chipata":                 [6.0614,  -73.6375],
  "Concepcion":              [6.7669,  -72.6939],
  "Contratacion":            [6.2928,  -73.4728],
  "Curiti":                  [6.6058,  -73.0672],
  "El Carmen":               [6.6989,  -73.5111],
  "El Carmen de Chucuri":    [6.6989,  -73.5111],
  "El Penon":                [6.0556,  -73.8189],
  "El Playon":               [7.4764,  -73.2036],
  "Galan":                   [6.6372,  -73.2897],
  "Gambita":                 [6.2358,  -73.3444],
  "Giron":                   [7.0692,  -73.1697],
  "Guavata":                 [5.9550,  -73.7008],
  "Guepsa":                  [6.0244,  -73.5717],
  "Jesus Maria":             [5.8722,  -73.7817],
  "Landazuri":               [6.2186,  -73.8133],
  "Malaga":                  [6.6997,  -72.7322],
  "Paramo":                  [6.4383,  -73.1706],
  "San Andres":              [6.8119,  -72.8486],
  "San Joaquin":             [6.4656,  -72.8486],
  "San Jose de Miranda":     [6.6319,  -72.7317],
  "San Vicente de Chucuri":  [6.8819,  -73.4094],
  "Santa Barbara":           [6.9914,  -72.9075],
  "Santa Helena del Opon":   [6.3392,  -73.6183],
  "Surata":                  [7.3669,  -72.9833],
  "Valle de San Jose":       [6.4194,  -73.1431],
  "Velez":                   [6.0106,  -73.6736],
}

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
  municipio?: string
}

export function LocationPicker({ onLocationChange, initialLocation, municipio }: LocationPickerProps) {
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
    lat: initialLocation?.latitud != null ? Number(initialLocation.latitud) || 7.1254 : 7.1254,
    lng: initialLocation?.longitud != null ? Number(initialLocation.longitud) || -73.1198 : -73.1198,
  })
  const [isMapReady, setIsMapReady] = useState(false)
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
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

        // Fuerza recalcular dimensiones por si el contenedor no estaba visible al montar
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize()
          }
        }, 100)
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

  // Coloca (o reemplaza) el marcador de punto en unas coordenadas dadas
  const placePoint = useCallback((lat: number, lng: number) => {
    const L = leafletRef.current
    if (!mapInstanceRef.current || !L) return

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
  }, [onLocationChange, getCustomIcon])

  // Handle click for point mode
  const handlePointClick = useCallback((e: L.LeafletMouseEvent) => {
    if (mode !== "punto") return
    placePoint(e.latlng.lat, e.latlng.lng)
  }, [mode, placePoint])

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

  // Fly to municipality center when selected (only if no marker/polygon placed yet)
  useEffect(() => {
    if (!municipio || !mapInstanceRef.current || !isMapReady) return
    if (markerRef.current || polygonRef.current) return
    const coords = MUNICIPIOS_SANTANDER_COORDS[municipio]
    if (coords) {
      mapInstanceRef.current.invalidateSize()
      mapInstanceRef.current.flyTo(coords, 13)
    }
  }, [municipio, isMapReady])

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

  // Localiza la ubicación actual del dispositivo (GPS) y coloca el punto ahí
  const locateMe = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("La geolocalización no está disponible en este dispositivo.")
      return
    }
    setGeoError(null)
    setLocating(true)
    clearDrawing()
    setMode("punto")
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        placePoint(latitude, longitude)
        mapInstanceRef.current?.flyTo([latitude, longitude], 16)
        setLocating(false)
      },
      (err) => {
        setLocating(false)
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Permiso de ubicación denegado. Actívalo en el navegador para usar tu ubicación."
            : "No se pudo obtener tu ubicación. Intenta de nuevo o marca el punto manualmente."
        )
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={mode === "punto" && !isDrawing ? "default" : "outline"}
          size="sm"
          onClick={switchToPointMode}
          className="gap-2 h-10 px-4 md:h-11 md:px-5 md:text-sm"
        >
          <MapPin className="h-4 w-4" />
          Marcar Punto
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={locateMe}
          disabled={locating}
          className="gap-2 h-10 px-4 md:h-11 md:px-5 md:text-sm"
        >
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
          {locating ? "Localizando..." : "Mi ubicación"}
        </Button>
        <Button
          type="button"
          variant={mode === "poligono" ? "default" : "outline"}
          size="sm"
          onClick={startPolygonDrawing}
          className="gap-2 h-10 px-4 md:h-11 md:px-5 md:text-sm"
        >
          <Pentagon className="h-4 w-4" />
          Dibujar Polígono
        </Button>
        {isDrawing && polygonPoints.length >= 3 && (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={finishPolygonDrawing}
            className="gap-2 h-10 px-4 md:h-11 md:px-5 md:text-sm bg-green-600 hover:bg-green-700"
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
            className="gap-2 h-10 px-4 md:h-11 md:px-5 md:text-sm text-destructive hover:text-destructive bg-transparent"
          >
            <Trash2 className="h-4 w-4" />
            Limpiar
          </Button>
        )}
      </div>

      {geoError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {geoError}
        </div>
      )}

      {isDrawing && (
        <div className="rounded-md bg-primary/10 p-3 text-sm text-primary">
          Toca el mapa para agregar puntos al polígono. Mínimo 3 puntos.
        </div>
      )}

      <div
        ref={mapRef}
        className="h-[300px] md:h-[420px] w-full rounded-lg border border-border"
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
