import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Products from "./pages/Products";
import VehicleDetail from "./pages/VehicleDetail";
import CatalogPrint from "./pages/CatalogPrint";
import Contact from "./pages/Contact";
import Admin, { ADMIN_BASE_PATH } from "./pages/Admin";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminVehicles from "./pages/admin/AdminVehicles";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminUsers from "./pages/admin/AdminUsers";
import ToastViewport from "./components/Toast";
import { trackPageView } from "./firebase/config";
import { useT } from "./context/LanguageContext";

function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
    trackPageView(pathname);
  }, [pathname]);
  return null;
}

function NotFound() {
  const { t } = useT();
  return (
    <div className="container mx-auto px-4 py-24 text-center">
      <p className="text-6xl font-extrabold text-primary-600">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">
        {t("404.title")}
      </h1>
      <p className="mt-2 text-slate-600">{t("404.desc")}</p>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <RouteEffects />
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/produk" element={<Products />} />
          <Route path="/produk/kategori/:slug" element={<Products />} />
          <Route path="/produk/:slug" element={<VehicleDetail />} />
          <Route path="/katalog-cetak" element={<CatalogPrint />} />
          <Route path="/kontak" element={<Contact />} />
          <Route path={ADMIN_BASE_PATH} element={<Admin />}>
            <Route path="kategori" element={<AdminCategories />} />
            <Route path="kendaraan" element={<AdminVehicles />} />
            <Route path="pengaturan" element={<AdminSettings />} />
            <Route path="pengguna" element={<AdminUsers />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <ToastViewport />
    </div>
  );
}
