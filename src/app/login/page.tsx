"use client";

import { useState } from "react";
import { Activity, Lock, User, ArrowRight, ShieldCheck, AlertCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) return;

        setLoading(true);
        setError("");

        try {
            const result = await login(username, password);
            if (!result.success) {
                setError(result.error || "Username atau password salah.");
            }
        } catch {
            setError("Terjadi kesalahan jaringan. Periksa koneksi Anda.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-50 overflow-hidden font-sans">
            {/* ── LIGHT MODE BACKGROUND EFFECTS ── */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-400/10 rounded-full blur-[100px] pointer-events-none -translate-x-1/3 translate-y-1/3" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-200/20 rounded-full blur-[120px] pointer-events-none" />

            {/* Mesh grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)] pointer-events-none" />

            {/* ── LOGIN CARD ── */}
            <div className="relative z-10 w-full max-w-md px-6 animate-in fade-in zoom-in-95 duration-700">
                <div className="bg-white/80 backdrop-blur-2xl border border-white/60 p-8 sm:p-10 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05),0_0_0_1px_rgba(255,255,255,0.5)_inset]">

                    <div className="flex flex-col items-center mb-10 text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-[0_12px_32px_rgba(59,130,246,0.3)] relative group overflow-hidden">
                            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <Activity size={32} strokeWidth={2.5} className="relative z-10" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-800 mb-2">MedCore<span className="text-blue-600">26</span></h1>
                        <p className="text-slate-500 text-sm font-semibold flex items-center gap-1.5">
                            <Sparkles size={14} className="text-indigo-400" />
                            Sistem Manajemen Dasbor Premium
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        {/* Username Field */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Username</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                    <User size={18} strokeWidth={2.5} />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Masukkan username..."
                                    className="w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold shadow-sm"
                                    disabled={loading}
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Password</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                    <Lock size={18} strokeWidth={2.5} />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Masukkan password..."
                                    className="w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold shadow-sm"
                                    disabled={loading}
                                    autoComplete="current-password"
                                />
                            </div>

                            {/* Error Message Animation */}
                            <div className={cn(
                                "overflow-hidden transition-all duration-300 ease-in-out",
                                error ? "max-h-16 opacity-100 mt-3" : "max-h-0 opacity-0"
                            )}>
                                <div className="flex items-start gap-2.5 text-[13px] font-bold text-rose-600 bg-rose-50 px-4 py-3 rounded-2xl border border-rose-100 shadow-sm">
                                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !username || !password}
                            className="group relative w-full flex justify-center py-4 px-4 text-sm font-bold rounded-2xl text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-900/10 transition-all overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(0,0,0,0.08)] active:scale-[0.98]"
                        >
                            {/* Hover highlight */}
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                            <div className="relative z-10 flex items-center gap-2.5">
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Memproses...</span>
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck size={18} className="text-slate-400 group-hover:text-blue-200 transition-colors" />
                                        <span>Masuk</span>
                                        <ArrowRight size={18} className="translate-x-0 group-hover:translate-x-1 opacity-50 group-hover:opacity-100 transition-all" />
                                    </>
                                )}
                            </div>
                        </button>
                    </form>

                    <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><ShieldCheck size={12} /> Terenkripsi</span>
                        <span>Khusus Internal</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
