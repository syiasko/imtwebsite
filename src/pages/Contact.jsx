import { useState } from "react";
import { useData } from "../context/DataContext";
import MapEmbed from "../components/MapEmbed";
import { trackEvent } from "../firebase/config";

export default function Contact() {
  const { company } = useData();
  const [sent, setSent] = useState(false);

  const onSubmit = (e) => {
    e.preventDefault();
    setSent(true);
    trackEvent("contact_form_submit", {});
  };

  const waNumber = (company.whatsapp || company.phone || "").replace(/\D/g, "");

  return (
    <div className="container mx-auto px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary-700">
        Kontak
      </p>
      <h1 className="mt-1 text-3xl md:text-4xl font-bold text-slate-900">
        Hubungi Tim {company.shortName || company.name}
      </h1>
      <p className="mt-2 text-slate-600 max-w-2xl">
        Sampaikan kebutuhan Anda — tim sales & engineering kami akan membalas
        secepatnya.
      </p>

      <div className="mt-10 grid lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <InfoRow label="Nama Perusahaan" value={company.name} />
            <InfoRow label="Alamat" value={company.address} />
            <InfoRow
              label="Telepon / WhatsApp"
              value={company.whatsapp || company.phone}
            />
            <InfoRow label="Email" value={company.email} />
            <InfoRow label="Jam Operasional" value={company.hours} />
          </div>

          {waNumber && (
            <a
              href={`https://wa.me/${waNumber}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("whatsapp_click", { source: "contact" })}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              💬 Chat WhatsApp Sekarang
            </a>
          )}

          <MapEmbed
            embedUrl={company.mapsEmbedUrl}
            shareUrl={company.mapsShareUrl}
            address={company.address}
          />
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-4 h-fit"
        >
          {sent && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 text-sm">
              Terima kasih! Pesan Anda telah kami terima. Tim kami akan
              menghubungi Anda segera.
            </div>
          )}

          <Field label="Nama Lengkap" name="name" required />
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Email" name="email" type="email" required />
            <Field label="No. Telepon" name="phone" required />
          </div>
          <Field label="Perusahaan / Instansi" name="company" />
          <Field label="Jenis Kendaraan yang Diminati" name="interest" />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Pesan
            </label>
            <textarea
              name="message"
              rows="5"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
              placeholder="Ceritakan kebutuhan unit Anda..."
            />
          </div>
          <button
            type="submit"
            className="w-full px-5 py-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold"
          >
            Kirim Pesan
          </button>
        </form>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-slate-900 whitespace-pre-line">{value}</p>
    </div>
  );
}

function Field({ label, name, type = "text", required }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-primary-600"> *</span>}
      </label>
      <input
        type={type}
        name={name}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
      />
    </div>
  );
}
