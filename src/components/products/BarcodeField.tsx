"use client";

import { useEffect, useRef, useState } from "react";
import { ScanLine, X } from "lucide-react";

// L'API BarcodeDetector (Chrome Android, ChromeOS, macOS) n'est pas encore dans
// les types DOM de TypeScript.
type DetectedBarcode = { rawValue: string };

type BarcodeDetectorInstance = {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
};

type BarcodeDetectorConstructor = {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<string[]>;
};

const PRODUCT_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "itf",
  "codabar",
];

function getDetectorConstructor() {
  return (
    window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }
  ).BarcodeDetector;
}

/**
 * Champ code-barres avec deux façons de saisir :
 *  - lecteur code-barres USB/Bluetooth : il « tape » le code puis envoie
 *    Entrée. On neutralise cette touche pour qu'elle ne valide pas le
 *    formulaire du produit avant la fin de la saisie ;
 *  - caméra du téléphone ou du terminal (bouton « Scanner »), quand le
 *    navigateur sait lire les codes-barres.
 */
export default function BarcodeField({
  value,
  onChange,
  className = "form-input",
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [isScanning, setIsScanning] = useState(false);
  const [notice, setNotice] = useState("");

  function openScanner() {
    setNotice("");

    if (
      !getDetectorConstructor() ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setNotice(
        "La lecture par caméra n’est pas disponible sur cet appareil. Cliquez dans le champ puis scannez avec votre lecteur de code-barres."
      );
      return;
    }

    setIsScanning(true);
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            // Le lecteur termine sa lecture par Entrée : ne pas soumettre le formulaire.
            if (event.key === "Enter") {
              event.preventDefault();
            }
          }}
          autoComplete="off"
          className={className}
          placeholder="Scanner ou saisir"
        />

        <button
          type="button"
          onClick={openScanner}
          aria-label="Scanner avec la caméra"
          title="Scanner avec la caméra"
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-blue-700 hover:bg-blue-50"
        >
          <ScanLine className="h-5 w-5" />
          <span className="hidden sm:inline">Scanner</span>
        </button>
      </div>

      <p className="mt-1.5 text-xs text-slate-500">
        Lecteur code-barres : cliquez dans le champ puis scannez. Sinon, utilisez
        la caméra.
      </p>

      {notice && (
        <p className="mt-1.5 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          {notice}
        </p>
      )}

      {isScanning && (
        <CameraScanner
          onDetected={(code) => {
            onChange(code);
            setIsScanning(false);
          }}
          onClose={() => setIsScanning(false)}
        />
      )}
    </div>
  );
}

function CameraScanner({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");

  // Les callbacks sont lus via une ref pour que la boucle de lecture ne soit
  // pas relancée (et la caméra rouverte) à chaque rendu du parent.
  const onDetectedRef = useRef(onDetected);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let isActive = true;

    async function start() {
      try {
        const Detector = getDetectorConstructor();

        if (!Detector) throw new Error("unsupported");

        const supported = (await Detector.getSupportedFormats?.()) ?? [];
        const formats = PRODUCT_FORMATS.filter(
          (format) => supported.length === 0 || supported.includes(format)
        );
        const detector = new Detector({ formats });

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });

        if (!isActive) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const video = videoRef.current;

        if (!video) return;

        video.srcObject = stream;
        await video.play();

        const scan = async () => {
          if (!isActive) return;

          try {
            const codes = await detector.detect(video);
            const found = codes.find((code) => code.rawValue);

            if (found) {
              navigator.vibrate?.(80);
              onDetectedRef.current(found.rawValue);
              return;
            }
          } catch {
            // Image pas encore prête : on réessaie au prochain passage.
          }

          timer = window.setTimeout(scan, 250);
        };

        void scan();
      } catch (caught) {
        if (!isActive) return;

        const name = caught instanceof Error ? caught.name : "";

        setError(
          name === "NotAllowedError"
            ? "Accès à la caméra refusé. Autorisez la caméra dans les réglages du navigateur."
            : name === "NotFoundError"
              ? "Aucune caméra détectée sur cet appareil."
              : "Impossible de démarrer la caméra."
        );
      }
    }

    void start();

    return () => {
      isActive = false;

      if (timer) window.clearTimeout(timer);

      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Scanner un code-barres"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-3"
    >
      <div className="w-full max-w-md overflow-hidden rounded-[1.5rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <h3 className="text-base font-black text-slate-950">
              Scanner un code-barres
            </h3>
            <p className="text-xs text-slate-500">
              Placez le code dans le cadre, à environ 15 cm.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le scanner"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error ? (
          <p className="px-4 pb-5 text-sm font-semibold text-red-700">{error}</p>
        ) : (
          <div className="relative bg-black">
            <video
              ref={videoRef}
              muted
              playsInline
              className="aspect-[4/3] w-full object-cover"
            />

            <div className="pointer-events-none absolute inset-x-[12%] top-1/2 h-24 -translate-y-1/2 rounded-2xl border-2 border-emerald-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        )}
      </div>
    </div>
  );
}
