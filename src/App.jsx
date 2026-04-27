import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Products from "./pages/Products";
import VehicleDetail from "./pages/VehicleDetail";
import Catalog from "./pages/Catalog";
import Contact from "./pages/Contact";
import Admin from "./pages/Admin";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminVehicles from "./pages/admin/AdminVehicles";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <div className="container mx-auto px-4 py-24 text-center">
      <p className="text-6xl font-extrabold text-brand-600">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">
        Halaman tidak ditemukan
      </h1>
      <p className="mt-2 text-slate-600">
        URL yang Anda buka mungkin sudah berubah atau dihapus.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/produk" element={<Products />} />
          <Route path="/produk/kategori/:slug" element={<Products />} />
          <Route path="/produk/:id" element={<VehicleDetail />} />
          <Route path="/katalog" element={<Catalog />} />
          <Route path="/kontak" element={<Contact />} />
          <Route path="/admin" element={<Admin />}>
            <Route path="kategori" element={<AdminCategories />} />
            <Route path="kendaraan" element={<AdminVehicles />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
