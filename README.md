# TeamVault — Secure Team Password Manager

A production-grade, self-hosted password manager built for companies that need to share credentials across teams — without passing passwords through Slack, Telegram, or sticky notes.

**Live demo:** [password-manager-mauve-seven.vercel.app](https://password-manager-mauve-seven.vercel.app)

---

## Product Brief

TeamVault solves a real problem every company faces: credentials for CRM platforms, cloud accounts, social media, and internal tools get shared insecurely through chat or stored in spreadsheets. TeamVault gives teams a single encrypted vault with role-based access — every credential is locked with AES-256-GCM, the vault requires a master password to open, and every action is logged for auditability. V2 would introduce end-to-end (zero-knowledge) encryption where the server never holds decrypted data, SAML/SSO for enterprise login, and a browser extension for auto-fill.

**If I had 3 more days I would add:**
- TOTP / two-factor authentication on vault unlock
- Email alerts for suspicious activity (login from new IP, bulk export)
- Password expiry reminders and rotation prompts per credential
- Browser extension with auto-fill using the existing API

---

## Features

### Core Vault
- **AES-256-GCM encryption** — username, password, and notes are encrypted server-side before touching the database; ciphertext is all the DB ever sees
- **Master password** — bcrypt (12 rounds); never stored in plaintext; the vault stays locked until explicitly unlocked
- **Auto-lock** — configurable inactivity timer (5 / 15 / 30 / 60 min); resets on any mouse, keyboard, or touch event
- **Password generator** — configurable length (8–64), uppercase / lowercase / numbers / symbols toggles, one-click copy
- **Strength meter** — live zxcvbn scoring (Very Weak → Very Strong) on every credential card and in the generator
- **One-click copy** — separate copy buttons for username and password; password hidden by default until the eye icon is toggled
- **Reused password detection** — HMAC fingerprints identify passwords shared across multiple entries; a warning modal lists all affected credentials
- **Category + tag system** — 9 built-in categories (Social, Banking, Work, Dev…) plus freeform tags with full-text search
- **Favicon auto-fetch** — service icons loaded via Google Favicons API for instant visual recognition
- **Export / Import** — download the full vault or single credentials as JSON; re-import with automatic deduplication

### Teams (Bonus Feature)
- Create and manage multiple teams
- Invite members by email; assign OWNER or MEMBER roles
- Share credentials within a team scope; personal credentials stay private
- RBAC enforced at every API endpoint — MEMBER can view, OWNER can create / edit / delete

### Audit Trail
- Every action is logged: create, update, delete, view, copy, lock, unlock, import, export
- Activity feed visible in Settings with relative timestamps

### Security Hardening
- JWT stored in **httpOnly, sameSite:strict** cookie — not accessible to JavaScript
- **CSRF protection** — Origin ↔ Host header check on every API mutation
- **Rate limiting** — 10 login attempts / 15 min per IP; 5 register attempts / hour
- **HKDF-SHA256** key derivation for server-side credential encryption (RFC 5869)
- **Zod** schema validation on all API inputs with length caps
- **38 automated tests** — unit (crypto, auth, rate-limit, schemas) + integration (mocked Prisma)
- **Playwright e2e** test suite for login, vault, and lock flows

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Database | PostgreSQL + Prisma 7 |
| Server encryption | Node.js `crypto` — AES-256-GCM, HKDF-SHA256 |
| Auth | `jose` — JWT HS256, httpOnly cookie |
| Password hashing | `bcryptjs` 12 rounds |
| UI | Tailwind CSS v4 + Framer Motion |
| 3D lock screen | Three.js |
| Strength meter | zxcvbn |
| Input validation | Zod |
| Testing | Vitest + Playwright |
| Icons | lucide-react |

---

## Local Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 14+

### 1. Clone and install

```bash
git clone <repo-url>
cd password-manager
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in the three required values:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/password_manager"
JWT_SECRET="<random 64-char hex>"
CREDENTIALS_SECRET="<random 64-char hex>"
```

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run it twice — once for `JWT_SECRET`, once for `CREDENTIALS_SECRET`.

### 3. Set up the database

```bash
npx prisma migrate deploy   # apply all migrations
npx prisma generate         # generate the Prisma client
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the register page will guide you through creating your first account.

### 5. Run tests

```bash
npm test              # unit + integration (38 tests)
npm run test:e2e      # Playwright — requires dev server running
```

---

## Deploy to Vercel + Neon (free tier)

### 1. Create a Neon database

1. Go to [neon.tech](https://neon.tech) → New project
2. Copy the **connection string** (looks like `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`)

### 2. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

When prompted:
- **Link to existing project?** → `No` — create a new project
- **Pull environment variables?** → `No` — you will add them manually in step 3

Or connect your GitHub repo at [vercel.com/new](https://vercel.com/new).

### 3. Set environment variables in Vercel

In **Project → Settings → Environment Variables**, add:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your Neon connection string |
| `JWT_SECRET` | 64-char random hex |
| `CREDENTIALS_SECRET` | 64-char random hex |

### 4. Run migrations against the production database

```bash
DATABASE_URL="<your-neon-url>" npx prisma migrate deploy
```

### 5. Redeploy

```bash
vercel --prod
```

> `prisma generate` runs automatically as part of the build step — no need to run it manually on Vercel.

---

## Security Architecture

### Encryption flow

```
User enters master password
        │
        ├─► bcrypt(12 rounds) ──► masterHash stored in DB
        │                          (used only for vault unlock verification)
        │
        └─► Server-side credential encryption (per request):
                │
                ├─► HKDF-SHA256(CREDENTIALS_SECRET) ──► 256-bit AES key
                │
                └─► AES-256-GCM (random 12-byte IV per field)
                        ├─► encrypt(username)  → iv.tag.ciphertext
                        ├─► encrypt(password)  → iv.tag.ciphertext
                        └─► encrypt(notes)     → iv.tag.ciphertext
                                                   stored in DB
```

### What is stored in the database

| Field | Stored as |
|---|---|
| Master password | bcrypt hash (irreversible) |
| Username | AES-256-GCM ciphertext |
| Password | AES-256-GCM ciphertext |
| Notes | AES-256-GCM ciphertext |
| Password fingerprint | HMAC-SHA256 (reuse detection only) |
| Service name, URL | Plaintext |
| Category, tags | Plaintext |

### Session security

- JWT in **httpOnly + sameSite:strict** cookie — XSS cannot read it, cross-site requests cannot use it
- Token TTL: 8 hours
- CSRF: Origin ↔ Host header verified on every `POST / PUT / PATCH / DELETE` to `/api/*`
- Rate limiting: in-memory per-IP counters on login, unlock, and register

---

## Project Structure

```
password-manager/
├── app/
│   ├── page.tsx                    # Lock screen (default route)
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── vault/
│   │   ├── page.tsx                # Vault overview
│   │   ├── add/page.tsx
│   │   └── edit/[id]/page.tsx
│   ├── teams/
│   │   ├── page.tsx                # Team list
│   │   └── [id]/page.tsx           # Team detail + members
│   ├── settings/page.tsx
│   └── api/
│       ├── auth/                   # login, register, unlock, logout,
│       │                           #   check, change-password, clear-data
│       ├── credentials/            # CRUD + list
│       ├── teams/                  # CRUD + members
│       ├── activity/               # Audit log
│       ├── export/                 # JSON vault download
│       └── import/                 # JSON vault upload
├── components/
│   ├── Forms/                      # CredentialForm, PasswordGenerator
│   ├── Layout/                     # Header, Sidebar, PageTransitionWrapper
│   ├── LockScreen/                 # ThreeBackground (Three.js)
│   ├── UI/                         # ActivityLog, CopyButton, PasswordStrength,
│   │                               #   CategoryBadge
│   └── Vault/                      # CredentialCard, CredentialList, FilterBar,
│                                   #   EmptyState, ReusedPasswordModal
├── context/
│   ├── SessionContext.tsx          # Auth state, auto-lock, login/logout
│   └── VaultContext.tsx            # Credentials list, refresh
├── lib/
│   ├── auth.ts                     # JWT helpers
│   ├── prisma.ts                   # Prisma singleton (PrismaPg adapter)
│   ├── types.ts                    # Shared TypeScript types
│   └── server/
│       ├── credential-crypto.ts    # AES-256-GCM, HKDF, fingerprint
│       ├── credential-permissions.ts
│       ├── rate-limit.ts           # In-memory rate limiter
│       └── schemas.ts              # Zod validation schemas
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── __tests__/
│   ├── credential-crypto.test.ts   # Unit tests
│   ├── auth.test.ts
│   └── integration/                # Route handler tests (mocked Prisma)
├── e2e/                            # Playwright tests
├── proxy.ts                        # Next.js middleware (JWT + CSRF)
└── scripts/
    └── migrate-credential-keys.ts  # HKDF re-encryption migration
```

---

## API Reference

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Login + issue JWT |
| POST | `/api/auth/unlock` | ✓ | Re-verify master password after lock |
| POST | `/api/auth/logout` | ✓ | Clear session cookie |
| GET | `/api/auth/check` | — | Auth status |
| POST | `/api/auth/change-password` | ✓ | Update master password |
| POST | `/api/auth/clear-data` | ✓ | Delete vault + account |
| GET | `/api/credentials` | ✓ | List all accessible credentials |
| POST | `/api/credentials` | ✓ | Create credential |
| GET | `/api/credentials/:id` | ✓ | Get one credential |
| PUT | `/api/credentials/:id` | ✓ | Update credential |
| DELETE | `/api/credentials/:id` | ✓ | Delete credential |
| GET | `/api/teams` | ✓ | List user's teams |
| POST | `/api/teams` | ✓ | Create team |
| GET | `/api/teams/:id` | ✓ | Team detail |
| PUT | `/api/teams/:id` | ✓ | Update team |
| DELETE | `/api/teams/:id` | ✓ | Delete team |
| GET | `/api/teams/:id/members` | ✓ | List members |
| POST | `/api/teams/:id/members` | ✓ | Add member by email |
| DELETE | `/api/teams/:id/members/:userId` | ✓ | Remove member |
| GET | `/api/activity` | ✓ | Audit log |
| POST | `/api/activity` | ✓ | Log event |
| GET | `/api/export` | ✓ | Download vault JSON |
| POST | `/api/import` | ✓ | Upload vault JSON |

---

## License

MIT
