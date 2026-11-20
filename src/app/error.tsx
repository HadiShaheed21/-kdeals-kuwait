'use client';

/** Customer-safe error boundary: details stay server-side while shoppers can recover. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="flex min-h-[60vh] items-center justify-center bg-slate-50 p-5 text-slate-900"><section className="max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm"><p className="text-xs font-extrabold uppercase tracking-[.16em] text-orange-600">K DEALS</p><h1 className="mt-2 text-2xl font-extrabold">Something needs another try</h1><p className="mt-2 text-sm leading-6 text-slate-600">We could not load this page safely. Your cart and wishlist are not changed.</p><button type="button" onClick={reset} className="mt-5 min-h-11 rounded-xl bg-purple-700 px-4 text-sm font-bold text-white hover:bg-purple-800">Try again</button></section></main>;
}
