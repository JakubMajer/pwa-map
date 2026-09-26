import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MapView from './components/MapView.jsx'
import Sidebar from './components/Sidebar.jsx'
import CategoryEditor from './components/CategoryEditor.jsx'
import PlaceEditor from './components/PlaceEditor.jsx'
import * as db from './db.js'
import * as format from './format.js'
import './styles/app.less'

const HIDDEN_KEY = 'mapa-hidden-categories'

function readHidden() {
  try {
    return JSON.parse(localStorage.getItem(HIDDEN_KEY)) || []
  } catch {
    return []
  }
}

export default function App() {
  const [categories, setCategories] = useState([])
  const [places, setPlaces] = useState([])
  const [hidden, setHidden] = useState(readHidden)

  const [query, setQuery] = useState('')
  const [geoResults, setGeoResults] = useState([])
  const [geoStatus, setGeoStatus] = useState('idle')

  const [categoryDraft, setCategoryDraft] = useState(null)
  const [placeDraft, setPlaceDraft] = useState(null)
  const [picking, setPicking] = useState(null) // null | 'new' | 'edit'
  const [confirmState, setConfirmState] = useState(null)

  const [selectedId, setSelectedId] = useState(null)
  const [flyTarget, setFlyTarget] = useState(null)
  const geoAbort = useRef()

  useEffect(() => {
    db.loadAll().then(({ categories, places }) => {
      setCategories(categories)
      setPlaces(places)
    })
  }, [])

  useEffect(() => {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden))
  }, [hidden])

  const categoriesById = useMemo(
    () => Object.fromEntries(categories.map((category) => [category.id, category])),
    [categories],
  )

  const placesByCategory = useMemo(() => {
    const grouped = {}
    for (const place of places) {
      ;(grouped[place.categoryId] ||= []).push(place)
    }
    return grouped
  }, [places])

  const visiblePlaces = useMemo(
    () => places.filter((place) => !hidden.includes(place.categoryId)),
    [places, hidden],
  )

  // Hledání jede přes název, popisek i název kategorie – ať se dá bod najít
  // i podle toho, co si k němu člověk poznamenal.
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return []
    return places
      .map((place) => ({ place, category: categoriesById[place.categoryId] }))
      .filter(({ place, category }) =>
        [place.name, place.description, category?.name]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(needle)),
      )
      .slice(0, 50)
  }, [query, places, categoriesById])

  const focusPlace = useCallback(
    (id, zoom) => {
      const place = places.find((item) => item.id === id)
      setSelectedId(id)
      if (place) setFlyTarget({ center: [place.lat, place.lng], zoom })
    },
    [places],
  )

  // ── Kategorie ───────────────────────────────────────────────
  async function saveCategory(data) {
    const category = data.id
      ? data
      : { ...data, id: db.newId(), order: categories.length }
    await db.saveCategory(category)
    setCategories((current) => {
      const exists = current.some((item) => item.id === category.id)
      const next = exists
        ? current.map((item) => (item.id === category.id ? category : item))
        : [...current, category]
      return next.sort((a, b) => a.order - b.order)
    })
    setCategoryDraft(null)
  }

  function askDeleteCategory(category) {
    const count = (placesByCategory[category.id] || []).length
    setConfirmState({
      title: `Smazat kategorii „${category.name}“?`,
      text: count
        ? `Smaže se i ${format.places(count)}, které do ní patří. Tohle nejde vrátit.`
        : 'Kategorie je prázdná.',
      onConfirm: async () => {
        await db.deleteCategory(category.id)
        setCategories((current) => current.filter((item) => item.id !== category.id))
        setPlaces((current) => current.filter((item) => item.categoryId !== category.id))
        setConfirmState(null)
      },
    })
  }

  // ── Body ────────────────────────────────────────────────────
  function startNewPlace() {
    if (categories.length === 0) return
    setPlaceDraft(null)
    setSelectedId(null)
    setPicking('new')
  }

  function editPlace(place) {
    setPlaceDraft({ ...place, isNew: false })
    setSelectedId(place.id)
  }

  function handleMapPick([lat, lng]) {
    const coords = { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) }
    if (picking === 'new') {
      setPlaceDraft({
        isNew: true,
        name: '',
        description: '',
        categoryId: categories[0].id,
        ...coords,
      })
    } else {
      setPlaceDraft((draft) => ({ ...draft, ...coords }))
    }
    setPicking(null)
  }

  async function savePlace(draft) {
    const place = {
      id: draft.id || db.newId(),
      categoryId: draft.categoryId,
      name: draft.name,
      description: draft.description,
      lat: Number(draft.lat),
      lng: Number(draft.lng),
      createdAt: draft.createdAt || new Date().toISOString(),
    }
    await db.savePlace(place)
    setPlaces((current) => {
      const exists = current.some((item) => item.id === place.id)
      const next = exists
        ? current.map((item) => (item.id === place.id ? place : item))
        : [...current, place]
      return next.sort((a, b) => a.name.localeCompare(b.name, 'cs'))
    })
    setPlaceDraft(null)
    setSelectedId(place.id)
    setFlyTarget({ center: [place.lat, place.lng] })
  }

  function askDeletePlace(place) {
    setConfirmState({
      title: `Smazat bod „${place.name}“?`,
      text: 'Tohle nejde vrátit.',
      onConfirm: async () => {
        await db.deletePlace(place.id)
        setPlaces((current) => current.filter((item) => item.id !== place.id))
        setSelectedId(null)
        setConfirmState(null)
      },
    })
  }

  // ── Vyhledání místa ve světě (Nominatim / OpenStreetMap) ────
  async function geoSearch(text) {
    const needle = text.trim()
    if (!needle) return
    geoAbort.current?.abort()
    const controller = new AbortController()
    geoAbort.current = controller
    setGeoStatus('loading')
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search')
      url.searchParams.set('q', needle)
      url.searchParams.set('format', 'jsonv2')
      url.searchParams.set('limit', '6')
      const response = await fetch(url, { signal: controller.signal })
      if (!response.ok) throw new Error(response.statusText)
      const data = await response.json()
      setGeoResults(
        data.map((item) => ({
          id: `${item.osm_type}-${item.osm_id}`,
          label: item.display_name,
          lat: Number(item.lat),
          lng: Number(item.lon),
        })),
      )
      setGeoStatus('done')
    } catch (error) {
      if (error.name !== 'AbortError') setGeoStatus('error')
    }
  }

  function pickGeoResult(result) {
    setSelectedId(null)
    setFlyTarget({ center: [result.lat, result.lng], zoom: 15 })
    // Návrh bodu rovnou předvyplníme – typický scénář je „najdi místo a ulož si ho“.
    if (categories.length > 0) {
      setPlaceDraft({
        isNew: true,
        name: result.label.split(',')[0],
        description: '',
        categoryId: categories[0].id,
        lat: result.lat,
        lng: result.lng,
      })
    }
  }

  // ── Export / import ─────────────────────────────────────────
  function exportData() {
    const payload = { version: 1, exportedAt: new Date().toISOString(), categories, places }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = `moje-mapa-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function importData(file) {
    let payload
    try {
      payload = JSON.parse(await file.text())
    } catch {
      setConfirmState({ title: 'Soubor se nepodařilo načíst', text: 'Není to platný JSON.' })
      return
    }
    if (!Array.isArray(payload?.categories) || !Array.isArray(payload?.places)) {
      setConfirmState({ title: 'Nepodporovaný soubor', text: 'Chybí seznam kategorií nebo bodů.' })
      return
    }
    setConfirmState({
      title: 'Nahradit současná data?',
      text: `Import obsahuje ${format.categories(payload.categories.length)} a ${format.places(payload.places.length)}. Současná data se smažou.`,
      onConfirm: async () => {
        await db.replaceAll(payload)
        const fresh = await db.loadAll()
        setCategories(fresh.categories)
        setPlaces(fresh.places)
        setConfirmState(null)
      },
    })
  }

  return (
    <div className="app">
      <MapView
        places={visiblePlaces}
        categoriesById={categoriesById}
        picking={Boolean(picking)}
        onPick={handleMapPick}
        flyTarget={flyTarget}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onEdit={editPlace}
        onDelete={askDeletePlace}
      />

      <Sidebar
        categories={categories}
        placesByCategory={placesByCategory}
        hidden={hidden}
        onToggleCategory={(id) =>
          setHidden((current) =>
            current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
          )
        }
        query={query}
        onQueryChange={setQuery}
        matches={matches}
        geoResults={geoResults}
        geoStatus={geoStatus}
        onGeoSearch={geoSearch}
        onGeoPick={pickGeoResult}
        onSelectPlace={(id) => focusPlace(id, 16)}
        onAddCategory={() => setCategoryDraft({})}
        onEditCategory={setCategoryDraft}
        onDeleteCategory={askDeleteCategory}
        onAddPlace={startNewPlace}
        onEditPlace={editPlace}
        onExport={exportData}
        onImport={importData}
      />

      {picking && (
        <div className="hint">
          Klikni na mapu a umísti bod
          <button type="button" className="link" onClick={() => setPicking(null)}>
            Zrušit
          </button>
        </div>
      )}

      {categoryDraft && (
        <CategoryEditor
          category={categoryDraft.id ? categoryDraft : null}
          onSave={saveCategory}
          onClose={() => setCategoryDraft(null)}
        />
      )}

      {placeDraft && !picking && (
        <PlaceEditor
          draft={placeDraft}
          categories={categories}
          onChange={setPlaceDraft}
          onSave={savePlace}
          onPickOnMap={() => setPicking('edit')}
          onClose={() => setPlaceDraft(null)}
        />
      )}

      {confirmState && (
        <div className="overlay" onClick={() => setConfirmState(null)}>
          <div className="dialog" onClick={(event) => event.stopPropagation()}>
            <h2>{confirmState.title}</h2>
            <p className="muted">{confirmState.text}</p>
            <div className="dialog__actions">
              <button type="button" className="link" onClick={() => setConfirmState(null)}>
                {confirmState.onConfirm ? 'Zrušit' : 'Zavřít'}
              </button>
              {confirmState.onConfirm && (
                <button type="button" className="danger" onClick={confirmState.onConfirm}>
                  Potvrdit
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
