'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[KashNubix global error]', error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#F2F2F7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '24px', padding: '32px', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '40px' }}>⚠️</span>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#1c1c1e' }}>Algo salió mal</h2>
          <p style={{ fontSize: '14px', color: '#8e8e93', margin: 0 }}>Ocurrió un error inesperado en la aplicación.</p>
        </div>
        <button
          onClick={reset}
          style={{ padding: '12px 24px', background: '#007AFF', color: '#fff', fontWeight: 600, fontSize: '16px', border: 'none', borderRadius: '16px', cursor: 'pointer' }}
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
