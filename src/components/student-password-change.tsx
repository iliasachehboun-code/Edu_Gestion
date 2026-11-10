"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { changePasswordAction } from "@/app/actions/auth";
import Link from "next/link";

export function StudentPasswordChangeForm({
  schoolId,
  backHref,
}: {
  schoolId: string;
  backHref?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 6) {
      setError("Le nouveau mot de passe doit comporter au moins 6 caractères.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Le nouveau mot de passe et sa confirmation ne correspondent pas.");
      return;
    }

    const formData = new FormData();
    formData.append("currentPassword", currentPassword);
    formData.append("newPassword", newPassword);
    formData.append("confirmPassword", confirmPassword);

    startTransition(async () => {
      const res = await changePasswordAction(schoolId, formData);
      if (res?.error) {
        setError(res.error);
      } else if (res?.success) {
        setSuccess("Votre mot de passe a été modifié avec succès !");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 animate-in fade-in">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-[#8fe3cf] bg-[#d7f6ee] p-4 text-xs font-bold text-[#002b5b] shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <span>🎉</span>
            <span>{success}</span>
          </div>
          {backHref && (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg bg-[#002b5b] px-3 py-1.5 text-xs text-white hover:bg-[#001e42] transition shadow-xs"
            >
              <span>Retourner au profil</span>
              <span>&rarr;</span>
            </Link>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#3d5278]">
            Mot de passe actuel *
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            placeholder="Saisissez votre mot de passe actuel"
            className="mt-1.5 w-full rounded-xl border border-[#b7c9e6] bg-white px-3.5 py-2.5 text-sm text-[#0c2340] outline-none transition focus:border-[#002b5b] focus:ring-2 focus:ring-[#8fe3cf]"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#3d5278]">
              Nouveau mot de passe *
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Minimum 6 caractères"
              className="mt-1.5 w-full rounded-xl border border-[#b7c9e6] bg-white px-3.5 py-2.5 text-sm text-[#0c2340] outline-none transition focus:border-[#002b5b] focus:ring-2 focus:ring-[#8fe3cf]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#3d5278]">
              Confirmer le mot de passe *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Répétez le nouveau mot de passe"
              className="mt-1.5 w-full rounded-xl border border-[#b7c9e6] bg-white px-3.5 py-2.5 text-sm text-[#0c2340] outline-none transition focus:border-[#002b5b] focus:ring-2 focus:ring-[#8fe3cf]"
            />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-3">
          {backHref && (
            <Link
              href={backHref}
              className="rounded-xl border border-[#c9d7ee] bg-white px-4 py-2.5 text-xs font-bold text-[#3d5278] hover:bg-[#f4f8fc] transition"
            >
              Annuler
            </Link>
          )}
          <Button
            type="submit"
            disabled={isPending || !currentPassword || !newPassword || !confirmPassword}
            className="bg-[#002b5b] hover:bg-[#001e42] text-white px-6 py-2.5 text-xs font-bold shadow-sm"
          >
            {isPending ? "Mise à jour en cours..." : "🔒 Valider le nouveau mot de passe"}
          </Button>
        </div>
      </form>
    </div>
  );
}
