# Moje mapa (PWA)

Mapa celého světa s **vlastními kategoriemi a body**. Instalovatelná PWA, data zůstávají
v prohlížeči (IndexedDB) – žádný server, žádné přihlašování.

## Co umí

- **Kategorie** – název, barva, ikona; zaškrtávátkem se skrývají/zobrazují na mapě
- **Body** – název, popisek, kategorie, souřadnice; umístí se kliknutím do mapy
- **Bublina pinu** – název, kategorie a vlastní popisek, hned s tlačítky Upravit / Smazat
- **Vyhledávání** – v mých bodech (název, popisek, kategorie) a ve světě přes OpenStreetMap
- **Export / import** dat do JSON (záloha a přenos mezi zařízeními)
- **Offline** – appka i už načtené dlaždice mapy fungují bez připojení

## Vývoj

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # produkční build do dist/
npm run preview      # náhled buildu (tady se teprve aktivuje service worker)
```

Přes Docker: `docker compose up`

## Struktura

```
src/
├── App.jsx               # stav aplikace a propojení všech částí
├── db.js                 # IndexedDB – kategorie a body (jediné místo s daty)
├── components/
│   ├── MapView.jsx       # Leaflet mapa, piny a bubliny
│   ├── Sidebar.jsx       # menu v rohu – vyhledávání, kategorie, export/import
│   ├── CategoryEditor.jsx
│   └── PlaceEditor.jsx
└── styles/app.less
```

## Poznámky

- Mapové podklady: OpenStreetMap (bez API klíče). Přechod na Google Maps by znamenal
  vyměnit `MapView.jsx` – zbytek aplikace na konkrétní mapě nezávisí.
- Vyhledávání míst používá veřejné [Nominatim](https://nominatim.openstreetmap.org) API;
  má limit zhruba 1 dotaz za sekundu, proto se spouští až na Enter / kliknutí na „vyhledat“.
- `base` ve `vite.config.js` je relativní, takže build funguje i v podsložce (GitHub Pages).
