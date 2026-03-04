# MedCore Admin — Developer Shortcuts

## 🚀 Perintah Umum

```bash
# Development
npm run dev                    # Jalankan dev server (http://localhost:3000)
npm run build                  # Build production (standalone)
npm run lint                   # ESLint check
npm test                       # Run Jest unit tests

# Database
npx prisma studio              # Open Prisma Studio (visual DB browser)
npx prisma db push             # Sync schema ke DB (dev only, no migration file)
npx prisma migrate dev         # Buat migration file baru (dev)
npx prisma migrate deploy      # Apply migrations production (pakai DIRECT_URL!)
npx prisma generate            # Regenerate Prisma Client (setelah schema berubah)

# Deployment
bash scripts/update-server.sh  # Update server via SSH (pull + build + migrate + pm2 reload)
pm2 status                     # Cek status aplikasi
pm2 logs medcore-admin --lines 50  # Lihat 50 log terakhir
pm2 reload ecosystem.config.js --update-env  # Reload dengan env terbaru
```

---

## 🔑 Env Variables Checklist

### Required (app crash jika tidak ada)
```env
DATABASE_URL=postgresql://...   # Neon pooled connection
JWT_SECRET=...                  # Min 32 chars — sign access token
ADMIN_KEY=...                   # Min 8 chars — master admin key
```

### Optional (graceful degradation)
```env
DIRECT_URL=...                  # Neon non-pooled — WAJIB untuk prisma migrate
REDIS_URL=rediss://:pass@...    # Upstash Redis — untuk RBAC cache
SENTRY_DSN=https://...          # Sentry error tracking
NEXT_PUBLIC_SENTRY_DSN=...      # Sama dengan SENTRY_DSN
NEXT_PUBLIC_APP_URL=https://... # Production URL (untuk automation fallback)
CRON_SECRET=...                 # Auth header untuk cron jobs
```

### CI/CD — GitHub Secrets
```
SERVER_HOST, SERVER_USERNAME, SERVER_SSH_KEY
DATABASE_URL, DIRECT_URL, JWT_SECRET, ADMIN_KEY
NEXT_PUBLIC_APP_URL, REDIS_URL
NEON_PROJECT_ID, NEON_API_KEY
SENTRY_DSN, SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT
```

---

## 🛡️ Auth API Reference

| Endpoint | Method | Deskripsi |
|---|---|---|
| `/api/auth/login` | POST | Login → set access (15m) + refresh (7d) cookies |
| `/api/auth/logout` | POST | Logout device ini |
| `/api/auth/logout` | POST `{ all: true }` | Logout semua device |
| `/api/auth/refresh` | GET `?redirect=/path` | Browser refresh → rotate tokens → redirect |
| `/api/auth/refresh` | POST | Silent refresh (dari auth-context) |
| `/api/auth/me` | GET | Get current user session |

**Cookies:**
- `medcore_session` — JWT access token (httpOnly, 15m)
- `medcore_refresh` — Opaque refresh token (httpOnly, 7d)

---

## 🐘 Prisma Soft-Delete Notes

Models yang auto-filter `deletedAt = null`: **Doctor, Shift, User**

```typescript
// Normal — hanya data aktif
const doctors = await prisma.doctor.findMany();

// Bypass soft-delete — lihat semua termasuk yang dihapus
const allDoctors = await prisma.$queryRaw`SELECT * FROM "Doctor"`;

// Restore doctor yang dihapus
await prisma.doctor.update({
  where: { id: '...' },
  data: { deletedAt: null },
});
```

---

## 🔄 RBAC Cache

```typescript
import { invalidateRbacCache } from '@/lib/rbac-cache';

// Invalidate setelah admin ubah role user
await invalidateRbacCache(userId);

// Invalidate semua user dalam satu role (sudah otomatis di PUT /api/roles)
```

---

## 🐛 Troubleshooting

| Masalah | Solusi |
|---|---|
| `❌ Invalid/missing environment variables` | Cek `.env` — `DATABASE_URL`, `JWT_SECRET`, `ADMIN_KEY` wajib ada |
| `prisma.refreshToken does not exist` | Jalankan `npx prisma generate` |
| `405 /api/auth/refresh` | Pastikan menggunakan `proxy.ts` bukan `middleware.ts` |
| Dev server crash setelah hapus `.next` | Stop server dulu, hapus `.next`, baru `npm run dev` |
| `prisma migrate` gagal dengan pooler URL | Gunakan `DIRECT_URL` (non-pooled endpoint) |
| Soft-delete tidak berjalan | Pastikan model ada di `SOFT_DELETE_MODELS` di `prisma.ts` |
