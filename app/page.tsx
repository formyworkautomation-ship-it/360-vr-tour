'use client';

import dynamic from 'next/dynamic';

const MarzipanoViewer = dynamic(() => import('@/components/MarzipanoViewer'), {
  ssr: false,
  loading: () => <div style={{ color: 'white', padding: '20px', backgroundColor: '#141414', height: '100vh' }}>جاري تحميل الجولة الافتراضية...</div>
});

export default function Home() {
  return (
    <main style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
      <MarzipanoViewer />
    </main>
  );
}