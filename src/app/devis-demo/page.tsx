"use client";

import { useState } from "react";
import { MessageCircle, Send, Mail } from "lucide-react";

import PublicSiteHeader from "@/components/public/PublicSiteHeader";
import PublicSiteFooter from "@/components/public/PublicSiteFooter";
import PublicMobileNav from "@/components/public/PublicMobileNav";

export default function DemoQuotePage() {
  const [fullName, setFullName] = useState("");
  const [pharmacyName, setPharmacyName] = useState("");
  const [city, setCity] = useState("");
  const [size, setSize] = useState("Petite pharmacie");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function buildMessage() {
    return `Bonjour AKSANTIC,%0A%0AJe souhaite demander une démo / un devis pour Mpangi_Pharma.%0A%0ANom : ${fullName}%0APharmacie : ${pharmacyName}%0AVille : ${city}%0ATaille : ${size}%0ATéléphone : ${phone}%0AEmail : ${email}%0A%0ABesoin : ${message}`;
  }

  function handleWhatsApp() {
    window.open(`https://wa.me/243801655726?text=${buildMessage()}`, "_blank");
  }

  function handleEmail() {
    window.location.href = `mailto:aksantictech@gmail.com?subject=Demande de démo / devis Mpangi_Pharma&body=${buildMessage()}`;
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24 lg:pb-0">
      <PublicSiteHeader />

      <section className="bg-gradient-to-r from-blue-800 via-blue-700 to-emerald-600 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-100">
            Démo & Devis
          </p>
          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Demandez une démonstration de Mpangi_Pharma
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-blue-50 md:text-lg">
            Remplissez ce formulaire et nous vous contacterons pour une démo,
            un devis ou une installation.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 md:px-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field
              label="Nom complet"
              value={fullName}
              onChange={setFullName}
              placeholder="Votre nom"
            />
            <Field
              label="Nom de la pharmacie"
              value={pharmacyName}
              onChange={setPharmacyName}
              placeholder="Ex : Pharmacie Centrale"
            />
            <Field
              label="Ville / Commune"
              value={city}
              onChange={setCity}
              placeholder="Ex : Kinshasa"
            />
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Taille de la pharmacie
              </label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
              >
                <option>Petite pharmacie</option>
                <option>Pharmacie moyenne</option>
                <option>Grande pharmacie</option>
              </select>
            </div>
            <Field
              label="Téléphone"
              value={phone}
              onChange={setPhone}
              placeholder="+243..."
            />
            <Field
              label="Email"
              value={email}
              onChange={setEmail}
              placeholder="exemple@email.com"
            />
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Votre besoin
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Décrivez votre besoin..."
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleWhatsApp}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black text-white hover:bg-emerald-700"
            >
              <MessageCircle className="h-4 w-4" />
              Envoyer par WhatsApp
            </button>

            <button
              type="button"
              onClick={handleEmail}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-4 text-sm font-black text-white hover:bg-blue-800"
            >
              <Mail className="h-4 w-4" />
              Envoyer par email
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
            Vous pouvez aussi nous écrire directement sur WhatsApp :{" "}
            <span className="font-black">+243 801 655 726</span>
          </div>
        </div>
      </section>

      <PublicSiteFooter />
      <PublicMobileNav />
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
      />
    </div>
  );
}