import Image from "next/image";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
import "./login.css";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/");
  return <main className="school-login-page">
    <section className="school-login-story" aria-labelledby="school-story-title">
      <a href="/login" className="school-login-brand" aria-label="Henri Moissan, accueil du portail">
        <span className="school-login-mark"><Image src="/henri-moissan.png" alt="" width={94} height={58} priority /></span>
        <span>Henri Moissan<small>GROUPE SCOLAIRE · RABAT</small></span>
      </a>
      <div className="school-login-editorial">
        <p className="school-login-kicker"><span /> L’école, ensemble.</p>
        <h1 id="school-story-title">Chaque journée<br />ouvre un <em>avenir.</em></h1>
        <p className="school-login-story-copy">Enseignants, familles, équipes pédagogiques.<br />Un même lien, tout au long de l’année.</p>
      </div>
      <div className="school-login-art"><Image src="/school-courtyard.svg" alt="Illustration d’une cour d’école bordée d’arcades" width={900} height={540} priority /></div>
      <div className="school-login-story-foot"><span>Apprendre. Grandir. S’accomplir.</span><span>Hassan, Rabat <span aria-hidden="true">↗</span></span></div>
    </section>
    <section className="school-login-access" aria-labelledby="login-title">
      <header className="school-login-access-top"><span>Portail scolaire</span><a href="mailto:groupe.scolaire@henrimoissan.net">Besoin d’aide ? <span aria-hidden="true">↗</span></a></header>
      <div className="school-login-login">
        <p className="school-login-eyebrow">BIENVENUE CHEZ VOUS</p>
        <h2 id="login-title">Votre école.<br />Votre espace.</h2>
        <p className="school-login-intro">Connectez-vous pour retrouver votre quotidien scolaire.</p>
        <LoginForm />
        <p className="school-login-help">Première connexion ou identifiants oubliés ?<br /><a href="mailto:groupe.scolaire@henrimoissan.net">Le secrétariat vous accompagne <span aria-hidden="true">→</span></a></p>
        <details className="school-login-demo"><summary>Essayer un compte de démonstration</summary><dl>
          <div><dt>Professeur</dt><dd>prof@ecole-demo.fr · demo123</dd></div>
          <div><dt>Direction</dt><dd>directeur@ecole-demo.fr · demo123</dd></div>
          <div><dt>Parent</dt><dd>parent@ecole-demo.fr · demo123</dd></div>
          <div><dt>Super administrateur</dt><dd>admin@school.app · admin123</dd></div>
        </dl></details>
      </div>
      <footer className="school-login-footer"><span>Groupe scolaire Henri Moissan</span><a href="tel:+212666363631">06 66 36 36 31</a></footer>
    </section>
  </main>;
}
