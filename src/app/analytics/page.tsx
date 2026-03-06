"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import {
    BarChart3,
    TrendingUp,
    Users,
    Clock,
    Activity,
    Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Doctor, Shift } from "@/lib/data-service";

// Lazy-load the heavy recharts charts — defers ~200KB from initial bundle
const AnalyticsCharts = dynamic(
    () => import("@/components/analytics/AnalyticsCharts").then(mod => ({ default: mod.AnalyticsCharts })),
    {
        ssr: false,
        loading: () => (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 super-glass-card p-6 rounded-[32px] shadow-sm border border-white/50 h-[400px] flex items-center justify-center">
                    <div className="text-sm font-bold text-slate-300 animate-pulse">Loading charts...</div>
                </div>
                <div className="super-glass-card p-6 rounded-[32px] shadow-sm border border-white/50 h-[400px] flex items-center justify-center">
                    <div className="text-sm font-bold text-slate-300 animate-pulse">Loading charts...</div>
                </div>
            </div>
        )
    }
);


export default function AnalyticsPage() {
    const { data: doctors = [] } = useSWR<Doctor[]>('/api/doctors');
    const { data: shifts = [] } = useSWR<Shift[]>('/api/shifts');
    const [timeRange, setTimeRange] = useState("7 Hari Terakhir");

    // Calculate some real stats from current data
    const { totalDoctors, activeDoctors, utilizationRate, activeDoctorsList } = useMemo(() => {
        const totalDoctors = doctors.length;
        const activeDoctorsList = doctors.filter(d => d.status === 'BUKA' || d.status === 'PENUH');
        const activeDoctors = activeDoctorsList.length;
        const utilizationRate = totalDoctors > 0 ? Math.round((activeDoctors / totalDoctors) * 100) : 0;
        return { totalDoctors, activeDoctors, utilizationRate, activeDoctorsList };
    }, [doctors]);

    return (
        <div className="w-full h-full px-2 lg:px-6 flex flex-col overflow-hidden">
            {/* ── Header ────────────────────────────────────────────── */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 sm:pt-4 mb-5 lg:mb-6 gap-3 sm:gap-4 flex-shrink-0 w-full relative z-20">
                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                    <div className="p-2 sm:p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-[14px] sm:rounded-2xl shadow-[0_4px_14px_0_rgba(139,92,246,0.3)] text-white flex-shrink-0">
                        <BarChart3 size={18} className="sm:hidden" />
                        <BarChart3 size={22} className="hidden sm:block" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0 pr-2 sm:pr-0">
                        <h1 className="text-lg sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 leading-tight truncate">
                            <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">Analitik</span>
                        </h1>
                        <p className="text-[11px] sm:text-xs lg:text-sm text-slate-500 font-medium mt-0.5 truncate bg-white/60 backdrop-blur-sm self-start px-1.5 -ml-1.5 rounded-md">Dasbor performa klinik secara real-time</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 flex-wrap w-full sm:w-auto overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 scrollbar-hide -ml-1 pl-1 sm:pl-0 sm:ml-0 translate-y-[-2px] sm:translate-y-0">
                    {/* Time Filter */}
                    <div className="relative group flex-shrink-0">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-[14px] blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                        <div className="relative flex items-center bg-white/70 backdrop-blur-xl rounded-[12px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_10px_-3px_rgba(0,0,0,0.02)] border border-slate-200/50 p-1">
                            {["Hari Ini", "7 Hari Terakhir", "Bulan Ini"].map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={cn(
                                        "px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-[10px] text-[10px] sm:text-xs font-bold transition-all duration-300 whitespace-nowrap",
                                        timeRange === range
                                            ? "bg-white text-blue-600 shadow-sm scale-105"
                                            : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                                    )}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Export Button */}
                    <button className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 sm:p-2.5 px-3 sm:px-4 rounded-[12px] text-white font-bold flex items-center gap-2 text-[11px] sm:text-sm shadow-[0_4px_14px_0_rgba(0,92,255,0.39)] hover:scale-105 transition-transform group relative overflow-hidden flex-shrink-0">
                        <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:animate-shimmer" />
                        <Download size={14} className="relative z-10 sm:hidden" />
                        <Download size={18} className="relative z-10 hidden sm:block" />
                        <span className="relative z-10">Export Report</span>
                    </button>
                </div>
            </header>

            {/* ── Main Scrollable Content ────────────────────────────── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10 space-y-6">

                {/* Top Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {/* Stat 1 */}
                    <div className="super-glass-card p-6 rounded-[32px] shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-blue-500/20 transition-all duration-500"></div>
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="p-3 bg-white/60 text-blue-600 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] backdrop-blur-md">
                                <Users size={22} strokeWidth={2.5} />
                            </div>
                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                                <TrendingUp size={12} strokeWidth={3} />
                                +12.5%
                            </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-500 mb-1 relative z-10">Total Kunjungan Pasien</h3>
                        <div className="flex items-baseline gap-2 relative z-10">
                            <span className="text-4xl font-black text-slate-800 tracking-tight">1,248</span>
                            <span className="text-xs font-medium text-slate-400">minggu ini</span>
                        </div>
                    </div>

                    {/* Stat 2 */}
                    <div className="super-glass-card p-6 rounded-[32px] shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-emerald-500/20 transition-all duration-500"></div>
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="p-3 bg-white/60 text-emerald-600 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] backdrop-blur-md">
                                <Clock size={22} strokeWidth={2.5} />
                            </div>
                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                                <TrendingUp size={12} strokeWidth={3} className="rotate-180" />
                                -5.2%
                            </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-500 mb-1 relative z-10">Rata-rata Waktu Tunggu</h3>
                        <div className="flex items-baseline gap-2 relative z-10">
                            <span className="text-4xl font-black text-slate-800 tracking-tight">14<span className="text-xl">m</span></span>
                            <span className="text-xs font-medium text-slate-400">per pasien</span>
                        </div>
                    </div>

                    {/* Stat 3 */}
                    <div className="super-glass-card p-6 rounded-[32px] shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-purple-500/20 transition-all duration-500"></div>
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="p-3 bg-white/60 text-purple-600 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] backdrop-blur-md">
                                <Activity size={22} strokeWidth={2.5} />
                            </div>
                            <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                                <TrendingUp size={12} strokeWidth={3} />
                                +2.4%
                            </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-500 mb-1 relative z-10">Utilisasi Dokter Aktif</h3>
                        <div className="flex items-baseline gap-2 relative z-10">
                            <span className="text-4xl font-black text-slate-800 tracking-tight">{utilizationRate}%</span>
                            <span className="text-xs font-medium text-slate-400">{activeDoctors} / {totalDoctors} dokter</span>
                        </div>
                    </div>

                    {/* Stat 4 */}
                    <div className="super-glass-card p-6 rounded-[32px] shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-rose-500/20 transition-all duration-500"></div>
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="p-3 bg-white/60 text-rose-600 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] backdrop-blur-md">
                                <Activity size={22} strokeWidth={2.5} />
                            </div>
                        </div>
                        <h3 className="text-sm font-bold text-slate-500 mb-1 relative z-10">Kepuasan Pelayanan</h3>
                        <div className="flex items-baseline gap-2 relative z-10">
                            <span className="text-4xl font-black text-slate-800 tracking-tight">4.8</span>
                            <span className="text-xs font-medium text-slate-400">/ 5.0</span>
                        </div>
                    </div>
                </div>

                {/* Charts Container — lazy-loaded to defer ~200KB recharts bundle */}
                <AnalyticsCharts shifts={shifts} />

                {/* Live Patient Pipeline */}
                <div className="offscreen-section super-glass-card p-6 rounded-[32px] shadow-sm border border-white/50 relative overflow-hidden mt-6">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>

                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                                Live Patient Pipeline
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                                </span>
                            </h2>
                            <p className="text-xs font-medium text-slate-400">Antrian berjalan di seluruh poliklinik</p>
                        </div>
                        <button className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-white px-3 py-1.5 rounded-xl transition-colors shadow-sm border border-blue-100/50">
                            Lihat Semua
                        </button>
                    </div>

                    <div className="space-y-3 relative z-10">
                        {activeDoctorsList.length > 0 ? activeDoctorsList.slice(0, 4).map((doc, i) => (
                            <div key={doc.id} className="group flex items-center justify-between p-4 bg-white/40 hover:bg-white/80 rounded-2xl border border-white/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                        {doc.image ? (
                                            <AvatarImage src={doc.image} alt={doc.name} className="object-cover" />
                                        ) : (
                                            <AvatarFallback className="bg-gradient-to-tr from-blue-500 to-indigo-500 text-white text-xs font-bold">{doc.queueCode || doc.name.charAt(0)}</AvatarFallback>
                                        )}
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{doc.name}</p>
                                        <p className="text-[11px] text-slate-500 font-medium">{doc.specialty}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-0.5">EST. WAKTU</p>
                                        <p className="text-xs font-bold text-slate-700">{15 + (i * 5)} min</p>
                                    </div>
                                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner hidden md:block">
                                        <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full" style={{ width: `${80 - (i * 15)}%` }}></div>
                                    </div>
                                    <div className={cn("px-3 py-1 rounded-xl text-xs font-bold shadow-sm whitespace-nowrap", doc.status === 'BUKA' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100")}>
                                        {doc.status === 'BUKA' ? 'TERIMA PASIEN' : 'ANTRIAN PENUH'}
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-8 text-slate-400 flex flex-col items-center gap-2">
                                <Clock size={32} className="opacity-20 mb-2" />
                                <p className="text-sm font-bold">Belum ada aktivitas poliklinik</p>
                                <p className="text-xs font-medium">Data antrian live akan muncul di sini</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
