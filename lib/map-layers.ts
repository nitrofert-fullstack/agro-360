// lib/map-layers.ts
// Config compartida de capas de mapa (base/satelital/nasa/clima) — usada por
// el mapa Leaflet (components/map-viewer.tsx) y el mapa MapLibre
// (components/map-viewer-gl.tsx) para que ambos sirvan exactamente los
// mismos proveedores y URLs, sin duplicar la lista.

export type LayerType = "ndvi" | "satellite" | "temperature" | "precipitation"
  | "osm" | "cartoLight" | "cartoDark" | "cartoVoyager"
  | "esriTopo" | "esriStreet" | "openTopo" | "esriNatGeo"
  | "nasaTrueColor" | "nasaViirs" | "nasaEVI" | "nasaLST" | "nasaFire"

export interface LayerConfig {
  name: string
  description: string
  url: string
  attribution: string
  opacity: number
  useColorRemap?: boolean
  maxZoom?: number
  category: 'base' | 'satelital' | 'nasa' | 'clima'
  subdomains?: string
}

function getGibsDate(): string {
  const date = new Date()
  date.setDate(date.getDate() - 8)
  return date.toISOString().split("T")[0]
}

export function buildLayers(): Record<LayerType, LayerConfig> {
  const gibsDate = getGibsDate()
  return {
    // ── Base maps ──────────────────────────────────────────────────────────
    osm: {
      name: "OpenStreetMap",
      description: "Mapa estándar colaborativo",
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: "© OpenStreetMap contributors",
      opacity: 1,
      maxZoom: 19,
      category: 'base',
      subdomains: 'abc',
    },
    cartoLight: {
      name: "Carto Claro",
      description: "Mapa minimalista fondo claro",
      url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      attribution: "© CARTO",
      opacity: 1,
      maxZoom: 19,
      category: 'base',
      subdomains: 'abcd',
    },
    cartoDark: {
      name: "Carto Oscuro",
      description: "Mapa minimalista fondo oscuro",
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      attribution: "© CARTO",
      opacity: 1,
      maxZoom: 19,
      category: 'base',
      subdomains: 'abcd',
    },
    cartoVoyager: {
      name: "Carto Voyager",
      description: "Mapa detallado estilo Voyager",
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      attribution: "© CARTO",
      opacity: 1,
      maxZoom: 19,
      category: 'base',
      subdomains: 'abcd',
    },
    esriTopo: {
      name: "Esri Topo",
      description: "Mapa topográfico con curvas de nivel",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
      attribution: "Esri, HERE, Garmin, FAO, NOAA, USGS",
      opacity: 1,
      maxZoom: 19,
      category: 'base',
    },
    esriStreet: {
      name: "Esri Calles",
      description: "Mapa de calles y carreteras Esri",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      attribution: "Esri, HERE, Garmin, USGS",
      opacity: 1,
      maxZoom: 19,
      category: 'base',
    },
    openTopo: {
      name: "OpenTopoMap",
      description: "Mapa topográfico de OpenStreetMap",
      url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      attribution: "© OpenTopoMap (CC-BY-SA)",
      opacity: 1,
      maxZoom: 17,
      category: 'base',
      subdomains: 'abc',
    },
    // ── Satelital ──────────────────────────────────────────────────────────
    satellite: {
      name: "Esri Satelital",
      description: "Vista satelital de alta resolucion",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "Esri World Imagery",
      opacity: 1,
      category: 'satelital',
    },
    esriNatGeo: {
      name: "Esri NatGeo",
      description: "Mapa estilo National Geographic",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}",
      attribution: "Esri, NatGeo, DeLorme",
      opacity: 1,
      maxZoom: 16,
      category: 'satelital',
    },
    nasaTrueColor: {
      name: "MODIS Color Real",
      description: "MODIS Terra color real diario",
      url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${gibsDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
      attribution: "NASA GIBS MODIS Terra",
      opacity: 1,
      maxZoom: 9,
      category: 'satelital',
    },
    nasaViirs: {
      name: "VIIRS Color Real",
      description: "VIIRS SNPP color real diario",
      url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${gibsDate}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg`,
      attribution: "NASA GIBS VIIRS SNPP",
      opacity: 1,
      maxZoom: 8,
      category: 'satelital',
    },
    // ── NASA overlays ──────────────────────────────────────────────────────
    ndvi: {
      name: "NDVI",
      description: "Indice de Vegetacion (NASA MODIS) - Max zoom: 9",
      url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/${gibsDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`,
      attribution: "NASA GIBS MODIS",
      opacity: 0.85,
      maxZoom: 9,
      category: 'nasa',
    },
    nasaEVI: {
      name: "EVI (8 días)",
      description: "Índice de Vegetación Mejorado MODIS",
      url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_EVI_8Day/default/${gibsDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`,
      attribution: "NASA GIBS MODIS EVI",
      opacity: 0.85,
      maxZoom: 9,
      category: 'nasa',
    },
    nasaLST: {
      name: "Temp. Superficie",
      description: "Temperatura superficial terrestre MODIS",
      url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Land_Surface_Temp_Day/default/${gibsDate}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`,
      attribution: "NASA GIBS MODIS LST",
      opacity: 0.85,
      maxZoom: 7,
      category: 'nasa',
    },
    nasaFire: {
      name: "Incendios Activos",
      description: "Anomalías térmicas VIIRS 375m",
      url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_Thermal_Anomalies_375m_All/default/${gibsDate}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`,
      attribution: "NASA GIBS VIIRS Fire",
      opacity: 0.9,
      maxZoom: 8,
      category: 'nasa',
    },
    // ── Clima ──────────────────────────────────────────────────────────────
    temperature: {
      name: "Temperatura",
      description: "Mapa de calor con temperaturas actuales",
      url: "/api/weather-tile?type=temp_new&z={z}&x={x}&y={y}",
      attribution: "OpenWeatherMap",
      opacity: 0.7,
      category: 'clima',
    },
    precipitation: {
      name: "Precipitacion",
      description: "Niveles de precipitacion actual",
      url: "/api/weather-tile?type=precipitation_new&z={z}&x={x}&y={y}",
      attribution: "OpenWeatherMap",
      opacity: 0.7,
      category: 'clima',
    },
  }
}
