import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, Barcode, ShoppingCart, Trash2, Plus, Minus, CreditCard, 
  DollarSign, QrCode, RefreshCw, Printer, CheckCircle, 
  AlertCircle, Clock, Layers, FileText, 
  X, Check, Store
} from "lucide-react";
import api from "../utils/api";

// Web Audio API feedback for realistic POS register
const playBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {
    // ignore
  }
};

const playCashChime = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.08 + 0.22);
      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.22);
    });
  } catch (e) {
    // ignore
  }
};

export default function PosRegisterPage() {
  const navigate = useNavigate();

  // Cashier User & Shift
  const [user, setUser] = useState(null);
  const [currentShift, setCurrentShift] = useState(() => {
    try {
      const s = localStorage.getItem("pos_current_shift");
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });

  // Products & Categories
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(["Semua"]);
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [searchTerm, setSearchTerm] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Cart
  const [cart, setCart] = useState(() => {
    try {
      const c = localStorage.getItem("pos_active_cart");
      const parsed = c ? JSON.parse(c) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);

  // Held Carts Queue
  const [heldCarts, setHeldCarts] = useState(() => {
    try {
      const h = localStorage.getItem("pos_held_carts");
      const parsed = h ? JSON.parse(h) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [showHoldModal, setShowHoldModal] = useState(false);

  // Store Settings (for receipt)
  const [storeSettings, setStoreSettings] = useState({
    store_name: "POSMart Minimarket",
    store_phone: "0812-3456-7890",
    store_address: "Jl. Raya Bogor No. 45, Jakarta Timur",
    receipt_footer: "Terima kasih telah berbelanja di POSMart!"
  });

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showRekapModal, setShowRekapModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Payment Form State
  const [paymentMethod, setPaymentMethod] = useState("cash"); // cash, qris, transfer
  const [customerName, setCustomerName] = useState("Pelanggan Langsung");
  const [cashReceived, setCashReceived] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [lastCompletedOrder, setLastCompletedOrder] = useState(null);

  // Shift Modal Inputs
  const [shiftInitialCash, setShiftInitialCash] = useState("100000");
  const [shiftClosingCash, setShiftClosingCash] = useState("");
  const [shiftNotes, setShiftNotes] = useState("");

  // System Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  // Refs
  const barcodeInputRef = useRef(null);
  const searchInputRef = useRef(null);

  // 1. Clock timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Auth verification & Demo Population
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("demo") === "1") {
      setUser({ name: "Administrator", role: "admin" });
      if (cart.length === 0) {
        setCart([
          { id: 18, name: "Carrera Sampo Mobil 800 ml", price: 15000, barcode: "111128", image: "/product/product_1787122711_6a85541777aa1.jpg", stock: 12, qty: 2 },
          { id: 17, name: "Greenfields Susu UHT Full Cream Kotak 950 ml", price: 24500, barcode: "111127", image: "/product/product_1787111634_6a8528d203cc9.jpg", stock: 15, qty: 1 }
        ]);
      }
      if (!currentShift) {
        setCurrentShift({
          id: 1,
          openedAt: "06 Nov 2026, 07:00",
          cashierName: "Administrator",
          initialCash: 100000,
          totalSales: 345000,
          totalCash: 250000,
          totalNonCash: 95000,
          transactionsCount: 14
        });
      }
      return;
    }
    const profile = localStorage.getItem("user_profile");
    if (profile) {
      try {
        const p = JSON.parse(profile);
        setUser(p);
        const role = typeof p?.role === 'string' ? p.role.toLowerCase() : (p?.role?.name || '').toLowerCase();
        if (role !== "cashier" && role !== "admin" && role !== "owner") {
          navigate("/");
        }
      } catch {
        navigate("/login");
      }
    } else {
      navigate("/login");
    }
  }, [navigate]);

  // 3. Persist active cart & held carts
  useEffect(() => {
    try {
      localStorage.setItem("pos_active_cart", JSON.stringify(cart));
    } catch (e) {
      // ignore
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem("pos_held_carts", JSON.stringify(heldCarts));
    } catch (e) {
      // ignore
    }
  }, [heldCarts]);

  // 4. Fetch Products & Categories & Store Settings
  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const [prodRes, catRes, setRes] = await Promise.all([
        api.get("/get.product.php?per_page=150"),
        api.get("/get.product.php?categories=1"),
        api.get("/public/settings.php")
      ]);

      if (prodRes.data?.status === "success" && Array.isArray(prodRes.data.data)) {
        setProducts(prodRes.data.data);
      }
      if (catRes.data?.status === "success" && Array.isArray(catRes.data.data)) {
        const cleanCats = catRes.data.data.map(c => typeof c === 'string' ? c : (c?.name || String(c || ''))).filter(Boolean);
        setCategories(["Semua", ...cleanCats]);
      }
      if (setRes.data?.status === "success" && setRes.data.data) {
        setStoreSettings(prev => ({ ...prev, ...setRes.data.data }));
      }
    } catch (err) {
      console.error("Gagal memuat katalog produk:", err);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Calculations
  const validCart = Array.isArray(cart) ? cart : [];
  const subtotal = validCart.reduce((sum, item) => sum + (Number(item?.price) || 0) * (Number(item?.qty) || 1), 0);
  const discountVal = Math.min(subtotal, Math.max(0, Number(discountAmount) || 0));
  const taxVal = Math.round(((subtotal - discountVal) * Math.max(0, Number(taxPercent) || 0)) / 100);
  const grandTotal = Math.max(0, subtotal - discountVal + taxVal);

  const numCashReceived = Number(cashReceived) || 0;
  const changeAmount = Math.max(0, numCashReceived - grandTotal);
  const isCashSufficient = paymentMethod !== "cash" || numCashReceived >= grandTotal;

  // Add item to cart
  const addToCart = (product, addQty = 1) => {
    if (!product) return;
    const stock = Number(product.stock) || 0;
    if (stock <= 0) {
      alert(`Stok produk "${product.name || 'Produk'}" sedang habis!`);
      return;
    }

    setCart(prev => {
      const currentList = Array.isArray(prev) ? prev : [];
      const idx = currentList.findIndex(item => item.id === product.id);
      if (idx >= 0) {
        const curItem = currentList[idx];
        const newQty = (curItem.qty || 1) + addQty;
        if (newQty > stock) {
          alert(`Maksimal stok tercapai (${stock} pcs)`);
          return currentList;
        }
        playBeep();
        const copy = [...currentList];
        copy[idx] = { ...curItem, qty: newQty };
        return copy;
      } else {
        playBeep();
        return [...currentList, {
          id: product.id,
          name: product.name || "Produk",
          price: Number(product.price) || 0,
          barcode: product.barcode || "-",
          image: product.image,
          stock: stock,
          qty: addQty
        }];
      }
    });
  };

  const updateCartQty = (productId, delta) => {
    setCart(prev => {
      const currentList = Array.isArray(prev) ? prev : [];
      return currentList.map(item => {
        if (item.id === productId) {
          const nextQty = (item.qty || 1) + delta;
          if (nextQty <= 0) return null;
          if (nextQty > item.stock) {
            alert(`Stok hanya tersedia ${item.stock}`);
            return item;
          }
          return { ...item, qty: nextQty };
        }
        return item;
      }).filter(Boolean);
    });
  };

  const removeCartItem = (productId) => {
    setCart(prev => (Array.isArray(prev) ? prev.filter(item => item.id !== productId) : []));
  };

  const clearCart = () => {
    if (validCart.length === 0) return;
    if (window.confirm("Kosongkan semua produk di keranjang saat ini?")) {
      setCart([]);
      setDiscountAmount(0);
      setTaxPercent(0);
    }
  };

  // Handle Barcode Scan / Enter
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    const query = String(barcodeInput || "").trim();
    if (!query) return;

    // 1. Look for exact barcode match
    let match = products.find(p => p.barcode && String(p.barcode).trim().toLowerCase() === query.toLowerCase());

    // 2. If not found by exact barcode, look for exact ID or name match
    if (!match) {
      match = products.find(p => String(p.id) === query || (p.name && p.name.toLowerCase().includes(query.toLowerCase())));
    }

    if (match) {
      addToCart(match, 1);
      setBarcodeInput("");
    } else {
      alert(`Produk dengan Barcode/SKU "${query}" tidak ditemukan!`);
    }
  };

  // Cart Hold & Recall
  const handleHoldCart = () => {
    if (validCart.length === 0) return;
    const name = prompt("Beri catatan / nama pelanggan untuk hold keranjang ini:", `Pelanggan #${heldCarts.length + 1}`) || "Pelanggan";
    const held = {
      id: Date.now(),
      time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      customerName: name,
      items: validCart,
      discountAmount,
      taxPercent,
      subtotal,
      grandTotal
    };

    setHeldCarts(prev => [held, ...(Array.isArray(prev) ? prev : [])]);
    setCart([]);
    setDiscountAmount(0);
    setTaxPercent(0);
    alert(`Keranjang pesanan [${name}] berhasil di-Hold.`);
  };

  const handleRestoreHeldCart = (heldItem) => {
    if (!heldItem) return;
    if (validCart.length > 0) {
      if (!window.confirm("Keranjang kasir saat ini berisi barang. Timpa dengan keranjang hold terpilih?")) {
        return;
      }
    }
    setCart(Array.isArray(heldItem.items) ? heldItem.items : []);
    setDiscountAmount(Number(heldItem.discountAmount) || 0);
    setTaxPercent(Number(heldItem.taxPercent) || 0);
    setHeldCarts(prev => (Array.isArray(prev) ? prev.filter(h => h.id !== heldItem.id) : []));
    setShowHoldModal(false);
  };

  const handleDeleteHeldCart = (heldId) => {
    if (window.confirm("Hapus antrian belanja ini?")) {
      setHeldCarts(prev => (Array.isArray(prev) ? prev.filter(h => h.id !== heldId) : []));
    }
  };

  // Open Payment Modal
  const openPaymentModal = () => {
    if (validCart.length === 0) return;
    setCashReceived(String(grandTotal)); // default uang pas
    setShowPaymentModal(true);
  };

  // 5. Hotkeys Listener (F2, F4, F8, Escape)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowReceiptModal(false);
        setShowPaymentModal(false);
        setShowHoldModal(false);
        setShowShiftModal(false);
        setShowRekapModal(false);
        return;
      }

      if (e.key === "F2") {
        e.preventDefault();
        barcodeInputRef.current?.focus();
        barcodeInputRef.current?.select();
      } else if (e.key === "F4") {
        e.preventDefault();
        if (validCart.length > 0) {
          handleHoldCart();
        } else if (heldCarts.length > 0) {
          setShowHoldModal(true);
        }
      } else if (e.key === "F8") {
        e.preventDefault();
        if (validCart.length > 0 && !showPaymentModal) {
          openPaymentModal();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [validCart, heldCarts, showPaymentModal]);

  // Checkout Walk-in Order via API
  const handleCompleteTransaction = async (e) => {
    e?.preventDefault();
    if (validCart.length === 0 || isSubmittingOrder) return;
    if (!isCashSufficient) {
      alert("Jumlah uang yang diterima kurang dari total belanja!");
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const orderPayload = {
        customer_name: (typeof customerName === 'string' ? customerName.trim() : "") || "Pelanggan Langsung",
        phone: "-",
        address: "Ambil di toko",
        courier: "walkin",
        payment_mode: "cash",
        items: validCart.map(item => ({
          id: item.id || item.product_id,
          product_id: item.product_id || item.id,
          qty: item.qty
        }))
      };

      const res = await api.post("/cart/create_order.php", orderPayload);

      if (res.data?.status === "success") {
        playCashChime();

        // Update shift record if opened
        if (currentShift) {
          const updatedShift = {
            ...currentShift,
            totalSales: (Number(currentShift.totalSales) || 0) + grandTotal,
            totalCash: paymentMethod === "cash" 
              ? (Number(currentShift.totalCash) || 0) + grandTotal 
              : (Number(currentShift.totalCash) || 0),
            totalNonCash: paymentMethod !== "cash" 
              ? (Number(currentShift.totalNonCash) || 0) + grandTotal 
              : (Number(currentShift.totalNonCash) || 0),
            transactionsCount: (Number(currentShift.transactionsCount) || 0) + 1
          };
          setCurrentShift(updatedShift);
          try {
            localStorage.setItem("pos_current_shift", JSON.stringify(updatedShift));
          } catch (err) {
            // ignore
          }
        }

        const completedData = {
          orderId: res.data.order_id,
          date: new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }),
          customerName: (typeof customerName === 'string' ? customerName.trim() : "") || "Pelanggan Langsung",
          cashierName: typeof user?.name === 'string' ? user.name : "Kasir",
          items: [...validCart],
          subtotal,
          discountAmount: discountVal,
          taxPercent,
          taxVal,
          grandTotal,
          paymentMethod,
          cashReceived: paymentMethod === "cash" ? numCashReceived : grandTotal,
          changeAmount: paymentMethod === "cash" ? changeAmount : 0
        };

        setLastCompletedOrder(completedData);
        setShowPaymentModal(false);
        setShowReceiptModal(true);

        // Deduct local stock immediately & refresh products
        setProducts(prev => (Array.isArray(prev) ? prev.map(p => {
          const bought = validCart.find(c => c.id === p.id);
          if (bought) {
            return { ...p, stock: Math.max(0, (Number(p.stock) || 0) - bought.qty) };
          }
          return p;
        }) : []));

        // Reset Cart
        setCart([]);
        setDiscountAmount(0);
        setTaxPercent(0);
        setCustomerName("Pelanggan Langsung");
      } else {
        alert(res.data?.message || "Gagal memproses transaksi kasir!");
      }
    } catch (err) {
      console.error("Order submit error:", err);
      alert(err.response?.data?.message || "Terjadi kesalahan server saat menyelesaikan transaksi!");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Shift Management Functions
  const handleOpenShift = () => {
    const initial = Math.max(0, Number(shiftInitialCash) || 0);
    const newShift = {
      id: Date.now(),
      openedAt: new Date().toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }),
      cashierName: typeof user?.name === 'string' ? user.name : "Kasir",
      initialCash: initial,
      totalSales: 0,
      totalCash: 0,
      totalNonCash: 0,
      transactionsCount: 0
    };
    setCurrentShift(newShift);
    try {
      localStorage.setItem("pos_current_shift", JSON.stringify(newShift));
    } catch (e) {
      // ignore
    }
    setShowShiftModal(false);
    alert(`Shift berhasil dibuka dengan modal kas awal Rp ${initial.toLocaleString("id-ID")}`);
  };

  const handleCloseShift = () => {
    if (!currentShift) return;
    const closing = Number(shiftClosingCash) || 0;
    const initialCash = Number(currentShift.initialCash) || 0;
    const totalCash = Number(currentShift.totalCash) || 0;
    const expectedDrawerCash = initialCash + totalCash;
    const difference = closing - expectedDrawerCash;

    const shiftSummary = {
      ...currentShift,
      closedAt: new Date().toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }),
      closingCash: closing,
      expectedCash: expectedDrawerCash,
      difference,
      notes: shiftNotes
    };

    try {
      const history = JSON.parse(localStorage.getItem("pos_shift_history") || "[]");
      const validHistory = Array.isArray(history) ? history : [];
      validHistory.unshift(shiftSummary);
      localStorage.setItem("pos_shift_history", JSON.stringify(validHistory.slice(0, 50)));
    } catch (e) {
      console.error(e);
    }

    localStorage.removeItem("pos_current_shift");
    setCurrentShift(null);
    setShowShiftModal(false);
    alert(`Shift resmi ditutup!\nKas Diharapkan: Rp ${expectedDrawerCash.toLocaleString("id-ID")}\nKas Fisik: Rp ${closing.toLocaleString("id-ID")}\nSelisih: Rp ${difference.toLocaleString("id-ID")}`);
  };

  // Print Thermal Receipt
  const handlePrintReceipt = () => {
    window.print();
  };

  // Quick cash denomination presets
  const quickCashOptions = [
    grandTotal,
    Math.ceil(grandTotal / 10000) * 10000,
    Math.ceil(grandTotal / 20000) * 20000,
    Math.ceil(grandTotal / 50000) * 50000,
    100000,
    200000,
    500000
  ].filter((val, idx, arr) => val >= grandTotal && arr.indexOf(val) === idx).slice(0, 5);

  // Filter products by category & search term
  const filteredProducts = (Array.isArray(products) ? products : []).filter(p => {
    if (!p) return false;
    const pCategory = typeof p.category === 'string' ? p.category : (p.category?.name || '');
    const matchCategory = selectedCategory === "Semua" || pCategory === selectedCategory;
    const query = searchTerm.toLowerCase().trim();
    const pName = typeof p.name === 'string' ? p.name.toLowerCase() : '';
    const pBarcode = p.barcode ? String(p.barcode).toLowerCase() : '';
    const matchSearch = !query || 
      pName.includes(query) || 
      pBarcode.includes(query) ||
      pCategory.toLowerCase().includes(query);
    return matchCategory && matchSearch;
  });

  const userNameDisplay = typeof user?.name === 'string' ? user.name : "Kasir";
  const userRoleDisplay = typeof user?.role === 'string' ? user.role.toUpperCase() : "STAFF";

  return (
    <div className="min-h-screen bg-[#F4F4F0] text-ink font-sans flex flex-col select-none overflow-hidden h-screen">
      
      {/* 1. TOP HEADER (STATUS & NAVIGATION) */}
      <header className="bg-white border-b-2 border-ink px-4 py-2.5 flex items-center justify-between shadow-[0_2px_0_#161616] shrink-0 z-20">
        <div className="flex items-center gap-3">
          <img 
            src="/logo-icon.png?v=2" 
            alt="POSMart" 
            className="w-11 h-11 object-contain rounded-xl border-2 border-ink shadow-[2px_2px_0_#161616] bg-white p-0.5" 
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight leading-none">POSMart Mesin Kasir</h1>
              <span className="bg-ink text-cream text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                Terminal POS
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-2">
              <span>{currentTime.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
              <span>•</span>
              <span className="font-mono font-bold text-slate-700">{currentTime.toLocaleTimeString("id-ID")}</span>
              <span>•</span>
              <span className="text-slate-800 font-bold">{userNameDisplay} ({userRoleDisplay})</span>
            </p>
          </div>
        </div>

        {/* Center / Right Control Badges */}
        <div className="flex items-center gap-2">
          {/* Shift Status Indicator */}
          {currentShift ? (
            <button 
              onClick={() => setShowRekapModal(true)}
              className="bg-lime/30 border-2 border-ink px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-black shadow-[2px_2px_0_#161616] hover:bg-lime/50 transition-colors cursor-pointer"
              title="Klik untuk lihat Rekap Shift"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></div>
              <span>Shift Aktif: Rp {Number(currentShift.totalSales || 0).toLocaleString("id-ID")}</span>
            </button>
          ) : (
            <button 
              onClick={() => setShowShiftModal(true)}
              className="bg-amber-100 border-2 border-ink text-amber-900 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-black shadow-[2px_2px_0_#161616] hover:bg-amber-200 transition-colors cursor-pointer"
            >
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Shift Belum Dibuka — Buka Shift</span>
            </button>
          )}

          <button 
            onClick={() => setShowShiftModal(true)}
            className="bg-white border-2 border-ink px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-slate-100 shadow-[2px_2px_0_#161616] cursor-pointer"
          >
            {currentShift ? "Tutup Shift" : "Buka Shift"}
          </button>

          <button 
            onClick={() => setShowRekapModal(true)}
            className="bg-white border-2 border-ink px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-slate-100 shadow-[2px_2px_0_#161616] cursor-pointer"
          >
            Rekap
          </button>

          <button 
            onClick={() => navigate("/cashier")}
            className="bg-sky-100 border-2 border-ink text-sky-900 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-sky-200 shadow-[2px_2px_0_#161616] flex items-center gap-1.5 cursor-pointer"
          >
            <Store className="w-3.5 h-3.5" />
            <span>Pesanan Online</span>
          </button>

          {(user?.role === "admin" || user?.role === "owner") && (
            <button 
              onClick={() => navigate("/admin")}
              className="bg-white border-2 border-ink text-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-slate-100 shadow-[2px_2px_0_#161616] cursor-pointer"
            >
              Panel Admin
            </button>
          )}

          <button 
            onClick={() => navigate("/")}
            className="bg-coral/10 border-2 border-ink text-coral px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-coral/20 shadow-[2px_2px_0_#161616] cursor-pointer"
            title="Keluar ke Beranda Toko"
          >
            Toko
          </button>
        </div>
      </header>

      {/* 2. MAIN REGISTER SPLIT VIEW */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT COLUMN: PRODUCT SEARCH, BARCODE SCAN & GRID (65%) */}
        <section className="flex-1 flex flex-col border-r-2 border-ink bg-cream/40 overflow-hidden">
          
          {/* Top Inputs: Search & Barcode Scanner */}
          <div className="p-3 bg-white border-b-2 border-ink flex flex-col md:flex-row gap-2 shrink-0">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input 
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama produk / kategori..."
                className="w-full bg-[#FBFBF7] border-2 border-ink rounded-xl pl-10 pr-4 py-2 text-sm font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-ink"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Barcode Scanner Input */}
            <form onSubmit={handleBarcodeSubmit} className="relative w-full md:w-80">
              <Barcode className="absolute left-3.5 top-3 w-4 h-4 text-slate-700" />
              <input 
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan Barcode / SKU..."
                className="w-full bg-[#FFFBEB] border-2 border-ink rounded-xl pl-10 pr-12 py-2 text-sm font-bold placeholder:text-amber-700/60 focus:outline-none focus:bg-amber-50 focus:ring-2 focus:ring-amber-500"
              />
              <span className="absolute right-2.5 top-2 bg-amber-200 border border-ink text-[10px] font-black px-1.5 py-0.5 rounded text-amber-900 pointer-events-none">
                F2
              </span>
            </form>
          </div>

          {/* Category Filter Pills */}
          <div className="px-3 py-2 bg-white/70 border-b-2 border-ink flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {categories.map((cat, idx) => {
              const catLabel = typeof cat === 'string' ? cat : (cat?.name || `Kategori ${idx}`);
              return (
                <button
                  key={catLabel}
                  onClick={() => setSelectedCategory(catLabel)}
                  className={`px-3 py-1 rounded-lg text-xs font-black whitespace-nowrap transition-all border-2 border-ink cursor-pointer ${
                    selectedCategory === catLabel 
                      ? "bg-ink text-cream shadow-[2px_2px_0_#CBF169]" 
                      : "bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {catLabel}
                </button>
              );
            })}
          </div>

          {/* Products Grid */}
          <div className="flex-1 p-3 overflow-y-auto">
            {loadingProducts ? (
              <div className="h-full flex items-center justify-center flex-col text-slate-400 gap-2">
                <RefreshCw className="w-8 h-8 animate-spin text-ink" />
                <p className="font-bold text-sm">Memuat katalog kasir...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-full flex items-center justify-center flex-col text-slate-400">
                <div className="w-16 h-16 bg-white border-2 border-ink rounded-2xl flex items-center justify-center shadow-[3px_3px_0_#161616] text-3xl mb-3">
                  📦
                </div>
                <p className="font-black text-ink text-base">Produk tidak ditemukan</p>
                <p className="text-xs text-slate-500 mt-1">Coba kata kunci pencarian atau kategori lain</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                {filteredProducts.map((p) => {
                  const stockNum = Number(p.stock) || 0;
                  const isOutOfStock = stockNum <= 0;
                  const inCartItem = validCart.find(c => c.id === p.id);
                  const inCartQty = inCartItem ? inCartItem.qty : 0;
                  const categoryName = typeof p.category === 'string' ? p.category : (p.category?.name || 'Umum');

                  return (
                    <div 
                      key={p.id}
                      onClick={() => !isOutOfStock && addToCart(p, 1)}
                      className={`relative bg-white border-2 border-ink rounded-xl p-2.5 flex flex-col justify-between transition-all select-none ${
                        isOutOfStock 
                          ? "opacity-50 cursor-not-allowed bg-slate-100" 
                          : "hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#161616] active:translate-y-0 active:shadow-none cursor-pointer"
                      }`}
                    >
                      {/* Cart Count Badge if in cart */}
                      {inCartQty > 0 && (
                        <div className="absolute -top-2 -right-2 bg-coral text-white border-2 border-ink text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow-[1px_1px_0_#161616] z-10 animate-bounce">
                          {inCartQty}
                        </div>
                      )}

                      {/* Image / Thumbnail */}
                      <div className="w-full aspect-square bg-[#FBFBF7] border border-slate-200 rounded-lg overflow-hidden mb-2 relative flex items-center justify-center">
                        <img 
                          src={p.image ? (p.image.startsWith("http") || p.image.startsWith("/") ? p.image : `/product/${p.image}`) : "https://placehold.co/200x200?text=No+Image"}
                          alt={p.name || "Produk"}
                          className="w-full h-full object-contain p-1"
                          onError={(e) => { e.currentTarget.src = "https://placehold.co/200x200?text=POSMart"; }}
                        />
                        {/* Stock status pill */}
                        <div className="absolute bottom-1 right-1">
                          {isOutOfStock ? (
                            <span className="bg-coral text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm">
                              Habis
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm">
                              Stok {stockNum}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Product details */}
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                          {p.barcode ? `SKU: ${p.barcode}` : categoryName}
                        </p>
                        <h2 className="text-xs font-black text-ink line-clamp-2 leading-snug mt-0.5" title={p.name}>
                          {p.name}
                        </h2>
                      </div>

                      <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-sm font-black text-ink">
                          Rp {Number(p.price || 0).toLocaleString("id-ID")}
                        </span>
                        {!isOutOfStock && (
                          <button 
                            type="button" 
                            className="w-6 h-6 bg-lime border border-ink rounded-md flex items-center justify-center font-black text-xs hover:bg-lime/80"
                            title="Tambah ke keranjang"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: REGISTER CART & BILLING SUMMARY (35%) */}
        <aside className="w-96 lg:w-[420px] bg-white flex flex-col shrink-0 select-none">
          
          {/* Cart Header */}
          <div className="p-3 border-b-2 border-ink bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-ink" />
              <h2 className="font-black text-base tracking-tight">Keranjang Kasir</h2>
              <span className="bg-lime border border-ink text-ink text-xs font-black px-2 py-0.5 rounded-full">
                {validCart.reduce((sum, item) => sum + (Number(item?.qty) || 1), 0)} item
              </span>
            </div>

            {/* Quick Actions: Hold, Recall, Reset */}
            <div className="flex items-center gap-1.5">
              <button 
                onClick={handleHoldCart}
                disabled={validCart.length === 0}
                className="bg-amber-100 border border-ink text-amber-900 text-xs font-black px-2.5 py-1 rounded-lg hover:bg-amber-200 disabled:opacity-40 cursor-pointer shadow-[1px_1px_0_#161616]"
                title="Hold Keranjang (F4)"
              >
                Hold
              </button>
              <button 
                onClick={() => setShowHoldModal(true)}
                className="relative bg-white border border-ink text-slate-700 text-xs font-black px-2.5 py-1 rounded-lg hover:bg-slate-100 cursor-pointer shadow-[1px_1px_0_#161616]"
                title="Buka Daftar Keranjang yang di-Hold"
              >
                Ambil Hold
                {heldCarts.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-coral text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {heldCarts.length}
                  </span>
                )}
              </button>
              <button 
                onClick={clearCart}
                disabled={validCart.length === 0}
                className="bg-rose-50 border border-ink text-rose-700 text-xs font-black px-2 py-1 rounded-lg hover:bg-rose-100 disabled:opacity-40 cursor-pointer shadow-[1px_1px_0_#161616]"
                title="Kosongkan Keranjang"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#FBFBF7]">
            {validCart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center mb-3">
                  <ShoppingCart className="w-7 h-7 text-slate-300" />
                </div>
                <p className="font-black text-slate-600 text-sm">Keranjang Kosong</p>
                <p className="text-xs text-slate-400 mt-1">
                  Klik produk di samping atau scan barcode (F2) untuk menambahkan item.
                </p>
              </div>
            ) : (
              validCart.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-white border-2 border-ink rounded-xl p-2.5 shadow-[2px_2px_0_#161616] flex items-center gap-2.5"
                >
                  <div className="w-10 h-10 bg-[#FBFBF7] border border-slate-200 rounded-lg shrink-0 overflow-hidden flex items-center justify-center">
                    <img 
                      src={item.image ? (item.image.startsWith("http") || item.image.startsWith("/") ? item.image : `/product/${item.image}`) : "https://placehold.co/100x100?text=Item"}
                      alt={item.name}
                      className="w-full h-full object-contain"
                      onError={(e) => { e.currentTarget.src = "https://placehold.co/100x100?text=Item"; }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-black text-ink truncate leading-tight">
                      {item.name}
                    </h3>
                    <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                      Rp {Number(item.price || 0).toLocaleString("id-ID")}
                    </p>
                  </div>

                  {/* Quantity Controller */}
                  <div className="flex items-center gap-1.5 border border-ink rounded-lg bg-cream/40 p-0.5 shrink-0">
                    <button 
                      onClick={() => updateCartQty(item.id, -1)}
                      className="w-6 h-6 bg-white border border-ink rounded flex items-center justify-center text-xs font-black hover:bg-slate-100"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-black">
                      {item.qty}
                    </span>
                    <button 
                      onClick={() => updateCartQty(item.id, 1)}
                      className="w-6 h-6 bg-white border border-ink rounded flex items-center justify-center text-xs font-black hover:bg-slate-100"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right shrink-0 w-20">
                    <p className="text-xs font-black text-ink">
                      Rp {((Number(item.price) || 0) * (Number(item.qty) || 1)).toLocaleString("id-ID")}
                    </p>
                  </div>

                  {/* Remove Button */}
                  <button 
                    onClick={() => removeCartItem(item.id)}
                    className="p-1 text-slate-300 hover:text-rose-600 rounded cursor-pointer"
                    title="Hapus baris"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Cart Billing Summary & Controls */}
          <div className="p-3 border-t-2 border-ink bg-white shrink-0 space-y-2">
            
            {/* Subtotal */}
            <div className="flex justify-between items-center text-xs font-bold text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono text-ink font-black">Rp {subtotal.toLocaleString("id-ID")}</span>
            </div>

            {/* Diskon & Pajak Inputs */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-0.5">
                  Diskon (Rp)
                </label>
                <input 
                  type="number"
                  min="0"
                  value={discountAmount || ""}
                  onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-[#FBFBF7] border border-ink rounded-lg px-2 py-1 text-xs font-bold font-mono focus:outline-none focus:bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-0.5">
                  PPN (%)
                </label>
                <div className="flex items-center gap-1">
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    value={taxPercent || ""}
                    onChange={(e) => setTaxPercent(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full bg-[#FBFBF7] border border-ink rounded-lg px-2 py-1 text-xs font-bold font-mono focus:outline-none focus:bg-white"
                  />
                  <button 
                    type="button"
                    onClick={() => setTaxPercent(prev => prev === 11 ? 0 : 11)}
                    className={`px-2 py-1 border border-ink rounded-lg text-[10px] font-black shrink-0 ${
                      taxPercent === 11 ? "bg-ink text-cream" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    11%
                  </button>
                </div>
              </div>
            </div>

            {/* Grand Total */}
            <div className="pt-2 border-t border-dashed border-slate-300 flex items-baseline justify-between">
              <div>
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                  Total Bayar
                </span>
                <span className="text-2xl font-black text-ink tracking-tight font-mono">
                  Rp {grandTotal.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Checkout Bayar Button */}
            <button 
              onClick={openPaymentModal}
              disabled={validCart.length === 0}
              className="w-full py-3.5 bg-lime hover:bg-[#bde85b] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed border-2 border-ink rounded-xl font-black text-base text-ink shadow-[3px_3px_0_#161616] active:translate-y-0.5 active:shadow-[1px_1px_0_#161616] flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <span>BAYAR</span>
              <span>•</span>
              <span className="font-mono">Rp {grandTotal.toLocaleString("id-ID")}</span>
              <span className="bg-ink text-cream text-[10px] font-black px-1.5 py-0.5 rounded ml-1">
                F8
              </span>
            </button>

            {/* Keyboard Shortcuts Hint */}
            <div className="text-[10px] text-center font-bold text-slate-400 pt-1">
              <span>F2: Scan Barcode</span> • <span>F4: Hold/Ambil</span> • <span>F8: Bayar</span> • <span>ESC: Tutup</span>
            </div>
          </div>
        </aside>
      </div>

      {/* 3. MODAL: PEMBAYARAN KASIR (F8) */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-ink rounded-2xl w-full max-w-lg shadow-[6px_6px_0_#161616] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-[#FBFBF7] border-b-2 border-ink p-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-ink">Pembayaran Transaksi</h3>
                <p className="text-xs text-slate-500 font-medium">Kasir: {userNameDisplay} • {validCart.length} Jenis Produk</p>
              </div>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="w-8 h-8 rounded-full border border-ink flex items-center justify-center hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCompleteTransaction} className="p-4 space-y-4">
              
              {/* Grand Total Banner */}
              <div className="bg-lime/20 border-2 border-ink rounded-xl p-3 text-center">
                <p className="text-xs font-black text-slate-600 uppercase tracking-wider">TOTAL YANG HARUS DIBAYAR</p>
                <p className="text-3xl font-black text-ink font-mono mt-0.5">
                  Rp {grandTotal.toLocaleString("id-ID")}
                </p>
              </div>

              {/* Customer Name */}
              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">
                  Nama Pelanggan
                </label>
                <input 
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Pelanggan Langsung (Walk-in)"
                  className="w-full bg-[#FBFBF7] border-2 border-ink rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:bg-white"
                />
              </div>

              {/* Payment Method Tabs */}
              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`py-2 px-3 border-2 border-ink rounded-xl font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                      paymentMethod === "cash" 
                        ? "bg-ink text-cream shadow-[2px_2px_0_#CBF169]" 
                        : "bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    Tunai (Cash)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("qris");
                      setCashReceived(String(grandTotal));
                    }}
                    className={`py-2 px-3 border-2 border-ink rounded-xl font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                      paymentMethod === "qris" 
                        ? "bg-ink text-cream shadow-[2px_2px_0_#CBF169]" 
                        : "bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    QRIS
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("transfer");
                      setCashReceived(String(grandTotal));
                    }}
                    className={`py-2 px-3 border-2 border-ink rounded-xl font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                      paymentMethod === "transfer" 
                        ? "bg-ink text-cream shadow-[2px_2px_0_#CBF169]" 
                        : "bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    Transfer
                  </button>
                </div>
              </div>

              {/* CASH PAYMENT FIELDS */}
              {paymentMethod === "cash" ? (
                <div className="space-y-3 bg-[#FBFBF7] border border-ink rounded-xl p-3">
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">
                      Uang Tunai Diterima (Rp)
                    </label>
                    <input 
                      type="number"
                      autoFocus
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder="Masukkan nominal uang..."
                      className="w-full bg-white border-2 border-ink rounded-xl px-3 py-2.5 text-lg font-black font-mono focus:outline-none focus:ring-2 focus:ring-ink"
                    />
                  </div>

                  {/* Denomination Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {quickCashOptions.map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setCashReceived(String(val))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black border border-ink cursor-pointer ${
                          numCashReceived === val 
                            ? "bg-ink text-cream" 
                            : "bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {val === grandTotal ? "Uang Pas" : `Rp ${val.toLocaleString("id-ID")}`}
                      </button>
                    ))}
                  </div>

                  {/* Change Calculation */}
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                    isCashSufficient 
                      ? "bg-emerald-50 border-emerald-300 text-emerald-900" 
                      : "bg-rose-50 border-rose-300 text-rose-900"
                  }`}>
                    <span className="text-xs font-black">
                      {isCashSufficient ? "Kembalian:" : "Uang Kurang:"}
                    </span>
                    <span className="text-base font-black font-mono">
                      {isCashSufficient 
                        ? `Rp ${changeAmount.toLocaleString("id-ID")}` 
                        : `Kurang Rp ${(grandTotal - numCashReceived).toLocaleString("id-ID")}`}
                    </span>
                  </div>
                </div>
              ) : paymentMethod === "qris" ? (
                <div className="bg-[#FBFBF7] border border-ink rounded-xl p-4 text-center space-y-2">
                  <div className="w-32 h-32 bg-white border-2 border-ink mx-auto rounded-xl flex items-center justify-center p-2 shadow-sm">
                    {/* Simulated Static QRIS */}
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=POSMART_QRIS_${grandTotal}`} 
                      alt="QRIS POSMart" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Minta pelanggan scan QRIS melalui BCA / GoPay / OVO / ShopeePay</p>
                  <span className="inline-block bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded">
                    Menunggu verifikasi kasir
                  </span>
                </div>
              ) : (
                <div className="bg-[#FBFBF7] border border-ink rounded-xl p-3 text-xs space-y-1 font-bold text-slate-700">
                  <p>Rekening Toko POSMart:</p>
                  <p className="font-mono text-ink font-black">BCA: 8720-9912-34 a/n POSMart Official</p>
                  <p className="text-slate-500">Pastikan bukti transfer telah dicek sebelum menekan konfirmasi.</p>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-3 bg-white border-2 border-ink rounded-xl font-black text-sm text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Batal (ESC)
                </button>
                <button
                  type="submit"
                  disabled={!isCashSufficient || isSubmittingOrder}
                  className="flex-2 py-3 bg-lime hover:bg-[#bde85b] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed border-2 border-ink rounded-xl font-black text-sm text-ink shadow-[3px_3px_0_#161616] cursor-pointer flex items-center justify-center gap-2 transition-all"
                >
                  {isSubmittingOrder ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Selesaikan Transaksi (Enter)</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL: STRUK PEMBAYARAN THERMAL (58mm / 80mm) */}
      {showReceiptModal && lastCompletedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-ink rounded-2xl w-full max-w-sm shadow-[6px_6px_0_#161616] overflow-hidden flex flex-col animate-in fade-in">
            {/* Modal Top Bar */}
            <div className="bg-[#FBFBF7] border-b-2 border-ink p-3 flex items-center justify-between print:hidden">
              <span className="font-black text-sm text-ink flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Transaksi Berhasil
              </span>
              <button 
                onClick={() => setShowReceiptModal(false)}
                className="w-7 h-7 rounded-full border border-ink flex items-center justify-center hover:bg-slate-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Printable Receipt Canvas */}
            <div id="thermal-receipt" className="p-4 bg-white text-ink text-xs font-mono leading-tight max-h-[75vh] overflow-y-auto">
              <div className="text-center pb-3 border-b border-dashed border-slate-300">
                <h4 className="font-black text-sm uppercase">{storeSettings.store_name}</h4>
                <p className="text-[10px] text-slate-600 mt-0.5">{storeSettings.store_address}</p>
                <p className="text-[10px] text-slate-600">Telp/WA: {storeSettings.store_phone}</p>
              </div>

              <div className="py-2 border-b border-dashed border-slate-300 text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  <span>No. Faktur:</span>
                  <span className="font-bold">#POS-{lastCompletedOrder.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Waktu:</span>
                  <span>{lastCompletedOrder.date}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kasir:</span>
                  <span>{lastCompletedOrder.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span>{lastCompletedOrder.customerName}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="py-2 border-b border-dashed border-slate-300 space-y-1.5">
                {Array.isArray(lastCompletedOrder.items) && lastCompletedOrder.items.map((it, idx) => (
                  <div key={idx} className="text-[11px]">
                    <div className="font-bold text-ink truncate">{it.name}</div>
                    <div className="flex justify-between text-slate-600">
                      <span>{it.qty} x Rp {Number(it.price || 0).toLocaleString("id-ID")}</span>
                      <span className="font-bold text-ink">Rp {((Number(it.qty) || 1) * (Number(it.price) || 0)).toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="py-2 border-b border-dashed border-slate-300 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>Rp {Number(lastCompletedOrder.subtotal || 0).toLocaleString("id-ID")}</span>
                </div>
                {lastCompletedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-coral">
                    <span>Diskon:</span>
                    <span>-Rp {Number(lastCompletedOrder.discountAmount).toLocaleString("id-ID")}</span>
                  </div>
                )}
                {lastCompletedOrder.taxVal > 0 && (
                  <div className="flex justify-between">
                    <span>PPN ({lastCompletedOrder.taxPercent}%):</span>
                    <span>Rp {Number(lastCompletedOrder.taxVal).toLocaleString("id-ID")}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-200">
                  <span>TOTAL:</span>
                  <span>Rp {Number(lastCompletedOrder.grandTotal || 0).toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span>Bayar ({String(lastCompletedOrder.paymentMethod || 'CASH').toUpperCase()}):</span>
                  <span>Rp {Number(lastCompletedOrder.cashReceived || 0).toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Kembalian:</span>
                  <span>Rp {Number(lastCompletedOrder.changeAmount || 0).toLocaleString("id-ID")}</span>
                </div>
              </div>

              <div className="text-center pt-3 text-[10px] text-slate-500 space-y-1">
                <p>{storeSettings.receipt_footer}</p>
                <p>Simpan struk ini sebagai bukti pembayaran yang sah.</p>
              </div>
            </div>

            {/* Print & Next Customer Actions */}
            <div className="p-3 bg-[#FBFBF7] border-t-2 border-ink flex items-center gap-2 print:hidden">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 py-2.5 bg-white border-2 border-ink rounded-xl font-black text-xs text-slate-800 hover:bg-slate-100 flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0_#161616]"
              >
                <Printer className="w-4 h-4" />
                Cetak Struk
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 py-2.5 bg-lime border-2 border-ink rounded-xl font-black text-xs text-ink hover:bg-[#bde85b] flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0_#161616]"
              >
                <Plus className="w-4 h-4" />
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: DAFTAR KERANJANG DI-HOLD */}
      {showHoldModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-ink rounded-2xl w-full max-w-md shadow-[6px_6px_0_#161616] overflow-hidden flex flex-col">
            <div className="bg-[#FBFBF7] border-b-2 border-ink p-3 flex items-center justify-between">
              <h3 className="font-black text-sm text-ink flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-600" />
                Daftar Antrian Belanja (Hold)
              </h3>
              <button 
                onClick={() => setShowHoldModal(false)}
                className="w-7 h-7 rounded-full border border-ink flex items-center justify-center hover:bg-slate-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 max-h-80 overflow-y-auto space-y-2">
              {heldCarts.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <p className="font-bold text-sm">Tidak ada keranjang yang sedang di-hold.</p>
                  <p className="text-xs mt-1">Tekan tombol Hold di keranjang untuk menunda pesanan pelanggan.</p>
                </div>
              ) : (
                heldCarts.map((h) => (
                  <div key={h.id} className="bg-[#FBFBF7] border-2 border-ink rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="font-black text-sm text-ink">{h.customerName}</p>
                      <p className="text-xs text-slate-500">{h.time} • {Array.isArray(h.items) ? h.items.length : 0} jenis item</p>
                      <p className="text-xs font-mono font-black text-emerald-700 mt-0.5">
                        Rp {Number(h.grandTotal || 0).toLocaleString("id-ID")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => handleRestoreHeldCart(h)}
                        className="px-3 py-1.5 bg-lime border border-ink rounded-lg text-xs font-black hover:bg-lime/80 shadow-[1px_1px_0_#161616]"
                      >
                        Muat
                      </button>
                      <button 
                        onClick={() => handleDeleteHeldCart(h.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-[#FBFBF7] border-t-2 border-ink text-right">
              <button
                onClick={() => setShowHoldModal(false)}
                className="px-4 py-1.5 bg-white border border-ink rounded-lg text-xs font-bold hover:bg-slate-100"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: BUKA / TUTUP SHIFT KASIR */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-ink rounded-2xl w-full max-w-md shadow-[6px_6px_0_#161616] overflow-hidden flex flex-col">
            <div className="bg-[#FBFBF7] border-b-2 border-ink p-3 flex items-center justify-between">
              <h3 className="font-black text-sm text-ink flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-ink" />
                {currentShift ? "Tutup Shift Kasir" : "Buka Shift Baru"}
              </h3>
              <button 
                onClick={() => setShowShiftModal(false)}
                className="w-7 h-7 rounded-full border border-ink flex items-center justify-center hover:bg-slate-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {!currentShift ? (
                // BUKA SHIFT
                <>
                  <p className="text-xs text-slate-600">
                    Masukkan jumlah uang kas awal (modal receh/kembalian di laci kasir) sebelum memulai transaksi.
                  </p>
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">
                      Kas Awal Laci (Rp)
                    </label>
                    <input 
                      type="number"
                      value={shiftInitialCash}
                      onChange={(e) => setShiftInitialCash(e.target.value)}
                      placeholder="100000"
                      className="w-full bg-[#FBFBF7] border-2 border-ink rounded-xl px-3 py-2 text-base font-black font-mono focus:outline-none focus:bg-white"
                    />
                  </div>
                  <button
                    onClick={handleOpenShift}
                    className="w-full py-2.5 bg-lime hover:bg-[#bde85b] border-2 border-ink rounded-xl font-black text-sm text-ink shadow-[2px_2px_0_#161616] cursor-pointer"
                  >
                    Buka Shift Sekarang
                  </button>
                </>
              ) : (
                // TUTUP SHIFT
                <>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1 font-medium text-slate-700">
                    <div className="flex justify-between">
                      <span>Shift Dibuka:</span>
                      <span className="font-bold">{currentShift.openedAt}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kas Awal:</span>
                      <span className="font-mono font-bold">Rp {Number(currentShift.initialCash || 0).toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Penjualan Tunai:</span>
                      <span className="font-mono font-bold">Rp {Number(currentShift.totalCash || 0).toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Penjualan Non-Tunai:</span>
                      <span className="font-mono font-bold">Rp {Number(currentShift.totalNonCash || 0).toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200 font-black text-ink">
                      <span>Uang Fisik Seharusnya di Laci:</span>
                      <span className="font-mono text-emerald-700">
                        Rp {(Number(currentShift.initialCash || 0) + Number(currentShift.totalCash || 0)).toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">
                      Uang Fisik Sebenarnya di Laci (Rp)
                    </label>
                    <input 
                      type="number"
                      value={shiftClosingCash}
                      onChange={(e) => setShiftClosingCash(e.target.value)}
                      placeholder="Hitung uang di laci kasir..."
                      className="w-full bg-[#FBFBF7] border-2 border-ink rounded-xl px-3 py-2 text-base font-black font-mono focus:outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">
                      Catatan Shift (Opsional)
                    </label>
                    <textarea 
                      value={shiftNotes}
                      onChange={(e) => setShiftNotes(e.target.value)}
                      placeholder="Contoh: Selisih Rp 500 karena pembulatan permen..."
                      rows={2}
                      className="w-full bg-[#FBFBF7] border-2 border-ink rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:bg-white"
                    />
                  </div>

                  <button
                    onClick={handleCloseShift}
                    disabled={!shiftClosingCash}
                    className="w-full py-2.5 bg-coral text-white disabled:bg-slate-200 disabled:text-slate-400 border-2 border-ink rounded-xl font-black text-sm shadow-[2px_2px_0_#161616] cursor-pointer"
                  >
                    Tutup Shift & Simpan Laporan
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: REKAP SHIFT AKTIF */}
      {showRekapModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-ink rounded-2xl w-full max-w-md shadow-[6px_6px_0_#161616] overflow-hidden flex flex-col">
            <div className="bg-[#FBFBF7] border-b-2 border-ink p-3 flex items-center justify-between">
              <h3 className="font-black text-sm text-ink flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                Rekap Transaksi Kasir
              </h3>
              <button 
                onClick={() => setShowRekapModal(false)}
                className="w-7 h-7 rounded-full border border-ink flex items-center justify-center hover:bg-slate-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {currentShift ? (
                <>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-[#FBFBF7] border-2 border-ink rounded-xl p-2.5">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Total Transaksi</p>
                      <p className="text-xl font-black text-ink">{currentShift.transactionsCount || 0}</p>
                    </div>
                    <div className="bg-lime/20 border-2 border-ink rounded-xl p-2.5">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Total Penjualan</p>
                      <p className="text-xl font-black text-ink font-mono">
                        Rp {Number(currentShift.totalSales || 0).toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs space-y-1.5 font-medium">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Modal Kas Awal:</span>
                      <span className="font-mono font-bold">Rp {Number(currentShift.initialCash || 0).toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Penjualan Tunai:</span>
                      <span className="font-mono font-bold">Rp {Number(currentShift.totalCash || 0).toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Penjualan Non-Tunai / QRIS:</span>
                      <span className="font-mono font-bold">Rp {Number(currentShift.totalNonCash || 0).toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-slate-200 font-black text-sm text-ink">
                      <span>Total Kas Fisik di Laci:</span>
                      <span className="font-mono text-emerald-700">
                        Rp {(Number(currentShift.initialCash || 0) + Number(currentShift.totalCash || 0)).toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-6 text-center text-slate-500 text-sm">
                  Belum ada shift yang aktif saat ini. Buka shift terlebih dahulu.
                </div>
              )}
            </div>

            <div className="p-3 bg-[#FBFBF7] border-t-2 border-ink text-right">
              <button
                onClick={() => setShowRekapModal(false)}
                className="px-4 py-1.5 bg-white border border-ink rounded-lg text-xs font-bold hover:bg-slate-100"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT STYLES FOR THERMAL RECEIPT */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #thermal-receipt, #thermal-receipt * {
            visibility: visible !important;
          }
          #thermal-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 58mm !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>

    </div>
  );
}
