import { Cross, Leaf, Pill } from "lucide-react";

type AppLogoProps = {
  compact?: boolean;
};

export default function AppLogo({ compact = false }: AppLogoProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-emerald-500 shadow-lg">
        <Cross className="h-7 w-7 text-white" strokeWidth={2.4} />

        <div className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow">
          <Leaf className="h-4 w-4 text-emerald-600" strokeWidth={2.4} />
        </div>

        <div className="absolute -left-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow">
          <Pill className="h-3.5 w-3.5 text-blue-700" strokeWidth={2.4} />
        </div>
      </div>

      {!compact && (
        <div>
          <div className="text-2xl font-black tracking-tight">
            <span className="text-blue-900">Mpangi_</span>
            <span className="text-emerald-600">Pharma</span>
          </div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
            Gestion multi-pharmacie
          </p>
        </div>
      )}
    </div>
  );
}