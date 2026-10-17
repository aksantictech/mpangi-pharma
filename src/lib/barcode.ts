/*
 * Lecture de code-barres en caisse.
 *
 * Un lecteur USB / Bluetooth se comporte comme un clavier : il « tape » les
 * chiffres du code à toute vitesse (quelques millisecondes entre deux touches)
 * puis envoie Entrée. Ce module reconnaît cette rafale pour la distinguer d'une
 * saisie humaine, et retrouve le produit correspondant.
 */

/** Écart maximal entre deux touches d'un lecteur ; une frappe humaine est bien plus lente. */
export const SCAN_MAX_KEY_GAP_MS = 80;
/** Longueur minimale d'un code pour être pris pour un scan (évite « 12 + Entrée »). */
export const SCAN_MIN_LENGTH = 4;

/**
 * Forme comparable d'un code-barres. Les codes numériques perdent leurs zéros
 * de tête : un EAN-13 « 0123456789012 » et le même code lu en UPC-A
 * « 123456789012 » désignent le même produit.
 */
export function normalizeBarcode(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim().toLowerCase();

  return /^\d+$/.test(trimmed) ? trimmed.replace(/^0+(?=\d)/, "") : trimmed;
}

export function findProductByBarcode<T extends { barcode: string | null }>(
  products: T[],
  code: string
): T | undefined {
  const wanted = normalizeBarcode(code);

  if (!wanted) return undefined;

  return products.find((product) => normalizeBarcode(product.barcode) === wanted);
}

/**
 * Assemble les touches d'une rafale de lecteur. `feed` renvoie le code complet
 * quand Entrée arrive après une rafale assez longue, sinon null.
 */
export function createScanDetector(
  options: { maxGapMs?: number; minLength?: number } = {}
) {
  const maxGap = options.maxGapMs ?? SCAN_MAX_KEY_GAP_MS;
  const minLength = options.minLength ?? SCAN_MIN_LENGTH;

  let buffer = "";
  let lastAt = 0;

  return {
    feed(key: string, now: number): string | null {
      if (key === "Enter") {
        const code = now - lastAt <= maxGap ? buffer : "";

        buffer = "";
        lastAt = 0;

        return code.length >= minLength ? code : null;
      }

      if (key.length !== 1) return null;

      // Pause trop longue : c'est une saisie humaine, on repart de zéro.
      if (now - lastAt > maxGap) buffer = "";

      buffer += key;
      lastAt = now;

      return null;
    },
    reset() {
      buffer = "";
      lastAt = 0;
    },
  };
}

/** Bip court de confirmation (aigu) ou d'erreur (grave). Silencieux si indisponible. */
export function playScanBeep(kind: "ok" | "error") {
  try {
    const Context =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!Context) return;

    const context = new Context();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "square";
    oscillator.frequency.value = kind === "ok" ? 1100 : 220;
    gain.gain.value = 0.06;

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + (kind === "ok" ? 0.09 : 0.25));
    oscillator.onended = () => void context.close();
  } catch {
    // Le bip est un confort : jamais bloquant.
  }

  try {
    navigator.vibrate?.(kind === "ok" ? 60 : [80, 60, 80]);
  } catch {
    // idem
  }
}
