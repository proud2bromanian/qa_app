# QA Manager

Aplicație web pentru gestionarea testelor de calitate (QA), construită cu SvelteKit, TypeScript, Prisma și Tailwind CSS.

## Funcționalități

### Gestionare Proiecte
- Creare, editare și ștergere proiecte
- Invitații cu cod unic pentru adăugare membri
- Roluri: **Administrator** și **Membru**
- Selector de proiecte în sidebar cu navigare rapidă

### Cazuri de Test
- CRUD complet cu coduri secvențiale (TC-1, TC-2, ...)
- Câmpuri: titlu, mediu, pași, rezultat așteptat, rezultat obținut, tip testare (manuală/automată), prioritate (critică/înaltă/medie/scăzută)
- Atașamente (capturi de ecran) cu validare tip și dimensiune
- Clonare test case
- Import/Export CSV
- Filtrare după mediu, tip testare, prioritate și căutare full-text

### Suite de Teste
- Grupare cazuri de test în colecții ordonate
- Interfață dual-colonă (disponibile / selectate) cu drag logic
- Reordonare teste cu butoane sus/jos
- Lansare execuție direct din suită

### Execuții
- Rulare teste individual sau din suită
- Urmrire progres în timp real cu bară vizuală
- Statusuri per test: netestat, trecut, eșuat, blocat
- Creare automată de bug la marcarea testului ca eșuat
- Statistici aggregate (progres, trecute, eșuate, blocate)

### Bug-uri
- Ciclu de viață complet: **Deschis** → **În lucru** → **Rezolvat** → **Închis**
- Severitate: **Critică**, **Majoră**, **Moderată**, **Minoră**
- Asociere automată cu test case-ul sursă
- Filtrare după status, severitate și căutare full-text
- Carduri expandabile cu detalii complete

### Dashboard
- Statistici generale (teste, suite, execuții, bug-uri)
- Rată de trecere cu indicator vizual
- Execuții recente cu progres individual

### Cont Utilizator
- Autentificare/Înregistrare cu JWT (httpOnly cookies)
- Modificare parolă
- Setări profil

## Tehnologii

| Componentă | Tehnologie |
|---|---|
| Framework | SvelteKit 2 |
| Limbaj | TypeScript |
| Stil | Tailwind CSS 4 |
| Bază de date | SQLite local, PostgreSQL pe Vercel via Prisma |
| Autentificare | JWT + bcrypt |
| Runtime | Node.js |

## Instalare

```bash
# Clonează repository-ul
git clone <url-repo>
cd qa_app

# Instalează dependențele
npm install

# Configurează variabila de mediu
cp .env.example .env
# Editează .env și setează JWT_SECRET

# Inițializează baza de date
npx prisma db push

# Pornește serverul de dezvoltare
npm run dev
```

## Variabile de Mediu

Creează un fișier `.env` în rădăcina proiectului:

```env
JWT_SECRET=un-secret-sigur-si-lung
```

## Deploy pe Vercel

Pentru producție, aplicația folosește schema `prisma/schema.vercel.prisma`, care este configurată pentru PostgreSQL. SQLite (`prisma/dev.db`) este doar pentru dezvoltare locală și nu este persistent pe Vercel.

În Vercel setează variabilele de mediu:

```env
JWT_SECRET=un-secret-sigur-si-lung
DATABASE_URL=postgresql://user:password@pooled.db.prisma.io:5432/database?sslmode=require
DIRECT_URL=postgresql://user:password@db.prisma.io:5432/database?sslmode=require
```

Poți crea baza de date din Vercel Marketplace, Neon, Supabase sau orice provider PostgreSQL. La deploy, comanda `npm run vercel-build` rulează `prisma generate`, apoi `prisma db push` pentru a crea/actualiza tabelele.

## Structura Proiectului

```
src/
├── lib/
│   ├── components/          # Componente reutilizabile
│   │   ├── Badge.svelte
│   │   ├── EmptyState.svelte
│   │   ├── Modal.svelte
│   │   ├── SearchInput.svelte
│   │   ├── Spinner.svelte
│   │   ├── StatCard.svelte
│   │   └── Toasts.svelte
│   ├── server/
│   │   ├── auth.ts          # Autentificare și autorizare
│   │   ├── prisma.ts        # Client Prisma
│   │   └── rate-limit.ts    # Limitare request-uri
│   ├── stores/
│   │   ├── auth.ts          # Store utilizator curent
│   │   └── toast.ts         # Store notificări
│   └── types.ts             # Interfețe TypeScript
├── routes/
│   ├── api/                 # API endpoints
│   │   ├── auth/            # Login, Register, Logout
│   │   ├── projects/        # CRUD proiecte, teste, suite, execuții, bug-uri
│   │   └── account/         # Setări profil
│   ├── login/               # Pagina de autentificare
│   ├── register/            # Pagina de înregistrare
│   ├── dashboard/           # Dashboard global
│   ├── projects/            # Paginile proiectelor
│   │   └── [id]/
│   │       ├── dashboard/   # Dashboard proiect
│   │       ├── test-cases/  # Cazuri de test
│   │       ├── test-suites/ # Suite de teste
│   │       ├── executions/  # Execuții
│   │       ├── bugs/        # Bug-uri
│   │       ├── settings/    # Setări proiect (admin)
│   │       └── join/        # Alăturare via invitație
│   ├── account/             # Setări cont
│   ├── +layout.svelte       # Layout principal cu sidebar
│   └── +layout.server.ts    # Încărcare date layout
└── app.css                  # Stiluri globale + tema Tailwind
```

## Securitate

- **Autentificare**: JWT în cookie-uri httpOnly, expirare 7 zile
- **Autorizare**: Verificare apartenență la proiect pe fiecare endpoint
- **Rate limiting**: 10 request-uri/minut pe login și register
- **Upload**: Validare MIME type (PNG, JPEG, GIF, WebP) și dimensiune maximă 5MB
- **Coduri TC**: Generare atomică în tranzacție pentru a preveni race conditions

## Comenzi

```bash
npm run dev          # Server de dezvoltare
npm run build        # Build producție
npm run preview      # Preview build producție
npx prisma studio    # Interfață vizuală pentru baza de date
npx prisma db push   # Sincronizare schema cu baza de date
```
