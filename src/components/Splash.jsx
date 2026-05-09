export default function Splash({ company }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 text-white grid place-items-center p-10">
      <div className="text-center anim-fade-in">
        <img
          src="/logo.png"
          alt="IMT Karoseri"
          className="mx-auto h-32 w-32 rounded-2xl bg-white object-contain p-2 shadow-2xl"
        />
        <h1 className="mt-6 text-4xl md:text-5xl font-extrabold tracking-tight">
          {company?.shortName || "IMT Karoseri"}
        </h1>
        <p className="mt-2 text-primary-100/90 text-lg">
          {company?.name || "PT. INDRAPRASTA MULIA TEKNIK"}
        </p>
        <div className="mt-10 mx-auto h-1 w-48 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full w-1/2 bg-secondary-400 animate-pulse" />
        </div>
        <p className="mt-4 text-sm text-primary-100/70 uppercase tracking-widest">
          Memuat showcase…
        </p>
      </div>
    </div>
  );
}
