import { ForgotPasswordForm } from '@/ui/admin/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-600">K DEALS</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">Reset admin password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Enter your administrator email address. If the account is eligible, we will send a new recovery link.</p>
        <ForgotPasswordForm />
      </section>
    </main>
  );
}
