"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  CircleStackIcon,
} from "@heroicons/react/24/outline";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface TestItem {
  userId: string;
  firstName: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

type Status = "idle" | "loading" | "success" | "error";

// ─── small toast helper ───────────────────────────────────────────────────────
function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg
        ${ok ? "bg-emerald-600 text-white" : "bg-red-500 text-white"}`}
    >
      {ok ? <CheckIcon className="w-4 h-4" /> : <XMarkIcon className="w-4 h-4" />}
      {msg}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TestDbPage() {
  const [items, setItems]         = useState<TestItem[]>([]);
  const [listStatus, setListStatus] = useState<Status>("idle");

  // create form
  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");
  const [createStatus, setCreateStatus] = useState<Status>("idle");

  // inline edit
  const [editId,    setEditId]    = useState<string | null>(null);
  const [editName,  setEditName]  = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editStatus, setEditStatus] = useState<Status>("idle");

  // toast
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  // ── FETCH ALL ──────────────────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setListStatus("loading");
    try {
      const res = await fetch(`${API}/api/test`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setItems(data.items ?? []);
      setListStatus("success");
    } catch (e) {
      setListStatus("error");
      showToast((e as Error).message, false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ── CREATE ─────────────────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setCreateStatus("loading");
    try {
      const res = await fetch(`${API}/api/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      setName(""); setEmail("");
      setCreateStatus("success");
      showToast("Item created in DynamoDB ✓", true);
      await fetchItems();
    } catch (e) {
      setCreateStatus("error");
      showToast((e as Error).message, false);
    } finally {
      setTimeout(() => setCreateStatus("idle"), 2000);
    }
  }

  // ── UPDATE ─────────────────────────────────────────────────────────────────
  async function handleUpdate(id: string) {
    setEditStatus("loading");
    try {
      const res = await fetch(`${API}/api/test/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), email: editEmail.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      setEditId(null);
      setEditStatus("idle");
      showToast("Updated ✓", true);
      await fetchItems();
    } catch (e) {
      setEditStatus("error");
      showToast((e as Error).message, false);
    }
  }

  // ── DELETE ─────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    try {
      const res = await fetch(`${API}/api/test/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      showToast("Deleted ✓", true);
      await fetchItems();
    } catch (e) {
      showToast((e as Error).message, false);
    }
  }

  // ── START EDIT ─────────────────────────────────────────────────────────────
  function startEdit(item: TestItem) {
    setEditId(item.userId);
    setEditName(item.firstName ?? "");
    setEditEmail(item.email ?? "");
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-sm">
            <CircleStackIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">DynamoDB CRUD Test</h1>
            <p className="text-sm text-gray-400">
              Table: <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">clerk-auth-users</code>
            </p>
          </div>
          <button
            onClick={fetchItems}
            className="ml-auto btn-ghost !w-auto px-3 py-2 text-xs"
            title="Refresh"
          >
            <ArrowPathIcon className={`w-4 h-4 ${listStatus === "loading" ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* ── Create form ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <PlusIcon className="w-4 h-4 text-brand-600" /> Create item
          </h2>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
            <input
              className="form-input"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              className="form-input"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={createStatus === "loading"}
              className="btn-primary !w-auto px-6 shrink-0"
            >
              {createStatus === "loading" ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <PlusIcon className="w-4 h-4" />
              )}
              Create
            </button>
          </form>
        </div>

        {/* ── Items list ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              Items in DynamoDB
              {listStatus === "success" && (
                <span className="ml-2 badge bg-brand-50 text-brand-600 border border-brand-100">
                  {items.length}
                </span>
              )}
            </h2>
          </div>

          {/* Loading */}
          {listStatus === "loading" && (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2 text-sm">
              <span className="w-4 h-4 border-2 border-gray-200 border-t-brand-500 rounded-full animate-spin" />
              Fetching from DynamoDB…
            </div>
          )}

          {/* Error */}
          {listStatus === "error" && (
            <div className="py-12 text-center text-sm text-red-500">
              Failed to connect to DynamoDB. Check the backend is running and AWS credentials are set.
            </div>
          )}

          {/* Empty */}
          {listStatus === "success" && items.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">
              No test items yet — create one above.
            </div>
          )}

          {/* Items */}
          {items.length > 0 && (
            <ul className="divide-y divide-gray-50">
              {items.map((item) => (
                <li key={item.userId} className="px-6 py-4">
                  {editId === item.userId ? (
                    /* ── Inline edit row ── */
                    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                      <input
                        className="form-input text-xs py-2"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Name"
                      />
                      <input
                        className="form-input text-xs py-2"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="Email"
                      />
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleUpdate(item.userId)}
                          disabled={editStatus === "loading"}
                          className="btn-primary !w-auto px-3 py-2 text-xs"
                        >
                          {editStatus === "loading"
                            ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            : <CheckIcon className="w-3.5 h-3.5" />}
                          Save
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="btn-ghost !w-auto px-3 py-2 text-xs"
                        >
                          <XMarkIcon className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── Read row ── */
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center
                                      text-brand-600 font-bold text-sm shrink-0">
                        {(item.firstName ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.firstName}</p>
                        <p className="text-xs text-gray-400 truncate">{item.email}</p>
                        <p className="text-xs text-gray-300 font-mono truncate">{item.userId}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => startEdit(item)}
                          className="p-2 rounded-lg hover:bg-brand-50 text-gray-400 hover:text-brand-600 transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.userId)}
                          className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Status legend ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Connection status
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <StatusBadge label="Backend"  ok={listStatus === "success"} />
            <StatusBadge label="DynamoDB" ok={listStatus === "success"} />
            <StatusBadge label="CREATE"   ok={createStatus === "success"} />
            <StatusBadge label="REGION"   ok={true} value="eu-north-1" />
          </div>
        </div>

      </div>
    </div>
  );
}

function StatusBadge({ label, ok, value }: { label: string; ok: boolean; value?: string }) {
  return (
    <div className={`rounded-xl px-3 py-2 border ${ok ? "bg-emerald-50 border-emerald-100" : "bg-gray-50 border-gray-100"}`}>
      <p className="text-gray-400 mb-0.5">{label}</p>
      <p className={`font-semibold ${ok ? "text-emerald-600" : "text-gray-400"}`}>
        {value ?? (ok ? "Connected" : "Pending")}
      </p>
    </div>
  );
}
