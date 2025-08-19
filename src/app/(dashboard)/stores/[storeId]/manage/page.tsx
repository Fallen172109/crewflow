"use client";
import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import StoreSelector from "@/components/assistant/StoreSelector";
import ThreadsSidebar from "@/components/assistant/ThreadsSidebar";
import QuickActionsBar from "@/components/assistant/QuickActionsBar";
import ProductPreviewDock, { ProductDraft, ProductPreviewDockRef } from "@/components/assistant/ProductPreviewDock";
import StoreChatPanel from "@/components/assistant/StoreChatPanel";

/** Adjust to your unified chat API */
async function sendStoreManagerMessage(message: string, opts?: any) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      attachments: [],
      threadId: opts?.threadId,
      context: { ...(opts?.context || {}), storeId: opts?.context?.storeId },
    }),
  });
  return res.json();
}

/** Adjust to your threads create endpoint if available */
async function createThread(storeId: string): Promise<string> {
  const res = await fetch("/api/chat/threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      agentName: 'store-manager',
      taskType: 'shopify',
      title: `Store Management - ${new Date().toLocaleDateString()}`,
      context: `Managing Shopify store: ${storeId}`
    }),
  });
  if (res.ok) {
    const json = await res.json();
    return json?.thread?.id || json?.threadId || json?.id || crypto.randomUUID();
  }
  return crypto.randomUUID();
}

export default function ManageStorePage() {
  const params = useParams();
  const storeId = params.storeId as string;
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  const [pendingPrompt, setPendingPrompt] = useState<string>("");
  const productPreviewRef = useRef<ProductPreviewDockRef>(null);

  const sendPrompt = async (prompt: string) => {
    setPendingPrompt(prompt); // Store to pass into chat input
  };

  const handleNewDraft = (draft: ProductDraft) => {
    productPreviewRef.current?.addDraft(draft);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 py-4">
      {/* Top bar: store selector + quick actions */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg md:text-xl font-semibold text-slate-800">Store Management</h1>
          <StoreSelector currentStoreId={storeId} />
        </div>
        <div className="hidden md:block">
          <QuickActionsBar onAction={sendPrompt} />
        </div>
      </div>

      {/* Mobile quick actions */}
      <div className="md:hidden mb-3">
        <QuickActionsBar onAction={sendPrompt} />
      </div>

      <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)_minmax(320px,0.9fr)]">
        {/* Threads Sidebar */}
        <ThreadsSidebar
          storeId={storeId}
          threadId={threadId}
          onSelect={(id) => setThreadId(id)}
          onNewThread={() => createThread(storeId)}
        />

        {/* Chat */}
        <section className="cf-card p-3 flex flex-col h-[calc(100vh-160px)]">
          <header className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm opacity-70 text-slate-600">AI Store Assistant</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 border border-slate-200 text-slate-600">
                Thread: {threadId ? threadId.slice(0,6) : "new"}
              </span>
            </div>
            <button
              className="text-xs px-2 py-1 rounded-md bg-[#ff6a3d] text-white hover:opacity-90"
              onClick={async () => setThreadId(await createThread(storeId))}
            >
              New Thread
            </button>
          </header>

          <div className="flex-1 min-h-0">
            <StoreChatPanel
              storeId={storeId}
              sendStoreManagerMessage={(msg, opts) =>
                sendStoreManagerMessage(msg, { ...opts, threadId, context: { ...(opts?.context || {}), storeId } })
              }
              onNewDraft={handleNewDraft}
              renderToolbar={({ text, setText, busy, submit }) => (
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#ff6a3d] focus:ring-2 focus:ring-orange-100"
                    placeholder={pendingPrompt ? pendingPrompt : 'Ask me to create products, manage orders…'}
                    value={pendingPrompt ? pendingPrompt : text}
                    onChange={(e) => { setPendingPrompt(""); setText(e.target.value); }}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey ? submit() : null}
                    disabled={busy}
                  />
                  <button
                    onClick={() => { if (pendingPrompt) { setText(pendingPrompt); setPendingPrompt(""); } submit(); }}
                    disabled={busy}
                    className="rounded-lg px-4 py-2 bg-[#ff6a3d] text-white hover:opacity-90 disabled:opacity-50 cf-glow"
                  >
                    {busy ? "Sending…" : "Send"}
                  </button>
                </div>
              )}
            />
          </div>
        </section>

        {/* Product Preview Dock */}
        <section className="cf-card p-3 h-[calc(100vh-160px)] overflow-auto cf-scroll">
          <header className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-800">Product Preview</h3>
            <span className="text-xs text-slate-500">Store: {storeId.slice(-8)}</span>
          </header>
          <div className="cf-sep mb-2" />
          <ProductPreviewDock
            ref={productPreviewRef}
            onPublished={() => { /* optional toast/refresh */ }}
          />
        </section>
      </div>
    </div>
  );
}
