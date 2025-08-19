"use client";
import { useEffect, useState } from "react";

type Thread = { id: string; title?: string; updated_at?: string };

type Props = {
  storeId: string;
  threadId?: string;
  onSelect: (id: string) => void;
  onNewThread: () => Promise<string> | string; // return new threadId
};

export default function ThreadsSidebar({ storeId, threadId, onSelect, onNewThread }: Props) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Use existing threads API with shopify-ai agent
        const res = await fetch(`/api/chat/threads?agent=shopify-ai&taskType=shopify&limit=20`, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          setThreads(json?.threads || json || []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [storeId]);

  const create = async () => {
    setCreating(true);
    try {
      const id = await onNewThread();
      // optimistic add
      setThreads(t => [{ id, title: "New Thread" }, ...t]);
      onSelect(id);
    } finally {
      setCreating(false);
    }
  };

  return (
    <aside className="hidden lg:flex lg:flex-col w-[280px] p-3 cf-card h-[calc(100vh-96px)]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-800">Threads</h3>
        <button
          onClick={create}
          disabled={creating}
          className="text-xs px-2 py-1 rounded-md bg-[#ff6a3d] text-white hover:opacity-90 disabled:opacity-50"
        >
          {creating ? "…" : "New"}
        </button>
      </div>
      <div className="cf-sep mb-2" />
      <div className="flex-1 overflow-auto space-y-1 cf-scroll">
        {loading ? (
          <div className="text-xs text-slate-500">Loading…</div>
        ) : threads.length ? (
          threads.map(t => (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                t.id === threadId 
                  ? "border-[#ff6a3d] bg-orange-50 text-slate-800" 
                  : "border-slate-200 hover:border-slate-300 text-slate-700"
              }`}
            >
              <div className="text-sm truncate">{t.title || `Thread ${t.id.slice(0,6)}`}</div>
              <div className="text-[10px] opacity-60">
                {t.updated_at ? new Date(t.updated_at).toLocaleString() : ""}
              </div>
            </button>
          ))
        ) : (
          <div className="text-xs text-slate-500">No threads yet.</div>
        )}
      </div>
    </aside>
  );
}
