import { useEffect, useRef, useState } from 'react'
import * as format from '../format.js'

export default function Sidebar({
  categories,
  placesByCategory,
  hidden,
  onToggleCategory,
  query,
  onQueryChange,
  matches,
  geoResults,
  geoStatus,
  onGeoSearch,
  onGeoPick,
  onSelectPlace,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onAddPlace,
  onEditPlace,
  onExport,
  onImport,
}) {
  const [open, setOpen] = useState(true)
  const [expanded, setExpanded] = useState({})
  const fileRef = useRef()

  // Na úzkém displeji ať panel nezakrývá celou mapu hned po startu.
  useEffect(() => {
    if (window.matchMedia('(max-width: 640px)').matches) setOpen(false)
  }, [])

  const searching = query.trim().length > 0

  return (
    <>
      <button
        type="button"
        className={`menu-toggle${open ? ' menu-toggle--open' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Skrýt menu' : 'Zobrazit menu'}
      >
        <span className="menu-toggle__bars" aria-hidden="true" />
      </button>

      <aside className={`sidebar${open ? '' : ' sidebar--closed'}`}>
        <header className="sidebar__head">
          <h1>Moje mapa</h1>
          <p>{format.categories(categories.length)}</p>
        </header>

        <div className="sidebar__search">
          <input
            type="search"
            value={query}
            placeholder="Hledat bod nebo místo…"
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onGeoSearch(query)
            }}
          />
        </div>

        <div className="sidebar__body">
          {searching ? (
            <section className="results">
              <h2 className="results__title">Moje body</h2>
              {matches.length === 0 && <p className="muted">Nic nenalezeno.</p>}
              {matches.map(({ place, category }) => (
                <button
                  key={place.id}
                  type="button"
                  className="row row--place"
                  onClick={() => onSelectPlace(place.id)}
                >
                  <span className="dot" style={{ background: category?.color || '#6b7280' }} />
                  <span className="row__text">
                    <strong>{place.name}</strong>
                    <small>{category ? `${category.icon} ${category.name}` : 'Bez kategorie'}</small>
                  </span>
                </button>
              ))}

              <h2 className="results__title">
                Místa na mapě
                <button type="button" className="link" onClick={() => onGeoSearch(query)}>
                  vyhledat
                </button>
              </h2>
              {geoStatus === 'loading' && <p className="muted">Hledám…</p>}
              {geoStatus === 'error' && <p className="muted">Vyhledávání se nepodařilo.</p>}
              {geoStatus === 'done' && geoResults.length === 0 && (
                <p className="muted">Žádné místo nenalezeno.</p>
              )}
              {geoResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  className="row row--geo"
                  onClick={() => onGeoPick(result)}
                >
                  <span className="dot dot--geo">📍</span>
                  <span className="row__text">
                    <strong>{result.label.split(',')[0]}</strong>
                    <small>{result.label}</small>
                  </span>
                </button>
              ))}
            </section>
          ) : (
            <section className="categories">
              {categories.length === 0 && (
                <p className="muted">
                  Zatím nemáš žádnou kategorii. Vytvoř si třeba „Restaurace“ a začni přidávat body.
                </p>
              )}
              {categories.map((category) => {
                const places = placesByCategory[category.id] || []
                const isOpen = expanded[category.id]
                return (
                  <div className="category" key={category.id}>
                    <div className="category__head">
                      <label className="category__toggle">
                        <input
                          type="checkbox"
                          checked={!hidden.includes(category.id)}
                          onChange={() => onToggleCategory(category.id)}
                        />
                        <span className="dot" style={{ background: category.color }}>
                          {category.icon}
                        </span>
                        <span className="category__name">{category.name}</span>
                      </label>
                      <span className="category__count">{places.length}</span>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() =>
                          setExpanded((state) => ({ ...state, [category.id]: !isOpen }))
                        }
                        aria-label={isOpen ? 'Sbalit' : 'Rozbalit'}
                      >
                        {isOpen ? '▾' : '▸'}
                      </button>
                    </div>

                    {isOpen && (
                      <div className="category__body">
                        <div className="category__actions">
                          <button type="button" className="link" onClick={() => onEditCategory(category)}>
                            Upravit
                          </button>
                          <button
                            type="button"
                            className="link link--danger"
                            onClick={() => onDeleteCategory(category)}
                          >
                            Smazat ({format.places(places.length)})
                          </button>
                        </div>
                        {places.map((place) => (
                          <button
                            key={place.id}
                            type="button"
                            className="row row--place"
                            onClick={() => onSelectPlace(place.id)}
                          >
                            <span className="row__text">
                              <strong>{place.name}</strong>
                              {place.description && <small>{place.description}</small>}
                            </span>
                            <span
                              className="icon-btn"
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.stopPropagation()
                                onEditPlace(place)
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.stopPropagation()
                                  onEditPlace(place)
                                }
                              }}
                            >
                              ✎
                            </span>
                          </button>
                        ))}
                        {places.length === 0 && <p className="muted">Zatím žádné body.</p>}
                      </div>
                    )}
                  </div>
                )
              })}
            </section>
          )}
        </div>

        <footer className="sidebar__foot">
          <div className="sidebar__buttons">
            <button type="button" onClick={onAddCategory}>
              + Kategorie
            </button>
            <button
              type="button"
              className="primary"
              onClick={onAddPlace}
              disabled={categories.length === 0}
              title={categories.length === 0 ? 'Nejdřív vytvoř kategorii' : undefined}
            >
              + Bod
            </button>
          </div>
          <div className="sidebar__buttons sidebar__buttons--small">
            <button type="button" className="link" onClick={onExport}>
              Export dat
            </button>
            <button type="button" className="link" onClick={() => fileRef.current.click()}>
              Import dat
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(event) => {
                const file = event.target.files[0]
                if (file) onImport(file)
                event.target.value = ''
              }}
            />
          </div>
        </footer>
      </aside>
    </>
  )
}
