import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const DEFAULT_CENTER = [49.8175, 15.473] // střed ČR, mapa je ale celosvětová
const DEFAULT_ZOOM = 7

// Pin si kreslíme sami, aby mohl mít barvu a emoji kategorie.
// Zároveň tím odpadá známý problém s cestami k default ikonám Leafletu v bundleru.
function pinIcon(category, active) {
  const color = category?.color || '#6b7280'
  const icon = category?.icon || ''
  return L.divIcon({
    className: 'pin-wrapper',
    html: `<div class="pin${active ? ' pin--active' : ''}" style="--pin-color:${color}">
             <span class="pin__glyph">${icon}</span>
           </div>`,
    iconSize: [30, 40],
    iconAnchor: [15, 38],
    popupAnchor: [0, -34],
  })
}

function MapClicks({ enabled, onPick }) {
  useMapEvents({
    click(event) {
      if (enabled) onPick([event.latlng.lat, event.latlng.lng])
    },
  })
  return null
}

// Přesun mapy řídí rodič přes objekt `target`; nová identita objektu = nový přesun,
// takže dvojí kliknutí na stejný bod mapu posune znovu.
function FlyTo({ target }) {
  const map = useMap()
  useEffect(() => {
    if (!target) return
    map.flyTo(target.center, target.zoom ?? map.getZoom(), { duration: 0.6 })
  }, [target, map])
  return null
}

// Otevřená bublina si přes autoPan drží mapu u sebe – když se výběr zruší
// (přelet na vyhledané místo, umisťování bodu), musí se zavřít, jinak mapa odskočí zpět.
function PopupSync({ selectedId, markerRefs }) {
  const map = useMap()
  useEffect(() => {
    const marker = selectedId && markerRefs.current[selectedId]
    if (!marker) {
      map.closePopup()
      return
    }
    // Otevřít hned; a ještě jednou po doletu mapy, protože přelet spuštěný
    // ve stejnou chvíli by jinak bublinu mohl zahodit.
    const open = () => marker.openPopup()
    open()
    map.once('moveend', open)
    return () => map.off('moveend', open)
  }, [selectedId, markerRefs, map])
  return null
}

function CursorMode({ picking }) {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    container.classList.toggle('map--picking', picking)
    return () => container.classList.remove('map--picking')
  }, [picking, map])
  return null
}

export default function MapView({
  places,
  categoriesById,
  picking,
  onPick,
  flyTarget,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
}) {
  const markerRefs = useRef({})

  const markers = useMemo(
    () =>
      places.map((place) => {
        const category = categoriesById[place.categoryId]
        return (
          <Marker
            key={place.id}
            position={[place.lat, place.lng]}
            icon={pinIcon(category, place.id === selectedId)}
            ref={(ref) => {
              if (ref) markerRefs.current[place.id] = ref
              else delete markerRefs.current[place.id]
            }}
            eventHandlers={{ click: () => onSelect(place.id) }}
          >
            <Popup>
              <div className="popup">
                <h3 className="popup__title">{place.name}</h3>
                {category && (
                  <span className="popup__category" style={{ '--chip-color': category.color }}>
                    {category.icon} {category.name}
                  </span>
                )}
                {place.description && <p className="popup__text">{place.description}</p>}
                <div className="popup__actions">
                  <button type="button" onClick={() => onEdit(place)}>
                    Upravit
                  </button>
                  <button type="button" className="danger" onClick={() => onDelete(place)}>
                    Smazat
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        )
      }),
    [places, categoriesById, selectedId, onSelect, onEdit, onDelete],
  )

  return (
    <MapContainer
      className="map"
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      minZoom={2}
      worldCopyJump
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <MapClicks enabled={picking} onPick={onPick} />
      <FlyTo target={flyTarget} />
      <CursorMode picking={picking} />
      {markers}
      <PopupSync selectedId={selectedId} markerRefs={markerRefs} />
    </MapContainer>
  )
}
