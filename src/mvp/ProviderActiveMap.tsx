import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { StyleSpecification } from 'maplibre-gl'
import { loadMaplibre } from '../lib/maplibreLoader'

type Props = {
  userPos: [number, number] | null // [lng, lat]
  // Optional: we could accept a providerId to show other markers, but per instructions we avoid extra markers.
}

export function ProviderActiveMap({ userPos }: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<import('maplibre-gl').Map | null>(null)
  const markerRef = useRef<import('maplibre-gl').Marker | null>(null)
  const [mapReady, setMapReady] = useState(false)

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

  // Initialize map when we have a user position and the container is ready.
  // maplibre-gl (~1 MB) se descarga recién cuando este mapa se monta.
  useEffect(() => {
    if (!userPos || !mapContainerRef.current || mapRef.current) return
    let alive = true
    void loadMaplibre().then(maplibregl => {
      if (!alive || !mapContainerRef.current || mapRef.current) return
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: mapStyle,
        center: userPos,
        zoom: 14,
        attributionControl: false
      })
      mapRef.current = map
      setMapReady(true)

      // Add a marker for the user position
      const el = document.createElement('div')
      el.className = 'ugo-provider-marker'
      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(userPos)
        .addTo(map)
    }).catch(error => console.warn('[ProviderActiveMap] maplibre load failed', error))

    return () => {
      alive = false
      setMapReady(false)
      markerRef.current?.remove()
      markerRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [userPos, mapStyle])

  // Update map center and marker when userPos changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !userPos || !mapReady) return
    map.easeTo({ center: userPos, duration: 300 })
    // Update marker position
    if (markerRef.current) {
      markerRef.current.setLngLat(userPos)
    } else {
      // Create marker if not exist (should exist after init)
      let alive = true
      void loadMaplibre().then(maplibregl => {
        if (!alive || mapRef.current !== map || markerRef.current) return
        const el = document.createElement('div')
        el.className = 'ugo-provider-marker'
        markerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat(userPos)
          .addTo(map)
      }).catch(error => console.warn('[ProviderActiveMap] marker load failed', error))
      return () => { alive = false }
    }
  }, [userPos, mapReady])

  if (!userPos) {
    return (
      <div ref={mapContainerRef} className="ugo-provider-active-map">
        <div className="placeholder">Ubicación pendiente</div>
      </div>
    )
  }

  return <div ref={mapContainerRef} className="ugo-provider-active-map" />
}
