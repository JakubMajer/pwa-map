import { useState } from 'react'

const COLORS = ['#e11d48', '#f97316', '#eab308', '#22c55e', '#0ea5e9', '#6366f1', '#a855f7', '#78716c']
const ICONS = ['🍽️', '☕', '🍺', '🏨', '🏔️', '🏖️', '🛒', '⛽', '🅿️', '🎯', '📷', '⭐']

export default function CategoryEditor({ category, onSave, onClose }) {
  const [name, setName] = useState(category?.name || '')
  const [color, setColor] = useState(category?.color || COLORS[0])
  const [icon, setIcon] = useState(category?.icon || ICONS[0])

  function submit(event) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSave({ ...category, name: trimmed, color, icon })
  }

  return (
    <div className="overlay" onClick={onClose}>
      <form className="dialog" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
        <h2>{category ? 'Upravit kategorii' : 'Nová kategorie'}</h2>

        <label className="field">
          <span>Název kategorie</span>
          <input
            value={name}
            autoFocus
            placeholder="např. Restaurace"
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <div className="field">
          <span>Barva</span>
          <div className="swatches">
            {COLORS.map((value) => (
              <button
                key={value}
                type="button"
                className={`swatch${value === color ? ' swatch--active' : ''}`}
                style={{ background: value }}
                onClick={() => setColor(value)}
                aria-label={`Barva ${value}`}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <span>Ikona</span>
          <div className="swatches">
            {ICONS.map((value) => (
              <button
                key={value}
                type="button"
                className={`swatch swatch--icon${value === icon ? ' swatch--active' : ''}`}
                onClick={() => setIcon(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="dialog__actions">
          <button type="button" className="link" onClick={onClose}>
            Zrušit
          </button>
          <button type="submit" className="primary" disabled={!name.trim()}>
            Uložit
          </button>
        </div>
      </form>
    </div>
  )
}
