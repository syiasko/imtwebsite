import { useState } from "react";
import { companyInfo } from "../data/initialData";

export default function Contact() {
  const [sent, setSent] = useState(false);

  const onSubmit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
        Kontak
      </p>
      <h1 className="mt-1 text-3xl md:text-4xl font-bold text-slate-900">
        Hubungi Tim {companyInfo.name}
      </h1>
      <p className="mt-2 text-slate-600 max-w-2xl">
        Sampaikan kebutuhan Anda — tim sales & engineering kami akan membalas
        dalam 1x24 jam kerja.
      </p>

      <div className="mt-10 grid lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <InfoRow label="Alamat Workshop" value={companyInfo.address} />
          <InfoRow label="Telepon / WhatsApp" value={companyInfo.phone} />
          <InfoRow label="Email" value={companyInfo.email} />
          <InfoRow label="Jam Operasional" value={companyInfo.hours} />

          <a
            href={`https://wa.me/${companyInfo.phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            💬 Chat WhatsApp Sekarang
          </a>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-4"
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
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
              placeholder="Ceritakan kebutuhan unit Anda..."
            />
          </div>
          <button
            type="submit"
            className="w-full px-5 py-3 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold"
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
      <p className="mt-1 text-slate-900">{value}</p>
    </div>
  );
}

function Field({ label, name, type = "text", required }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-brand-600"> *</span>}
      </label>
      <input
        type={type}
        name={name}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
      />
    </div>
  );
}
