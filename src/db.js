import { openDB } from 'idb'

const DB_NAME = 'mapa-db'
const DB_VERSION = 1
const CATEGORIES = 'categories'
const PLACES = 'places'

// Celá práce s daty je schválně na jednom místě – kdyby se někdy
// přešlo z IndexedDB na server, mění se jen tenhle soubor.
function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(CATEGORIES)) {
        db.createObjectStore(CATEGORIES, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(PLACES)) {
        const store = db.createObjectStore(PLACES, { keyPath: 'id' })
        store.createIndex('categoryId', 'categoryId')
      }
    },
  })
}

export function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function loadAll() {
  const db = await getDB()
  const [categories, places] = await Promise.all([
    db.getAll(CATEGORIES),
    db.getAll(PLACES),
  ])
  return {
    categories: categories.sort((a, b) => a.order - b.order),
    places: places.sort((a, b) => a.name.localeCompare(b.name, 'cs')),
  }
}

export async function saveCategory(category) {
  const db = await getDB()
  await db.put(CATEGORIES, category)
  return category
}

// Smazání kategorie smaže i její body – obojí v jedné transakci,
// ať v databázi nezůstanou body bez kategorie.
export async function deleteCategory(id) {
  const db = await getDB()
  const tx = db.transaction([CATEGORIES, PLACES], 'readwrite')
  await tx.objectStore(CATEGORIES).delete(id)
  const placeStore = tx.objectStore(PLACES)
  const orphans = await placeStore.index('categoryId').getAllKeys(id)
  await Promise.all(orphans.map((key) => placeStore.delete(key)))
  await tx.done
}

export async function savePlace(place) {
  const db = await getDB()
  await db.put(PLACES, place)
  return place
}

export async function deletePlace(id) {
  const db = await getDB()
  await db.delete(PLACES, id)
}

export async function replaceAll({ categories, places }) {
  const db = await getDB()
  const tx = db.transaction([CATEGORIES, PLACES], 'readwrite')
  await tx.objectStore(CATEGORIES).clear()
  await tx.objectStore(PLACES).clear()
  for (const category of categories) await tx.objectStore(CATEGORIES).put(category)
  for (const place of places) await tx.objectStore(PLACES).put(place)
  await tx.done
}
