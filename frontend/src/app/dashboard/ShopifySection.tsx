"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import Image from "next/image";
import {
  ShoppingBagIcon,
  ArrowPathIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  TagIcon,
  MagnifyingGlassIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShopifyVariant {
  id: number;
  title: string;
  price: string;
  inventory_quantity: number;
}

interface ShopifyImage {
  src: string;
  alt: string | null;
}

interface ShopifyProduct {
  id: number;
  title: string;
  status: "active" | "draft" | "archived";
  vendor: string;
  product_type: string;
  variants: ShopifyVariant[];
  images: ShopifyImage[];
  created_at: string;
}

interface ShopifyStatus {
  connected: boolean;
  shop?: string;
  scope?: string;
  installedAt?: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusPill({ status }: { status: ShopifyProduct["status"] }) {
  const map = {
    active:   "bg-emerald-50 text-emerald-700 border-emerald-100",
    draft:    "bg-amber-50  text-amber-700   border-amber-100",
    archived: "bg-gray-100  text-gray-500    border-gray-200",
  } as const;
  return (
    <span className={`badge border text-[10px] px-2 py-0.5 ${map[status]} capitalize`}>
      {status}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-44 bg-gray-100" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-gray-100 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-3 bg-gray-100 rounded w-1/4 mt-4" />
      </div>
    </div>
  );
}

function ProductCard({ p }: { p: ShopifyProduct }) {
  const price = p.variants[0]?.price ?? "—";
  const stock = p.variants.reduce((s, v) => s + (v.inventory_quantity ?? 0), 0);
  const img   = p.images[0];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card
                    hover:shadow-card-hover transition-all duration-200 flex flex-col group">
      <div className="relative h-44 bg-gray-50 rounded-t-2xl overflow-hidden flex items-center justify-center">
        {img?.src ? (
          <Image
            src={img.src}
            alt={img.alt ?? p.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            unoptimized
          />
        ) : (
          <ShoppingBagIcon className="w-10 h-10 text-gray-200" />
        )}
        <div className="absolute top-2.5 left-2.5">
          <StatusPill status={p.status} />
        </div>
      </div>
      <div className="p-4 flex flex-col gap-1 flex-1">
        <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{p.title}</p>
        {p.vendor && <p className="text-xs text-gray-400 truncate">{p.vendor}</p>}
        {p.product_type && (
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <TagIcon className="w-3 h-3 shrink-0" />
            <span className="truncate">{p.product_type}</span>
          </p>
        )}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
          <span className="text-sm font-bold text-gray-900">${price}</span>
          <span className={`text-xs font-medium ${stock > 0 ? "text-emerald-600" : "text-red-400"}`}>
            {stock > 0 ? `${stock} in stock` : "Out of stock"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Connect prompt ───────────────────────────────────────────────────────────

function ConnectPrompt({ onConnect }: { onConnect: (shop: string) => Promise<void> }) {
  const [shop, setShop] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function normalise(val: string) {
    return val.trim().toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");
  }

  function isValid(val: string) {
    return /^[a-zA-Z0-9-]+\.myshopify\.com$/.test(val);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = normalise(shop);
    if (!isValid(cleaned)) {
      setError("Enter a valid store domain — e.g. my-store.myshopify.com");
      return;
    }
    setBusy(true);
    setError("");
    await onConnect(cleaned);
    setBusy(false);
  }

  return (
    <div className="flex flex-col items-center py-10 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#96bf48]/10 flex items-center justify-center mb-5 shadow-sm">
        <ShoppingBagIcon className="w-8 h-8 text-[#5a8a00]" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Connect your Shopify store</h3>
      <p className="text-sm text-gray-400 max-w-sm mb-6">
        Enter your store URL and click Connect. You&apos;ll be taken to Shopify to approve access in one click.
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3">
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs
                           select-none pointer-events-none font-medium">
            https://
          </span>
          <input
            className={`form-input pl-14 ${error ? "border-red-400 focus:ring-red-100" : ""}`}
            placeholder="my-store.myshopify.com"
            value={shop}
            onChange={(e) => { setShop(e.target.value); setError(""); }}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {error && (
          <p className="form-error justify-center">
            <ExclamationCircleIcon className="w-3.5 h-3.5 shrink-0" />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !shop.trim()}
          className="btn-primary gap-2 py-3"
        >
          {busy ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Redirecting to Shopify…
            </>
          ) : (
            <>
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              Connect store
            </>
          )}
        </button>
      </form>

      <p className="text-xs text-gray-300 mt-4">
        Read-only access to products, inventory and orders.
      </p>
    </div>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────

export default function ShopifySection() {
  const { getToken } = useAuth();

  const [status,          setStatus]          = useState<ShopifyStatus | null>(null);
  const [products,        setProducts]        = useState<ShopifyProduct[]>([]);
  const [loadingStatus,   setLoadingStatus]   = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [nextCursor,      setNextCursor]      = useState<string | null>(null);
  const [prevCursor,      setPrevCursor]      = useState<string | null>(null);
  const [search,          setSearch]          = useState("");
  const [toast,           setToast]           = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Check OAuth connection status ───────────────────────────────────────────
  const checkStatus = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/shopify/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: ShopifyStatus = await res.json();
      setStatus(data);
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoadingStatus(false);
    }
  }, [getToken]);

  useEffect(() => {
    // Detect return from Shopify OAuth — ?shopify=connected in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get("shopify") === "connected") {
      showToast("Shopify store connected successfully!", true);
      window.history.replaceState({}, "", window.location.pathname);
    }
    checkStatus();
  }, [checkStatus]);

  // ── Fetch products via OAuth token stored in DynamoDB ──────────────────────
  const fetchProducts = useCallback(async (cursor?: string) => {
    setLoadingProducts(true);
    try {
      const token = await getToken();
      let url = `${API}/api/shopify/products?limit=12`;
      if (cursor) url += `&page_info=${encodeURIComponent(cursor)}`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error ?? "Failed to load products", false);
        return;
      }
      setProducts(data.products ?? []);
      setNextCursor(data.pagination?.nextCursor ?? null);
      setPrevCursor(data.pagination?.prevCursor ?? null);
    } catch {
      showToast("Network error — check the backend.", false);
    } finally {
      setLoadingProducts(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (status?.connected) fetchProducts();
  }, [status?.connected, fetchProducts]);

  // ── Start OAuth flow ────────────────────────────────────────────────────────
  async function handleConnect(shop: string) {
    try {
      const token = await getToken();
      const res = await fetch(
        `${API}/api/shopify/auth?shop=${encodeURIComponent(shop)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok || !data.authUrl) {
        showToast(data.error ?? "Could not start Shopify OAuth", false);
        return;
      }
      // Redirect to Shopify → merchant approves → Lambda callback →
      // saves token to DynamoDB → redirects back to /dashboard?shopify=connected
      window.location.href = data.authUrl;
    } catch {
      showToast("Could not reach the backend.", false);
    }
  }

  // ── Disconnect ──────────────────────────────────────────────────────────────
  async function handleDisconnect() {
    if (!confirm(`Disconnect ${status?.shop}?`)) return;
    const token = await getToken();
    const res = await fetch(`${API}/api/shopify/disconnect`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setStatus({ connected: false });
      setProducts([]);
      setNextCursor(null);
      setPrevCursor(null);
      showToast("Store disconnected", true);
    }
  }

  const filtered = search.trim()
    ? products.filter((p) =>
        [p.title, p.vendor, p.product_type].join(" ")
          .toLowerCase().includes(search.toLowerCase())
      )
    : products;

  return (
    <div className="mt-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl
                         px-4 py-3 text-sm font-medium shadow-lg animate-fade-in
                         ${toast.ok ? "bg-emerald-600 text-white" : "bg-red-500 text-white"}`}>
          {toast.ok
            ? <CheckCircleIcon className="w-4 h-4 shrink-0" />
            : <ExclamationCircleIcon className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#96bf48]/10 flex items-center justify-center">
              <ShoppingBagIcon className="w-5 h-5 text-[#5a8a00]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Shopify Products</p>
              {status?.connected && status.shop && (
                <p className="text-xs text-gray-400">{status.shop}</p>
              )}
            </div>
          </div>

          {status?.connected && (
            <div className="flex items-center gap-2">
              <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs">
                Connected
              </span>
              <button
                onClick={() => fetchProducts()}
                disabled={loadingProducts}
                className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 transition-colors"
                title="Refresh"
              >
                <ArrowPathIcon className={`w-4 h-4 ${loadingProducts ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={handleDisconnect}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                title="Disconnect"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-6">

          {loadingStatus && (
            <div className="flex items-center justify-center py-14 gap-2 text-sm text-gray-400">
              <span className="w-4 h-4 border-2 border-gray-200 border-t-brand-500 rounded-full animate-spin" />
              Checking connection…
            </div>
          )}

          {/* Not connected — show connect form */}
          {!loadingStatus && !status?.connected && (
            <ConnectPrompt onConnect={handleConnect} />
          )}

          {/* Connected — show products */}
          {!loadingStatus && status?.connected && (
            <>
              <div className="relative mb-5">
                <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  className="form-input pl-10 text-sm"
                  placeholder="Search by title, vendor, or type…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {loadingProducts && products.length === 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              )}

              {!loadingProducts && filtered.length === 0 && (
                <div className="py-14 text-center text-sm text-gray-400">
                  {search ? `No products matching "${search}"` : "No products found."}
                </div>
              )}

              {filtered.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filtered.map((p) => <ProductCard key={p.id} p={p} />)}
                </div>
              )}

              {!search && (prevCursor || nextCursor) && (
                <div className="flex items-center justify-center gap-3 mt-6 pt-4 border-t border-gray-50">
                  <button
                    onClick={() => fetchProducts(prevCursor!)}
                    disabled={!prevCursor || loadingProducts}
                    className="btn-ghost !w-auto px-4 py-2 text-sm disabled:opacity-40"
                  >
                    <ChevronLeftIcon className="w-4 h-4" /> Previous
                  </button>
                  <button
                    onClick={() => fetchProducts(nextCursor!)}
                    disabled={!nextCursor || loadingProducts}
                    className="btn-ghost !w-auto px-4 py-2 text-sm disabled:opacity-40"
                  >
                    Next <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
