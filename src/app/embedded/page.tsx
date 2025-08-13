'use client';
import { useEffect } from 'react';

export default function Embedded() {
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const shop = p.get('shop') || p.get('shopify_domain') || '';
    if (shop) {
      const to = new URL('/api/auth/shopify', window.location.origin);
      to.searchParams.set('shop', shop);
      const host = p.get('host');
      if (host) to.searchParams.set('host', host);
      window.location.replace(to.toString());
    }
  }, []);
  return <div style={{ padding: 16 }}>Anchoring CrewFlow… launching OAuth in Shopify.</div>;
}
