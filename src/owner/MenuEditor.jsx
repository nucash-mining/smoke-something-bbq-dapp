import { useEffect, useState } from 'react'
import { getMenu, saveMenuItem, deleteMenuItem, uploadMenuImage } from '../lib/db.js'
import { fmtPrice, categoryOrder } from '../config.js'

const blank = { category: 'Plates', name: '', description: '', price: '', available: true, image_url: '' }

export default function MenuEditor() {
  const [menu, setMenu] = useState([])
  const [draft, setDraft] = useState(blank)
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState(null)

  const load = () => getMenu().then(setMenu).catch((e) => setErr(e.message))
  useEffect(() => { load() }, [])

  async function save(e) {
    e.preventDefault()
    setErr(null); setBusy(true)
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        category: draft.category.trim() || 'Other',
        name: draft.name.trim(),
        description: draft.description.trim(),
        price: draft.price === '' ? null : Number(draft.price),
        available: draft.available,
        image_url: draft.image_url || null,
        sort_order: Number(draft.sort_order) || 0,
      }
      if (!payload.name) throw new Error('Name is required.')
      await saveMenuItem(payload)
      setDraft(blank); setEditingId(null)
      await load()
    } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }

  function edit(item) {
    setEditingId(item.id)
    setDraft({
      category: item.category, name: item.name, description: item.description || '',
      price: item.price ?? '', available: item.available !== false, sort_order: item.sort_order || 0,
      image_url: item.image_url || '',
    })
  }

  async function handleImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setErr(null); setUploading(true)
    try {
      const url = await uploadMenuImage(file)
      setDraft((d) => ({ ...d, image_url: url }))
    } catch (e2) { setErr('Image upload failed: ' + e2.message) }
    finally { setUploading(false) }
  }

  async function remove(id) {
    if (!confirm('Delete this item?')) return
    await deleteMenuItem(id); await load()
  }

  const cats = [...new Set(menu.map((m) => m.category))].sort(
    (a, b) => (categoryOrder.indexOf(a) + 1 || 99) - (categoryOrder.indexOf(b) + 1 || 99)
  )

  return (
    <div>
      <div className="card">
        <h3 className="cat-title">{editingId ? 'Edit item' : 'Add menu item'}</h3>
        <form onSubmit={save} className="menu-form">
          <div className="row2">
            <input className="field" list="cats" placeholder="Category (Plates, Ribs, Sides…)"
              value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
            <datalist id="cats">{categoryOrder.map((c) => <option key={c} value={c} />)}</datalist>
            <input className="field" type="number" step="0.01" min="0" placeholder="Price (blank = Ask)"
              value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
          </div>
          <input className="field" placeholder="Item name"
            value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input className="field" placeholder="Description (optional)"
            value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />

          <div className="img-upload">
            {draft.image_url ? (
              <img className="mi-thumb lg" src={draft.image_url} alt="preview" />
            ) : <div className="mi-thumb lg placeholder">No photo</div>}
            <div className="iu-actions">
              <label className="btn secondary file-label">
                {uploading ? 'Uploading…' : draft.image_url ? 'Change photo' : 'Upload photo'}
                <input type="file" accept="image/*" onChange={handleImage} disabled={uploading} hidden />
              </label>
              {draft.image_url ? (
                <button type="button" className="link-btn" onClick={() => setDraft({ ...draft, image_url: '' })}>Remove</button>
              ) : null}
            </div>
          </div>

          <label className="chk">
            <input type="checkbox" checked={draft.available}
              onChange={(e) => setDraft({ ...draft, available: e.target.checked })} /> Available
          </label>
          <div className="row2">
            <button className="btn" disabled={busy}>{editingId ? 'Save changes' : 'Add item'}</button>
            {editingId ? <button type="button" className="btn secondary" onClick={() => { setEditingId(null); setDraft(blank) }}>Cancel</button> : null}
          </div>
          {err ? <div className="status err">{err}</div> : null}
        </form>
      </div>

      {cats.map((cat) => (
        <div className="card menu-cat" key={cat}>
          <h3 className="cat-title">{cat}</h3>
          {menu.filter((m) => m.category === cat).map((item) => (
            <div className="menu-item" key={item.id}>
              {item.image_url ? <img className="mi-thumb" src={item.image_url} alt={item.name} /> : null}
              <div className="mi-info">
                <div className="mi-name">{item.name} {item.available === false ? <span className="warn-pill">hidden</span> : null}</div>
                {item.description ? <div className="mi-desc">{item.description}</div> : null}
              </div>
              <div className="mi-right">
                <span className="mi-price">{fmtPrice(item.price)}</span>
                <button className="add-btn" onClick={() => edit(item)}>Edit</button>
                <button className="cr-x" onClick={() => remove(item.id)} aria-label="Delete">×</button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
