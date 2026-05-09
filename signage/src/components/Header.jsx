import { useEffect, useState } from "react";

const formatClock = (d) =>
  d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

const formatDate = (d) =>
  d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default function Header({ company, leading, trailing }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="bg-primary-700/95 backdrop-blur text-white border-b border-white/10">
      <div className="px-8 lg:px-12 py-4 flex items-center gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {leading}
          <img
            src="/logo.png"
            alt=""
            className="h-12 w-12 rounded-md bg-white object-contain p-1 flex-shrink-0"
          />
          <div className="min-w-0 leading-tight">
            <p className="text-xl font-bold truncate">
              {company?.shortName || "IMT Karoseri"}
            </p>
            <p className="text-xs text-primary-200 truncate">
              {company?.name || "PT. INDRAPRASTA MULIA TEKNIK"}
            </p>
          </div>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-xl font-bold tabular-nums">{formatClock(now)}</p>
          <p className="text-xs text-primary-200">{formatDate(now)}</p>
        </div>
        {trailing}
      </div>
    </header>
  );
}
