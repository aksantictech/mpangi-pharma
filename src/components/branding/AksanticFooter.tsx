import Image from "next/image";

export default function AksanticFooter() {
  return (
    <footer className="flex w-full flex-col items-center justify-between gap-4 border-t border-slate-200 bg-white/80 px-6 py-5 text-sm text-slate-500 backdrop-blur md:flex-row">
      <div className="flex items-center gap-3">
        <Image
          src="/brand/aksantic-logo.jpeg"
          alt="Aksantic Technology"
          width={150}
          height={60}
          className="h-10 w-auto object-contain"
          priority
        />
      </div>

      <p className="text-center font-medium text-slate-600">
        Propulsé par Aksantic Technology © 2026
      </p>

      <p className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700">
        Sécurisé · Simple · Multi-pharmacie
      </p>
    </footer>
  );
}