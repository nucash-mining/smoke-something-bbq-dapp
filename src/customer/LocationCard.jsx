import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { getSettings } from '../lib/db.js'
import { mapsLink } from '../lib/payLinks.js'
import { business, location as locCfg } from '../config.js'

const Icon = L.icon({
  iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow,
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
})

function timeAgo(iso) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  return `${Math.round(s / 3600)}h ago`
}

export default function LocationCard() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const mapRef = useRef(null)
  const mapObj = useRef(null)

  // poll the owner's shared location every 20s so customers see them move/appear
  useEffect(() => {
    let active = true
    const load = () => getSettings().then((s) => active && setSettings(s)).finally(() => active && setLoading(false))
    load()
    const t = setInterval(load, 15000)
    return () => { active = false; clearInterval(t) }
  }, [])

  const live = settings?.location_enabled && settings?.location_lat != null && settings?.location_lng != null
  const lat = settings?.location_lat
  const lng = settings?.location_lng

  useEffect(() => {
    if (!live || !mapRef.current) return
    if (!mapObj.current) {
      const map = L.map(mapRef.current).setView([lat, lng], 15)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
      }).addTo(map)
      L.marker([lat, lng], { icon: Icon }).addTo(map).bindPopup(`${business.name} is here`)
      mapObj.current = map
      setTimeout(() => map.invalidateSize(), 0)
    } else {
      mapObj.current.setView([lat, lng], 15)
    }
  }, [live, lat, lng])

  // tear down map when going offline
  useEffect(() => {
    if (!live && mapObj.current) { mapObj.current.remove(); mapObj.current = null }
  }, [live])

  return (
    <section className="section">
      <h2>Find the truck</h2>
      <div className="card">
        {loading ? (
          <p className="m-sub">Checking location…</p>
        ) : live ? (
          <>
            <div className="live-row">
              <span className="live-badge"><span className="live-dot" /> LIVE</span>
              <span className="m-sub">
                {business.name} is sharing their location
                {settings?.updated_at ? ` · updated ${timeAgo(settings.updated_at)}` : ''}
              </span>
            </div>
            <div id="map" ref={mapRef} />
            <a className="btn" style={{ marginTop: 12, display: 'block', textAlign: 'center', textDecoration: 'none' }}
              href={mapsLink(lat, lng, business.name)} target="_blank" rel="noreferrer">
              📍 Open in Maps &amp; get directions
            </a>
          </>
        ) : (
          <p className="m-sub" style={{ margin: 0 }}>
            We're not sharing a live location right now. Check our{' '}
            <a href={business.facebook} target="_blank" rel="noreferrer" style={{ color: 'var(--ember-2)' }}>
              Facebook page
            </a>{' '}for today's spot.
          </p>
        )}
      </div>
    </section>
  )
}
