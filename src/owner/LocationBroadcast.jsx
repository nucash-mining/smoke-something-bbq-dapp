import { useEffect, useRef, useState } from 'react'
import { getSettings, saveSettings } from '../lib/db.js'

// Owner toggles "Share my live location". While on, we watch the device GPS and
// push coordinates to business_settings so customers see the truck on the map.
export default function LocationBroadcast() {
  const [on, setOn] = useState(false)
  const [coords, setCoords] = useState(null)
  const [err, setErr] = useState(null)
  const watchId = useRef(null)

  useEffect(() => {
    getSettings().then((s) => {
      setOn(!!s.location_enabled)
      if (s.location_lat != null) setCoords({ lat: s.location_lat, lng: s.location_lng })
    })
  }, [])

  useEffect(() => {
    if (!on) {
      if (watchId.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId.current); watchId.current = null
      }
      return
    }
    if (!('geolocation' in navigator)) { setErr('This device has no geolocation.'); return }
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude
        setCoords({ lat, lng }); setErr(null)
        saveSettings({ location_enabled: true, location_lat: lat, location_lng: lng }).catch((e) => setErr(e.message))
      },
      (e) => setErr(e.message || 'Could not read location.'),
      { enableHighAccuracy: true, maximumAge: 8000, timeout: 15000 }
    )
    return () => {
      if (watchId.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId.current); watchId.current = null
      }
    }
  }, [on])

  async function toggle(next) {
    setOn(next)
    if (!next) await saveSettings({ location_enabled: false })
  }

  return (
    <div className="card">
      <div className="loc-head">
        <div>
          <strong>Share my live location</strong>
          <div className="m-sub">Customers see your spot on the map and can get directions.</div>
        </div>
        <label className="switch">
          <input type="checkbox" checked={on} onChange={(e) => toggle(e.target.checked)} />
          <span className="slider-track" />
        </label>
      </div>
      {on && coords ? (
        <div className="coords">📡 Broadcasting: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</div>
      ) : on ? (
        <div className="coords">Getting your location… (allow the prompt)</div>
      ) : (
        <div className="coords">Off — customers are pointed to your Facebook page instead.</div>
      )}
      {err ? <div className="status err">{err}</div> : null}
    </div>
  )
}
