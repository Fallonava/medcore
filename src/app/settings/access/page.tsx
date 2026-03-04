"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { RESOURCES } from "@/lib/auth-shared";
import {
  Shield, Users, Plus, Trash2, Save, Edit2, X, Check,
  UserPlus, Key, Eye, Pencil, AlertCircle, Loader2, ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Permission { resource: string; action: string; }
interface Role {
  id: string; name: string; description: string | null; isSystem: boolean;
  permissions: (Permission & { id: string })[];
  _count: { users: number };
}
interface User {
  id: string; username: string; name: string; isActive: boolean;
  roleId: string | null; role: { id: string; name: string } | null;
  createdAt: string;
}

export default function AccessManagementPage() {
  const { isSuperAdmin } = useAuth();
  const [tab, setTab] = useState<"roles" | "users">("roles");
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ── Role Editor State ──
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [rolePerms, setRolePerms] = useState<Record<string, { read: boolean; write: boolean }>>({});
  const [showNewRole, setShowNewRole] = useState(false);

  // ── User Editor State ──
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", name: "", roleId: "" });
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editUserData, setEditUserData] = useState<{ name: string; roleId: string; password: string }>({ name: "", roleId: "", password: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, usersRes] = await Promise.all([fetch("/api/roles"), fetch("/api/users")]);
      if (rolesRes.ok) setRoles(await rolesRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
    } catch { setError("Gagal memuat data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showMessage = (msg: string, type: "success" | "error") => {
    if (type === "success") { setSuccess(msg); setError(""); }
    else { setError(msg); setSuccess(""); }
    setTimeout(() => { setSuccess(""); setError(""); }, 3000);
  };

  // ── Role Helpers ──
  const initRolePerms = (role?: Role) => {
    const perms: Record<string, { read: boolean; write: boolean }> = {};
    RESOURCES.forEach((r) => { perms[r.key] = { read: false, write: false }; });
    if (role) {
      role.permissions.forEach((p) => {
        if (perms[p.resource]) {
          if (p.action === "read") perms[p.resource].read = true;
          if (p.action === "write") perms[p.resource].write = true;
        }
      });
    }
    setRolePerms(perms);
  };

  const openEditRole = (role: Role) => {
    setEditingRole(role);
    setNewRoleName(role.name);
    setNewRoleDesc(role.description || "");
    initRolePerms(role);
    setShowNewRole(false);
  };

  const openNewRole = () => {
    setEditingRole(null);
    setNewRoleName("");
    setNewRoleDesc("");
    initRolePerms();
    setShowNewRole(true);
  };

  const buildPermissions = (): Permission[] => {
    const perms: Permission[] = [];
    Object.entries(rolePerms).forEach(([resource, val]) => {
      if (val.read) perms.push({ resource, action: "read" });
      if (val.write) perms.push({ resource, action: "write" });
    });
    return perms;
  };

  const saveRole = async () => {
    setSaving(true);
    try {
      const permissions = buildPermissions();
      const body = editingRole
        ? { id: editingRole.id, name: newRoleName, description: newRoleDesc, permissions }
        : { name: newRoleName, description: newRoleDesc, permissions };
      const res = await fetch("/api/roles", {
        method: editingRole ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showMessage(editingRole ? "Role berhasil diperbarui" : "Role berhasil dibuat", "success");
        setEditingRole(null); setShowNewRole(false); fetchData();
      } else {
        const data = await res.json();
        showMessage(data.error || "Gagal menyimpan role", "error");
      }
    } catch { showMessage("Gagal menyimpan role", "error"); }
    finally { setSaving(false); }
  };

  const deleteRole = async (id: string) => {
    if (!confirm("Yakin ingin menghapus role ini?")) return;
    const res = await fetch("/api/roles", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (res.ok) { showMessage("Role berhasil dihapus", "success"); fetchData(); }
    else { const d = await res.json(); showMessage(d.error || "Gagal menghapus role", "error"); }
  };

  // ── User Helpers ──
  const saveNewUser = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newUser) });
      if (res.ok) {
        showMessage("Pengguna berhasil dibuat", "success");
        setShowNewUser(false); setNewUser({ username: "", password: "", name: "", roleId: "" }); fetchData();
      } else { const d = await res.json(); showMessage(d.error || "Gagal membuat pengguna", "error"); }
    } catch { showMessage("Gagal membuat pengguna", "error"); }
    finally { setSaving(false); }
  };

  const updateUser = async (id: string) => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { id, name: editUserData.name, roleId: editUserData.roleId || null };
      if (editUserData.password) body.password = editUserData.password;
      const res = await fetch("/api/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { showMessage("Pengguna berhasil diperbarui", "success"); setEditingUser(null); fetchData(); }
      else { const d = await res.json(); showMessage(d.error || "Gagal memperbarui", "error"); }
    } catch { showMessage("Gagal memperbarui", "error"); }
    finally { setSaving(false); }
  };

  const toggleUserActive = async (user: User) => {
    const res = await fetch("/api/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: user.id, isActive: !user.isActive }) });
    if (res.ok) { fetchData(); } else { showMessage("Gagal mengubah status", "error"); }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Yakin ingin menghapus pengguna ini?")) return;
    const res = await fetch("/api/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (res.ok) { showMessage("Pengguna berhasil dihapus", "success"); fetchData(); }
    else { showMessage("Gagal menghapus pengguna", "error"); }
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Shield className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Akses Ditolak</h2>
        <p className="text-slate-500">Hanya Super Admin yang dapat mengakses halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Shield className="text-blue-600" /> Manajemen Akses
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kelola role, izin akses, dan pengguna sistem</p>
        </div>
      </div>

      {/* Feedback Messages */}
      {(error || success) && (
        <div className={cn("p-4 rounded-2xl text-sm font-semibold flex items-center gap-2 transition-all", error ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200")}>
          {error ? <AlertCircle size={16} /> : <Check size={16} />}
          {error || success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl w-fit">
        <button onClick={() => setTab("roles")} className={cn("px-5 py-2.5 rounded-xl text-sm font-bold transition-all", tab === "roles" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
          <Shield size={16} className="inline mr-2" />Roles & Izin
        </button>
        <button onClick={() => setTab("users")} className={cn("px-5 py-2.5 rounded-xl text-sm font-bold transition-all", tab === "users" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
          <Users size={16} className="inline mr-2" />Pengguna
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : tab === "roles" ? (
        /* ═══════════════ ROLES TAB ═══════════════ */
        <div className="space-y-4">
          <button onClick={openNewRole} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-sm">
            <Plus size={16} /> Tambah Role Baru
          </button>

          {/* Role Cards */}
          {roles.map((role) => (
            <div key={role.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm", role.isSystem ? "bg-gradient-to-br from-amber-500 to-orange-500" : "bg-gradient-to-br from-blue-500 to-indigo-500")}>
                    {role.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{role.name}</h3>
                    <p className="text-xs text-slate-500">{role.description || "Tidak ada deskripsi"} • {role._count.users} pengguna</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEditRole(role)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                    <Edit2 size={16} />
                  </button>
                  {!role.isSystem && (
                    <button onClick={() => deleteRole(role.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Permission Summary */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {RESOURCES.map((r) => {
                  const hasRead = role.permissions.some((p) => p.resource === r.key && p.action === "read");
                  const hasWrite = role.permissions.some((p) => p.resource === r.key && p.action === "write");
                  if (!hasRead && !hasWrite) return null;
                  return (
                    <span key={r.key} className={cn("px-2.5 py-1 rounded-lg text-xs font-bold", hasWrite ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700")}>
                      {hasWrite ? <Pencil size={10} className="inline mr-1" /> : <Eye size={10} className="inline mr-1" />}
                      {r.label}
                    </span>
                  );
                })}
                {role.isSystem && <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700">Akses Penuh</span>}
              </div>
            </div>
          ))}

          {/* Role Editor Modal */}
          {(editingRole || showNewRole) && (
            <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { setEditingRole(null); setShowNewRole(false); }}>
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-black text-slate-800">
                    {editingRole ? `Edit Role: ${editingRole.name}` : "Buat Role Baru"}
                  </h2>
                  <button onClick={() => { setEditingRole(null); setShowNewRole(false); }} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Nama Role</label>
                    <input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="Contoh: Pendaftaran" disabled={editingRole?.isSystem} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Deskripsi</label>
                    <input value={newRoleDesc} onChange={(e) => setNewRoleDesc(e.target.value)} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="Deskripsi singkat role..." />
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Matriks Izin Akses</h3>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left py-3 px-4 font-bold text-slate-600">Halaman / Fitur</th>
                        <th className="text-center py-3 px-4 font-bold text-slate-600 w-24">
                          <Eye size={14} className="inline mr-1" />Lihat
                        </th>
                        <th className="text-center py-3 px-4 font-bold text-slate-600 w-24">
                          <Pencil size={14} className="inline mr-1" />Edit
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {RESOURCES.map((r) => (
                        <tr key={r.key} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-semibold text-slate-700">{r.label}</td>
                          <td className="text-center py-3 px-4">
                            <input type="checkbox" checked={rolePerms[r.key]?.read || false} onChange={(e) => setRolePerms((p) => ({ ...p, [r.key]: { ...p[r.key], read: e.target.checked } }))} className="w-4 h-4 rounded accent-blue-600" />
                          </td>
                          <td className="text-center py-3 px-4">
                            <input type="checkbox" checked={rolePerms[r.key]?.write || false} onChange={(e) => {
                              setRolePerms((p) => ({
                                ...p,
                                [r.key]: { read: e.target.checked ? true : p[r.key]?.read, write: e.target.checked },
                              }));
                            }} className="w-4 h-4 rounded accent-emerald-600" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button onClick={() => { setEditingRole(null); setShowNewRole(false); }} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">Batal</button>
                  <button onClick={saveRole} disabled={saving || !newRoleName} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Simpan
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ═══════════════ USERS TAB ═══════════════ */
        <div className="space-y-4">
          <button onClick={() => setShowNewUser(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-sm">
            <UserPlus size={16} /> Tambah Pengguna
          </button>

          {/* New User Form */}
          {showNewUser && (
            <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-slate-800 text-sm">Pengguna Baru</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={newUser.name} onChange={(e) => setNewUser((u) => ({ ...u, name: e.target.value }))} placeholder="Nama lengkap" className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                <input value={newUser.username} onChange={(e) => setNewUser((u) => ({ ...u, username: e.target.value }))} placeholder="Username" className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                <input type="password" value={newUser.password} onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))} placeholder="Password" className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                <select value={newUser.roleId} onChange={(e) => setNewUser((u) => ({ ...u, roleId: e.target.value }))} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                  <option value="">Pilih Role...</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowNewUser(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Batal</button>
                <button onClick={saveNewUser} disabled={saving || !newUser.username || !newUser.password || !newUser.name} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 flex items-center gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Simpan
                </button>
              </div>
            </div>
          )}

          {/* User Cards */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-5 font-bold text-slate-600">Pengguna</th>
                  <th className="text-left py-3 px-5 font-bold text-slate-600">Username</th>
                  <th className="text-left py-3 px-5 font-bold text-slate-600">Role</th>
                  <th className="text-center py-3 px-5 font-bold text-slate-600">Status</th>
                  <th className="text-right py-3 px-5 font-bold text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="py-3 px-5">
                      {editingUser === u.id ? (
                        <input value={editUserData.name} onChange={(e) => setEditUserData((d) => ({ ...d, name: e.target.value }))} className="px-3 py-1.5 border rounded-lg text-sm w-full" />
                      ) : (
                        <span className="font-semibold text-slate-800">{u.name}</span>
                      )}
                    </td>
                    <td className="py-3 px-5 text-slate-600 font-mono text-xs">{u.username}</td>
                    <td className="py-3 px-5">
                      {editingUser === u.id ? (
                        <select value={editUserData.roleId} onChange={(e) => setEditUserData((d) => ({ ...d, roleId: e.target.value }))} className="px-3 py-1.5 border rounded-lg text-sm">
                          <option value="">Tanpa Role</option>
                          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      ) : (
                        <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold", u.role ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500")}>{u.role?.name || "Tanpa Role"}</span>
                      )}
                    </td>
                    <td className="py-3 px-5 text-center">
                      <button onClick={() => toggleUserActive(u)} className={cn("px-2.5 py-1 rounded-lg text-xs font-bold transition-all", u.isActive ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-rose-50 text-rose-700 hover:bg-rose-100")}>
                        {u.isActive ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {editingUser === u.id ? (
                          <>
                            <input type="password" value={editUserData.password} onChange={(e) => setEditUserData((d) => ({ ...d, password: e.target.value }))} placeholder="Password baru (opsional)" className="px-3 py-1.5 border rounded-lg text-xs w-40 mr-2" />
                            <button onClick={() => updateUser(u.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Check size={16} /></button>
                            <button onClick={() => setEditingUser(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setEditingUser(u.id); setEditUserData({ name: u.name, roleId: u.roleId || "", password: "" }); }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                            <button onClick={() => deleteUser(u.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
