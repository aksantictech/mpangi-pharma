export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Un seul lien de navigation doit être actif à la fois. Un href plus court
 * (ex. /finances) est un préfixe d'un href plus long (ex. /finances/tva) :
 * sans ça, les deux se retrouvent surlignés simultanément. On ne retient
 * que le href le plus spécifique (le plus long) parmi ceux qui
 * correspondent au chemin courant.
 */
export function getActiveHref(pathname: string, hrefs: string[]) {
  return hrefs
    .filter((href) => isActivePath(pathname, href))
    .sort((a, b) => b.length - a.length)[0];
}
