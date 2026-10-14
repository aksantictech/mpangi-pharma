import { Search, ShoppingCart } from "lucide-react";

/*
 * Aperçus de l'application pour la page d'accueil : écrans reconstruits en
 * HTML/CSS (nets à toute taille, aucun poids d'image, texte lisible par les
 * moteurs de recherche) avec des chiffres de DÉMONSTRATION. Ils sont purement
 * décoratifs (aria-hidden) ; la légende de la page précise qu'ils sont
 * illustratifs.
 */

const weekBars = [
  { day: "jeu", height: 46 },
  { day: "ven", height: 82 },
  { day: "sam", height: 58 },
  { day: "dim", height: 40 },
  { day: "lun", height: 66 },
  { day: "mar", height: 52 },
  { day: "mer", height: 74, today: true },
];

export function DashboardMock() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-blue-200/60"
    >
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        <span className="ml-3 rounded-md bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
          mpangi-pharma.app/dashboard
        </span>
      </div>

      <div className="space-y-4 bg-slate-50 p-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">
            Pharmacie Doreah
          </p>
          <p className="text-lg font-black text-slate-950">Tableau de bord</p>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-bold text-slate-600">Ventes du jour</p>
            <p className="mt-1 text-sm font-black text-slate-950">
              184 500 CDF
            </p>
            <p className="mt-1 text-[10px] font-black text-emerald-700">
              ▲ 12 % vs hier
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-bold text-slate-600">Ventes</p>
            <p className="mt-1 text-sm font-black text-slate-950">23</p>
            <p className="mt-1 text-[10px] font-semibold text-slate-600">
              Hier : 21
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-bold text-slate-600">
              À réapprovisionner
            </p>
            <p className="mt-1 text-sm font-black text-orange-700">4</p>
            <p className="mt-1 text-[10px] font-semibold text-slate-600">
              dont 1 rupture
            </p>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2.5">
          <div className="col-span-3 rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-black text-slate-950">
              Ventes des 7 derniers jours
            </p>

            <div className="mt-3 flex h-24 items-end gap-1.5">
              {weekBars.map((bar) => (
                <div
                  key={bar.day}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                >
                  <div
                    className={`w-full rounded-t-md ${
                      bar.today ? "bg-blue-600" : "bg-blue-200"
                    }`}
                    style={{ height: `${bar.height}%` }}
                  />
                  <span className="text-[9px] font-bold text-slate-600">
                    {bar.day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-black text-slate-950">
              À réapprovisionner
            </p>

            <ul className="mt-3 space-y-1.5">
              {[
                ["Amoxicilline", "Rupture", "bg-red-100 text-red-700"],
                ["Paracétamol", "Reste 4", "bg-orange-100 text-orange-700"],
                ["Vitamine C", "Reste 8", "bg-orange-100 text-orange-700"],
              ].map(([name, state, tone]) => (
                <li
                  key={name}
                  className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1.5"
                >
                  <span className="truncate text-[10px] font-black text-slate-800">
                    {name}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-black ${tone}`}
                  >
                    {state}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

const tiles = [
  { name: "Paracétamol", detail: "500mg / Comprimé", price: "1 500", stock: "Stock 42", inCart: 2 },
  { name: "Amoxicilline", detail: "250mg / Gélule", price: "3 200", stock: "Stock 18", rx: true, inCart: 1 },
  { name: "Coartem", detail: "20/120 / Comprimé", price: "4 800", stock: "Stock 3", low: true },
  { name: "Vitamine C", detail: "500mg / Comprimé", price: "2 100", stock: "Stock 27" },
];

export function PhoneMock() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto w-[17.5rem] rounded-[2.5rem] border-[6px] border-slate-900 bg-slate-900 shadow-2xl shadow-slate-400/50"
    >
      <div className="relative overflow-hidden rounded-[2rem] bg-slate-50">
        <div className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-slate-300" />

        <div className="space-y-3 px-3 pb-20 pt-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-700">
              Pharmacie Doreah
            </p>
            <p className="text-lg font-black text-slate-950">Caisse</p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5">
            <Search className="h-4 w-4 text-slate-600" />
            <span className="text-[11px] font-medium text-slate-600">
              Produit, DCI ou code-barres…
            </span>
          </div>

          <div className="flex gap-1.5 overflow-hidden">
            {["Tous", "Antalgiques", "Antibio…"].map((chip, index) => (
              <span
                key={chip}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black ${
                  index === 0
                    ? "border-blue-700 bg-blue-700 text-white"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                {chip}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {tiles.map((tile) => (
              <div
                key={tile.name}
                className={`relative rounded-xl border-2 p-2.5 ${
                  tile.inCart
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                {tile.inCart && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-700 px-1 text-[10px] font-black text-white">
                    {tile.inCart}
                  </span>
                )}

                <p className="truncate text-[11px] font-black text-slate-950">
                  {tile.name}
                </p>
                <p className="truncate text-[9px] font-semibold text-slate-600">
                  {tile.detail}
                </p>

                {tile.rx && (
                  <span className="mt-1 inline-block rounded-full border border-red-100 bg-red-50 px-1.5 py-0.5 text-[8px] font-black uppercase text-red-700">
                    Ordonnance
                  </span>
                )}

                <p className="mt-2 text-sm font-black text-blue-800">
                  {tile.price}{" "}
                  <span className="text-[9px] font-bold text-blue-700">CDF</span>
                </p>
                <p
                  className={`text-[9px] font-black ${
                    tile.low ? "text-amber-800" : "text-slate-600"
                  }`}
                >
                  {tile.stock}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-xl bg-blue-700 px-3 py-3 text-white shadow-lg">
          <span className="flex items-center gap-2 text-[11px] font-black">
            <ShoppingCart className="h-4 w-4" />
            Voir le panier
          </span>
          <span className="text-sm font-black">6 200 CDF</span>
        </div>
      </div>
    </div>
  );
}
