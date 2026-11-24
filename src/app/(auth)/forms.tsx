"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { FieldError } from "@/components/ui";
import { requestPasswordReset, resetPassword, signIn, signUp, type FormState } from "./actions";

function PasswordInput({ name = "password", autoComplete, describedBy }: { name?: string; autoComplete: string; describedBy?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={name} name={name} type={show ? "text" : "password"} required autoComplete={autoComplete} className="input pr-12" aria-describedby={describedBy} />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-0 px-4 text-muted hover:text-fg" aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signUp, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <div>
        <label htmlFor="name" className="label">Name</label>
        <input id="name" name="name" autoComplete="given-name" required className="input" />
        <FieldError>{fe.name}</FieldError>
      </div>
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        <FieldError>{fe.email}</FieldError>
      </div>
      <div>
        <label htmlFor="password" className="label">Password</label>
        <PasswordInput autoComplete="new-password" describedBy="pw-hint" />
        <p id="pw-hint" className="mt-1.5 text-xs text-muted">At least 10 characters with a letter and a number.</p>
        <FieldError>{fe.password}</FieldError>
      </div>
      <label className="flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" name="terms" className="mt-0.5 size-4 accent-[var(--accent)]" />
        <span>I agree to the Terms and Privacy Policy, and understand PandaFit offers general fitness guidance, not medical advice.</span>
      </label>
      <FieldError>{fe.terms}</FieldError>
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Creating account…" : "Create account"}</button>
    </form>
  );
}

export function SignInForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="label">Password</label>
          <Link href="/forgot-password" className="mb-1.5 text-xs text-accent-ink hover:underline">Forgot password?</Link>
        </div>
        <PasswordInput autoComplete="current-password" />
      </div>
      <FieldError>{state?.error}</FieldError>
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestPasswordReset, undefined);
  if (state?.message)
    return (
      <div className="space-y-3 text-sm">
        <p>{state.message}</p>
        {state.devLink && (
          <p className="rounded-xl bg-surface-2 p-3 text-xs text-muted">
            Dev mode — no email provider configured yet. <Link className="text-accent-ink underline" href={state.devLink.replace(/^https?:\/\/[^/]+/, "")}>Open reset link</Link>
          </p>
        )}
      </div>
    );
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Sending…" : "Send reset link"}</button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPassword, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="password" className="label">New password</label>
        <PasswordInput autoComplete="new-password" />
        <FieldError>{state?.fieldErrors?.password}</FieldError>
      </div>
      <FieldError>{state?.error}</FieldError>
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Saving…" : "Reset password"}</button>
    </form>
  );
}
