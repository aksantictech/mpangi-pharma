"use client";

import { useState } from "react";
import { Globe, Mail, MapPin, MessageCircle, PhoneCall, Send } from "lucide-react";

import PublicSiteHeader from "@/components/public/PublicSiteHeader";
import PublicSiteFooter from "@/components/public/PublicSiteFooter";
import PublicMobileNav from "@/components/public/PublicMobileNav";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit() {
    const body = `Bonjour AKSANTIC,%0A%0ANom : ${name}%0AContact : ${contact}%0AObjet : ${subject}%0A%0AMessage : ${message}`;
    window.location.href = `mailto:aksantictech@gmail.com?subject=${encodeURIComponent(
      subject || "Contact Mpangi_Pharma"
    )}&body=${body}`;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <PublicSiteHeader />

      <section className="bg-gradient-to-r from-blue-800 via-blue-700 to-emerald-600 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-100">
            Contact
          </p>
          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Parlons de votre projet
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-blue-50 md:text-lg">
            Une question, un besoin de démo ou un projet de digitalisation de
            pharmacie ? Contactez-nous.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">
              Nos coordonnées
            </h2>

            <div className="mt-6 space-y-4 text-sm text-slate-600">
              <a
                href="https://aksantictech.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 rounded-2xl border border-slate-100 p-4 hover:bg-slate-50"
              >
                <Globe className="mt-0.5 h-5 w-5 text-blue-700" />
                <div>
                  <p className="font-black text-slate-900">Site internet</p>
                  <p>https://aksantictech.com</p>
                </div>
              </a>

              <a
                href="mailto:aksantictech@gmail.com"
                className="flex items-start gap-3 rounded-2xl border border-slate-100 p-4 hover:bg-slate-50"
              >
                <Mail className="mt-0.5 h-5 w-5 text-blue-700" />
                <div>
                  <p className="font-black text-slate-900">Email</p>
                  <p>aksantictech@gmail.com</p>
                </div>
              </a>

              <a
                href="https://wa.me/243801655726"
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 rounded-2xl border border-slate-100 p-4 hover:bg-slate-50"
              >
                <MessageCircle className="mt-0.5 h-5 w-5 text-emerald-700" />
                <div>
                  <p className="font-black text-slate-900">WhatsApp</p>
                  <p>+243 801 655 726</p>
                </div>
              </a>

              <div className="flex items-start gap-3 rounded-2xl border border-slate-100 p-4">
                <MapPin className="mt-0.5 h-5 w-5 text-blue-700" />
                <div>
                  <p className="font-black text-slate-900">Disponibilité</p>
                  <p>Contact en ligne pour démonstration et accompagnement.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">
              Formulaire de contact
            </h2>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field
                label="Nom"
                value={name}
                onChange={setName}
                placeholder="Votre nom"
              />
              <Field
                label="Téléphone ou email"
                value={contact}
                onChange={setContact}
                placeholder="Votre contact"
              />
            </div>

            <div className="mt-5">
              <Field
                label="Objet"
                value={subject}
                onChange={setSubject}
                placeholder="Objet de votre demande"
              />
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                placeholder="Votre message..."
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleSubmit}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-4 text-sm font-black text-white hover:bg-blue-800"
              >
                <Send className="h-4 w-4" />
                Envoyer par email
              </button>

              <a
                href="https://wa.me/243801655726"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-black text-emerald-700 hover:bg-emerald-100"
              >
                <PhoneCall className="h-4 w-4" />
                Nous écrire sur WhatsApp
              </a>
            </div>
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