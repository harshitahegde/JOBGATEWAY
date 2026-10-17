"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken, clearAuthToken, api } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const verifyAndRedirect = async () => {
      const token = getAuthToken();
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        // Authenticate token against backend /me
        await api.get('/auth/me');
        router.push('/dashboard');
      } catch (err: any) {
        // Stale, expired, or invalid token (e.g. database reset after Render redeployment)
        clearAuthToken();
        router.push('/login');
      } finally {
        setChecking(false);
      }
    };

    verifyAndRedirect();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
      <p className="text-xs text-slate-500 font-medium">Checking session...</p>
    </div>
  );
}
