"use client"

import { useEffect, useRef, useState } from "react"
import { PanelLeft } from "lucide-react"
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
  role?: 'admin' | 'asesor' | 'analista' | 'agricultor' | 'campesino'
}

// Bounds de Colombia continental + insular — igual que en map-viewer.tsx, para
// que el usuario no se salga del país navegando.
const COLOMBIA_BOUNDS: [[number, number], [number, number]] = [
  [-82, -4.5],   // suroeste [lng, lat]
  [-66.8, 13.5], // noreste [lng, lat]
]

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

function sourceIdFor(key: LayerType): string {
  return `src-${key}`
}
function layerIdFor(key: LayerType): string {
  return `layer-${key}`
}

function isOverlayCategory(category: LayerConfig['category']): boolean {
  return category === 'nasa' || category === 'clima'
}

export function MapViewerGL({
  initialCenter,
  initialZoom,
  markerPosition,
  polygonCoords,
  markers,
  minimal = false,
  controlledLayer,
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
  const [activeBackground, setActiveBackground] = useState<LayerType>(
    (controlledLayer && !isOverlayCategory(buildLayers()[controlledLayer].category)) ? controlledLayer : "cartoLight"
  )
  const [activeOverlay, setActiveOverlay] = useState<LayerType | null>(
    (controlledLayer && isOverlayCategory(buildLayers()[controlledLayer].category)) ? controlledLayer : null
  )
  const visibleRef = useRef<{ background: LayerType; overlay: LayerType | null }>({ background: activeBackground, overlay: activeOverlay })
  const [opacity, setOpacity] = useState(0.85)
  const [tilesLoading, setTilesLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const layers = buildLayers()
  const visibleCategories = canSee(role, 'all-layers')
    ? (['base', 'satelital', 'nasa', 'clima'] as const)
    : (['base', 'satelital', 'nasa'] as const)

  // En modo minimal (panel externo con un solo toggle, ej. detalle de
  // caracterización) el llamador controla una única capa exclusiva — igual
  // que antes de este cambio, sin distinguir fondo/overlay.
  useEffect(() => {
    if (!minimal || !controlledLayer) return
    if (isOverlayCategory(layers[controlledLayer].category)) {
      setActiveOverlay(controlledLayer)
    } else {
      setActiveBackground(controlledLayer)
      setActiveOverlay(null)
    }
  }, [minimal, controlledLayer])

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
      features: (markers ?? []).map((m) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [m.position[1], m.position[0]] },
        properties: { id: m.id ?? '', popupContent: m.popupContent, name: m.name ?? '' },
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

    const brand = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#16a34a'

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

    map.on('click', 'clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })
      const clusterId = features[0]?.properties?.cluster_id
      const source = map.getSource('markers') as maplibregl.GeoJSONSource
      if (clusterId == null) return
      // v6 de maplibre-gl cambió getClusterExpansionZoom de callback a Promise
      // (ver maplibre-gl.d.ts: `getClusterExpansionZoom(clusterId): Promise<number>`),
      // a diferencia de la firma con callback que usa el ejemplo del plan.
      source.getClusterExpansionZoom(clusterId).then((zoom) => {
        const geom = features[0].geometry as GeoJSON.Point
        map.easeTo({ center: geom.coordinates as [number, number], zoom: zoom ?? map.getZoom() + 1 })
      }).catch(() => {})
    })

    map.on('click', 'unclustered-point', (e) => {
      const feature = e.features?.[0]
      if (!feature) return
      const geom = feature.geometry as GeoJSON.Point
      const popupContent = String(feature.properties?.popupContent ?? '')
      new maplibregl.Popup({ closeButton: true })
        .setLngLat(geom.coordinates as [number, number])
        .setHTML(popupContent)
        .addTo(map)
    })

    map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = '' })
    map.on('mouseenter', 'unclustered-point', () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'unclustered-point', () => { map.getCanvas().style.cursor = '' })
  }, [markers, isMapReady])

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
          paint: { 'fill-color': '#22c55e', 'fill-opacity': 0.3 },
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
      </aside>

      <div className="flex-1 relative min-w-0">
        {/* h-full/w-full, no absolute inset-0: maplibre-gl.css le pone
            position:relative al contenedor (clase .maplibregl-map que
            MapLibre agrega solo), lo que pisa un position:absolute de
            Tailwind y deja el div con alto 0 (inset-0 no estira nada sin
            position:absolute/fixed). h-full sí funciona con cualquier
            position, siempre que el padre (arriba) tenga alto definido. */}
        <div ref={mapContainerRef} className="h-full w-full" />
      </div>
    </div>
  )
}
