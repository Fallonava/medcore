# 📦 Database Backups

Folder ini berisi backup database PostgreSQL dari server Ubuntu (Beta).

> ⚠️ Folder ini di-ignore oleh Git. Jangan commit file backup ke repository.

## Struktur File

| File | Keterangan |
|------|------------|
| `backup_hospital_YYYYMMDD_HHMMSS.sql` | Backup format custom (pg_dump -Fc) |
| `backup_hospital_YYYYMMDD_HHMMSS.dump` | Backup format dump |
| `2026-04-02T*` | Backup JSON lama (April 2026) |

## Cara Membuat Backup Baru

Jalankan dari root project:
```bash
python scripts/utils/backup_db.py
```

## Cara Restore ke Server Windows

```powershell
# Format .sql (plain text)
psql -U postgres -d hospital_db -f backups\backup_hospital_xxx.sql

# Format .dump (custom)
pg_restore -U postgres -d hospital_db backups\backup_hospital_xxx.dump
```
