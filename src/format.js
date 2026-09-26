// České skloňování počtu: 1 bod / 2–4 body / 5+ bodů (a 0 bodů).
export function plural(count, one, few, many) {
  if (count === 1) return `${count} ${one}`
  if (count >= 2 && count <= 4) return `${count} ${few}`
  return `${count} ${many}`
}

export const places = (count) => plural(count, 'bod', 'body', 'bodů')
export const categories = (count) => plural(count, 'kategorie', 'kategorie', 'kategorií')
