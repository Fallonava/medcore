"use client";

import { useMemo } from "react";
import { BriefcaseMedical, FileClock, CheckCircle2, BarChart3, TrendingUp } from "lucide-react";
import type { Doctor, Shift } from "@/lib/data-service";

interface DashboardStatsProps {
  todayDoctors: Doctor[];
  shifts: Shift[];
  todayDayIdx: number;
  efficiency: number;
}

export function DashboardStats({ todayDoctors, shifts, todayDayIdx, efficiency }: DashboardStatsProps) {
  const activeDocs = useMemo(() => todayDoctors.filter(d => d.status === 'BUKA' || d.status === 'PENUH'), [todayDoctors]);
  const onLeaveDocs = useMemo(() => todayDoctors.filter(d => d.status === 'CUTI'), [todayDoctors]);
  const todayShiftCount = useMemo(() => shifts.filter(s => s.dayIdx === todayDayIdx).length, [shifts, todayDayIdx]);
  const activePercent = todayDoctors.length > 0 ? (activeDocs.length / todayDoctors.length) * 100 : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-5">
      {/* Stat 1: Dokter Bertugas */}
      <div className="super-glass-card p-5 rounded-[28px] shadow-sm relative overflow-hidden group border border-white/30">
        <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 rounded-full blur-3xl -mr-8 -mt-8 group-hover:bg-blue-500/20 transition-all duration-500" />
        <div className="flex justify-between items-start mb-3 relative z-10">
          <div className="p-2.5 bg-blue-50 text-blue-500 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] backdrop-blur-md">
            <BriefcaseMedical size={20} strokeWidth={2.5} />
          </div>
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
            <TrendingUp size={10} strokeWidth={3} />
            Live
          </span>
        </div>
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10">Bertugas</h3>
        <div className="flex items-baseline gap-2 relative z-10">
          <span className="text-3xl font-black text-slate-800 tracking-tight">{activeDocs.length}</span>
          <span className="text-xs font-semibold text-slate-400">/ {todayDoctors.length}</span>
        </div>
        <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden relative z-10">
          <div className="h-full rounded-full btn-gradient transition-all duration-1000 ease-out" style={{ width: `${activePercent}%` }} />
        </div>
      </div>

      {/* Stat 2: Cuti */}
      <div className="super-glass-card p-5 rounded-[28px] shadow-sm relative overflow-hidden group border border-white/30">
        <div className="absolute top-0 right-0 w-28 h-28 bg-violet-500/10 rounded-full blur-3xl -mr-8 -mt-8 group-hover:bg-violet-500/20 transition-all duration-500" />
        <div className="flex justify-between items-start mb-3 relative z-10">
          <div className="p-2.5 bg-violet-50 text-violet-500 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] backdrop-blur-md">
            <FileClock size={20} strokeWidth={2.5} />
          </div>
        </div>
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10">Cuti</h3>
        <div className="flex items-baseline gap-2 relative z-10">
          <span className="text-3xl font-black text-slate-800 tracking-tight">{onLeaveDocs.length}</span>
          <span className="text-xs font-semibold text-slate-400">dokter</span>
        </div>
      </div>

      {/* Stat 3: Efisiensi */}
      <div className="super-glass-card p-5 rounded-[28px] shadow-sm relative overflow-hidden group border border-white/30">
        <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-3xl -mr-8 -mt-8 group-hover:bg-emerald-500/20 transition-all duration-500" />
        <div className="flex justify-between items-start mb-3 relative z-10">
          <div className="p-2.5 bg-emerald-50 text-emerald-500 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] backdrop-blur-md">
            <CheckCircle2 size={20} strokeWidth={2.5} />
          </div>
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
            <TrendingUp size={10} strokeWidth={3} />
            +2.4%
          </span>
        </div>
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10">Efisiensi</h3>
        <div className="flex items-baseline gap-2 relative z-10">
          <span className="text-3xl font-black text-slate-800 tracking-tight">{efficiency}%</span>
        </div>
      </div>

      {/* Stat 4: Total Shift */}
      <div className="super-glass-card p-5 rounded-[28px] shadow-sm relative overflow-hidden group border border-white/30">
        <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-3xl -mr-8 -mt-8 group-hover:bg-amber-500/20 transition-all duration-500" />
        <div className="flex justify-between items-start mb-3 relative z-10">
          <div className="p-2.5 bg-amber-50 text-amber-500 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] backdrop-blur-md">
            <BarChart3 size={20} strokeWidth={2.5} />
          </div>
        </div>
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10">Shift Hari Ini</h3>
        <div className="flex items-baseline gap-2 relative z-10">
          <span className="text-3xl font-black text-slate-800 tracking-tight">{todayShiftCount}</span>
          <span className="text-xs font-semibold text-slate-400">sesi</span>
        </div>
      </div>
    </div>
  );
}
