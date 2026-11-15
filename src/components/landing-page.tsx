"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { createSchoolAmbience, type AmbienceHandle } from "@/lib/school-ambience";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    id: "eleves",
    title: "Élèves & classes",
    text: "Dossiers, inscriptions et effectifs toujours à jour.",
  },
  {
    id: "appel",
    title: "Appel & absences",
    text: "Pointage en ligne ou fiche scannée, en quelques secondes.",
  },
  {
    id: "notes",
    title: "Notes & bulletins",
    text: "Saisie, moyennes et publication pour les familles.",
  },
  {
    id: "caisse",
    title: "Finances",
    text: "Frais scolaires, encaissements et journal de caisse.",
  },
] as const;

const PASSAGE_LINES = [
  "Le couloir s'éclaire…",
  "Les classes s'ouvrent…",
  "La journée commence.",
];

export function LandingPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ambienceRef = useRef<AmbienceHandle | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [passageIndex, setPassageIndex] = useState(0);
  const [entered, setEntered] = useState(false);
  const [active, setActive] = useState<(typeof FEATURES)[number]["id"]>("appel");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    ambienceRef.current = createSchoolAmbience();
    const boot = window.setTimeout(() => setEntered(true), 80);
    return () => {
      window.clearTimeout(boot);
      ambienceRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(
      () => setPassageIndex((n) => (n + 1) % PASSAGE_LINES.length),
      3200
    );
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 2800);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setActive(FEATURES[tick % FEATURES.length].id);
  }, [tick]);

  async function toggleSound() {
    const ambience = ambienceRef.current;
    if (!ambience) return;
    if (soundOn) {
      ambience.stop();
      ambienceRef.current = createSchoolAmbience();
      setSoundOn(false);
      return;
    }
    await ambience.start();
    setSoundOn(true);
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3">
          <BrandLogo size="md" priority />
          <div>
            <p className="font-display text-lg font-semibold leading-none text-white">
              Edu Gestion
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
              Plateforme scolaire
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => void toggleSound()}
            className="rounded-xl border border-white/25 bg-black/20 px-3 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/15 sm:text-sm"
            aria-pressed={soundOn}
            title={
              soundOn
                ? "Couper la mélodie"
                : "Activer une douce mélodie d'école (clic requis par le navigateur)"
            }
          >
            {soundOn ? "Couper le son" : "Mélodie douce"}
          </button>
          <Link
            href="/login"
            className="rounded-xl bg-white/15 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25"
          >
            Se connecter
          </Link>
        </div>
      </header>

      <section className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden px-5 pb-16 pt-28 text-white sm:px-8 sm:pb-20 lg:px-12">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/edu-gestion-logo.jpg"
          aria-hidden
        >
          <source src="/school-passage.mp4" type="video/mp4" />
        </video>

        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-brand-deep/88 via-brand/70 to-brand/35"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-brand-deep/80 via-transparent to-brand-deep/35"
        />

        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 w-[28%] bg-gradient-to-r from-black/25 to-transparent transition-opacity duration-[1800ms]",
            entered ? "opacity-100" : "opacity-0"
          )}
        />

        <div className="relative z-10 max-w-3xl">
          <p
            className={cn(
              "text-xs font-semibold uppercase tracking-[0.22em] text-white/75 transition duration-700 sm:text-sm",
              entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
            )}
          >
            Passage vers l&apos;école
          </p>
          <h1
            className={cn(
              "mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl transition duration-700 delay-100",
              entered ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            )}
          >
            Edu Gestion
          </h1>
          <p
            className={cn(
              "mt-4 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg transition duration-700 delay-200",
              entered ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            )}
          >
            Une seule plateforme pour piloter élèves, cours, absences, notes et
            familles — claire, vivante, prête pour le quotidien de l&apos;école.
          </p>

          <p
            key={passageIndex}
            className="landing-passage mt-5 min-h-[1.5rem] font-display text-lg text-accent-soft sm:text-xl"
            aria-live="polite"
          >
            {PASSAGE_LINES[passageIndex]}
          </p>

          <div
            className={cn(
              "mt-8 flex flex-wrap gap-3 transition duration-700 delay-300",
              entered ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            )}
          >
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-brand shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-soft"
            >
              Entrer dans l&apos;espace
            </Link>
            <a
              href="#parcours"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/35 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Voir le parcours
            </a>
          </div>
        </div>
      </section>

      <section
        id="parcours"
        className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-20"
      >
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-semibold text-foreground">
            Touchez une mission
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">
            Explorez les piliers d&apos;Edu Gestion avant de vous connecter.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, index) => {
            const selected = active === feature.id;
            return (
              <button
                key={feature.id}
                type="button"
                onMouseEnter={() => setActive(feature.id)}
                onFocus={() => setActive(feature.id)}
                onClick={() => setActive(feature.id)}
                className={cn(
                  "rounded-2xl border px-4 py-5 text-left transition duration-300",
                  selected
                    ? "-translate-y-1 border-brand bg-brand text-white shadow-lg shadow-brand/20"
                    : "border-line bg-surface text-foreground hover:border-line-strong hover:bg-brand-soft/60"
                )}
                style={{ transitionDelay: `${index * 40}ms` }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-70">
                  0{index + 1}
                </p>
                <p className="mt-2 font-display text-xl font-semibold">
                  {feature.title}
                </p>
                <p
                  className={cn(
                    "mt-2 text-sm leading-relaxed",
                    selected ? "text-sidebar-text/90" : "text-muted"
                  )}
                >
                  {feature.text}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-[1.75rem] border border-line bg-surface px-6 py-6 sm:flex-row sm:items-center sm:px-8">
          <div>
            <p className="font-display text-xl font-semibold text-foreground">
              Prêt à ouvrir votre établissement ?
            </p>
            <p className="mt-1 text-sm text-muted">
              Connexion sécurisée pour l&apos;équipe et les familles.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-deep"
          >
            Se connecter
          </Link>
        </div>
      </section>
    </div>
  );
}
