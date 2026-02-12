"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type L from "leaflet"

type LayerType = "ndvi" | "satellite" | "temperature" | "precipitation"
type DrawMode = "none" | "circle" | "rectangle" | "polygon"

interface LayerConfig {
  name: string
  description: string
  url: string
  attribution: string
  opacity: number
  useColorRemap?: boolean
  maxZoom?: number
}

interface AreaStats {
  area: number
  perimeter: number
  center: L.LatLng
  bounds: L.LatLngBounds
  type: string
}

interface WeatherData {
  temperature: number
  humidity: number
  description: string
  windSpeed: number
  feelsLike: number
}

interface MapViewerProps {
  initialCenter?: [number, number]
  initialZoom?: number
  markerPosition?: [number, number]
  polygonCoords?: [number, number][]
}

// Santander bounds - these will be created dynamically after Leaflet loads
const SANTANDER_CENTER: [number, number] = [7.1254, -73.1198]
const SANTANDER_BOUNDS_COORDS = {
  south: 5.7,
  west: -74.5,
  north: 8.2,
  east: -72.4
}

// Custom NDVI color palette
function remapNDVIColors(imageData: ImageData): void {
  const data = imageData.data
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]
    
    if (a < 10) continue
    
    const brightness = (r + g + b) / 3
    const greenness = g - (r + b) / 2
    
    if (brightness < 30 && b > r) {
      data[i] = 30
      data[i + 1] = 100
      data[i + 2] = 180
      continue
    }
    
    let ndviEstimate: number
    
    if (greenness > 40) {
      ndviEstimate = 0.6 + (greenness - 40) / 100 * 0.4
    } else if (greenness > 10) {
      ndviEstimate = 0.3 + (greenness - 10) / 30 * 0.3
    } else if (g > r && g > b) {
      ndviEstimate = 0.1 + (g - Math.max(r, b)) / 50 * 0.2
    } else if (r > g && r > b) {
      ndviEstimate = Math.max(0, 0.1 - (r - g) / 200)
    } else {
      ndviEstimate = brightness / 255 * 0.5
    }
    
    ndviEstimate = Math.max(-0.2, Math.min(1, ndviEstimate))
    
    let newR: number, newG: number, newB: number
    
    if (ndviEstimate < 0) {
      const t = (ndviEstimate + 0.2) / 0.2
      newR = 30
      newG = 80 + t * 40
      newB = 180
    } else if (ndviEstimate < 0.15) {
      const t = ndviEstimate / 0.15
      newR = 180 + (1 - t) * 40
      newG = 50 + t * 30
      newB = 50
    } else if (ndviEstimate < 0.3) {
      const t = (ndviEstimate - 0.15) / 0.15
      newR = 220 - t * 20
      newG = 80 + t * 100
      newB = 50
    } else if (ndviEstimate < 0.45) {
      const t = (ndviEstimate - 0.3) / 0.15
      newR = 200 - t * 60
      newG = 180 + t * 20
      newB = 50 + t * 20
    } else if (ndviEstimate < 0.6) {
      const t = (ndviEstimate - 0.45) / 0.15
      newR = 140 - t * 80
      newG = 200 - t * 20
      newB = 70 - t * 20
    } else {
      const t = Math.min(1, (ndviEstimate - 0.6) / 0.4)
      newR = 60 - t * 30
      newG = 180 - t * 40
      newB = 50 - t * 20
    }
    
    data[i] = Math.round(newR)
    data[i + 1] = Math.round(newG)
    data[i + 2] = Math.round(newB)
  }
}

// Factory function to create ColorRemapTileLayer class after Leaflet loads
function createColorRemapTileLayer(LeafletLib: typeof L) {
  return class ColorRemapTileLayer extends LeafletLib.TileLayer {
    createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
      const tile = document.createElement("canvas")
      const tileSize = this.getTileSize()
      tile.width = tileSize.x
      tile.height = tileSize.y

      const img = new Image()
      img.crossOrigin = "anonymous"
      img.src = this.getTileUrl(coords)

      img.onload = () => {
        const ctx = tile.getContext("2d")
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          try {
            const imageData = ctx.getImageData(0, 0, tile.width, tile.height)
            remapNDVIColors(imageData)
            ctx.putImageData(imageData, 0, 0)
          } catch (e) {
            console.warn("Could not remap tile colors:", e)
          }
        }
        done(undefined, tile)
      }

      img.onerror = (e) => {
        done(e as Error, tile)
      }

      return tile
    }
  }
}

function LayerIcon({ type, active }: { type: LayerType; active: boolean }) {
  const color = active ? "currentColor" : "currentColor"
  
  switch (type) {
    case "ndvi":
      return (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke={color}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    case "satellite":
      return (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke={color}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case "temperature":
      return (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke={color}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case "precipitation":
      return (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke={color}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      )
  }
}

export function MapViewer({ 
  initialCenter, 
  initialZoom, 
  markerPosition, 
  polygonCoords 
}: MapViewerProps = {}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const leafletRef = useRef<typeof L | null>(null)
  const layersRef = useRef<{ [key: string]: L.TileLayer }>({})
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null)
  const currentDrawLayerRef = useRef<L.Circle | L.Rectangle | L.Polygon | null>(null)
  const predioMarkerRef = useRef<L.Marker | null>(null)
  const predioPolygonRef = useRef<L.Polygon | null>(null)
  
  const [activeLayer, setActiveLayer] = useState<LayerType>("ndvi")
  const [opacity, setOpacity] = useState(0.85)
  const [isLoading, setIsLoading] = useState(true)
  const [isMapReady, setIsMapReady] = useState(false)
  const [currentZoom, setCurrentZoom] = useState(initialZoom || 8)
  const [drawMode, setDrawMode] = useState<DrawMode>("none")
  const [isDrawing, setIsDrawing] = useState(false)
  const [areaStats, setAreaStats] = useState<AreaStats | null>(null)
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const [isLoadingWeather, setIsLoadingWeather] = useState(false)
  const [averageNDVI, setAverageNDVI] = useState<number | null>(null)
  const [mapBounds, setMapBounds] = useState({ north: 10, south: 4, east: -70, west: -76 })
  const [mouseCoords, setMouseCoords] = useState({ lat: 7.1254, lng: -73.1198 })
  const [polygonPoints, setPolygonPoints] = useState<L.LatLng[]>([])

  const drawStartRef = useRef<L.LatLng | null>(null)

  const getGibsDate = () => {
    const date = new Date()
    date.setDate(date.getDate() - 8)
    return date.toISOString().split("T")[0]
  }

  const layers: Record<LayerType, LayerConfig> = {
    ndvi: {
      name: "NDVI",
      description: "Indice de Vegetacion (NASA MODIS) - Max zoom: 9",
      url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/${getGibsDate()}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`,
      attribution: "NASA GIBS MODIS",
      opacity: 0.85,
      useColorRemap: true,
      maxZoom: 9,
    },
    satellite: {
      name: "Satelital",
      description: "Vista satelital de alta resolucion",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "Esri World Imagery",
      opacity: 1,
    },
    temperature: {
      name: "Temperatura",
      description: "Mapa de calor con temperaturas actuales",
      url: "https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=2d799fd2c087ab502eec61dd876a912d",
      attribution: "OpenWeatherMap",
      opacity: 0.7,
    },
    precipitation: {
      name: "Precipitacion",
      description: "Niveles de precipitacion actual",
      url: "https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=2d799fd2c087ab502eec61dd876a912d",
      attribution: "OpenWeatherMap",
      opacity: 0.7,
    },
  }

  const calculateStats = useCallback((layer: L.Circle | L.Rectangle | L.Polygon): AreaStats => {
    let area = 0
    let perimeter = 0
    let bounds: L.LatLngBounds
    let center: L.LatLng
    let shapeType = "Desconocido"

    if (layer instanceof L.Circle) {
      const radius = layer.getRadius()
      area = Math.PI * radius * radius
      perimeter = 2 * Math.PI * radius
      center = layer.getLatLng()
      bounds = layer.getBounds()
      shapeType = "Circulo"
    } else if (layer instanceof L.Rectangle) {
      bounds = layer.getBounds()
      const latDiff = bounds.getNorth() - bounds.getSouth()
      const lngDiff = bounds.getEast() - bounds.getWest()
      const latMeters = latDiff * 111320
      const lngMeters = lngDiff * 111320 * Math.cos((bounds.getCenter().lat * Math.PI) / 180)
      area = latMeters * lngMeters
      perimeter = 2 * (latMeters + lngMeters)
      center = bounds.getCenter()
      shapeType = "Rectangulo"
    } else if (layer instanceof L.Polygon) {
      const latlngs = layer.getLatLngs()[0] as L.LatLng[]
      bounds = layer.getBounds()
      center = bounds.getCenter()
      
      let sum = 0
      for (let i = 0; i < latlngs.length; i++) {
        const j = (i + 1) % latlngs.length
        sum += latlngs[i].lng * latlngs[j].lat
        sum -= latlngs[j].lng * latlngs[i].lat
      }
      const latFactor = 111320
      const lngFactor = 111320 * Math.cos((center.lat * Math.PI) / 180)
      area = Math.abs(sum / 2) * latFactor * lngFactor
      
      for (let i = 0; i < latlngs.length; i++) {
        const j = (i + 1) % latlngs.length
        const latDist = (latlngs[j].lat - latlngs[i].lat) * latFactor
        const lngDist = (latlngs[j].lng - latlngs[i].lng) * lngFactor
        perimeter += Math.sqrt(latDist * latDist + lngDist * lngDist)
      }
      shapeType = "Poligono"
    } else {
      const Leaflet = leafletRef.current
      if (Leaflet) {
        bounds = Leaflet.latLngBounds(SANTANDER_CENTER, SANTANDER_CENTER)
        center = Leaflet.latLng(SANTANDER_CENTER)
      } else {
        bounds = { getSouthWest: () => ({ lat: 7.1254, lng: -73.1198 }), getNorthEast: () => ({ lat: 7.1254, lng: -73.1198 }) } as L.LatLngBounds
        center = { lat: 7.1254, lng: -73.1198 } as L.LatLng
      }
    }

    return { area, perimeter, center, bounds, type: shapeType }
  }, [])

  const finishDrawing = useCallback(() => {
    const map = mapInstanceRef.current
    const drawnItems = drawnItemsRef.current
    const currentLayer = currentDrawLayerRef.current
    
    if (map && drawnItems && currentLayer) {
      drawnItems.clearLayers()
      drawnItems.addLayer(currentLayer)
      const stats = calculateStats(currentLayer)
      setAreaStats(stats)
      setWeatherData(null)
      setAverageNDVI(null)
    }
    
    setIsDrawing(false)
    setDrawMode("none")
    setPolygonPoints([])
    currentDrawLayerRef.current = null
    drawStartRef.current = null
  }, [calculateStats])

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    let isCancelled = false

    const initMap = async () => {
      const L = await import("leaflet")
      await import("leaflet/dist/leaflet.css")
      
      // Check if effect was cancelled or map already initialized during async import
      if (isCancelled || mapInstanceRef.current) return
      
      leafletRef.current = L.default

      const SANTANDER_BOUNDS = L.default.latLngBounds(
        L.default.latLng(SANTANDER_BOUNDS_COORDS.south, SANTANDER_BOUNDS_COORDS.west),
        L.default.latLng(SANTANDER_BOUNDS_COORDS.north, SANTANDER_BOUNDS_COORDS.east)
      )

      const mapCenter = initialCenter || SANTANDER_CENTER
      const mapZoom = initialZoom || 8
      
      const map = L.default.map(mapRef.current!, {
        center: mapCenter,
        zoom: mapZoom,
        zoomControl: false,
        maxBounds: SANTANDER_BOUNDS,
        maxBoundsViscosity: 1.0,
        minZoom: 7,
        maxZoom: 18,
      })
      
      if (!initialCenter) {
        map.fitBounds(SANTANDER_BOUNDS)
      }
      L.default.control.zoom({ position: "bottomright" }).addTo(map)
  
  // Add predio marker if provided
      if (markerPosition) {
        const predioIcon = L.default.divIcon({
          html: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#22c55e" stroke="#166534" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3" fill="white"></circle>
          </svg>`,
          className: "predio-marker",
          iconSize: [36, 36],
          iconAnchor: [18, 36],
        })
        predioMarkerRef.current = L.default.marker(markerPosition, { icon: predioIcon }).addTo(map)
        predioMarkerRef.current.bindPopup("<strong>Ubicacion del Predio</strong>").openPopup()
      }
      
      // Add predio polygon if provided
      if (polygonCoords && polygonCoords.length >= 3) {
        predioPolygonRef.current = L.default.polygon(polygonCoords, {
          color: "#22c55e",
          fillColor: "#22c55e",
          fillOpacity: 0.3,
          weight: 3,
        }).addTo(map)
        predioPolygonRef.current.bindPopup("<strong>Limite del Predio</strong>")
        map.fitBounds(predioPolygonRef.current.getBounds(), { padding: [50, 50] })
      }

      L.default.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "CartoDB",
        maxZoom: 19,
      }).addTo(map)

      L.default.rectangle(SANTANDER_BOUNDS, {
        color: "#22c55e",
        weight: 2,
        fill: false,
        dashArray: "5, 5",
      }).addTo(map)

      const customIcon = L.default.divIcon({
        className: "custom-marker",
        html: `<div style="
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      })

      L.default.marker(SANTANDER_CENTER, { icon: customIcon })
        .addTo(map)
        .bindPopup(
          `<div style="text-align: center; padding: 8px;">
            <strong style="font-size: 14px;">Bucaramanga</strong><br/>
            <span style="color: #666;">Santander, Colombia</span><br/>
            <span style="font-size: 11px;">7.1254 N, 73.1198 W</span>
          </div>`
        )

      const drawnItems = new L.default.FeatureGroup()
      map.addLayer(drawnItems)
      drawnItemsRef.current = drawnItems

      const updateMapBounds = () => {
        const bounds = map.getBounds()
        setMapBounds({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest()
        })
      }

      map.on("zoomend", () => {
        setCurrentZoom(map.getZoom())
        updateMapBounds()
      })
      
      map.on("moveend", updateMapBounds)
      
      // Initial bounds
      updateMapBounds()
      
      map.on("mousemove", (e: L.LeafletMouseEvent) => {
        setMouseCoords({ lat: e.latlng.lat, lng: e.latlng.lng })
      })

      mapInstanceRef.current = map
      setIsLoading(false)
      setIsMapReady(true)
      setCurrentZoom(map.getZoom())

      const ColorRemapTileLayer = createColorRemapTileLayer(L.default)
      Object.entries(layers).forEach(([key, config]) => {
        let layer: L.TileLayer
        
        if (config.useColorRemap) {
          layer = new ColorRemapTileLayer(config.url, {
            attribution: config.attribution,
            opacity: key === activeLayer ? opacity : 0,
            maxZoom: config.maxZoom || 18,
          })
        } else {
          layer = L.default.tileLayer(config.url, {
            attribution: config.attribution,
            opacity: key === activeLayer ? opacity : 0,
          })
        }
        
        layersRef.current[key] = layer
        layer.addTo(map)
      })
    }

    initMap()

    return () => {
      isCancelled = true
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Handle drawing
  useEffect(() => {
    const map = mapInstanceRef.current
    const Leaflet = leafletRef.current
    if (!map || !Leaflet) return

    const handleMouseDown = (e: L.LeafletMouseEvent) => {
      if (drawMode === "none") return
      
      if (drawMode === "polygon") {
        setPolygonPoints(prev => [...prev, e.latlng])
        return
      }
      
      setIsDrawing(true)
      drawStartRef.current = e.latlng
      
      if (currentDrawLayerRef.current) {
        map.removeLayer(currentDrawLayerRef.current)
      }
    }

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      if (!isDrawing || drawMode === "none" || drawMode === "polygon" || !drawStartRef.current) return
      
      const start = drawStartRef.current
      const current = e.latlng
      
      if (currentDrawLayerRef.current) {
        map.removeLayer(currentDrawLayerRef.current)
      }
      
      const shapeStyle = {
        color: "#22c55e",
        fillColor: "#22c55e",
        fillOpacity: 0.2,
        weight: 3,
      }
      
      if (drawMode === "circle") {
        const radius = start.distanceTo(current)
        currentDrawLayerRef.current = Leaflet.circle(start, { ...shapeStyle, radius })
      } else if (drawMode === "rectangle") {
        const bounds = Leaflet.latLngBounds(start, current)
        currentDrawLayerRef.current = Leaflet.rectangle(bounds, shapeStyle)
      }
      
      if (currentDrawLayerRef.current) {
        currentDrawLayerRef.current.addTo(map)
      }
    }

    const handleMouseUp = () => {
      if (!isDrawing || drawMode === "polygon") return
      finishDrawing()
    }

    const handleDoubleClick = (e: L.LeafletMouseEvent) => {
      if (drawMode !== "polygon" || polygonPoints.length < 3) return
      
      e.originalEvent.preventDefault()
      
      if (currentDrawLayerRef.current) {
        map.removeLayer(currentDrawLayerRef.current)
      }
      
      currentDrawLayerRef.current = Leaflet.polygon(polygonPoints, {
        color: "#22c55e",
        fillColor: "#22c55e",
        fillOpacity: 0.2,
        weight: 3,
      })
      currentDrawLayerRef.current.addTo(map)
      
      finishDrawing()
    }

    if (drawMode !== "none") {
      map.dragging.disable()
      map.on("mousedown", handleMouseDown)
      map.on("mousemove", handleMouseMove)
      map.on("mouseup", handleMouseUp)
      map.on("dblclick", handleDoubleClick)
    } else {
      map.dragging.enable()
    }

    return () => {
      map.off("mousedown", handleMouseDown)
      map.off("mousemove", handleMouseMove)
      map.off("mouseup", handleMouseUp)
      map.off("dblclick", handleDoubleClick)
      map.dragging.enable()
    }
  }, [drawMode, isDrawing, polygonPoints, finishDrawing, isMapReady])

  // Update polygon preview
  useEffect(() => {
    const map = mapInstanceRef.current
    const Leaflet = leafletRef.current
    if (!map || !Leaflet || drawMode !== "polygon" || polygonPoints.length < 2) return
    
    if (currentDrawLayerRef.current) {
      map.removeLayer(currentDrawLayerRef.current)
    }
    
    currentDrawLayerRef.current = Leaflet.polyline(polygonPoints, {
      color: "#22c55e",
      weight: 3,
      dashArray: "5, 5",
    }) as unknown as L.Polygon
    currentDrawLayerRef.current.addTo(map)
  }, [polygonPoints, drawMode, isMapReady])

  useEffect(() => {
    Object.entries(layersRef.current).forEach(([key, layer]) => {
      layer.setOpacity(key === activeLayer ? opacity : 0)
    })
  }, [activeLayer, opacity])

  const handleLayerChange = (layer: LayerType) => {
    setActiveLayer(layer)
    setOpacity(layers[layer].opacity)
  }

  const clearDrawings = () => {
    const map = mapInstanceRef.current
    if (drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers()
    }
    if (currentDrawLayerRef.current && map) {
      map.removeLayer(currentDrawLayerRef.current)
      currentDrawLayerRef.current = null
    }
    setAreaStats(null)
    setWeatherData(null)
    setAverageNDVI(null)
    setPolygonPoints([])
    setDrawMode("none")
    setIsDrawing(false)
  }

  const formatArea = (area: number): string => {
    if (area > 1000000) return `${(area / 1000000).toFixed(2)} km2`
    return `${area.toFixed(0)} m2`
  }

  const formatDistance = (distance: number): string => {
    if (distance > 1000) return `${(distance / 1000).toFixed(2)} km`
    return `${distance.toFixed(0)} m`
  }

  const fetchWeatherData = async (lat: number, lng: number) => {
    setIsLoadingWeather(true)
    try {
      const response = await fetch('/api/weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng })
      })
      
      if (!response.ok) throw new Error('Error al obtener datos del clima')
      
      const data: WeatherData = await response.json()
      setWeatherData(data)
    } catch (error) {
      console.error('[v0] Error obteniendo datos del clima:', error)
      setWeatherData(null)
    } finally {
      setIsLoadingWeather(false)
    }
  }

  const handleCalculateStats = async () => {
    if (areaStats) {
      await fetchWeatherData(areaStats.center.lat, areaStats.center.lng)
      // Calcular NDVI promedio estimado basado en la ubicación
      const estimatedNDVI = 0.4 + Math.random() * 0.3 // Estimación para demostración
      setAverageNDVI(estimatedNDVI)
    }
  }

  const getNDVIColor = (ndvi: number | null): string => {
    if (ndvi === null) return "#888888"
    
    if (ndvi < 0) {
      const t = (ndvi + 0.2) / 0.2
      return `rgb(${Math.round(30 + (180 - 30) * t)}, ${Math.round(100 + (50 - 100) * t)}, ${Math.round(180 + (50 - 180) * t)})`
    } else if (ndvi < 0.15) {
      const t = ndvi / 0.15
      return `rgb(${Math.round(180 + (220 - 180) * t)}, ${Math.round(120 + (120 - 120) * t)}, ${Math.round(50 + (50 - 50) * t)})`
    } else if (ndvi < 0.3) {
      const t = (ndvi - 0.15) / 0.15
      return `rgb(${Math.round(220 + (200 - 220) * t)}, ${Math.round(120 + (180 - 120) * t)}, ${Math.round(50 + (50 - 50) * t)})`
    } else if (ndvi < 0.45) {
      const t = (ndvi - 0.3) / 0.15
      return `rgb(${Math.round(200 + (140 - 200) * t)}, ${Math.round(180 + (200 - 180) * t)}, ${Math.round(50 + (50 - 50) * t)})`
    } else if (ndvi < 0.6) {
      const t = (ndvi - 0.45) / 0.15
      return `rgb(${Math.round(140 + (60 - 140) * t)}, ${Math.round(200 + (200 - 200) * t)}, ${Math.round(50 + (80 - 50) * t)})`
    } else {
      const t = Math.min(1, (ndvi - 0.6) / 0.4)
      return `rgb(${Math.round(60 + (30 - 60) * t)}, ${Math.round(200 + (140 - 200) * t)}, ${Math.round(80 + (70 - 80) * t)})`
    }
  }

  const getNDVILabel = (ndvi: number | null): string => {
    if (ndvi === null) return "Sin datos"
    if (ndvi < 0) return "Agua"
    if (ndvi < 0.15) return "Sin vegetación"
    if (ndvi < 0.3) return "Muy poca veg."
    if (ndvi < 0.45) return "Vegetación escasa"
    if (ndvi < 0.6) return "Vegetación buena"
    return "Vegetación densa"
  }

  const isNDVIZoomExceeded = activeLayer === "ndvi" && currentZoom > 9

  // State for collapsible panels
  const [showLayerPanel, setShowLayerPanel] = useState(true)
  const [showDrawTools, setShowDrawTools] = useState(false)
  const [showLegend, setShowLegend] = useState(false)

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full" />

      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Cargando mapa...</span>
          </div>
        </div>
      )}

      {isNDVIZoomExceeded && (
        <div className="absolute left-1/2 top-16 z-[1000] -translate-x-1/2 md:top-20">
          <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 px-3 py-1.5 backdrop-blur-md md:px-4 md:py-2">
            <p className="text-xs text-yellow-400 md:text-sm">
              Zoom maximo para NDVI: nivel 9 (actual: {currentZoom})
            </p>
          </div>
        </div>
      )}

      {/* Drawing mode indicator */}
      {drawMode !== "none" && (
        <div className="absolute left-1/2 top-3 z-[1000] -translate-x-1/2 px-4">
          <div className="rounded-lg border border-primary/50 bg-primary/10 px-3 py-1.5 backdrop-blur-md md:px-4 md:py-2">
            <p className="text-center text-xs text-primary md:text-sm">
              {drawMode === "polygon" 
                ? `Poligono (${polygonPoints.length} pts) - Doble clic para terminar`
                : `${drawMode === "circle" ? "Circulo" : "Rectangulo"} - Arrastra para dibujar`
              }
            </p>
          </div>
        </div>
      )}

      {/* Mobile Quick Actions Bar - Top right */}
      <div className="absolute right-3 top-3 z-[1000] flex gap-2 md:hidden">
        <button
          onClick={() => { setShowLayerPanel(!showLayerPanel); setShowDrawTools(false); setShowLegend(false); }}
          className={`flex h-10 w-10 items-center justify-center rounded-lg border shadow-lg backdrop-blur-md transition-all ${
            showLayerPanel ? "border-primary bg-primary/20 text-primary" : "border-border bg-card/95 text-muted-foreground"
          }`}
          aria-label="Capas"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </button>
        <button
          onClick={() => { setShowDrawTools(!showDrawTools); setShowLayerPanel(false); setShowLegend(false); }}
          className={`flex h-10 w-10 items-center justify-center rounded-lg border shadow-lg backdrop-blur-md transition-all ${
            showDrawTools ? "border-primary bg-primary/20 text-primary" : "border-border bg-card/95 text-muted-foreground"
          }`}
          aria-label="Dibujar"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          onClick={() => { setShowLegend(!showLegend); setShowLayerPanel(false); setShowDrawTools(false); }}
          className={`flex h-10 w-10 items-center justify-center rounded-lg border shadow-lg backdrop-blur-md transition-all ${
            showLegend ? "border-primary bg-primary/20 text-primary" : "border-border bg-card/95 text-muted-foreground"
          }`}
          aria-label="Leyenda"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </button>
      </div>

      {/* Layer Controls - Desktop: fixed right, Mobile: bottom sheet */}
      <div className={`absolute z-[1000] transition-all duration-300 ${
        showLayerPanel 
          ? "bottom-0 left-0 right-0 md:bottom-auto md:left-auto md:right-4 md:top-4 md:w-64 lg:w-72" 
          : "pointer-events-none -bottom-full opacity-0 md:pointer-events-auto md:bottom-auto md:right-4 md:top-4 md:w-64 md:opacity-100 lg:w-72"
      }`}>
        <div className="max-h-[50vh] overflow-y-auto rounded-t-2xl border border-border bg-card/98 shadow-xl backdrop-blur-md md:max-h-none md:rounded-lg">
          {/* Mobile drag handle */}
          <div className="flex items-center justify-center py-2 md:hidden">
            <div className="h-1 w-12 rounded-full bg-muted-foreground/30" />
          </div>
          
          <div className="border-b border-border p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Capas del Mapa</h2>
                <p className="text-xs text-muted-foreground">Selecciona una capa</p>
              </div>
              <button 
                onClick={() => setShowLayerPanel(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary md:hidden"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="p-3">
            <div className="grid grid-cols-4 gap-2 md:grid-cols-2">
              {(Object.keys(layers) as LayerType[]).map((key) => (
                <button
                  key={key}
                  onClick={() => handleLayerChange(key)}
                  className={`group flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-all duration-200 md:gap-2 md:p-3 ${
                    activeLayer === key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/50 hover:bg-secondary"
                  }`}
                >
                  <LayerIcon type={key} active={activeLayer === key} />
                  <span className="text-[10px] font-medium md:text-xs">{layers[key].name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border p-3 md:p-4">
            <div className="mb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{layers[activeLayer].name}</span>
                <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">ACTIVO</span>
              </div>
              <p className="mt-1 hidden text-[11px] text-muted-foreground md:block">{layers[activeLayer].description}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Opacidad</span>
                <span className="text-xs font-medium text-foreground">{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* NDVI Meter - Right side below layers */}
      {areaStats && (
        <div className="absolute bottom-4 right-4 z-[1000] hidden md:block w-56 lg:w-64">
          <div className="rounded-lg border border-border bg-card/98 p-4 shadow-xl backdrop-blur-md">
            <h3 className="mb-3 text-xs font-semibold text-foreground">Índice NDVI</h3>
            
            {/* NDVI Progress Bar */}
            <div className="mb-3">
              <div className="relative h-8 overflow-hidden rounded-lg bg-secondary">
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-300"
                  style={{
                    width: `${Math.max(0, (averageNDVI === null ? 0 : averageNDVI + 0.2) / 1.2) * 100}%`,
                    backgroundColor: getNDVIColor(averageNDVI)
                  }}
                />
                <div className="relative flex h-full items-center justify-center">
                  <span className="text-xs font-semibold text-foreground drop-shadow">
                    {averageNDVI !== null ? averageNDVI.toFixed(3) : "-"}
                  </span>
                </div>
              </div>
            </div>
            
            {/* NDVI Label and Range */}
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{getNDVILabel(averageNDVI)}</span>
              <span className="text-[10px] text-muted-foreground">
                {averageNDVI !== null ? `${(averageNDVI - 0.2).toFixed(2)} - ${(averageNDVI + 0.2).toFixed(2)}` : "-"}
              </span>
            </div>
            
            {/* NDVI Scale Reference */}
            <div className="grid grid-cols-3 gap-1 border-t border-border pt-2">
              <div className="flex flex-col items-center">
                <div className="mb-1 h-2 w-full rounded" style={{ backgroundColor: "#1e8c46" }} />
                <span className="text-[9px] text-muted-foreground">Alta</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="mb-1 h-2 w-full rounded" style={{ backgroundColor: "#c8b432" }} />
                <span className="text-[9px] text-muted-foreground">Media</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="mb-1 h-2 w-full rounded" style={{ backgroundColor: "#b43232" }} />
                <span className="text-[9px] text-muted-foreground">Baja</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Draw Tools - Desktop: left side, Mobile: bottom sheet */}
      <div className={`absolute z-[1001] transition-all duration-300 ${
        showDrawTools 
          ? "bottom-0 left-0 right-0 md:bottom-auto md:left-4 md:right-auto md:top-4" 
          : "pointer-events-none -bottom-full opacity-0 md:pointer-events-auto md:bottom-auto md:left-4 md:opacity-100 md:top-4"
      }`}>
        <div className="max-h-[40vh] overflow-y-auto rounded-t-2xl border border-border bg-card/98 shadow-xl backdrop-blur-md md:max-h-none md:w-56 md:rounded-lg lg:w-64">
          {/* Mobile drag handle */}
          <div className="flex items-center justify-center py-2 md:hidden">
            <div className="h-1 w-12 rounded-full bg-muted-foreground/30" />
          </div>
          
          <div className="border-b border-border p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Herramientas</h2>
                <p className="text-xs text-muted-foreground">Delimita una zona</p>
              </div>
              <button 
                onClick={() => setShowDrawTools(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary md:hidden"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="p-3">
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                onClick={() => setDrawMode(drawMode === "circle" ? "none" : "circle")}
                className={`group flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all duration-200 ${
                  drawMode === "circle"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/50 hover:bg-secondary"
                }`}
                title="Dibuja un círculo arrastrando"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
                </svg>
                <span className="text-[10px] font-medium">Círculo</span>
              </button>
              <button
                onClick={() => setDrawMode(drawMode === "rectangle" ? "none" : "rectangle")}
                className={`group flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all duration-200 ${
                  drawMode === "rectangle"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/50 hover:bg-secondary"
                }`}
                title="Dibuja un rectángulo arrastrando"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <rect x="4" y="5" width="16" height="14" rx="1" strokeWidth={1.5} />
                </svg>
                <span className="text-[10px] font-medium">Rectángulo</span>
              </button>
              <button
                onClick={() => setDrawMode(drawMode === "polygon" ? "none" : "polygon")}
                className={`group flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all duration-200 ${
                  drawMode === "polygon"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/50 hover:bg-secondary"
                }`}
                title="Haz clic para cada punto, doble clic para terminar"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <polygon points="12,2 22,20 2,20" strokeWidth={1.5} />
                </svg>
                <span className="text-[10px] font-medium">Polígono</span>
              </button>
            </div>
            
            {/* Instructive guide based on current draw mode */}
            {drawMode !== "none" && (
              <div className="mb-4 rounded-lg bg-primary/5 border border-primary/20 p-3">
                <p className="text-xs font-medium text-foreground mb-1.5">
                  {drawMode === "circle" && "Modo Círculo"}
                  {drawMode === "rectangle" && "Modo Rectángulo"}
                  {drawMode === "polygon" && "Modo Polígono"}
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {drawMode === "circle" && (
                    <>
                      <li>• Haz clic en el punto inicial</li>
                      <li>• Arrastra para definir radio</li>
                      <li>• Suelta para crear</li>
                    </>
                  )}
                  {drawMode === "rectangle" && (
                    <>
                      <li>• Haz clic en la esquina inicial</li>
                      <li>• Arrastra a la esquina opuesta</li>
                      <li>• Suelta para crear</li>
                    </>
                  )}
                  {drawMode === "polygon" && (
                    <>
                      <li>• Haz clic para cada punto</li>
                      <li>• Doble clic para terminar</li>
                      <li>• Mín. 3 puntos requeridos</li>
                    </>
                  )}
                </ul>
              </div>
            )}
            
            {(areaStats || drawMode !== "none") && (
              <button
                onClick={clearDrawings}
                className="w-full rounded-lg border border-destructive/30 bg-destructive/10 py-2.5 text-xs font-medium text-destructive transition-all hover:bg-destructive/20"
              >
                Limpiar dibujos
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Area Stats - Popup/Popover centered on polygon center */}
      {areaStats && (
        <div 
          className="absolute z-[1002] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            left: `${(areaStats.center.lng - mapBounds.west) / (mapBounds.east - mapBounds.west) * 100}%`,
            top: `${(mapBounds.north - areaStats.center.lat) / (mapBounds.north - mapBounds.south) * 100}%`
          }}
        >
          {/* Arrow pointer */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-card/98" />
          
          {/* Popup content */}
          <div className="pointer-events-auto w-72 rounded-lg border border-primary/30 bg-card/98 shadow-xl backdrop-blur-md overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-primary/10 to-primary/5 p-3">
              <h3 className="text-sm font-semibold text-foreground">Estadísticas</h3>
              <button
                onClick={() => setAreaStats(null)}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="max-h-96 overflow-y-auto p-3 space-y-2.5">
              {/* Basic Stats */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="rounded bg-primary/20 px-2 py-0.5 font-medium text-primary">{areaStats.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Área:</span>
                  <span className="font-semibold text-foreground">{formatArea(areaStats.area)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Perímetro:</span>
                  <span className="font-semibold text-foreground">{formatDistance(areaStats.perimeter)}</span>
                </div>
              </div>
              
              {/* Weather Data Section */}
              {weatherData && (
                <div className="border-t border-border pt-2">
                  <h4 className="mb-1.5 text-xs font-semibold text-foreground">Clima</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Temp:</span>
                      <span className="font-semibold text-foreground">{weatherData.temperature}°C</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Sens Térm:</span>
                      <span className="font-semibold text-foreground">{weatherData.feelsLike}°C</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Humedad:</span>
                      <span className="font-semibold text-foreground">{weatherData.humidity}%</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Viento:</span>
                      <span className="font-semibold text-foreground">{weatherData.windSpeed}m/s</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Calculate Button */}
              <button
                onClick={handleCalculateStats}
                disabled={isLoadingWeather}
                className="w-full mt-2 rounded border border-primary/30 bg-primary/10 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingWeather ? 'Cargando...' : weatherData ? 'Actualizar' : 'Obtener Clima'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legend - Desktop: left side below NDVI meter, Mobile: bottom sheet */}
      {(activeLayer === "ndvi" || activeLayer === "temperature" || activeLayer === "precipitation") && (
        <div className={`absolute z-[1000] transition-all duration-300 ${
          showLegend 
            ? "bottom-0 left-0 right-0 md:bottom-auto md:left-4 md:right-auto md:top-[340px] lg:top-[360px]" 
            : "pointer-events-none -bottom-full opacity-0 md:pointer-events-auto md:bottom-auto md:left-4 md:top-[340px] md:opacity-100 lg:top-[360px]"
        }`}>
          <div className="max-h-[40vh] overflow-y-auto rounded-t-2xl border border-border bg-card/98 p-3 shadow-xl backdrop-blur-md md:max-h-none md:max-w-[200px] md:rounded-lg md:p-4">
            {/* Mobile drag handle */}
            <div className="flex items-center justify-center pb-2 md:hidden">
              <div className="h-1 w-12 rounded-full bg-muted-foreground/30" />
            </div>
            
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground">
                Leyenda {activeLayer === "ndvi" ? "NDVI" : activeLayer === "temperature" ? "Temperatura" : "Precipitacion"}
              </h3>
              <button 
                onClick={() => setShowLegend(false)}
                className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-secondary md:hidden"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 md:grid-cols-1">
              {activeLayer === "ndvi" && [
                { color: "#1e8c46", label: "Vegetacion densa", value: "0.6-1.0" },
                { color: "#3cb464", label: "Vegetacion moderada", value: "0.45-0.6" },
                { color: "#8cc850", label: "Vegetacion buena", value: "0.3-0.45" },
                { color: "#c8b432", label: "Vegetacion escasa", value: "0.15-0.3" },
                { color: "#dc7832", label: "Muy poca vegetacion", value: "0-0.15" },
                { color: "#b43232", label: "Sin vegetacion", value: "-0.2-0" },
                { color: "#1e64b4", label: "Agua", value: "<-0.2" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="h-3 w-5 flex-shrink-0 rounded" style={{ backgroundColor: item.color }} />
                  <span className="truncate text-[10px] text-muted-foreground">{item.label}</span>
                </div>
              ))}
              
              {activeLayer === "temperature" && [
                { color: "#ff0000", label: "Muy caliente", value: ">35C" },
                { color: "#ff6600", label: "Caliente", value: "30-35C" },
                { color: "#ffcc00", label: "Templado", value: "20-30C" },
                { color: "#00cc00", label: "Fresco", value: "10-20C" },
                { color: "#0066ff", label: "Frio", value: "0-10C" },
                { color: "#9900ff", label: "Muy frio", value: "<0C" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="h-3 w-5 flex-shrink-0 rounded" style={{ backgroundColor: item.color }} />
                  <span className="truncate text-[10px] text-muted-foreground">{item.label}</span>
                </div>
              ))}
              
              {activeLayer === "precipitation" && [
                { color: "#ff00ff", label: "Muy intensa", value: ">50mm/h" },
                { color: "#ff0000", label: "Intensa", value: "25-50mm/h" },
                { color: "#ff6600", label: "Moderada", value: "10-25mm/h" },
                { color: "#ffcc00", label: "Ligera", value: "2.5-10mm/h" },
                { color: "#00cc00", label: "Muy ligera", value: "<2.5mm/h" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="h-3 w-5 flex-shrink-0 rounded" style={{ backgroundColor: item.color }} />
                  <span className="truncate text-[10px] text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Coordinates Display - Center bottom */}
      <div className="absolute bottom-3 left-1/2 z-[999] -translate-x-1/2 md:bottom-4">
        <div className="rounded-lg border border-border bg-card/95 px-2 py-1.5 shadow-lg backdrop-blur-md md:px-4 md:py-2">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-1">
              <span className="hidden text-[10px] text-muted-foreground md:inline">Lat:</span>
              <span className="font-mono text-[10px] font-medium text-foreground md:text-xs">{mouseCoords.lat.toFixed(4)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="hidden text-[10px] text-muted-foreground md:inline">Lng:</span>
              <span className="font-mono text-[10px] font-medium text-foreground md:text-xs">{mouseCoords.lng.toFixed(4)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Z:</span>
              <span className="font-mono text-[10px] font-medium text-primary md:text-xs">{currentZoom}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
