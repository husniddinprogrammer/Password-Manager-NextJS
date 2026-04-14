# TeamVault — Secure Team Password Manager

A production-grade, self-hosted password manager for teams. Built with Next.js 14, PostgreSQL, and AES-256 encryption.

---

## Features

- **AES-256 Encryption** — All sensitive fields encrypted client-side; only ciphertext reaches the server
- **Zero-knowledge architecture** — Master password never sent to server; bcrypt hash only
- **Three.js lock screen** — Animated 3D particle background with mouse parallax
- **Password generator** — Configurable length, character sets, live strength meter
- **Reused password detection** — Flags credentials sharing the same password
- **Favicon auto-fetch** — Service icons via Google Favicons API
- **Activity audit log** — Complete trail of copy, view, create, edit, delete events
- **Auto-lock** — Vault locks after configurable inactivity period (5–60 min)
- **Export** — Download encrypted vault as JSON backup
- **Category filtering** — Organize by Social, Banking, Work, Development, etc.
- **Tag system** — Freeform tags with full-text search

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Database | PostgreSQL + Prisma ORM |
| Encryption | crypto-js (AES-256 CBC + PBKDF2) |
| Auth | jose (JWT, httpOnly cookie) |
| Password hashing | bcryptjs (12 rounds) |
| UI | Tailwind CSS + Framer Motion |
| 3D | Three.js |
| Strength meter | zxcvbn |
| Icons | lucide-react |
| Toasts | react-hot-toast |

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

---

## Setup

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

Edit `.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/password_manager?schema=public"
JWT_SECRET="replace-with-a-random-64-char-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Generate a strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Set up the database

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. First-time setup

On first visit you'll be prompted to **create a master password**. This password:
- Is hashed with bcrypt (12 rounds) before storage
- Derives the AES-256 key via PBKDF2 in your browser
- Is never transmitted in plaintext

---

## Production Deployment

```bash
npm run build
npm start
```

For production, also set:
```env
NODE_ENV=production
```

Ensure your PostgreSQL instance is accessible and `DATABASE_URL` is correct.

---

## Security Architecture

### Encryption Flow

```
Master Password
    │
    ├── bcrypt(12 rounds) ──→ stored as masterHash in DB (server-side verification)
    │
    └── PBKDF2(100,000 iter, SHA-256) ──→ AES-256 key (derived in browser)
                                              │
                                              └── AES-256 CBC + random IV
                                                      │
                                                      ├── encrypt(username)
                                                      ├── encrypt(password)
                                                      └── encrypt(notes)
                                                              │
                                                              └── ciphertext stored in DB
```

### Session Management

- JWT stored in **httpOnly cookie** (not accessible to JavaScript)
- Token expires in **8 hours**
- Auto-lock triggers on **inactivity** (client-side timer)
- AES key stored in **sessionStorage only** — cleared on tab close or lock
- Server never sees the plaintext key or credentials

### What the server stores

| Field | Stored as |
|---|---|
| Master password | bcrypt hash |
| Username | AES-256 ciphertext |
| Password | AES-256 ciphertext |
| Notes | AES-256 ciphertext |
| Service name | Plaintext |
| URL | Plaintext |
| Category / Tags | Plaintext |

---

## Project Structure

```
password-manager/
├── app/
│   ├── page.tsx                     # Lock screen
│   ├── layout.tsx                   # Root layout + providers
│   ├── globals.css
│   ├── vault/
│   │   ├── page.tsx                 # Vault overview
│   │   ├── add/page.tsx             # Add credential
│   │   └── edit/[id]/page.tsx       # Edit credential
│   ├── settings/page.tsx            # Settings + activity log
│   └── api/
│       ├── auth/
│       │   ├── setup/route.ts       # First-time vault creation
│       │   ├── unlock/route.ts      # Verify master password, issue JWT
│       │   ├── logout/route.ts      # Clear session cookie
│       │   ├── check/route.ts       # Auth status check
│       │   ├── change-password/     # Update master password
│       │   └── clear-data/          # Delete vault + user
│       ├── credentials/
│       │   ├── route.ts             # GET all / POST new
│       │   └── [id]/route.ts        # GET / PUT / DELETE one
│       ├── activity/route.ts        # Activity log
│       └── export/route.ts          # Download encrypted JSON
├── components/
│   ├── Layout/
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── LockScreen/
│   │   ├── ThreeBackground.tsx      # Three.js particle animation
│   │   └── UnlockForm.tsx
│   ├── Vault/
│   │   ├── CredentialCard.tsx
│   │   ├── CredentialList.tsx
│   │   ├── FilterBar.tsx
│   │   └── EmptyState.tsx
│   ├── Forms/
│   │   ├── CredentialForm.tsx
│   │   └── PasswordGenerator.tsx
│   └── UI/
│       ├── PasswordStrength.tsx
│       ├── CopyButton.tsx
│       ├── CategoryBadge.tsx
│       └── ActivityLog.tsx
├── context/
│   ├── VaultContext.tsx              # Credentials + encryption key
│   └── SessionContext.tsx           # Auth state + auto-lock
├── lib/
│   ├── crypto.ts                    # AES-256 + PBKDF2
│   ├── auth.ts                      # JWT helpers
│   ├── prisma.ts                    # Prisma singleton
│   └── types.ts                     # Shared TypeScript types
├── prisma/
│   └── schema.prisma
└── middleware.ts                    # Route protection
```

---

## API Reference

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/setup` | — | Create first user + vault |
| POST | `/api/auth/unlock` | — | Verify master password, issue JWT |
| POST | `/api/auth/logout` | ✓ | Clear session cookie |
| GET | `/api/auth/check` | — | Check setup + session status |
| POST | `/api/auth/change-password` | ✓ | Update master password |
| POST | `/api/auth/clear-data` | ✓ | Delete all data |
| GET | `/api/credentials` | ✓ | List all credentials (encrypted) |
| POST | `/api/credentials` | ✓ | Create credential |
| GET | `/api/credentials/:id` | ✓ | Get one credential |
| PUT | `/api/credentials/:id` | ✓ | Update credential |
| DELETE | `/api/credentials/:id` | ✓ | Delete credential |
| GET | `/api/activity` | ✓ | List activity logs |
| POST | `/api/activity` | ✓ | Log an activity event |
| GET | `/api/export` | ✓ | Download encrypted vault JSON |

---

## Screenshots

> Add screenshots after first run:
> - `/screenshots/lock-screen.png`
> - `/screenshots/vault-overview.png`
> - `/screenshots/add-credential.png`
> - `/screenshots/settings.png`

---

## License

MIT
