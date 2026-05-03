'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[KashNubix error]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-bg-light dark:bg-bg-dark px-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-4xl">⚠️</span>
        <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Algo salió mal</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Ocurrió un error inesperado. Puedes intentar recargar la página.
        </p>
      </div>
      <button
        onClick={reset}
        className="px-6 py-3 bg-accent text-white font-semibold rounded-2xl active:scale-[0.97] transition-transform"
      >
        Reintentar
      </button>
    </div>
  );
}
