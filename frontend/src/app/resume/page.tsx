"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ResumePage() {
  const router = useRouter();
  useEffect(() => {
    router.push('/resume/builder');
  }, [router]);

  return null;
}
