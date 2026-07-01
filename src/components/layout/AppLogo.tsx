export default function AppLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <img
          src="/brand/aksantic-logo.jpeg"
          alt="Aksantic Technology"
          className="h-full w-full object-contain"
        />
      </div>

      <div>
        <p className="text-lg font-black leading-5 text-slate-950">
          Mpangi_Pharma
        </p>
        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
          Powered by Aksantic
        </p>
      </div>
    </div>
  );
}