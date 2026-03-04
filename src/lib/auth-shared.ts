// ─── Resource Registry ───
// All resources that can be controlled by RBAC
export const RESOURCES = [
  { key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { key: 'schedules', label: 'Jadwal', icon: 'Calendar' },
  { key: 'doctors', label: 'Dokter', icon: 'Users' },
  { key: 'leaves', label: 'Jadwal Cuti', icon: 'Calendar' },
  { key: 'analytics', label: 'Analitik', icon: 'BarChart3' },
  { key: 'automation', label: 'Otomatisasi', icon: 'Bot' },
  { key: 'display-control', label: 'Kontrol Layar', icon: 'Settings' },
  { key: 'users', label: 'Manajemen Pengguna', icon: 'UserSquare2' },
  { key: 'access', label: 'Manajemen Akses', icon: 'Shield' },
] as const;

export type ResourceKey = (typeof RESOURCES)[number]['key'];

// ─── Shared Types ───
export interface SessionPayload {
  userId: string;
  username: string;
  name: string;
  roleId: string | null;
  roleName: string | null;
  permissions: { resource: string; action: string }[];
}
