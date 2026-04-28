declare module 'leaflet' {
  const content: any
  export = content
}

declare module 'leaflet/dist/leaflet.css'
declare module 'leaflet-draw'
declare module 'leaflet-draw/dist/leaflet.draw.css'

declare namespace L {
  type Map = any
  type LatLng = any
  type LatLngBounds = any
  type LatLngExpression = any
  type LatLngBoundsExpression = any
  type Layer = any
  type LayerGroup = any
  type FeatureGroup = any
  type TileLayer = any
  type Marker = any
  type Circle = any
  type Rectangle = any
  type Polygon = any
  type Polyline = any
  type Path = any
  type Icon = any
  type DivIcon = any
  type Popup = any
  type Control = any
  type MapOptions = any
  type MarkerOptions = any
  type CircleOptions = any
  type PolylineOptions = any
  type PathOptions = any
  type TileLayerOptions = any
  type LeafletEvent = any
  type LeafletMouseEvent = any
  type Point = any
  type Bounds = any
  type CircleMarker = any
  type Coords = any
  type DoneCallback = any
}
