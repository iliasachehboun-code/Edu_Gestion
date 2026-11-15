"use client";

import { useActionState, useState } from "react";
import { loginAction } from "@/app/actions/auth";


type State = { error?: string } | null;
async function action(_prev: State, formData: FormData): Promise<State> {
  return loginAction(formData);
}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(action, null);
  const [visible, setVisible] = useState(false);
  return <form action={formAction} className={"school-login-form"} aria-busy={pending}>
    {state?.error && <p role="alert" id="login-error" className={"school-login-error"}>{state.error}</p>}
    <div className={"school-login-field"}>
      <label htmlFor="login-email">Adresse e-mail</label>
      <input id="login-email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required placeholder="prenom.nom@exemple.fr" aria-describedby={state?.error ? "login-error" : undefined} disabled={pending} />
    </div>
    <div className={"school-login-field"}>
      <label htmlFor="login-password">Mot de passe</label>
      <div className={"school-login-password"}>
        <input id="login-password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" required disabled={pending} />
        <button type="button" onClick={() => setVisible(!visible)} aria-controls="login-password" aria-pressed={visible} disabled={pending}>{visible ? "Masquer" : "Afficher"}</button>
      </div>
    </div>
    <button className={"school-login-submit"} type="submit" disabled={pending}>{pending ? "Connexion en cours…" : "Se connecter"}<span aria-hidden="true">→</span></button>
  </form>;
}
