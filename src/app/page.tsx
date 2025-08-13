'use client';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Handle Shopify OAuth requests first
    const q = new URLSearchParams(location.search);
    if (q.get('shop') && (q.get('hmac') || q.get('host'))) {
      const to = new URL('/api/auth/shopify', location.origin);
      to.search = q.toString();
      location.replace(to.toString());
      return;
    }

    // Handle normal user routing
    if (!loading) {
      if (user && user.email_confirmed_at) {
        // Authenticated user - redirect to dashboard
        router.push('/dashboard');
      } else {
        // Unauthenticated user - redirect to login
        router.push('/auth/login');
      }
    }
  }, [user, loading, router]);

  // Show loading state while determining where to redirect
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '2px solid #FF6A3D',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#666', margin: 0 }}>CrewFlow is ready to sail...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Fallback for edge cases
  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      CrewFlow is ready to sail.
    </div>
  );
}


