"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Store = { id: string; name?: string; domain?: string };
type Props = {
  currentStoreId: string;
  /** Optional: provide a list; otherwise we'll try GET /api/shopify/stores */
  initialStores?: Store[];
  navigateTo?: (id: string) => string; // default: (id) => `/stores/${id}/manage`
};

export default function StoreSelector({ currentStoreId, initialStores, navigateTo }: Props) {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>(initialStores || []);
  const [loading, setLoading] = useState(!initialStores);

  useEffect(() => {
    if (initialStores?.length) return;
    (async () => {
      try {
        // Adjust to your real endpoint if different
        const res = await fetch("/api/shopify/stores", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          setStores(json?.stores || json || []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [initialStores]);

  const go = (id: string) => {
    const path = navigateTo ? navigateTo(id) : `/stores/${id}/manage`;
    router.push(path);
  };

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-xs text-slate-600">Store</span>
      <select
        className="cf-chip px-3 py-2 text-sm outline-none focus:border-[#ff6a3d] text-slate-700"
        value={currentStoreId}
        disabled={loading}
        onChange={(e) => go(e.target.value)}
      >
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name || s.domain || s.id}
          </option>
        ))}
      </select>
    </div>
  );
}
