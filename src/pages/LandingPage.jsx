// File: src/pages/LandingPage.jsx
import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag, Truck, Shield, Star, ArrowRight,
  MapPin, Clock, Coins, Zap, Package, ChevronRight,
  BadgeCheck, Smartphone, QrCode,
} from 'lucide-react';
import api from '../utils/api';

// ─── Marquee ────────────────────────────────────────────────────────────────
const MARQUEE_ITEMS = [
  'SEMBAKO SEGAR', 'BAYAR ONLINE', 'AMBIL DI TOKO',
  'POIN MEMBER', 'PROMO SETIAP HARI', 'PENGIRIMAN CEPAT',
  'PRODUK TERPERCAYA', 'HARGA TERBAIK',
];

function Marquee() {
  const doubled = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div className="overflow-hidden bg-ink border-y-2 border-ink py-3 select-none">
      <div className="flex animate-marquee whitespace-nowrap w-max">
        {doubled.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-3 mx-6 text-xs sm:text-sm font-black text-lime uppercase tracking-widest">
            {item}
            <span className="text-coral">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────
function StatCard({ value, label, icon: Icon, color }) {
  return (
    <div className={`rounded-2xl border-2 border-ink p-5 shadow-[4px_4px_0_#161616] ${color} flex items-center gap-4`}>
      <div className="w-12 h-12 rounded-xl bg-ink flex items-center justify-center shrink-0">
        <Icon className="w-6 h-6 text-lime" />
      </div>
      <div>
        <p className="text-2xl font-black text-ink leading-none">{value}</p>
        <p className="text-xs text-ink/70 font-semibold mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── FeatureCard ─────────────────────────────────────────────────────────────
function FeatureCard({ emoji, title, desc, accent }) {
  return (
    <div className={`rounded-2xl border-2 border-ink p-5 shadow-[4px_4px_0_#161616] ${accent} space-y-2 group hover:shadow-[6px_6px_0_#161616] hover:-translate-y-0.5 transition-all`}>
      <span className="text-3xl">{emoji}</span>
      <h3 className="font-black text-ink text-base leading-tight">{title}</h3>
      <p className="text-xs text-ink/70 leading-relaxed">{desc}</p>
    </div>
  );
}

// ─── StepCard ────────────────────────────────────────────────────────────────
function StepCard({ num, title, desc }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-10 h-10 rounded-xl bg-ink border-2 border-ink flex items-center justify-center font-black text-lime text-lg shrink-0 shadow-[3px_3px_0_#CBF169]">
        {num}
      </div>
      <div>
        <p className="font-black text-ink text-sm">{title}</p>
        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ─── TestimonialCard ─────────────────────────────────────────────────────────
function TestimonialCard({ name, role, text, stars }) {
  return (
    <div className="rounded-2xl border-2 border-ink bg-white p-5 shadow-[4px_4px_0_#161616] space-y-3 hover:shadow-[6px_6px_0_#161616] hover:-translate-y-0.5 transition-all">
      <div className="flex gap-0.5">
        {Array.from({ length: stars }).map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-sm text-slate-700 leading-relaxed">"{text}"</p>
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
        <div className="w-8 h-8 rounded-full bg-lime border-2 border-ink flex items-center justify-center font-black text-ink text-xs">
          {name.charAt(0)}
        </div>
        <div>
          <p className="text-xs font-black text-ink">{name}</p>
          <p className="text-[11px] text-slate-400">{role}</p>
        </div>
        <BadgeCheck className="w-4 h-4 text-emerald-500 ml-auto" />
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [storeSettings, setStoreSettings] = useState({});
  const [stats, setStats] = useState({ products: 0, orders: 0 });

  useEffect(() => {
    api.get('/public/settings.php')
      .then(r => { if (r.data?.status === 'success') setStoreSettings(r.data.data || {}); })
      .catch(() => {});
    // Stats dari backend (produk & orders) — fallback ke dummy
    api.get('/public/stats.php')
      .then(r => { if (r.data?.status === 'success') setStats(r.data.data || {}); })
      .catch(() => {}); // fallback ke nilai default
  }, []);

  const storeName    = storeSettings.store_name    || 'POSMart';
  const storeAddress = storeSettings.store_address || 'Toko kami';
  const storeTagline = storeSettings.store_tagline || 'Belanja kebutuhan harian lebih mudah & hemat';

  const productCount = stats.products > 0 ? `${stats.products}+` : '200+';
  const orderCount   = stats.orders   > 0 ? `${Math.floor(stats.orders / 100) * 100}+` : '1.000+';

  return (
    <div className="min-h-screen bg-cream font-sans antialiased text-ink overflow-x-hidden">

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-cream border-b-2 border-ink">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/logo-posmart.png?v=2"
              alt={storeName}
              className="h-9 w-auto object-contain"
            />
          </Link>
          <nav className="hidden sm:flex items-center gap-6 text-xs font-black text-ink/60">
            <a href="#fitur" className="hover:text-ink transition-colors">Fitur</a>
            <a href="#cara-belanja" className="hover:text-ink transition-colors">Cara Belanja</a>
            <a href="#ulasan" className="hover:text-ink transition-colors">Ulasan</a>
          </nav>
          <Link
            to="/catalog"
            className="flex items-center gap-1.5 bg-ink text-lime text-xs font-black px-4 py-2 rounded-xl border-2 border-ink shadow-[3px_3px_0_#CBF169] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
          >
            Mulai Belanja <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        {/* Teks */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 bg-lime border-2 border-ink px-3 py-1.5 rounded-full text-[11px] font-black text-ink shadow-[2px_2px_0_#161616] -rotate-1">
            <Zap className="w-3.5 h-3.5 fill-ink" /> Belanja online, bayar/ambil di kasir
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-ink leading-[1.1] tracking-tight">
            Kebutuhan Harian,<br />
            <span className="relative inline-block">
              <span className="relative z-10">Satu Tempat.</span>
              <span className="absolute bottom-1 left-0 right-0 h-3 bg-lime -z-0 -rotate-1 rounded" />
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-md">
            {storeTagline}. Pesan online, pilih bayar di kasir atau transfer — barang siap dalam 15 menit.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/catalog"
              className="inline-flex items-center gap-2 bg-ink text-cream font-black text-sm px-6 py-3 rounded-xl border-2 border-ink shadow-[4px_4px_0_#161616] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
            >
              <ShoppingBag className="w-4 h-4 text-lime" /> Lihat Katalog
            </Link>
            <a
              href="#cara-belanja"
              className="inline-flex items-center gap-2 bg-white text-ink font-black text-sm px-6 py-3 rounded-xl border-2 border-ink shadow-[4px_4px_0_#161616] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
            >
              Cara Belanja <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          {/* Mini trust badge */}
          <div className="flex flex-wrap gap-4 pt-2">
            {[
              { icon: Shield, text: 'Produk Terjamin' },
              { icon: Truck,  text: 'Antar ke Rumah' },
              { icon: Coins,  text: 'Program Poin' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 text-xs font-semibold text-ink/70">
                <Icon className="w-4 h-4 text-ink" />
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Visual / Mockup card */}
        <div className="relative flex justify-center items-center">
          {/* Dekorasi */}
          <div className="absolute w-64 h-64 rounded-full bg-lime border-2 border-ink -top-6 -right-6 opacity-60 -z-0" />
          <div className="absolute w-32 h-32 rounded-full bg-coral border-2 border-ink -bottom-4 -left-4 opacity-40 -z-0" />

          {/* Card utama — mockup visual */}
          <div className="relative z-10 w-full max-w-sm bg-white border-2 border-ink rounded-2xl shadow-[8px_8px_0_#161616] overflow-hidden">
            {/* Header card */}
            <div className="bg-ink px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-lime" />
                <span className="text-sm font-black text-lime">{storeName}</span>
              </div>
              <span className="text-[10px] font-black text-lime/60 uppercase tracking-wider">Online Store</span>
            </div>
            {/* Body card */}
            <div className="p-5 space-y-4">
              {/* Produk dummy */}
              {[
                { name: 'Indomie Goreng', cat: 'Food', price: 'Rp 3.500', badge: null },
                { name: 'Aqua 1.5L', cat: 'Beverage', price: 'Rp 5.000', badge: '-20%' },
                { name: 'Teh Botol Sosro', cat: 'Beverage', price: 'Rp 6.000', badge: null },
              ].map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cream border-2 border-ink/20 flex items-center justify-center text-lg shrink-0">
                    {p.cat === 'Food' ? '🍜' : p.cat === 'Beverage' ? '🥤' : '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-ink truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-400">{p.cat}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-black text-ink">{p.price}</span>
                    {p.badge && (
                      <span className="text-[9px] font-black bg-coral text-white px-1.5 py-0.5 rounded-md">{p.badge}</span>
                    )}
                  </div>
                </div>
              ))}
              {/* CTA dalam card */}
              <div className="pt-2 border-t-2 border-ink/10 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold">Total Keranjang</p>
                  <p className="text-base font-black text-ink">Rp 14.500</p>
                </div>
                <div className="bg-ink text-cream text-[10px] font-black px-4 py-2 rounded-xl border-2 border-ink shadow-[2px_2px_0_#CBF169] flex items-center gap-1">
                  <ShoppingBag className="w-3 h-3 text-lime" /> Checkout
                </div>
              </div>
            </div>
          </div>

          {/* Floating badge poin */}
          <div className="absolute -bottom-3 -right-2 z-20 bg-lime border-2 border-ink rounded-xl px-3 py-2 shadow-[3px_3px_0_#161616] flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-ink" />
            <span className="text-xs font-black text-ink">+145 Poin</span>
          </div>

          {/* Floating badge siap */}
          <div className="absolute -top-3 left-4 z-20 bg-white border-2 border-ink rounded-xl px-3 py-2 shadow-[3px_3px_0_#161616] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-ink" />
            <span className="text-[11px] font-black text-ink">Siap ±15 menit</span>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ────────────────────────────────────────────────────────── */}
      <Marquee />

      {/* ── STATS ──────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard value={productCount} label="Produk tersedia"     icon={Package}     color="bg-lime" />
        <StatCard value={orderCount}   label="Transaksi diproses"  icon={ShoppingBag} color="bg-white" />
        <StatCard value="2 jam"        label="Garansi hold pesanan" icon={Clock}       color="bg-white" />
        <StatCard value="1 kartu"      label="Poin online & kasir"  icon={Coins}       color="bg-coral text-white" />
      </section>

      {/* ── FITUR ──────────────────────────────────────────────────────────── */}
      <section id="fitur" className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8 text-center">
          <span className="inline-block bg-lime border-2 border-ink text-ink text-[11px] font-black px-3 py-1 rounded-full shadow-[2px_2px_0_#161616] mb-3">
            ✦ Keunggulan Toko
          </span>
          <h2 className="text-3xl font-black text-ink">Kenapa Belanja di Sini?</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard
            emoji="🛒"
            title="Pesan Online, Bayar di Kasir"
            desc="Tidak perlu kartu kredit. Pilih produk dari rumah, ambil & bayar langsung di toko — tunai, QRIS, atau kartu."
            accent="bg-lime"
          />
          <FeatureCard
            emoji="🚚"
            title="Antar ke Depan Rumah"
            desc="Tersedia opsi pengiriman ke alamat Anda. Cakupan area dan tarif bisa dilihat saat checkout."
            accent="bg-white"
          />
          <FeatureCard
            emoji="🏆"
            title="Program Poin Member"
            desc="Setiap transaksi menghasilkan poin. Tukar poin sebagai potongan harga di pembelian berikutnya."
            accent="bg-white"
          />
          <FeatureCard
            emoji="⚡"
            title="Pesanan Siap Kilat"
            desc="Pesanan walk-in disiapkan dalam ±15 menit. Konfirmasi otomatis via notifikasi."
            accent="bg-white"
          />
          <FeatureCard
            emoji="🔒"
            title="Pembayaran Aman"
            desc="Didukung Midtrans — QRIS, e-wallet (GoPay, OVO, Dana), transfer bank, dan Virtual Account."
            accent="bg-white"
          />
          <FeatureCard
            emoji="📦"
            title="Stok Selalu Update"
            desc="Stok ditampilkan secara real-time. Tidak perlu khawatir memesan barang yang sudah habis."
            accent="bg-ink text-white [&_h3]:text-lime [&_p]:text-lime/70"
          />
        </div>
      </section>

      {/* ── CARA BELANJA ───────────────────────────────────────────────────── */}
      <section id="cara-belanja" className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white border-2 border-ink rounded-2xl shadow-[6px_6px_0_#161616] p-8">
          <div className="mb-8 text-center">
            <span className="inline-block bg-lime border-2 border-ink text-ink text-[11px] font-black px-3 py-1 rounded-full shadow-[2px_2px_0_#161616] mb-3">
              ✦ Panduan
            </span>
            <h2 className="text-3xl font-black text-ink">Cara Belanja</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Walk-in */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-lime border-2 border-ink flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-ink" />
                </div>
                <h3 className="font-black text-ink">Ambil di Toko</h3>
              </div>
              <StepCard num="1" title="Pilih Produk" desc="Browse katalog, tambahkan ke keranjang sesuai kebutuhan." />
              <StepCard num="2" title="Pilih Jam Ambil" desc="Tentukan kapan Anda akan datang — slot tersedia setiap 30 menit." />
              <StepCard num="3" title="Datang & Bayar" desc="Tunjukkan QR Code pesanan ke kasir, bayar tunai/QRIS/kartu. Selesai!" />
            </div>

            {/* Delivery */}
            <div className="space-y-5 md:border-l-2 md:border-ink/10 md:pl-8">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-ink border-2 border-ink flex items-center justify-center">
                  <Truck className="w-4 h-4 text-lime" />
                </div>
                <h3 className="font-black text-ink">Diantar ke Rumah</h3>
              </div>
              <StepCard num="1" title="Pilih Produk" desc="Browse katalog, tambahkan ke keranjang sesuai kebutuhan." />
              <StepCard num="2" title="Isi Alamat & Zona" desc="Masukkan alamat tujuan, pilih zona pengiriman yang tersedia." />
              <StepCard num="3" title="Bayar Online" desc="Pilih metode bayar (QRIS, e-wallet, VA bank) dan selesaikan transaksi." />
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONI ──────────────────────────────────────────────────────── */}
      <section id="ulasan" className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8 text-center">
          <span className="inline-block bg-lime border-2 border-ink text-ink text-[11px] font-black px-3 py-1 rounded-full shadow-[2px_2px_0_#161616] mb-3">
            ✦ Kata Mereka
          </span>
          <h2 className="text-3xl font-black text-ink">Dipercaya Pelanggan</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TestimonialCard
            name="Rina S."
            role="Pelanggan Tetap"
            stars={5}
            text="Praktis banget, pesan dari rumah terus tinggal ambil. Nggak perlu antri panjang!"
          />
          <TestimonialCard
            name="Dimas R."
            role="Member Poin"
            stars={5}
            text="Poin-nya lumayan buat potongan harga. Udah tiga bulan belanja di sini dan poin saya udah bisa buat beli beberapa item."
          />
          <TestimonialCard
            name="Bu Wati"
            role="Pelanggan"
            stars={4}
            text="Stoknya lengkap, harga sama kayak di toko. Bedanya bisa pesan dulu jadi nggak kehabisan."
          />
        </div>
      </section>

      {/* ── CTA AKHIR ──────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="relative bg-ink border-2 border-ink rounded-2xl shadow-[8px_8px_0_#CBF169] overflow-hidden px-8 py-12 text-center">
          {/* Dekorasi */}
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-lime opacity-20 pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-coral opacity-20 pointer-events-none" />

          <div className="relative z-10 space-y-5 max-w-lg mx-auto">
            <h2 className="text-3xl font-black text-lime leading-tight">
              Siap Belanja Sekarang?
            </h2>
            <p className="text-sm text-lime/70">
              {storeAddress && (
                <span className="flex items-center justify-center gap-1.5 mb-1">
                  <MapPin className="w-4 h-4 text-coral" />
                  {storeAddress}
                </span>
              )}
              Buka katalog, pilih produk yang kamu butuhkan, dan selesaikan dalam hitungan menit.
            </p>
            <Link
              to="/catalog"
              className="inline-flex items-center gap-2 bg-lime text-ink font-black text-sm px-8 py-3.5 rounded-xl border-2 border-lime shadow-[4px_4px_0_#CBF169] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
            >
              <ShoppingBag className="w-4 h-4" /> Mulai Belanja
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="border-t-2 border-ink bg-ink mt-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-lime border-2 border-lime flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4 text-ink" />
            </div>
            <span className="font-black text-lime text-base tracking-tight">{storeName}</span>
          </div>
          <p className="text-xs text-lime/50 text-center">
            © {new Date().getFullYear()} {storeName}. Semua hak dilindungi.
          </p>
          <div className="flex gap-4 text-xs font-semibold text-lime/60">
            <Link to="/terms" className="hover:text-lime transition-colors">Syarat & Ketentuan</Link>
            <Link to="/privacy" className="hover:text-lime transition-colors">Privasi</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
