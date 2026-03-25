'use client'
import { useRef, useEffect } from 'react'
import Map, { Marker, Source, Layer, type MapRef } from 'react-map-gl/mapbox'
import type { LayerProps } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

// Default centre: Cohuna, VIC
const DEFAULT_LNG = 144.3194
const DEFAULT_LAT = -35.8729

interface TaxiMapProps {
  pickup?: [number, number] | null   // [lng, lat]
  dest?: [number, number] | null
  routeGeometry?: GeoJSON.LineString | null
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
}

const routeLayer: LayerProps = {
  id: 'route',
  type: 'line',
  paint: {
    'line-color': '#d4570a',
    'line-width': 4,
    'line-dasharray': [2, 1.5],
  },
  layout: { 'line-cap': 'round', 'line-join': 'round' },
}

export default function TaxiMap({ pickup, dest, routeGeometry, className, style, children }: TaxiMapProps) {
  const mapRef = useRef<MapRef>(null)

  // Fit map to route or pickup+dest when they change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const points = [pickup, dest].filter(Boolean) as [number, number][]
    if (points.length === 2) {
      const lngs = points.map(p => p[0])
      const lats = points.map(p => p[1])
      map.fitBounds(
        [[Math.min(...lngs) - 0.01, Math.min(...lats) - 0.01], [Math.max(...lngs) + 0.01, Math.max(...lats) + 0.01]],
        { padding: 60, duration: 800 }
      )
    }
  }, [pickup?.[0], pickup?.[1], dest?.[0], dest?.[1]]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={className} style={{ position: 'relative', ...style }}>
    <Map
      ref={mapRef}
      mapboxAccessToken={TOKEN}
      initialViewState={{
        longitude: pickup?.[0] ?? DEFAULT_LNG,
        latitude: pickup?.[1] ?? DEFAULT_LAT,
        zoom: 13,
      }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      style={{ width: '100%', height: '100%' }}
    >
      {/* Route line */}
      {routeGeometry && (
        <Source id="route" type="geojson" data={{ type: 'Feature', geometry: routeGeometry, properties: {} }}>
          <Layer {...routeLayer} />
        </Source>
      )}

      {/* Pickup pin */}
      {pickup && (
        <Marker longitude={pickup[0]} latitude={pickup[1]} anchor="center">
          <div style={{ position: 'relative', width: 20, height: 20 }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'rgba(212,87,10,0.2)', animation: 'locPulse 2s ease-out infinite',
            }} />
            <div style={{
              position: 'absolute', inset: 4, borderRadius: '50%',
              background: '#d4570a', border: '2px solid white',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }} />
          </div>
        </Marker>
      )}

      {/* Destination pin */}
      {dest && (
        <Marker longitude={dest[0]} latitude={dest[1]} anchor="bottom">
          <div style={{
            width: 14, height: 14, borderRadius: '50%',
            background: '#1e2330', border: '2.5px solid white',
            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
          }} />
        </Marker>
      )}

      {children}
    </Map>
    </div>
  )
}
