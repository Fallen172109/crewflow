'use client';
import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('shop') && (q.get('hmac') || q.get('host'))) {
      const to = new URL('/api/auth/shopify', location.origin);
      to.search = q.toString();
      location.replace(to.toString());
    }
  }, []);
  return <div style={{ padding: 16 }}>CrewFlow is ready to sail.</div>;
}


