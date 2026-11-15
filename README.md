# EduGestion — SaaS de gestion scolaire

Plateforme multi-écoles pour écoles privées et centres de formation.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind
- Prisma + SQLite (local) — interchangeable avec PostgreSQL
- Auth par sessions (cookies httpOnly)

## Démarrage

```bash
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Comptes démo

| Rôle        | Email                     | Mot de passe |
|-------------|---------------------------|--------------|
| SuperAdmin  | admin@school.app          | admin123     |
| Directeur   | directeur@ecole-demo.fr   | demo123      |
| Enseignant  | prof@ecole-demo.fr        | demo123      |
| Parent      | parent@ecole-demo.fr      | demo123      |
| Étudiant    | eleve@ecole-demo.fr       | demo123      |

## Modules

1. **Fondations** — multi-tenant, auth, SuperAdmin écoles
2. **Élèves & enseignants** — classes, matières, années, affectations
3. **Notes & bulletins** — notes /20, trimestres, bulletins imprimables
4. **Emplois du temps** — créneaux, grille, détection de conflits
5. **Absences & retards** — pointage + notifications parents
6. **Paiements** — frais scolaires, paiements manuels
7. **Espace parents** — notes, EDT, absences, soldes, notifications

## Passer à PostgreSQL

Dans `prisma/schema.prisma` :

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Puis `DATABASE_URL="postgresql://..."` et `npx prisma migrate dev`.

## Espace professeur

Connexion : `prof@ecole-demo.fr` / `demo123` (données de démonstration).

- `/s/[schoolId]/teacher` : tableau de bord, étudiants uniques et suivi des séances.
- `/s/[schoolId]/teacher/calendar` : vues mois, semaine, jour et agenda ; appel par créneau.
- `/s/[schoolId]/teacher/courses` : cours affectés, contenus pédagogiques et progression.
- `/s/[schoolId]/teacher/students` : étudiants actifs inscrits dans les groupes du professeur pour l’année courante.

Le taux de présence du professeur correspond aux séances confirmées par un appel enregistré, divisées par les occurrences passées de son emploi du temps hebdomadaire dans l’année courante. Le jour courant est exclu du dénominateur. Ce suivi déclaratif ne constitue pas un pointage administratif ; les vacances et annulations ne sont pas encore modélisées.

Chaque module a un objectif modifiable de 24 séances par défaut. Le volume horaire est estimé à partir de la durée moyenne de ses créneaux. Les ressources peuvent contenir un lien HTTP(S) vers un support. Les examens et devoirs publiés sont des contenus du cours ; les notes restent gérées dans le module existant de notation.

Après mise à jour du schéma : `npx prisma generate`, puis `npx prisma migrate deploy` (arrêter le serveur sous Windows avant la génération si le moteur Prisma est verrouillé).

Vérification d’intégration : démarrer `npm run dev`, puis exécuter `node scripts/verify-teacher.cjs`. Le script crée ses propres données temporaires et les supprime après les vérifications.

L’appel par séance s’ouvre 15 minutes après l’heure de début, selon le fuseau `Africa/Casablanca`. Le professeur peut appliquer « Tous présents » ou « Tous absents », puis corriger individuellement chaque étudiant. Le bouton « Valider définitivement l’appel » verrouille la séance ; toute nouvelle sauvegarde est rejetée côté serveur, et les anciens écrans de présence respectent aussi ce verrouillage. Les appels déjà enregistrés avant cette règle sont considérés comme validés.

Test des limites horaires : `npx tsx scripts/verify-attendance-policy.ts`.
