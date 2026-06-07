import { useEffect, useRef, useState } from 'react'
import { getSettings, saveSettings } from '../lib/db.js'

// Two things the owner controls here:
//  1) "Usual spot" — a fixed location customers always see on the front page.
//  2) "Live location" — real-time GPS broadcast while you're parked/serving.
export default function LocationBroadcast() {
  const [on, setOn] = useState(false)
  const [coords, setCoords] = useState(null)
  const [base, setBase] = useState(null)   // {lat,lng,label}
  const [label, setLabel] = useState('')
  const [err, setErr] = useState(null)
  const [msg, setMsg] = useState(null)
  const watchId = useRef(null)

  useEffect(() => {
    getSettings().then((s) => {
      setOn(!!s.location_enabled)
      if (s.location_lat != null) setCoords({ lat: s.location_lat, lng: s.location_lng })
      if (s.base_lat != null) setBase({ lat: s.base_lat, lng: s.base_lng, label: s.base_label || '' })
      setLabel(s.base_label || '')
    })
  }, [])

  // live broadcast
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
      (e) => setErr(`${e.message || 'Could not read location.'} — allow location access for this site.`),
      { enableHighAccuracy: true, maximumAge: 8000, timeout: 15000 }
    )
    return () => {
      if (watchId.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId.current); watchId.current = null
      }
    }
  }, [on])

  async function toggle(next) {
    setErr(null)
    setOn(next)
    // Persist the enabled flag immediately so customers' view updates even
    // before the first GPS fix lands.
    await saveSettings({ location_enabled: next }).catch((e) => setErr(e.message))
  }

  function setUsualSpot() {
    setMsg(null); setErr(null)
    if (!('geolocation' in navigator)) { setErr('This device has no geolocation.'); return }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude
        try {
          await saveSettings({ base_lat: lat, base_lng: lng, base_label: label.trim() })
          setBase({ lat, lng, label: label.trim() })
          setMsg({ type: 'ok', text: 'Usual spot saved — customers now see it on the front page.' })
        } catch (e) { setErr(e.message) }
      },
      (e) => setErr(`${e.message || 'Could not read location.'} — allow location access.`),
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  async function clearUsualSpot() {
    await saveSettings({ base_lat: null, base_lng: null, base_label: '' })
    setBase(null); setMsg({ type: 'ok', text: 'Usual spot cleared.' })
  }

  return (
    <>
      {/* Usual spot */}
      <div className="card">
        <h3 className="cat-title">Our usual spot</h3>
        <p className="m-sub" style={{ marginBottom: 10 }}>
          A fixed location customers always see on the front page (until you go live below).
        </p>
        <input className="field" placeholder="Label (e.g. Main St & 5th, Charlotte)"
          value={label} onChange={(e) => setLabel(e.target.value)} />
        <div className="row2">
          <button className="btn secondary" type="button" onClick={setUsualSpot}>📍 Use my current location</button>
          {base ? <button className="btn secondary" type="button" onClick={clearUsualSpot}>Clear</button> : null}
        </div>
        {base ? (
          <div className="coords">Saved: {base.label ? `${base.label} · ` : ''}{base.lat.toFixed(5)}, {base.lng.toFixed(5)}</div>
        ) : <div className="coords">No usual spot set yet.</div>}
      </div>

      {/* Live broadcast */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="loc-head">
          <div>
            <strong>Share my LIVE location</strong>
            <div className="m-sub">Real-time GPS while you're serving. Overrides the usual spot.</div>
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
          <div className="coords">Off — customers see your usual spot{base ? '' : ' (none set)'} instead.</div>
        )}
        {err ? <div className="status err">{err}</div> : null}
      </div>

      {msg ? <div className={`status ${msg.type}`} style={{ marginTop: 10 }}>{msg.text}</div> : null}
    </>
  )
}
