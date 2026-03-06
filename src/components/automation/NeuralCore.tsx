"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { BrainCircuit, RotateCw, Users, Calendar, Activity, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Shift, Doctor, BroadcastRule } from "@/lib/data-service";

export function NeuralCore() {
    const { data: shifts = [] } = useSWR<Shift[]>('/api/shifts');
    const { data: doctors = [] } = useSWR<Doctor[]>('/api/doctors');
    const { data: broadcasts = [] } = useSWR<BroadcastRule[]>('/api/automation');
    const [syncCountdown, setSyncCountdown] = useState(300);

    useEffect(() => {
        const iv = setInterval(() => {
            setSyncCountdown(prev => (prev <= 0 ? 300 : prev - 1));
        }, 1000);
        return () => clearInterval(iv);
    }, []);

    const formatCountdown = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    const { totalShifts, totalDoctors, activeBroadcasts, todayShifts, efficiency, circumference, dashOffset } = useMemo(() => {
        const totalShifts = shifts.length;
        const totalDoctors = doctors.length;
        const activeBroadcasts = broadcasts.filter(b => b.active).length;
        const now = new Date();
        const todayDayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;
        const todayShifts = shifts.filter(s => s.dayIdx === todayDayIdx).length;
        const efficiency = totalDoctors > 0 ? Math.min(Math.round((totalShifts / (totalDoctors * 1.5)) * 100), 100) : 0;
        const circumference = 2 * Math.PI * 60;
        const dashOffset = circumference - (efficiency / 100) * circumference;
        return { totalShifts, totalDoctors, activeBroadcasts, todayShifts, efficiency, circumference, dashOffset };
    }, [shifts, doctors, broadcasts]);

    return (
        <div className="relative flex flex-col rounded-3xl border border-slate-200 bg-white p-6 overflow-hidden group shadow-lg shadow-slate-200/60 transition-all duration-500 hover:shadow-xl hover:border-slate-300">
            {/* Soft ambient light glows */}
            <div className="absolute top-0 right-0 h-40 w-40 bg-blue-50 blur-[80px] -z-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 h-32 w-32 bg-indigo-50 blur-[60px] -z-10 pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="flex gap-4">
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-lg shadow-blue-300/40 group-hover:shadow-blue-400/50 transition-shadow duration-500">
                        <div className="absolute inset-0 rounded-2xl border border-white/30" />
                        <BrainCircuit className="text-white h-7 w-7" />
                        <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white animate-pulse shadow-sm" />
                    </div>
                    <div className="flex flex-col justify-center">
                        <h3 className="text-lg font-bold text-slate-800 tracking-tight">Neural Engine</h3>
                        <p className="text-[11px] text-blue-600 font-mono uppercase tracking-widest mt-0.5 flex items-center gap-1.5 font-semibold">
                            <Cpu size={12} /> Core Process
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
                    <Activity className="h-3 w-3 text-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Monitoring</span>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 grid grid-cols-2 gap-5 relative z-10">
                {/* Circular Progress */}
                <div className="relative flex items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-inner">
                    <svg className="w-36 h-36 transform -rotate-90">
                        <circle cx="72" cy="72" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-200" />
                        <circle
                            cx="72" cy="72" r="60" stroke="currentColor" strokeWidth="8" fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={dashOffset}
                            className="text-blue-500 transition-all duration-[1500ms] ease-out"
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="flex items-baseline gap-0.5">
                            <span className="text-4xl font-black text-slate-800">{efficiency}</span>
                            <span className="text-xl font-bold text-blue-500">%</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Efficiency</span>
                    </div>
                </div>

                {/* Stats */}
                <div className="flex flex-col gap-4">
                    {/* Doctors Card */}
                    <div className="group/stat bg-blue-50 hover:bg-blue-100/60 rounded-2xl p-4 border border-blue-100 transition-all duration-300 relative overflow-hidden flex-1 flex flex-col justify-center shadow-sm">
                        <div className="absolute right-[-8px] top-[-8px] text-blue-100/80 group-hover/stat:scale-110 transition-all duration-500">
                            <Users size={56} />
                        </div>
                        <div className="flex items-center gap-2 mb-2 relative z-10">
                            <div className="p-1.5 rounded-lg bg-blue-200/60 text-blue-700">
                                <Users size={12} />
                            </div>
                            <p className="text-[10px] text-blue-700 uppercase font-bold tracking-wider">Active Doctors</p>
                        </div>
                        <span className="text-2xl font-black text-blue-900 relative z-10">{totalDoctors}</span>
                    </div>

                    {/* Shifts Card */}
                    <div className="group/stat bg-violet-50 hover:bg-violet-100/60 rounded-2xl p-4 border border-violet-100 transition-all duration-300 relative overflow-hidden flex-1 flex flex-col justify-center shadow-sm">
                        <div className="absolute right-[-8px] top-[-8px] text-violet-100/80 group-hover/stat:scale-110 transition-all duration-500">
                            <Calendar size={56} />
                        </div>
                        <div className="flex items-center gap-2 mb-2 relative z-10">
                            <div className="p-1.5 rounded-lg bg-violet-200/60 text-violet-700">
                                <Calendar size={12} />
                            </div>
                            <p className="text-[10px] text-violet-700 uppercase font-bold tracking-wider">Total Shifts</p>
                        </div>
                        <div className="flex items-baseline gap-2 relative z-10">
                            <span className="text-2xl font-black text-violet-900">{totalShifts}</span>
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                                {todayShifts} Today
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Status Panel */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
                    {[
                        { label: "Scheduling Engine", ok: true },
                        { label: "Broadcast Service", ok: activeBroadcasts > 0 },
                        { label: "Data Pipeline", ok: true },
                    ].map((s, i) => (
                        <div key={i} className="flex items-center gap-2 whitespace-nowrap bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                            <div className={cn(
                                "h-2 w-2 rounded-full",
                                s.ok ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]"
                            )} />
                            <span className="text-[11px] text-slate-600 font-semibold">{s.label}</span>
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl shrink-0 shadow-sm">
                    <RotateCw size={14} className="text-blue-500 animate-spin" style={{ animationDuration: '4s' }} />
                    <div className="flex flex-col">
                        <span className="text-[9px] text-blue-500 uppercase font-bold tracking-[0.15em] leading-none mb-1">Next Sync</span>
                        <span className="text-sm font-mono font-bold text-blue-700 leading-none">{formatCountdown(syncCountdown)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
