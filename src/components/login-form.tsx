"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { Button, Field, Input } from "@/components/ui";

type State = { error?: string } | null;

async function action(_prev: State, formData: FormData): Promise<State> {
  return loginAction(formData);
}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? (
        <div
          role="alert"
          className="rounded-xl border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </div>
      ) : null}
      <Field label="Email">
        <Input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="vous@ecole.fr"
          defaultValue="directeur@ecole-demo.fr"
        />
      </Field>
      <Field label="Mot de passe">
        <Input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          defaultValue="demo123"
        />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Connexion..." : "Se connecter"}
      </Button>
    </form>
  );
}
