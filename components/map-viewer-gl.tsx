"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { PanelLeft, X, RotateCcw, Loader2, Satellite, CloudSun, Layers, MapPinned, ChevronDown, ShieldCheck, CircleDashed } from "lucide-react"
import * as maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { buildLayers, type LayerType, type LayerConfig } from "@/lib/map-layers"
import { canSee, type MapMarker } from "./map-viewer"

// El bundler de Next.js no resuelve correctamente el `new Worker(new URL(...))`
// que maplibre-gl arma internamente para su worker de GeoJSON/clustering:
// en vez de apuntar al bundle del worker, termina resolviendo a la URL de la
// página actual, y el worker nunca procesa nada (markers/clusters sin
// renderizar). Verificado con `pnpm build && pnpm start` (webpack, el build
// real de producción, no solo `next dev` con Turbopack) — sin este workaround
// `page.on('worker')` muestra el worker apuntando a la URL de la página en
// vez de a maplibre-gl-worker.mjs incluso en el bundle de producción. Por
// eso este workaround se necesita en dev Y en prod; no lo quites asumiendo
// que es solo una rareza de Turbopack. Apuntar explícitamente al bundle de
// worker que copiamos a /public lo soluciona.
if (typeof window !== "undefined") {
  maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs")
}

export interface MapViewerGLProps {
  initialCenter?: [number, number]
  initialZoom?: number
  markerPosition?: [number, number]
  polygonCoords?: [number, number][]
  markers?: MapMarker[]
  minimal?: boolean
  controlledLayer?: LayerType
  // Overlay adicional en modo minimal (ej. NDVI sobre satelital para la
  // miniatura de un predio) — independiente de controlledLayer, que solo
  // fija el fondo. Antes minimal solo aceptaba UNA capa exclusiva.
  controlledOverlay?: LayerType
  role?: 'admin' | 'asesor' | 'analista' | 'agricultor' | 'campesino'
}

// Bounds de Colombia continental + insular — igual que en map-viewer.tsx, para
// que el usuario no se salga del país navegando.
const COLOMBIA_BOUNDS: [[number, number], [number, number]] = [
  [-82, -4.5],   // suroeste [lng, lat]
  [-66.8, 13.5], // noreste [lng, lat]
]

// Punto centinela histórico (Bucaramanga, Santander) — igual que en
// map-viewer.tsx — usado como fallback cuando un predio no tiene GPS
// capturado ni polígono dibujado. Con miles de predios así, coinciden todos
// en el mismo pixel: pintarlos como círculos individuales es solo ruido
// (un cluster de "2k" superpuesto). Se excluyen del mapa por completo y se
// resumen como aviso de texto en la lista de municipios.
const DEFAULT_SENTINEL_POINT: [number, number] = [7.1254, -73.1198]
function isSentinelMarker(m: MapMarker): boolean {
  if (m.polygonCoords && m.polygonCoords.length >= 3) return false
  return Math.abs(m.position[0] - DEFAULT_SENTINEL_POINT[0]) < 0.0005
    && Math.abs(m.position[1] - DEFAULT_SENTINEL_POINT[1]) < 0.0005
}

// MapLibre no entiende el token {s} (subdominio round-robin) ni {r} (retina)
// que usa Leaflet — esta función expande la URL de un LayerConfig al array
// de URLs que espera un raster source de MapLibre.
function toMapLibreTiles(config: LayerConfig): string[] {
  const urlNoRetina = config.url.replace('{r}', '')
  if (urlNoRetina.includes('{s}') && config.subdomains) {
    return config.subdomains.split('').map(s => urlNoRetina.replace('{s}', s))
  }
  return [urlNoRetina]
}

// MapLibre GL usa csscolorparser para sus paint properties, que NO entiende
// la sintaxis CSS Color 4 (oklch(), color(), etc. sin comas) — solo hex/rgb/
// hsl clásicos. Leer --primary vía getComputedStyle devuelve el string tal
// cual está declarado en globals.css (los navegadores no lo convierten a
// rgb para custom properties), así que si el theme usa oklch() crudo (como
// agro-360), ese color pasado a 'circle-color' es inválido para MapLibre y
// los círculos de marcador/cluster no se pintan — sin ningún error visible,
// simplemente no aparecen. Se detecta el formato y se cae a un verde fijo
// si no es hex/rgb/hsl. Ver https://github.com/maplibre/maplibre-style-spec/discussions/70
function getMapBrandColor(): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
  return /^#|^rgb|^hsl/i.test(raw) ? raw : '#16a34a'
}

function sourceIdFor(key: LayerType): string {
  return `src-${key}`
}
function layerIdFor(key: LayerType): string {
  return `layer-${key}`
}

function isOverlayCategory(category: LayerConfig['category']): boolean {
  return category === 'nasa' || category === 'clima'
}

interface SelectedPredio {
  id: string
  name: string
  position: [number, number]
  polygonCoords?: [number, number][]
}

interface NdviResult {
  ndvi: number
  interpretacion: string
  color: string
  fecha: string
}

interface WeatherResult {
  temperature: number
  humidity: number
  description: string
  windSpeed: number
  feelsLike: number
}

export function MapViewerGL({
  initialCenter,
  initialZoom,
  markerPosition,
  polygonCoords,
  markers,
  minimal = false,
  controlledLayer,
  controlledOverlay,
  role,
}: MapViewerGLProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [isMapReady, setIsMapReady] = useState(false)
  // Fondo (base/satelital): exactamente uno activo, opaco, reemplaza el
  // anterior. Overlay (nasa/clima): opcional, semitransparente, se dibuja
  // ENCIMA del fondo — nunca lo reemplaza. Antes ambos grupos compartían el
  // mismo estado "una sola capa a la vez", así que elegir NDVI apagaba el
  // mapa base entero y solo quedaban los parches de color de NDVI flotando
  // sobre nada (el reporte de "veo puras manchas").
  // Satelital por defecto (no un mapa de líneas genérico) para que la vista
  // de un predio se sienta como "foto real del terreno" — el usuario sigue
  // pudiendo cambiarla a mano en el mapa completo.
  const [activeBackground, setActiveBackground] = useState<LayerType>(
    (controlledLayer && !isOverlayCategory(buildLayers()[controlledLayer].category)) ? controlledLayer : "satellite"
  )
  // Precipitación siempre activa por defecto en el mapa completo — "genial
  // ver dónde está lloviendo en tiempo real" — el resto de overlays (NDVI,
  // temperatura) el usuario los prende/apaga a mano como antes. En modo
  // minimal, controlledOverlay manda (ej. NDVI fijo sobre la miniatura del
  // predio) en vez de precipitación.
  const [activeOverlay, setActiveOverlay] = useState<LayerType | null>(
    controlledOverlay ??
    ((controlledLayer && isOverlayCategory(buildLayers()[controlledLayer].category)) ? controlledLayer : (minimal ? null : "precipitation"))
  )
  const visibleRef = useRef<{ background: LayerType; overlay: LayerType | null }>({ background: activeBackground, overlay: activeOverlay })
  const [opacity, setOpacity] = useState(0.85)
  const [tilesLoading, setTilesLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  // Sidebar con dos vistas: capas (la de siempre) o navegación por municipio
  // — lista de municipios con conteo, expandible a los predios de cada uno
  // (marcando cuáles tienen polígono delimitado), para ubicar un predio
  // puntual sin depender de encontrarlo a ojo en el mapa. Empieza en
  // "municipios" (no "capas") a propósito: con miles de predios, pintarlos
  // todos de una deja el mapa saturado de círculos pegados entre sí —
  // arranca limpio y el usuario navega a lo que le interesa.
  const [sidebarTab, setSidebarTab] = useState<'layers' | 'municipios'>('municipios')
  const [expandedMunicipio, setExpandedMunicipio] = useState<string | null>(null)
  // Escape hatch: quien de verdad quiera ver todos los puntos a la vez
  // (a costa de que se amontonen) lo puede pedir explícitamente.
  const [showAllMarkers, setShowAllMarkers] = useState(false)
  // Solo se pintan en el mapa los predios del municipio expandido (o todos,
  // si showAllMarkers) — el resto de la lista sigue disponible para navegar,
  // simplemente no se renderiza como círculo hasta que el usuario lo pida.
  const visibleMarkers = useMemo(() => {
    const withRealPosition = (markers ?? []).filter((m) => !isSentinelMarker(m))
    return showAllMarkers
      ? withRealPosition
      : expandedMunicipio
        ? withRealPosition.filter((m) => (m.municipio?.trim() || 'Sin municipio') === expandedMunicipio)
        : []
  }, [markers, showAllMarkers, expandedMunicipio])

  // Predio seleccionado (clic en marcador) — zoom al predio, botón "volver"
  // a la vista inicial, y panel con NDVI puntual (MODIS) + clima (OpenWeather).
  // Visible para todos los roles, incluido agricultor.
  const [selectedPredio, setSelectedPredio] = useState<SelectedPredio | null>(null)
  const [ndvi, setNdvi] = useState<NdviResult | null>(null)
  const [ndviLoading, setNdviLoading] = useState(false)
  const [ndviError, setNdviError] = useState<string | null>(null)
  const [weather, setWeather] = useState<WeatherResult | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState<string | null>(null)
  const initialViewRef = useRef<{ center: maplibregl.LngLat; zoom: number } | null>(null)
  const layers = buildLayers()
  const visibleCategories = canSee(role, 'all-layers')
    ? (['base', 'satelital', 'nasa', 'clima'] as const)
    : (['base', 'satelital', 'nasa'] as const)

  // En modo minimal (panel externo, ej. miniatura de un predio) el llamador
  // controla fondo (controlledLayer) y overlay (controlledOverlay) de forma
  // independiente — antes una sola prop mandaba a cualquiera de los dos de
  // forma excluyente, así que no se podía fijar satelital + NDVI a la vez.
  useEffect(() => {
    if (!minimal) return
    if (controlledLayer) {
      if (isOverlayCategory(layers[controlledLayer].category)) {
        setActiveOverlay(controlledLayer)
      } else {
        setActiveBackground(controlledLayer)
      }
    }
    if (controlledOverlay) {
      setActiveOverlay(controlledOverlay)
    }
  }, [minimal, controlledLayer, controlledOverlay])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const layers = buildLayers()
    const mapCenter: [number, number] = initialCenter
      ? [initialCenter[1], initialCenter[0]] // MapLibre usa [lng, lat]
      : [-74.2973, 4.5709]
    const mapZoom = initialZoom || 5

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: { version: 8, sources: {}, layers: [] }, // estilo vacío — las capas raster se agregan abajo
      center: mapCenter,
      zoom: mapZoom,
      minZoom: 5,
      maxZoom: 18,
      maxBounds: COLOMBIA_BOUNDS,
      attributionControl: false,
      // Necesario para poder leer el canvas con drawImage() (recorte de NDVI
      // al polígono del predio, ver efecto más abajo) — sin esto el buffer
      // de WebGL se limpia justo después de cada frame y drawImage() copia
      // un canvas en blanco.
      canvasContextAttributes: { preserveDrawingBuffer: true },
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }))

    // El <details> de atribución de MapLibre (compact:true) se abre solo
    // al montar, y además el toggle nativo de <summary> pisa el estado que
    // el propio MapLibre acaba de fijar al hacer clic (queda en una mezcla
    // rara a medio camino) — así que en vez de intentar permitir el clic
    // manual, lo mantenemos siempre plegado sin excepción.
    const attribObserver = new MutationObserver(() => {
      const attribEl = mapContainerRef.current?.querySelector<HTMLDetailsElement>('.maplibregl-ctrl-attrib')
      if (attribEl?.hasAttribute('open')) attribEl.removeAttribute('open')
    })
    attribObserver.observe(mapContainerRef.current, { attributes: true, attributeFilter: ['open'], subtree: true })

    const tileFailCounts: Record<string, number> = {}
    const TILE_FAIL_THRESHOLD = 8
    const BASE_FALLBACK_CHAIN: LayerType[] = ['cartoLight', 'cartoVoyager', 'osm', 'esriStreet', 'openTopo']

    map.on('load', () => {
      Object.entries(layers).forEach(([key, config]) => {
        const layerKey = key as LayerType
        map.addSource(sourceIdFor(layerKey), {
          type: 'raster',
          tiles: toMapLibreTiles(config),
          tileSize: 256,
          attribution: config.attribution,
          maxzoom: config.maxZoom || 19,
        })
        const { background, overlay } = visibleRef.current
        const visible = layerKey === background || layerKey === overlay
        map.addLayer({
          id: layerIdFor(layerKey),
          type: 'raster',
          source: sourceIdFor(layerKey),
          // visibility (no solo opacity): una capa raster con
          // visibility:'none' NO pide tiles a la red. Con opacity:0 la capa
          // sigue "visible" para MapLibre y sigue descargando tiles en
          // segundo plano — así se cargaban NDVI/clima/etc. de una vez
          // aunque nunca se hubieran seleccionado.
          layout: {
            visibility: visible ? 'visible' : 'none',
          },
          paint: {
            // El fondo siempre opaco; el overlay usa la opacidad ajustable.
            // (minimal usa el mismo estado `opacity` para lo único visible.)
            'raster-opacity': layerKey === overlay || minimal ? opacity : 1,
          },
        })
      })
      initialViewRef.current = { center: map.getCenter(), zoom: map.getZoom() }
      setIsMapReady(true)
    })

    // Indicador de carga de tiles: 'sourcedataloading'/'sourcedata' solo de
    // las fuentes realmente visibles (fondo + overlay) — el resto está en
    // visibility:none y no carga nada, así que filtrar evita falsos
    // positivos.
    map.on('sourcedataloading', (e) => {
      const { background, overlay } = visibleRef.current
      if (e.sourceId === sourceIdFor(background) || (overlay && e.sourceId === sourceIdFor(overlay))) {
        setTilesLoading(true)
      }
    })
    map.on('sourcedata', (e) => {
      const { background, overlay } = visibleRef.current
      const isRelevant = e.sourceId === sourceIdFor(background) || (overlay && e.sourceId === sourceIdFor(overlay))
      if (isRelevant && map.isSourceLoaded(e.sourceId)) {
        setTilesLoading(false)
      }
    })

    // MapLibre emite 'error' a nivel de mapa (no por <img> individual como
    // Leaflet) cuando una fuente raster falla en cargar un tile. En runtime
    // el evento trae `sourceId`, pero el tipo público `ErrorEvent` de
    // maplibre-gl (ver maplibre-gl.d.ts) solo declara `error: ErrorLike` —
    // por eso el cast puntual a `any` solo para leer esa propiedad.
    map.on('error', (e: maplibregl.ErrorEvent) => {
      const sourceId: string | undefined = (e as unknown as { sourceId?: string }).sourceId
      if (!sourceId || !sourceId.startsWith('src-')) return
      const key = sourceId.replace('src-', '') as LayerType
      const config = layers[key]
      if (!config) return

      const { background, overlay } = visibleRef.current
      tileFailCounts[key] = (tileFailCounts[key] || 0) + 1
      if (tileFailCounts[key] < TILE_FAIL_THRESHOLD) return

      if (key === overlay) {
        console.warn(`[map-viewer-gl] Capa "${config.name}" fallando repetidamente, se desactiva.`)
        setActiveOverlay(null)
      } else if (key === background) {
        if (config.category !== 'base') {
          console.warn(`[map-viewer-gl] Capa "${config.name}" fallando repetidamente, se vuelve a mapa base.`)
          setActiveBackground('cartoLight')
        } else {
          const next = BASE_FALLBACK_CHAIN.find(k => k !== key)
          if (next) {
            console.warn(`[map-viewer-gl] Capa base "${config.name}" fallando repetidamente, cambiando a "${layers[next].name}".`)
            setActiveBackground(next)
          }
        }
      }
    })

    mapRef.current = map

    return () => {
      attribObserver.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Sincroniza qué capas son visibles (fondo + overlay) y su opacidad.
  // Usa visibility, no solo opacity: una capa raster en visibility:'none'
  // deja de pedir tiles a la red — así NDVI/clima/satelital/etc. solo
  // descargan algo cuando el usuario realmente los selecciona, en vez de
  // traerse todas las capas de una al abrir el mapa.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady) return
    visibleRef.current = { background: activeBackground, overlay: activeOverlay }
    const layers = buildLayers()
    Object.keys(layers).forEach((k) => {
      const key = k as LayerType
      const id = layerIdFor(key)
      if (!map.getLayer(id)) return
      const visible = key === activeBackground || key === activeOverlay
      map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none')
      map.setPaintProperty(id, 'raster-opacity', (key === activeOverlay || minimal) ? opacity : 1)
    })
    // Forzar marcadores/clusters/límite del predio seleccionado siempre al
    // tope: moveLayer() sin segundo argumento los sube al final de la pila
    // de capas de MapLibre. Sin esto, alternar entre tipos de mapa podía
    // dejar una capa raster pintando por encima de los círculos — se veía
    // el número del cluster (capa de texto aparte) pero no el círculo, y el
    // clic tampoco registraba porque el círculo quedaba con área 0 visible.
    ;['selected-predio-fill', 'selected-predio-line', 'clusters', 'cluster-count', 'unclustered-point', 'spider-lines', 'spider-points'].forEach((id) => {
      if (map.getLayer(id)) map.moveLayer(id)
    })
    // Las fuentes recién visibles pueden no tener tiles del viewport actual
    // todavía — mostrar el indicador hasta que 'sourcedata' confirme que ya
    // cargaron.
    const pending = [activeBackground, activeOverlay].filter((k): k is LayerType => !!k)
      .some(k => !map.isSourceLoaded(sourceIdFor(k)))
    setTilesLoading(pending)
  }, [activeBackground, activeOverlay, opacity, isMapReady, minimal])

  // Marcadores clusterizados — MapLibre trae clustering nativo en su
  // GeoJSONSource (cluster:true), no hace falta leaflet.markercluster aquí.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady) return

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: visibleMarkers.map((m) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [m.position[1], m.position[0]] },
        properties: {
          id: m.id ?? '',
          popupContent: m.popupContent,
          name: m.name ?? '',
          polygonCoords: m.polygonCoords ? JSON.stringify(m.polygonCoords) : '',
        },
      })),
    }

    const existingSource = map.getSource('markers')
    if (existingSource) {
      (existingSource as maplibregl.GeoJSONSource).setData(geojson)
      return
    }

    map.addSource('markers', {
      type: 'geojson',
      data: geojson,
      cluster: true,
      clusterRadius: 80,
      clusterMaxZoom: 17,
    })

    const brand = getMapBrandColor()

    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'markers',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': brand,
        'circle-radius': ['step', ['get', 'point_count'], 17, 10, 21, 100, 25, 1000, 29],
        'circle-stroke-width': 3,
        'circle-stroke-color': 'rgba(255,255,255,0.85)',
      },
    })
    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'markers',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-size': 13,
      },
      paint: { 'text-color': '#ffffff' },
    })
    map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'markers',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': brand,
        'circle-radius': 7,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    })

    // "Spiderfy": cuando un cluster ya está en su zoom máximo de agrupación
    // (predios genuinamente muy cercanos entre sí, ej. varias parcelas
    // contiguas) hacer zoom no los separa más — antes eso hacía que el clic
    // en un cluster de "3" mandara a un solo punto y los otros quedaran
    // invisibles/superpuestos, obligando a alejarse y buscarlos a mano.
    // Se abanican en un círculo alrededor del cluster para que cada uno
    // quede individualmente visible y clickeable, igual que
    // spiderfyOnMaxZoom en el Leaflet de map-viewer.tsx.
    const selectFromFeature = (feature: GeoJSON.Feature) => {
      const geom = feature.geometry as GeoJSON.Point
      const [lng, lat] = geom.coordinates as [number, number]
      const rawPolygon = String(feature.properties?.polygonCoords ?? '')
      let polygonCoords: [number, number][] | undefined
      if (rawPolygon) {
        try { polygonCoords = JSON.parse(rawPolygon) } catch { polygonCoords = undefined }
      }
      setSelectedPredio({
        id: String(feature.properties?.id ?? ''),
        name: String(feature.properties?.name ?? 'Predio'),
        position: [lat, lng],
        polygonCoords,
      })
    }

    const clearSpider = () => {
      if (map.getLayer('spider-points')) map.removeLayer('spider-points')
      if (map.getLayer('spider-lines')) map.removeLayer('spider-lines')
      if (map.getSource('spider-points-src')) map.removeSource('spider-points-src')
      if (map.getSource('spider-lines-src')) map.removeSource('spider-lines-src')
    }

    const spiderfyCluster = (center: [number, number], leaves: GeoJSON.Feature[]) => {
      clearSpider()
      const centerPx = map.project(center)
      const n = leaves.length
      const radiusPx = Math.max(40, Math.min(90, 24 + n * 6))
      const pointFeatures: GeoJSON.Feature[] = leaves.map((leaf, i) => {
        const angle = (2 * Math.PI * i) / n - Math.PI / 2
        const px = { x: centerPx.x + radiusPx * Math.cos(angle), y: centerPx.y + radiusPx * Math.sin(angle) }
        const lngLat = map.unproject([px.x, px.y] as [number, number])
        return {
          type: 'Feature',
          properties: leaf.properties,
          geometry: { type: 'Point', coordinates: [lngLat.lng, lngLat.lat] },
        }
      })
      const lineFeatures: GeoJSON.Feature = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'MultiLineString',
          coordinates: pointFeatures.map(f => [center, (f.geometry as GeoJSON.Point).coordinates]),
        },
      }
      map.addSource('spider-lines-src', { type: 'geojson', data: lineFeatures })
      map.addLayer({
        id: 'spider-lines',
        type: 'line',
        source: 'spider-lines-src',
        paint: { 'line-color': '#9ca3af', 'line-width': 1.5, 'line-dasharray': [2, 2] },
      })
      map.addSource('spider-points-src', { type: 'geojson', data: { type: 'FeatureCollection', features: pointFeatures } })
      map.addLayer({
        id: 'spider-points',
        type: 'circle',
        source: 'spider-points-src',
        paint: {
          'circle-color': brand,
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })
      map.on('click', 'spider-points', (e) => {
        const feature = e.features?.[0]
        if (!feature) return
        selectFromFeature(feature)
        clearSpider()
      })
      map.on('mouseenter', 'spider-points', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'spider-points', () => { map.getCanvas().style.cursor = '' })
    }

    map.on('click', 'clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })
      const clusterId = features[0]?.properties?.cluster_id
      const source = map.getSource('markers') as maplibregl.GeoJSONSource
      if (clusterId == null) return
      clearSpider()
      const geom = features[0].geometry as GeoJSON.Point
      // v6 de maplibre-gl cambió getClusterExpansionZoom de callback a Promise
      // (ver maplibre-gl.d.ts: `getClusterExpansionZoom(clusterId): Promise<number>`),
      // a diferencia de la firma con callback que usa el ejemplo del plan.
      source.getClusterExpansionZoom(clusterId).then((zoom) => {
        const targetZoom = zoom ?? map.getZoom() + 1
        // Si el zoom de expansión no supera el actual (o ya estamos en el
        // límite del mapa), zoomear no va a separar más los puntos —
        // abanicar en vez de quedar en un loop de zoom sin efecto.
        if (targetZoom <= map.getZoom() + 0.15 || targetZoom >= map.getMaxZoom() - 0.25) {
          source.getClusterLeaves(clusterId, 200, 0).then((leaves) => {
            spiderfyCluster(geom.coordinates as [number, number], leaves)
          }).catch(() => {})
          return
        }
        map.easeTo({ center: geom.coordinates as [number, number], zoom: targetZoom })
      }).catch(() => {})
    })

    map.on('click', 'unclustered-point', (e) => {
      const feature = e.features?.[0]
      if (!feature) return
      clearSpider()
      selectFromFeature(feature)
    })

    // Cualquier movimiento del mapa invalida las posiciones calculadas del
    // abanico (se proyectaron para un pixel/zoom específico) — se limpian
    // para no dejar puntos "fantasma" desalineados.
    map.on('zoomstart', clearSpider)
    map.on('dragstart', clearSpider)

    map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = '' })
    map.on('mouseenter', 'unclustered-point', () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'unclustered-point', () => { map.getCanvas().style.cursor = '' })
  }, [visibleMarkers, isMapReady])

  // Polígonos de todos los predios delimitados + etiqueta con el nombre.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady) return

    const SOURCE = 'all-predios-polygons'
    const FILL = 'all-predios-fill'
    const LINE = 'all-predios-line'
    const LABEL = 'all-predios-label'

    const polyFeatures: GeoJSON.Feature[] = []
    const labelFeatures: GeoJSON.Feature[] = []
    for (const m of visibleMarkers) {
      if (!m.polygonCoords || m.polygonCoords.length < 3) continue
      const coords = m.polygonCoords
      const ring = [
        ...coords.map(([lat, lng]) => [lng, lat] as [number, number]),
        [coords[0][1], coords[0][0]] as [number, number],
      ]
      const lngs = ring.map((c) => c[0])
      const lats = ring.map((c) => c[1])
      const cx = (Math.min(...lngs) + Math.max(...lngs)) / 2
      const cy = (Math.min(...lats) + Math.max(...lats)) / 2
      polyFeatures.push({
        type: 'Feature',
        properties: { name: m.name || 'Predio', id: m.id ?? '' },
        geometry: { type: 'Polygon', coordinates: [ring] },
      })
      labelFeatures.push({
        type: 'Feature',
        properties: { name: m.name || 'Predio', id: m.id ?? '' },
        geometry: { type: 'Point', coordinates: [cx, cy] },
      })
    }

    const polyData: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: polyFeatures }
    const labelData: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: labelFeatures }

    const ensure = () => {
      if (!map.getSource(SOURCE)) {
        map.addSource(SOURCE, { type: 'geojson', data: polyData })
        map.addLayer({
          id: FILL,
          type: 'fill',
          source: SOURCE,
          paint: { 'fill-color': '#16a34a', 'fill-opacity': 0.12 },
        })
        map.addLayer({
          id: LINE,
          type: 'line',
          source: SOURCE,
          paint: { 'line-color': '#15803d', 'line-width': 2 },
        })
      } else {
        ;(map.getSource(SOURCE) as maplibregl.GeoJSONSource).setData(polyData)
      }

      if (!map.getSource(`${SOURCE}-labels`)) {
        map.addSource(`${SOURCE}-labels`, { type: 'geojson', data: labelData })
        map.addLayer({
          id: LABEL,
          type: 'symbol',
          source: `${SOURCE}-labels`,
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 11,
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
            'text-anchor': 'center',
            'text-max-width': 10,
            'text-allow-overlap': false,
            'text-padding': 2,
          },
          paint: {
            'text-color': '#14532d',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.5,
          },
        })
      } else {
        ;(map.getSource(`${SOURCE}-labels`) as maplibregl.GeoJSONSource).setData(labelData)
      }

      // Mantener debajo de clusters / selección
      ;[FILL, LINE, LABEL].forEach((id) => {
        if (map.getLayer(id) && map.getLayer('clusters')) {
          try { map.moveLayer(id, 'clusters') } catch { /* ok */ }
        }
      })
    }

    ensure()

    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0]
      if (!f) return
      const id = String(f.properties?.id ?? '')
      const name = String(f.properties?.name ?? 'Predio')
      const marker = visibleMarkers.find((m) => m.id === id)
      if (marker) {
        setSelectedPredio({
          id,
          name,
          position: marker.position,
          polygonCoords: marker.polygonCoords,
        })
      }
    }

    map.on('click', FILL, onClick)
    map.on('mouseenter', FILL, () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', FILL, () => { map.getCanvas().style.cursor = '' })

    return () => {
      map.off('click', FILL, onClick)
    }
  }, [visibleMarkers, isMapReady])

  // Marcador de predio único + polígono de límite — caso "modal de admin" o
  // "detalle de caracterización" que pasan markerPosition/polygonCoords
  // directos en vez de un array markers[].
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady) return

    if (markerPosition) {
      new maplibregl.Marker({ color: '#22c55e' })
        .setLngLat([markerPosition[1], markerPosition[0]])
        .setPopup(new maplibregl.Popup().setHTML('<strong>Ubicación del Predio</strong>'))
        .addTo(map)
      map.easeTo({ center: [markerPosition[1], markerPosition[0]], zoom: Math.max(map.getZoom(), 14) })
    }

    if (polygonCoords && polygonCoords.length >= 3) {
      const ring = [...polygonCoords.map(([lat, lng]) => [lng, lat]), [polygonCoords[0][1], polygonCoords[0][0]]]
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Polygon', coordinates: [ring] },
      }
      if (!map.getSource('predio-polygon')) {
        map.addSource('predio-polygon', { type: 'geojson', data: geojson })
        map.addLayer({
          id: 'predio-polygon-fill',
          type: 'fill',
          source: 'predio-polygon',
          paint: { 'fill-color': '#22c55e', 'fill-opacity': 0 },
        })
        map.addLayer({
          id: 'predio-polygon-line',
          type: 'line',
          source: 'predio-polygon',
          paint: { 'line-color': '#22c55e', 'line-width': 3 },
        })
      }
      const lngs = ring.map(c => c[0])
      const lats = ring.map(c => c[1])
      map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 50 })
    }
  }, [markerPosition, polygonCoords, isMapReady])

  // Selección de predio desde la lista de marcadores: zoom al predio
  // (bounds del polígono si existe, punto si no), resalta su límite en el
  // color de salud NDVI una vez llega, y dispara NDVI puntual + clima.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady) return

    const SOURCE_ID = 'selected-predio-boundary'
    const FILL_ID = 'selected-predio-fill'
    const LINE_ID = 'selected-predio-line'

    const removeBoundary = () => {
      if (map.getLayer(FILL_ID)) map.removeLayer(FILL_ID)
      if (map.getLayer(LINE_ID)) map.removeLayer(LINE_ID)
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    }

    if (!selectedPredio) {
      removeBoundary()
      return
    }

    const { position, polygonCoords: coords } = selectedPredio

    if (coords && coords.length >= 3) {
      const ring = [...coords.map(([lat, lng]) => [lng, lat]), [coords[0][1], coords[0][0]]]
      const geojson: GeoJSON.Feature = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } }
      if (map.getSource(SOURCE_ID)) {
        (map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource).setData(geojson)
      } else {
        map.addSource(SOURCE_ID, { type: 'geojson', data: geojson })
        // Sin relleno (fill-opacity: 0) — solo el borde. La capa se
        // mantiene (en vez de quitarla) porque el efecto de abajo sigue
        // pintando su 'fill-color' con el verde/amarillo/rojo de salud NDVI
        // y otros efectos la usan como ancla de orden de capas; un relleno
        // visible encima tapa/desatura el recorte de NDVI dentro del predio.
        map.addLayer({ id: FILL_ID, type: 'fill', source: SOURCE_ID, paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0 } })
        map.addLayer({ id: LINE_ID, type: 'line', source: SOURCE_ID, paint: { 'line-color': '#3b82f6', 'line-width': 3 } })
      }
      const lngs = ring.map(c => c[0])
      const lats = ring.map(c => c[1])
      map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 80, maxZoom: 16, duration: 800 })
    } else {
      removeBoundary()
      const center: [number, number] = [position[1], position[0]]
      map.flyTo({ center, zoom: Math.max(map.getZoom(), 15), duration: 800 })

      // Predios sin polígono suelen compartir la coordenada placeholder
      // "aproximada" con otros — zoomear ahí puede seguir aterrizando sobre
      // un cluster (no se separan solo con zoom) y el punto individual del
      // predio elegido nunca se pinta. Al terminar el vuelo, si seguimos
      // sobre un cluster en ese punto, lo abanicamos igual que un clic real
      // para que el marcador quede visible.
      map.once('idle', () => {
        if (!map.getLayer('clusters')) return
        const px = map.project(center)
        const features = map.queryRenderedFeatures(px, { layers: ['clusters'] })
        const clusterId = features[0]?.properties?.cluster_id
        if (clusterId == null) return
        const source = map.getSource('markers') as maplibregl.GeoJSONSource
        source.getClusterLeaves(clusterId, 200, 0).then((leaves) => {
          const brand = getMapBrandColor()
          if (map.getLayer('spider-points')) map.removeLayer('spider-points')
          if (map.getLayer('spider-lines')) map.removeLayer('spider-lines')
          if (map.getSource('spider-points-src')) map.removeSource('spider-points-src')
          if (map.getSource('spider-lines-src')) map.removeSource('spider-lines-src')
          const centerPx = map.project(center)
          const n = leaves.length
          const radiusPx = Math.max(40, Math.min(90, 24 + n * 6))
          const pointFeatures: GeoJSON.Feature[] = leaves.map((leaf, i) => {
            const angle = (2 * Math.PI * i) / n - Math.PI / 2
            const p = { x: centerPx.x + radiusPx * Math.cos(angle), y: centerPx.y + radiusPx * Math.sin(angle) }
            const lngLat = map.unproject([p.x, p.y] as [number, number])
            return { type: 'Feature', properties: leaf.properties, geometry: { type: 'Point', coordinates: [lngLat.lng, lngLat.lat] } }
          })
          map.addSource('spider-lines-src', {
            type: 'geojson',
            data: { type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: pointFeatures.map(f => [center, (f.geometry as GeoJSON.Point).coordinates]) } },
          })
          map.addLayer({ id: 'spider-lines', type: 'line', source: 'spider-lines-src', paint: { 'line-color': '#9ca3af', 'line-width': 1.5, 'line-dasharray': [2, 2] } })
          map.addSource('spider-points-src', { type: 'geojson', data: { type: 'FeatureCollection', features: pointFeatures } })
          map.addLayer({ id: 'spider-points', type: 'circle', source: 'spider-points-src', paint: { 'circle-color': brand, 'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } })
        }).catch(() => {})
      })
    }

    return () => { removeBoundary() }
  }, [selectedPredio, isMapReady])

  // Tinta el límite del predio seleccionado con el color de salud NDVI en
  // cuanto llega (verde/amarillo/rojo según vigor vegetativo) — "NDVI solo
  // sobre el predio delimitado" en vez de una capa que cubre todo el mapa.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady || !ndvi) return
    if (map.getLayer('selected-predio-fill')) map.setPaintProperty('selected-predio-fill', 'fill-color', ndvi.color)
    if (map.getLayer('selected-predio-line')) map.setPaintProperty('selected-predio-line', 'line-color', ndvi.color)
  }, [ndvi, isMapReady])

  // Recorta la capa NDVI (imagen NASA, no el tinte plano de arriba) a la
  // forma exacta del polígono delimitado — en vez de una capa raster que
  // cubre todo el viewport. MapLibre no tiene "clip a geometría" nativo
  // para rasters, así que se aprovecha que ya renderiza el NDVI correctamente
  // proyectado en su propio canvas: se copia ese canvas con drawImage(),
  // recortado en espacio de pantalla con ctx.clip() al path del polígono
  // (proyectado con map.project()), y el resultado se vuelve a insertar
  // como fuente 'image' georreferenciada por sus 4 esquinas — así sigue
  // paneando/zoomeando en el sitio correcto igual que cualquier otra capa.
  // Requiere preserveDrawingBuffer:true en el mapa (ver constructor arriba).
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady) return

    const NDVI_LAYER_ID = layerIdFor('ndvi')
    const CLIP_LAYER_ID = 'ndvi-clip'
    const CLIP_SOURCE_ID = 'ndvi-clip-src'

    const removeClip = () => {
      if (map.getLayer(CLIP_LAYER_ID)) map.removeLayer(CLIP_LAYER_ID)
      if (map.getSource(CLIP_SOURCE_ID)) map.removeSource(CLIP_SOURCE_ID)
    }

    const activePolygon = (selectedPredio?.polygonCoords && selectedPredio.polygonCoords.length >= 3)
      ? selectedPredio.polygonCoords
      : (polygonCoords && polygonCoords.length >= 3 ? polygonCoords : null)

    // Sin polígono para recortar, o el overlay activo no es NDVI: capa NDVI
    // normal (todo el viewport, comportamiento de antes) y sin recorte.
    if (!activePolygon || activeOverlay !== 'ndvi') {
      removeClip()
      if (map.getLayer(NDVI_LAYER_ID)) {
        map.setLayoutProperty(NDVI_LAYER_ID, 'visibility', activeOverlay === 'ndvi' ? 'visible' : 'none')
      }
      return
    }

    let cancelled = false

    const buildClip = () => {
      if (cancelled || !map.getLayer(NDVI_LAYER_ID)) return
      // Sin tiles cargados todavía el canvas del mapa no tiene la imagen NDVI
      // pintada — recortar ahora capturaría un lienzo vacío/a medias.
      if (!map.isSourceLoaded(sourceIdFor('ndvi'))) return

      const ring = activePolygon.map(([lat, lng]) => [lng, lat] as [number, number])
      const pixelRing = ring.map((c) => map.project(c))
      const xs = pixelRing.map(p => p.x)
      const ys = pixelRing.map(p => p.y)
      const minX = Math.min(...xs), maxX = Math.max(...xs)
      const minY = Math.min(...ys), maxY = Math.max(...ys)
      const width = Math.ceil(maxX - minX)
      const height = Math.ceil(maxY - minY)
      if (width < 2 || height < 2) return

      const dpr = window.devicePixelRatio || 1
      const canvas = document.createElement('canvas')
      canvas.width = width * dpr
      canvas.height = height * dpr
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)

      ctx.beginPath()
      pixelRing.forEach((p, i) => {
        const x = p.x - minX
        const y = p.y - minY
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.closePath()
      ctx.clip()

      try {
        ctx.drawImage(map.getCanvas(), minX * dpr, minY * dpr, width * dpr, height * dpr, 0, 0, width, height)
      } catch {
        // Canvas "tainted" (tile sin CORS) o buffer aún no listo — se
        // reintenta en el próximo 'moveend'/reintento de tiles, sin romper
        // nada mientras tanto (queda la capa NDVI normal visible).
        return
      }

      map.setLayoutProperty(NDVI_LAYER_ID, 'visibility', 'none')

      const corner = (x: number, y: number): [number, number] => {
        const ll = map.unproject([x, y])
        return [ll.lng, ll.lat]
      }
      const coordinates: [[number, number], [number, number], [number, number], [number, number]] = [
        corner(minX, minY),
        corner(maxX, minY),
        corner(maxX, maxY),
        corner(minX, maxY),
      ]

      removeClip()
      map.addSource(CLIP_SOURCE_ID, { type: 'image', url: canvas.toDataURL(), coordinates })
      // beforeId: insertarla justo debajo del límite/marcadores del predio
      // (que ya se fuerzan al tope en el efecto de sincronía de capas) — sin
      // esto, al agregarse después quedaría por encima y los tapa.
      const anchor = ['selected-predio-fill', 'clusters', 'unclustered-point'].find(id => map.getLayer(id))
      map.addLayer({ id: CLIP_LAYER_ID, type: 'raster', source: CLIP_SOURCE_ID, paint: { 'raster-opacity': 1 } }, anchor)
    }

    map.once('idle', buildClip)
    map.on('moveend', buildClip)

    return () => {
      cancelled = true
      map.off('moveend', buildClip)
      removeClip()
      if (map.getLayer(NDVI_LAYER_ID)) {
        map.setLayoutProperty(NDVI_LAYER_ID, 'visibility', activeOverlay === 'ndvi' ? 'visible' : 'none')
      }
    }
  }, [selectedPredio, polygonCoords, activeOverlay, isMapReady])

  // Fetch de NDVI puntual (MODIS) + clima (OpenWeather) del predio seleccionado.
  // `cancelled` evita que una respuesta tardía de un predio anterior
  // sobrescriba el estado si el usuario ya seleccionó otro predio distinto
  // mientras la petición previa seguía en vuelo.
  useEffect(() => {
    let cancelled = false

    if (!selectedPredio) {
      setNdvi(null); setNdviError(null); setWeather(null); setWeatherError(null)
      return
    }
    const [lat, lng] = selectedPredio.position

    setNdviLoading(true); setNdviError(null); setNdvi(null)
    fetch(`/api/ndvi?lat=${lat}&lng=${lng}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        if (d.error) throw new Error(d.error)
        if (typeof d.ndvi !== 'number' || !d.color) throw new Error('Respuesta de NDVI incompleta')
        setNdvi(d)
      })
      .catch(e => { if (!cancelled) setNdviError(e instanceof Error ? e.message : 'Error al obtener NDVI') })
      .finally(() => { if (!cancelled) setNdviLoading(false) })

    setWeatherLoading(true); setWeatherError(null); setWeather(null)
    fetch('/api/weather', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lat, lng }) })
      .then(r => r.json())
      .then(d => { if (cancelled) return; if (d.error) throw new Error(d.error); setWeather(d) })
      .catch(e => { if (!cancelled) setWeatherError(e instanceof Error ? e.message : 'Error al obtener clima') })
      .finally(() => { if (!cancelled) setWeatherLoading(false) })

    return () => { cancelled = true }
  }, [selectedPredio])

  const handleVolver = () => {
    setSelectedPredio(null)
    const map = mapRef.current
    if (map && initialViewRef.current) {
      map.flyTo({ center: initialViewRef.current.center, zoom: initialViewRef.current.zoom, duration: 800 })
    }
  }

  // Agrupa los marcadores por municipio (orden alfabético, "Sin municipio"
  // al final) para el panel de navegación — mismo dato que ya trae cada
  // MapMarker, solo se reorganiza para mostrarlo como lista.
  const municipioGroups = useMemo(() => {
    const groups = new Map<string, { real: MapMarker[]; sentinelCount: number }>()
    for (const m of markers ?? []) {
      const key = m.municipio?.trim() || 'Sin municipio'
      const entry = groups.get(key) ?? { real: [], sentinelCount: 0 }
      if (isSentinelMarker(m)) entry.sentinelCount++
      else entry.real.push(m)
      groups.set(key, entry)
    }
    return [...groups.entries()].sort(([a], [b]) => {
      if (a === 'Sin municipio') return 1
      if (b === 'Sin municipio') return -1
      return a.localeCompare(b)
    })
  }, [markers])

  // Selecciona un predio directo desde el listado (sin pasar por un clic
  // real sobre el mapa) — el efecto que ya escucha selectedPredio se
  // encarga del zoom/fitBounds y de pintar el límite.
  const selectFromMarker = (m: MapMarker) => {
    setSelectedPredio({
      id: m.id ?? '',
      name: m.name ?? 'Predio',
      position: m.position,
      polygonCoords: m.polygonCoords,
    })
  }

  // Encuadra el mapa a todos los predios de un municipio (bounds si hay
  // varios, flyTo directo si hay uno solo) sin seleccionar ninguno todavía
  // — el usuario elige el predio puntual del listado expandido.
  const focusMunicipio = (predios: MapMarker[]) => {
    const map = mapRef.current
    if (!map || !predios.length) return
    if (predios.length === 1) {
      map.flyTo({ center: [predios[0].position[1], predios[0].position[0]], zoom: 14, duration: 800 })
      return
    }
    const lats = predios.map(p => p.position[0])
    const lngs = predios.map(p => p.position[1])
    map.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: 60, maxZoom: 15, duration: 800 }
    )
  }

  // ── Modo minimal: solo mapa, sin selector de capas ──
  if (minimal) {
    return (
      <div className="relative h-full w-full">
        <div ref={mapContainerRef} className="h-full w-full" />
        {!isMapReady && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">Cargando mapa...</span>
            </div>
          </div>
        )}
        {isMapReady && tilesLoading && (
          <div className="absolute top-3 right-3 z-[1001] flex items-center gap-2 rounded-full bg-background/90 border border-border px-3 py-1.5 shadow-md backdrop-blur-sm pointer-events-none">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-xs text-muted-foreground">Cargando capa...</span>
          </div>
        )}
      </div>
    )
  }

  // ── Modo completo: sidebar de capas + mapa ──
  return (
    <div className="relative flex h-full w-full overflow-hidden">
      {!isMapReady && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Cargando mapa...</span>
          </div>
        </div>
      )}
      {isMapReady && tilesLoading && (
        <div className="absolute top-3 right-3 z-[1001] flex items-center gap-2 rounded-full bg-background/90 border border-border px-3 py-1.5 shadow-md backdrop-blur-sm pointer-events-none">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs text-muted-foreground">Cargando capa...</span>
        </div>
      )}

      <button
        onClick={() => setSidebarOpen(v => !v)}
        className="lg:hidden absolute top-3 left-3 z-[1002] bg-card border border-border rounded-lg p-2 shadow-md text-muted-foreground hover:text-foreground transition-colors"
        aria-label={sidebarOpen ? 'Cerrar panel' : 'Abrir panel'}
      >
        <PanelLeft className="h-4 w-4" />
      </button>

      {sidebarOpen && (
        <div
          className="lg:hidden absolute inset-0 z-[1000] bg-black/30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        absolute lg:relative inset-y-0 left-0 z-[1001]
        w-72 lg:w-80 flex-shrink-0 flex flex-col
        border-r border-border bg-card shadow-lg lg:shadow-none
        transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 to-transparent flex-shrink-0">
          <h2 className="text-sm font-semibold text-foreground">
            {role === 'agricultor' || role === 'campesino' ? 'Mi Predio' : 'Mapa de Predios'}
          </h2>
          {markers && markers.length > 0 && (
            <p className="text-xs text-muted-foreground">{markers.length} predios registrados</p>
          )}
        </div>

        {markers && markers.length > 0 && (
          <div className="flex border-b border-border flex-shrink-0">
            <button
              onClick={() => setSidebarTab('layers')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${sidebarTab === 'layers' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Layers className="h-3.5 w-3.5" />
              Capas
            </button>
            <button
              onClick={() => setSidebarTab('municipios')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${sidebarTab === 'municipios' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <MapPinned className="h-3.5 w-3.5" />
              Municipios
            </button>
          </div>
        )}

        {sidebarTab === 'municipios' && markers && markers.length > 0 && (
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
            <label className="flex items-center gap-2 px-1 pb-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={showAllMarkers}
                onChange={(e) => setShowAllMarkers(e.target.checked)}
                className="h-3.5 w-3.5 accent-primary"
              />
              Mostrar todos los predios en el mapa (puede saturarse con muchos)
            </label>
            {municipioGroups.map(([municipio, group]) => {
              const expanded = expandedMunicipio === municipio
              const total = group.real.length + group.sentinelCount
              return (
                <div key={municipio} className="rounded-lg border border-border/60 overflow-hidden">
                  <button
                    onClick={() => {
                      setExpandedMunicipio(expanded ? null : municipio)
                      focusMunicipio(group.real)
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left bg-secondary/40 hover:bg-secondary transition-colors"
                  >
                    <span className="text-sm font-medium text-foreground truncate">{municipio}</span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-muted-foreground bg-background/60 rounded-full px-1.5 py-0.5">{total}</span>
                      <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </span>
                  </button>
                  {expanded && (
                    <div className="divide-y divide-border/40">
                      {group.sentinelCount > 0 && (
                        <div className="px-3 py-2 text-[11px] text-muted-foreground bg-secondary/20 italic">
                          {group.sentinelCount} {group.sentinelCount === 1 ? 'predio' : 'predios'} sin ubicación marcada
                          (quedó{group.sentinelCount === 1 ? '' : 'n'} en el punto por defecto de la ciudad) — no se muestra{group.sentinelCount === 1 ? '' : 'n'} en el mapa.
                        </div>
                      )}
                      {group.real.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => selectFromMarker(m)}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-primary/[0.06] transition-colors"
                        >
                          <span className="text-xs text-foreground truncate">{m.name || 'Sin nombre'}</span>
                          {m.polygonCoords && m.polygonCoords.length >= 3 ? (
                            <span className="flex items-center gap-1 shrink-0 text-[10px] text-primary">
                              <ShieldCheck className="h-3 w-3" /> Delimitado
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 shrink-0 text-[10px] text-muted-foreground">
                              <CircleDashed className="h-3 w-3" /> Sin delimitar
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {sidebarTab === 'layers' && (
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {([
            { key: 'base',      label: 'Base' },
            { key: 'satelital', label: 'Satelital' },
          ] as { key: LayerConfig['category']; label: string }[])
            .filter(({ key }) => visibleCategories.includes(key as any))
            .map(({ key: cat, label }) => {
              const catLayers = (Object.keys(layers) as LayerType[]).filter(k => layers[k].category === cat)
              if (!catLayers.length) return null
              return (
                <div key={cat}>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{label}</p>
                  <div className="space-y-1">
                    {catLayers.map((key) => (
                      <button
                        key={key}
                        onClick={() => setActiveBackground(key)}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition-all duration-150 ${
                          activeBackground === key
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-secondary/40 text-foreground hover:border-primary/40 hover:bg-secondary"
                        }`}
                      >
                        <span className="block text-xs font-medium leading-tight">{layers[key].name}</span>
                        <span className="block text-[10px] leading-tight text-muted-foreground mt-0.5 line-clamp-1">{layers[key].description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}

          <div className="border-t border-border pt-3 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-1">
              Capas encima del mapa (opcional)
            </p>
            {([
              { key: 'nasa',  label: 'NASA' },
              { key: 'clima', label: 'Clima' },
            ] as { key: LayerConfig['category']; label: string }[])
              .filter(({ key }) => visibleCategories.includes(key as any))
              .map(({ key: cat, label }) => {
                const catLayers = (Object.keys(layers) as LayerType[]).filter(k => layers[k].category === cat)
                if (!catLayers.length) return null
                return (
                  <div key={cat}>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{label}</p>
                    <div className="space-y-1">
                      {catLayers.map((key) => (
                        <button
                          key={key}
                          onClick={() => setActiveOverlay(activeOverlay === key ? null : key)}
                          className={`w-full rounded-lg border px-3 py-2 text-left transition-all duration-150 ${
                            activeOverlay === key
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-secondary/40 text-foreground hover:border-primary/40 hover:bg-secondary"
                          }`}
                        >
                          <span className="block text-xs font-medium leading-tight">{layers[key].name}</span>
                          <span className="block text-[10px] leading-tight text-muted-foreground mt-0.5 line-clamp-1">{layers[key].description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}

            {activeOverlay && (
              <div className="pt-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Opacidad — {layers[activeOverlay].name}</span>
                  <span className="text-[10px] font-medium text-foreground">{Math.round(opacity * 100)}%</span>
                </div>
                <input
                  type="range" min="0" max="1" step="0.1" value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
                />
              </div>
            )}
          </div>
        </div>
        )}
      </aside>

      <div className="flex-1 relative min-w-0">
        {/* h-full/w-full, no absolute inset-0: maplibre-gl.css le pone
            position:relative al contenedor (clase .maplibregl-map que
            MapLibre agrega solo), lo que pisa un position:absolute de
            Tailwind y deja el div con alto 0 (inset-0 no estira nada sin
            position:absolute/fixed). h-full sí funciona con cualquier
            position, siempre que el padre (arriba) tenga alto definido. */}
        <div ref={mapContainerRef} className="h-full w-full" />

        {selectedPredio && (
          <button
            onClick={handleVolver}
            className="absolute top-3 right-3 z-[1001] flex items-center gap-1.5 rounded-full bg-card border border-border px-3 py-1.5 text-xs font-medium text-foreground shadow-md hover:border-primary/40 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Volver
          </button>
        )}

        {selectedPredio && (
          <div className="absolute bottom-3 left-3 right-3 md:left-auto md:right-3 md:w-80 z-[1001] rounded-xl border border-border bg-card shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
              <h3 className="text-sm font-semibold text-foreground truncate">{selectedPredio.name}</h3>
              <button onClick={handleVolver} aria-label="Cerrar" className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Medidor NDVI — oculto si falla */}
              {(ndviLoading || ndvi) && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Satellite className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Índice NDVI</span>
                  </div>
                  {ndviLoading && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Consultando MODIS...
                    </div>
                  )}
                  {ndvi && !ndviLoading && (
                    <div className="space-y-1.5">
                      <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(0, Math.min(1, ndvi.ndvi)) * 100}%`, backgroundColor: ndvi.color }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold" style={{ color: ndvi.color }}>{ndvi.ndvi.toFixed(3)}</span>
                        <span className="text-muted-foreground">{ndvi.interpretacion}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/70">Composite MODIS · {ndvi.fecha}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Clima */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CloudSun className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Clima actual</span>
                </div>
                {weatherLoading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Consultando OpenWeather...
                  </div>
                )}
                {weatherError && !weatherLoading && (
                  <p className="text-xs text-destructive">{weatherError}</p>
                )}
                {weather && !weatherLoading && (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <div><span className="text-muted-foreground">Temperatura: </span><span className="font-medium text-foreground">{weather.temperature}°C</span></div>
                    <div><span className="text-muted-foreground">Sensación: </span><span className="font-medium text-foreground">{weather.feelsLike}°C</span></div>
                    <div><span className="text-muted-foreground">Humedad: </span><span className="font-medium text-foreground">{weather.humidity}%</span></div>
                    <div><span className="text-muted-foreground">Viento: </span><span className="font-medium text-foreground">{weather.windSpeed} m/s</span></div>
                    <div className="col-span-2"><span className="text-muted-foreground">Condición: </span><span className="font-medium text-foreground">{weather.description}</span></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
