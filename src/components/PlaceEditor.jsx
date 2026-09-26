export default function PlaceEditor({ draft, categories, onChange, onSave, onPickOnMap, onClose }) {
  function set(key, value) {
    onChange({ ...draft, [key]: value })
  }

  function submit(event) {
    event.preventDefault()
    const name = draft.name.trim()
    if (!name || !draft.categoryId) return
    onSave({ ...draft, name, description: draft.description.trim() })
  }

  return (
    <div className="overlay" onClick={onClose}>
      <form className="dialog" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
        <h2>{draft.isNew ? 'Nový bod' : 'Upravit bod'}</h2>

        <label className="field">
          <span>Název</span>
          <input
            value={draft.name}
            autoFocus
            placeholder="např. Pizzerie U Kašny"
            onChange={(event) => set('name', event.target.value)}
          />
        </label>

        <label className="field">
          <span>Kategorie</span>
          <select value={draft.categoryId} onChange={(event) => set('categoryId', event.target.value)}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Popisek</span>
          <textarea
            rows={4}
            value={draft.description}
            placeholder="Co si k tomuhle místu chceš zapamatovat…"
            onChange={(event) => set('description', event.target.value)}
          />
        </label>

        <div className="field">
          <span>Souřadnice</span>
          <div className="coords">
            <input
              type="number"
              step="any"
              value={draft.lat}
              onChange={(event) => set('lat', event.target.value)}
              aria-label="Zeměpisná šířka"
            />
            <input
              type="number"
              step="any"
              value={draft.lng}
              onChange={(event) => set('lng', event.target.value)}
              aria-label="Zeměpisná délka"
            />
            <button type="button" onClick={onPickOnMap}>
              Vybrat na mapě
            </button>
          </div>
        </div>

        <div className="dialog__actions">
          <button type="button" className="link" onClick={onClose}>
            Zrušit
          </button>
          <button type="submit" className="primary" disabled={!draft.name.trim()}>
            Uložit
          </button>
        </div>
      </form>
    </div>
  )
}
