// Odkaz na navigaci. Univerzální Google Maps URL: na telefonu ho zachytí
// nainstalovaná aplikace (Google Maps, na iOS nabídne otevření v appce),
// jinak se otevře mapa v prohlížeči.
export function navigationUrl(place) {
  const destination = `${place.lat},${place.lng}`
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}
