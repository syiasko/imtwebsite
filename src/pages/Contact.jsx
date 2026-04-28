import { useRef, useState } from "react";
import { useData } from "../context/DataContext";
import { useT } from "../context/LanguageContext";
import { trackEvent } from "../firebase/config";
import { saveContactMessage } from "../firebase/api";
import Modal from "../components/Modal";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  interest: "",
  message: "",
};

export default function Contact() {
  const { company } = useData();
  const { t } = useT();
  const formRef = useRef(null);
  const [form, setForm] = useState(initialForm);
  const [stage, setStage] = useState("idle"); // idle | confirm | success
  const [error, setError] = useState("");

  const waNumber = (company.whatsapp || company.phone || "").replace(/\D/g, "");

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = (e) => {
    e.preventDefault();
    if (!formRef.current?.reportValidity()) return;
    setError("");
    setStage("confirm");
  };

  const buildMailtoBody = () =>
    [
      `Nama   : ${form.name}`,
      `Email  : ${form.email}`,
      `Telp   : ${form.phone}`,
      form.company && `Inst.  : ${form.company}`,
      form.interest && `Minat  : ${form.interest}`,
      "",
      form.message,
    ]
      .filter(Boolean)
      .join("\n");

  const onConfirm = async () => {
    try {
      await saveContactMessage(form);
    } catch (err) {
      console.warn("Failed to persist message to Firestore:", err);
    }
    trackEvent("contact_form_submit", { has_company: !!form.company });

    const subject = `[Website] Pesan dari ${form.name}`;
    const body = buildMailtoBody();
    const mailto = `mailto:${encodeURIComponent(
      company.email
    )}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;

    setStage("success");
  };

  const onCloseSuccess = () => {
    setStage("idle");
    setForm(initialForm);
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary-700">
        {t("contact.eyebrow")}
      </p>
      <h1 className="mt-1 text-3xl md:text-4xl font-bold text-slate-900">
        {t("contact.title", { brand: company.shortName || company.name })}
      </h1>
      <p className="mt-2 text-slate-600 max-w-2xl">{t("contact.subtitle")}</p>

      <div className="mt-10 grid lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <InfoRow label={t("contact.companyName")} value={company.name} />
            <InfoRow label={t("contact.address")} value={company.address} />
            <InfoRow
              label={t("contact.phone")}
              value={company.whatsapp || company.phone}
            />
            <InfoRow label={t("contact.email")} value={company.email} />
            <InfoRow label={t("contact.hours")} value={company.hours} />
          </div>

          {waNumber && (
            <a
              href={`https://wa.me/${waNumber}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("whatsapp_click", { source: "contact" })}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {t("contact.waButton")}
            </a>
          )}
        </div>

        <form
          ref={formRef}
          onSubmit={onSubmit}
          className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-4 h-fit"
        >
          <Field
            label={t("contact.form.name")}
            value={form.name}
            onChange={(v) => update("name", v)}
            required
          />
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label={t("contact.form.email")}
              type="email"
              value={form.email}
              onChange={(v) => update("email", v)}
              required
            />
            <Field
              label={t("contact.form.phone")}
              value={form.phone}
              onChange={(v) => update("phone", v)}
              required
            />
          </div>
          <Field
            label={t("contact.form.company")}
            value={form.company}
            onChange={(v) => update("company", v)}
          />
          <Field
            label={t("contact.form.interest")}
            value={form.interest}
            onChange={(v) => update("interest", v)}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t("contact.form.message")}
              <span className="text-primary-600"> *</span>
            </label>
            <textarea
              rows="5"
              required
              value={form.message}
              onChange={(e) => update("message", e.target.value)}
              placeholder={t("contact.form.messagePlaceholder")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
            />
          </div>
          {error && (
            <p className="text-sm text-primary-700 bg-primary-50 px-3 py-2 rounded">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="w-full px-5 py-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold"
          >
            {t("contact.form.submit")}
          </button>
        </form>
      </div>

      <Modal
        open={stage === "confirm"}
        onClose={() => setStage("idle")}
        title={t("contact.confirm.title")}
        footer={
          <>
            <button
              type="button"
              onClick={() => setStage("idle")}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-white"
            >
              {t("contact.confirm.no")}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 rounded-lg font-semibold bg-primary-600 hover:bg-primary-700 text-white"
            >
              {t("contact.confirm.yes")}
            </button>
          </>
        }
      >
        <p className="text-sm">
          {t("contact.confirm.desc", { email: company.email })}
        </p>
      </Modal>

      <Modal
        open={stage === "success"}
        onClose={onCloseSuccess}
        title={t("contact.success.title")}
        footer={
          <button
            type="button"
            onClick={onCloseSuccess}
            className="px-4 py-2 rounded-lg font-semibold bg-primary-600 hover:bg-primary-700 text-white"
          >
            {t("contact.success.close")}
          </button>
        }
      >
        <div className="space-y-3 text-sm">
          <div className="flex justify-center text-4xl">✅</div>
          <p>{t("contact.success.desc", { email: company.email })}</p>
        </div>
      </Modal>
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

function Field({ label, value, onChange, type = "text", required }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-primary-600"> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
      />
    </div>
  );
}
