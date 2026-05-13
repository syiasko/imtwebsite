import { useEffect, useState } from "react";

export default function Screensaver({ grouped, onDismiss }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPortrait, setIsPortrait] = useState(
    window.innerHeight > window.innerWidth
  );
  const [theme, setTheme] = useState({ rgb: "rgb(0,0,0)", isLight: false });

  useEffect(() => {
    const handleResize = () =>
      setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const slides = (grouped || [])
    .map((g) => g.items[0]?.images?.[0])
    .filter(Boolean);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const id = setInterval(() => {
      setActiveSlide((i) => (i + 1) % slides.length);
    }, 8000);
    return () => clearInterval(id);
  }, [slides.length]);

  // Sample background color from the current image to create a frameless look
  useEffect(() => {
    const src = slides[activeSlide];
    if (!src) return;

    const img = new Image();
    img.src = src;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d");
      // Sample from the top-left corner (0,0)
      ctx.drawImage(img, 0, 0, 1, 1, 0, 0, 1, 1);
      const data = ctx.getImageData(0, 0, 1, 1).data;
      const [r, g, b] = data;
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      
      setTheme({
        rgb: `rgb(${r}, ${g}, ${b})`,
        isLight: luminance > 0.6 // Slightly higher threshold for "light" theme
      });
    };
  }, [activeSlide, slides]);

  const currentSlide = slides[activeSlide];

  return (
    <div
      className="fixed inset-0 z-[100] transition-colors duration-1000 cursor-pointer select-none overflow-hidden"
      style={{ backgroundColor: theme.rgb }}
      onClick={onDismiss}
    >
      {isPortrait ? (
        <div className="flex flex-col h-full anim-fade-in">
          {/* Top 70% - Image Section */}
          <div className="h-[70%] relative flex items-center justify-center p-12">
            <img
              key={currentSlide}
              src={currentSlide}
              alt=""
              className="max-w-full max-h-full object-contain anim-fade-in"
            />
          </div>

          {/* Bottom 30% - Text Section */}
          <div 
            className={`h-[30%] flex flex-col items-center justify-center px-12 text-center transition-colors duration-1000 ${
              theme.isLight ? "bg-black/5 border-black/10" : "bg-white/5 border-white/10"
            } border-t`}
          >
            <div className="space-y-6 anim-scale-in">
              <h2 className={`text-5xl md:text-6xl font-black uppercase tracking-tighter leading-tight anim-pulse-slow ${
                theme.isLight ? "text-slate-900" : "text-white"
              }`}>
                Sentuh layar untuk melihat produk lainnya
              </h2>
              <div className={`flex items-center justify-center gap-4 ${
                theme.isLight ? "text-primary-600" : "text-secondary-400"
              }`}>
                <span className={`h-1 w-12 rounded-full ${theme.isLight ? "bg-primary-600" : "bg-secondary-400"}`} />
                <p className="text-xl font-bold tracking-[0.2em] uppercase opacity-80">
                  IMT Karoseri Showcase
                </p>
                <span className={`h-1 w-12 rounded-full ${theme.isLight ? "bg-primary-600" : "bg-secondary-400"}`} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-full relative flex items-center justify-center p-20 anim-fade-in">
          <img
            key={currentSlide}
            src={currentSlide}
            alt=""
            className="max-w-full max-h-full object-contain anim-fade-in"
          />
          <div className="absolute inset-x-0 bottom-24 flex flex-col items-center px-10 text-center pointer-events-none">
            <h2 className={`text-6xl font-black uppercase tracking-tighter anim-pulse-slow ${
              theme.isLight ? "text-slate-900" : "text-white"
            }`}>
              Sentuh layar untuk melihat produk lainnya
            </h2>
          </div>
        </div>
      )}
    </div>
  );
}
