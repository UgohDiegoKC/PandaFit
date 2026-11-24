"use client";

import { useActionState, useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { FieldError } from "@/components/ui";
import { ThemeSwitch, type ThemePref } from "@/components/theme";
import { deleteAccount, removeAvatar, saveAvatar, saveTheme, type AvatarState, type DeleteState } from "./actions";

export function ThemeSetting({ initial }: { initial: ThemePref }) {
  return <ThemeSwitch initial={initial} onPersist={saveTheme} />;
}

/** Resizes to 256px on-device before upload — smaller payload and strips most metadata (EXIF/location). */
async function resize(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const s = Math.min(bmp.width, bmp.height);
  ctx.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function AvatarEditor({ name, avatar }: { name: string; avatar: string | null }) {
  const [state, action, pending] = useActionState<AvatarState, FormData>(saveAvatar, undefined);
  const [localError, setLocalError] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);
  const hidden = useRef<HTMLInputElement>(null);

  const onFile = async (f?: File) => {
    setLocalError(undefined);
    if (!f) return;
    if (!f.type.startsWith("image/")) return setLocalError("Please choose an image file.");
    if (f.size > 15_000_000) return setLocalError("That file is too large (max 15 MB).");
    try {
      hidden.current!.value = await resize(f);
      formRef.current!.requestSubmit();
    } catch {
      setLocalError("We couldn't read that image. Try a different one.");
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        {avatar ? <img src={avatar} alt="Your profile photo" className="size-20 rounded-full object-cover ring-2 ring-accent" />
          : <span className="grid size-20 place-items-center rounded-full bg-surface-2 text-2xl font-bold">{name[0]?.toUpperCase()}</span>}
        <label className="absolute -bottom-1 -right-1 grid size-8 cursor-pointer place-items-center rounded-full bg-accent text-on-accent" aria-label="Change profile photo">
          <Camera size={16} aria-hidden />
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      </div>
      <form ref={formRef} action={action}><input ref={hidden} type="hidden" name="avatar" /></form>
      <div className="text-sm">
        <div className="text-muted">{pending ? "Uploading…" : "JPG, PNG or WebP"}</div>
        {avatar && <form action={removeAvatar}><button className="mt-1 inline-flex items-center gap-1 text-danger"><Trash2 size={14} /> Remove photo</button></form>}
        <FieldError>{localError ?? state?.error}</FieldError>
      </div>
    </div>
  );
}

export function DeleteAccount() {
  const [state, action, pending] = useActionState<DeleteState, FormData>(deleteAccount, undefined);
  return (
    <details className="card border-danger/30 p-5">
      <summary className="cursor-pointer font-semibold text-danger">Delete account</summary>
      <p className="mt-3 text-sm text-muted">This permanently deletes your account, profile, plans, workout history and records. It can&apos;t be undone — export your data first if you want a copy.</p>
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label><span className="label">Password</span><input type="password" name="password" autoComplete="current-password" required className="input" /></label>
        <label><span className="label">Type DELETE</span><input name="confirm" required className="input" autoComplete="off" /></label>
        <div className="sm:col-span-2"><FieldError>{state?.error}</FieldError></div>
        <button className="btn bg-danger text-white sm:col-span-2" disabled={pending}>{pending ? "Deleting…" : "Permanently delete my account"}</button>
      </form>
    </details>
  );
}
