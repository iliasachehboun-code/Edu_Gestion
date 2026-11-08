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
