import React, { useEffect, useRef } from 'react'
import type { StyleSpecification } from 'maplibre-gl'
import maplibregl from 'maplibre-gl'

type Props = {
  userPos: [number, number] | null // [lng, lat]
  // Optional: we could accept a providerId to show other markers, but per instructions we avoid extra markers.
}

export function ProviderActiveMap({ userPos }: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)

  const mapStyle: StyleSpecification = {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors'
      }
    },
    layers: [
      {
        id: 'osm',
        type: 'raster',
        source: 'osm'
      }
    ]
  }

  // Initialize map when we have a user position and the container is ready
  useEffect(() => {
    if (!userPos || !mapContainerRef.current) return
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: userPos,
      zoom: 14,
      attributionControl: false
    })
    mapRef.current = map

    // Add a marker for the user position
    const el = document.createElement('div')
    el.className = 'ugo-provider-marker'
    markerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat(userPos)
      .addTo(map)

    return () => {
      markerRef.current?.remove()
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [userPos])

  // Update map center and marker when userPos changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !userPos) return
    map.easeTo({ center: userPos, duration: 300 })
    // Update marker position
    if (markerRef.current) {
      markerRef.current.setLngLat(userPos)
    } else {
      // Create marker if not exist (should exist after init)
      const el = document.createElement('div')
      el.className = 'ugo-provider-marker'
      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(userPos)
        .addTo(map)
    }
  }, [userPos])

  if (!userPos) {
    return (
      <div ref={mapContainerRef} className="ugo-provider-active-map">
        <div className="placeholder">Ubicación pendiente</div>
      </div>
    )
  }

  return <div ref={mapContainerRef} className="ugo-provider-active-map" />
}
