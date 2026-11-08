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
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}
      <Field label="Email">
        <Input
          name="email"
          type="email"
          required
          placeholder="vous@ecole.fr"
          defaultValue="directeur@ecole-demo.fr"
        />
      </Field>
      <Field label="Mot de passe">
        <Input
          name="password"
          type="password"
          required
          defaultValue="demo123"
        />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Connexion..." : "Se connecter"}
      </Button>
    </form>
  );
}
