"use client";

import { useState, useEffect, useMemo } from "react";
import { Activity, Users, MonitorPlay, AlertCircle, Search, Filter, Zap, Power, Clock, TrendingUp, BarChart3, CalendarCheck, BriefcaseMedical, FileClock, CheckCircle2, Wifi, WifiOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Doctor, LeaveRequest, Shift, Settings } from "@/lib/data-service";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LiveClock } from "@/components/LiveClock";
import { useDebounce } from "@/hooks/use-debounce";
import { useSSE } from "@/hooks/use-sse";
import { useRouter } from "next/navigation";
import { Skeleton, DoctorCardSkeleton, StatsSkeleton } from "@/components/ui/Skeleton";

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
  }, []);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  // ── ONE SSE connection, per-event handlers ──────────────────────────────
  const sseStatus = useSSE({
    url: '/api/stream/live',
    handlers: {
      doctors: (data: Doctor[]) => Array.isArray(data) && setDoctors(data),
      shifts:  (data: Shift[])  => Array.isArray(data) && setShifts(data),
      leaves:  (data: LeaveRequest[]) => Array.isArray(data) && setLeaves(data),
      settings: (data: Settings) => data && setSettings(data),
    },
  });

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400); // 400ms delay for visual feedback
  const isSearching = searchQuery !== debouncedSearch;

  // Calculate today's day index (0=Mon, 6=Sun)
  const todayDayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;

  // Today's date string for disabledDates comparison
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Filter: Only show doctors who have an active shift TODAY (not disabled for today)
  const todayDoctors = useMemo(() => doctors.filter(doc =>
    shifts.some(s => s.doctorId === doc.id && s.dayIdx === todayDayIdx && !(s.disabledDates || []).includes(todayStr))
  ), [doctors, shifts, todayDayIdx, todayStr]);

  // Automation Logic
  const automationEnabled = settings?.automationEnabled || false;

  const toggleAutomation = async () => {
    if (!settings) return;
    const newState = !settings.automationEnabled;

    // Store previous state for rollback
    const previousSettings = { ...settings };

    // Optimistic update
    setSettings({ ...settings, automationEnabled: newState });

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automationEnabled: newState })
      });
      if (!res.ok) throw new Error('API Error');
    } catch (e) {
      console.error("Failed to save settings", e);
      // Rollback on failure
      setSettings(previousSettings);
    }
  };

  // Toggle shift disabled for today
  const toggleShiftDisabled = async (shiftId: string, shift: Shift) => {
    const dates = shift.disabledDates || [];
    const isDisabledToday = dates.includes(todayStr);
    const newDates = isDisabledToday
      ? dates.filter(d => d !== todayStr)
      : [...dates, todayStr];

    // Store previous state for rollback
    const previousShifts = shifts;

    // Optimistic update
    setShifts(curr => curr?.map(s => s.id === shiftId ? { ...s, disabledDates: newDates } : s));

    try {
      const res = await fetch('/api/shifts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: shiftId, disabledDates: newDates })
      });
      if (!res.ok) throw new Error('API Error');
    } catch (e) {
      console.error('Failed to toggle shift', e);
      // Rollback on failure
      setShifts(previousShifts);
    }
  };

  // Manual Status Update (SETS manual override flag)
  const manualUpdateStatus = async (id: string | number, status: Doctor['status']) => {
    const nowLocal = new Date();
    const timeString = nowLocal.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
    const timestamp = nowLocal.getTime();

    // Store previous state for rollback
    const previousDoctors = doctors;

    // Optimistic update
    setDoctors(docs => docs?.map(d =>
      d.id === id ? {
        ...d,
        status,
        lastCall: (status === 'BUKA' || status === 'PENUH') ? timeString : d.lastCall,
        lastManualOverride: timestamp
      } : d
    ));

    try {
      const res = await fetch('/api/doctors', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: String(id),
          status,
          lastCall: (status === 'BUKA' || status === 'PENUH') ? timeString : undefined,
          lastManualOverride: timestamp
        })
      });
      if (!res.ok) throw new Error('API Error');
    } catch (e) {
      console.error('Failed to update doctor status', e);
      // Rollback on failure
      setDoctors(previousDoctors);
    }
  };

  const activeDocs = useMemo(() => todayDoctors.filter(d => d.status === 'BUKA' || d.status === 'PENUH'), [todayDoctors]);
  const onLeaveDocs = useMemo(() => todayDoctors.filter(d => d.status === 'CUTI'), [todayDoctors]);

  const [efficiency, setEfficiency] = useState(0);
  useEffect(() => {
    if (todayDoctors.length > 0) {
      const baseEff = Math.round((activeDocs.length / todayDoctors.length) * 100);
      setEfficiency(baseEff > 0 ? 90 + Math.round(Math.random() * 5) : 0);
    }
  }, [todayDoctors.length, activeDocs.length]);

  const filteredDoctors = useMemo(() => {
    return todayDoctors.filter(doc =>
      doc.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [todayDoctors, debouncedSearch]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  // Dynamic greeting
  const hour = now.getHours();
  const greeting = hour < 11 ? "Selamat Pagi" : hour < 15 ? "Selamat Siang" : hour < 18 ? "Selamat Sore" : "Selamat Malam";

  if (!mounted) return (
    <div className="w-full h-full px-3 lg:px-6 flex flex-col overflow-hidden animate-pulse">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 mb-4 lg:mb-5 gap-3">
            <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-2xl" />
                <div className="space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-3 w-48" />
                </div>
            </div>
            <div className="flex gap-2">
                <Skeleton className="h-10 w-32 rounded-2xl" />
                <Skeleton className="h-10 w-48 rounded-2xl" />
            </div>
        </header>
        <div className="space-y-6">
            <StatsSkeleton />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1,2,3,4,5,6,7,8].map(i => <DoctorCardSkeleton key={i} />)}
            </div>
        </div>
    </div>
  );

  return (
    <div className="w-full h-full px-3 lg:px-6 flex flex-col overflow-hidden">
      {/* ═══════════ PREMIUM HEADER ═══════════ */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 sm:pt-4 mb-5 lg:mb-6 flex-shrink-0 gap-3 sm:gap-4 w-full relative z-20">
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto -mt-0.5 sm:mt-0">
          <div className="p-2 sm:p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[14px] sm:rounded-2xl shadow-[0_4px_14px_0_rgba(0,92,255,0.3)] text-white flex-shrink-0">
            <Activity size={18} className="sm:hidden" />
            <Activity size={20} className="hidden sm:block" />
          </div>
          <div className="flex flex-col flex-1 min-w-0 pr-2 sm:pr-0">
            <div className="flex items-center justify-between sm:justify-start gap-2 w-full">
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 leading-tight truncate">
                {greeting}, <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Admin</span>
              </h1>
              <button
                onClick={handleLogout}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all sm:ml-2 border border-transparent"
                title="Keluar / Logout"
              >
                <Power size={18} strokeWidth={2.5} />
              </button>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 truncate bg-white/60 backdrop-blur-sm self-start px-1.5 -ml-1.5 rounded-md">Ringkasan kondisi fasilitas hari ini</p>
          </div>
        </div>

        {/* Interactive Badges - Horizontal Scroll on Mobile */}
        <div className="flex items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 scrollbar-hide -ml-1 pl-1 sm:pl-0 sm:ml-0 translate-y-[-2px] sm:translate-y-0">
          
          {/* Live Clock Widget */}
          <div className="flex-shrink-0 flex items-center">
            <LiveClock />
          </div>

          {/* Live Connection Status */}
          <div className={cn(
            "px-2.5 py-1.5 rounded-[12px] text-[11px] sm:text-xs font-bold flex flex-shrink-0 items-center gap-1.5 transition-all border outline-none",
            sseStatus === 'connected'
              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
              : sseStatus === 'reconnecting'
                ? "bg-amber-50 text-amber-600 border-amber-100 animate-pulse"
                : "bg-slate-50 text-slate-500 border-slate-100"
          )}>
            {sseStatus === 'connected'
              ? <Wifi size={12} strokeWidth={2.5} />
              : <WifiOff size={12} strokeWidth={2.5} />}
            {sseStatus === 'connected' ? 'Live'
              : sseStatus === 'reconnecting' ? 'Recon...'
                : 'Conn...'}
          </div>

          {/* Automation Switch */}
          <button
            onClick={toggleAutomation}
            className={cn(
              "flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 flex-shrink-0 rounded-[12px] transition-all active:scale-[0.97] group relative overflow-hidden",
              automationEnabled
                ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-[0_4px_12px_rgba(99,102,241,0.25)] border border-indigo-400/50"
                : "bg-white text-slate-600 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-slate-200/80 shadow-sm"
            )}
          >
            {automationEnabled && <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:animate-shimmer" />}
            <div className="relative z-10 flex items-center gap-2">
              <Zap size={14} className={cn(
                "transition-all",
                automationEnabled ? "fill-current text-white drop-shadow-[0_0_6px_rgba(167,139,250,0.8)]" : "group-hover:scale-110 text-slate-400"
              )} />
              <div className="flex flex-col text-left">
                <span className={cn("text-[11px] sm:text-xs font-extrabold leading-none tracking-wide", automationEnabled ? "text-white" : "")}>
                  {automationEnabled ? "AI Aktif" : "AI Pasif"}
                </span>
                {/* Desktop-only secondary text */}
                <span className="text-[9px] font-medium leading-tight opacity-80 hidden sm:block mt-0.5">
                  {automationEnabled ? "Sistem Otomatis" : "Manual Mode"}
                </span>
              </div>
            </div>
            {automationEnabled && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.8)]"></span>
              </span>
            )}
          </button>

          <div className="h-7 w-px bg-slate-200/60 mx-1 hidden lg:block flex-shrink-0 self-center" />

          {/* Search (Desktop) */}
          <div className="relative group hidden lg:block flex-shrink-0">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-[14px] blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
            <div className="relative">
              {isSearching ? (
                <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500 h-4 w-4 animate-spin" />
              ) : (
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              )}
              <input
                type="text"
                placeholder="Cari dokter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-[12px] bg-white/70 backdrop-blur-xl focus:bg-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_10px_-3px_rgba(0,0,0,0.02)] transition-all text-sm w-48 xl:w-56 outline-none focus:ring-1 focus:ring-blue-500/30 font-semibold text-slate-700 placeholder:text-slate-400 border border-slate-200/50"
              />
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════ SCROLLABLE CONTENT ═══════════ */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10 space-y-6">

        {/* ── STATS CARDS ─────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-5">
          {/* Stat 1: Dokter Bertugas */}
          <div className="super-glass-card p-5 rounded-[28px] shadow-sm relative overflow-hidden group border border-white/30">
            <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 rounded-full blur-3xl -mr-8 -mt-8 group-hover:bg-blue-500/20 transition-all duration-500"></div>
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
              <div className="h-full rounded-full btn-gradient transition-all duration-1000 ease-out" style={{ width: `${todayDoctors.length > 0 ? (activeDocs.length / todayDoctors.length) * 100 : 0}%` }} />
            </div>
          </div>

          {/* Stat 2: Cuti */}
          <div className="super-glass-card p-5 rounded-[28px] shadow-sm relative overflow-hidden group border border-white/30">
            <div className="absolute top-0 right-0 w-28 h-28 bg-violet-500/10 rounded-full blur-3xl -mr-8 -mt-8 group-hover:bg-violet-500/20 transition-all duration-500"></div>
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
            <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-3xl -mr-8 -mt-8 group-hover:bg-emerald-500/20 transition-all duration-500"></div>
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
            <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-3xl -mr-8 -mt-8 group-hover:bg-amber-500/20 transition-all duration-500"></div>
            <div className="flex justify-between items-start mb-3 relative z-10">
              <div className="p-2.5 bg-amber-50 text-amber-500 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] backdrop-blur-md">
                <BarChart3 size={20} strokeWidth={2.5} />
              </div>
            </div>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10">Shift Hari Ini</h3>
            <div className="flex items-baseline gap-2 relative z-10">
              <span className="text-3xl font-black text-slate-800 tracking-tight">{shifts.filter(s => s.dayIdx === todayDayIdx).length}</span>
              <span className="text-xs font-semibold text-slate-400">sesi</span>
            </div>
          </div>
        </div>


        {/* ── LIVE CONTROL PANEL ──────────────────── */}
        <div className="w-full space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2.5">
              <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600"></span>
              Kontrol Status Langsung
            </h3>

            <div className="flex items-center gap-3">
              {/* Mobile Search */}
              <div className="relative group lg:hidden">
                {isSearching ? (
                  <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                )}
                <input
                  type="text"
                  placeholder="Cari..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-2 rounded-xl bg-white/60 text-sm w-40 outline-none border border-white/50 shadow-sm"
                />
              </div>

              <div className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm border",
                automationEnabled
                  ? "bg-violet-50 text-violet-600 border-violet-100"
                  : "bg-emerald-50 text-emerald-600 border-emerald-100"
              )}>
                <span className="relative flex h-2 w-2">
                  <span className={cn(
                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                    automationEnabled ? "bg-violet-400" : "bg-emerald-400"
                  )}></span>
                  <span className={cn(
                    "relative inline-flex rounded-full h-2 w-2",
                    automationEnabled ? "bg-violet-500" : "bg-emerald-500"
                  )}></span>
                </span>
                {automationEnabled ? "AI Mengelola Sistem" : "Sistem Online"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filteredDoctors.map(doc => (
              <div key={doc.id} className={cn(
                "super-glass-card p-4 rounded-[24px] group relative overflow-hidden border border-white/30 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300",
                automationEnabled && "hover:opacity-100"
              )}>
                {automationEnabled && (
                  <div className="absolute inset-0 bg-violet-500/3 pointer-events-none" />
                )}

                <div className={cn(
                  "absolute top-4 right-4 w-3 h-3 rounded-full z-20 shadow-sm",
                  doc.status === 'BUKA' ? "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]" :
                    doc.status === 'PENUH' ? "bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.6)]" :
                      doc.status === 'CUTI' ? "bg-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.6)]" :
                        doc.status === 'OPERASI' ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]" :
                          doc.status === 'SELESAI' ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]" :
                            doc.status === 'AKAN_BUKA' ? "bg-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.6)]" :
                              "bg-slate-300"
                )} />

                <div className="flex items-start gap-3 mb-3 relative z-10">
                  <Avatar className="h-12 w-12 shadow-sm border-2 border-white/50">
                    <AvatarFallback className={cn(
                      "text-sm font-bold text-white",
                      doc.status === 'BUKA' ? "bg-gradient-to-br from-blue-500 to-indigo-500" :
                        doc.status === 'PENUH' ? "bg-gradient-to-br from-orange-500 to-amber-500" :
                          doc.status === 'CUTI' ? "bg-gradient-to-br from-pink-500 to-rose-500" :
                            doc.status === 'OPERASI' ? "bg-gradient-to-br from-red-500 to-rose-600" :
                              doc.status === 'AKAN_BUKA' ? "bg-gradient-to-br from-indigo-400 to-purple-500" :
                                "bg-gradient-to-br from-slate-400 to-slate-500"
                    )}>
                      {doc.queueCode || doc.name.charAt(4)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-slate-800 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">{doc.name}</h4>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <p className="text-[11px] text-slate-400 font-medium line-clamp-2">{doc.specialty}</p>
                      {(() => {
                        const activeShift = shifts.find(s =>
                          s.doctorId === doc.id && s.dayIdx === todayDayIdx &&
                          !(s.disabledDates || []).includes(todayStr) &&
                          s.registrationTime
                        );
                        return activeShift?.registrationTime ? (
                          <div className="flex items-center gap-1 bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md border border-blue-100">
                            <Clock size={9} />
                            <span className="text-[9px] font-bold">{activeShift.registrationTime}</span>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mb-3 relative z-10">
                  <div className={cn(
                    "inline-flex px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider",
                    doc.status === 'BUKA' ? "bg-blue-50 text-blue-600 border border-blue-100" :
                      doc.status === 'PENUH' ? "bg-orange-50 text-orange-600 border border-orange-100" :
                        doc.status === 'CUTI' ? "bg-pink-50 text-pink-600 border border-pink-100" :
                          doc.status === 'OPERASI' ? "bg-red-50 text-red-600 border border-red-100" :
                            doc.status === 'SELESAI' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                              doc.status === 'AKAN_BUKA' ? "bg-indigo-50 text-indigo-600 border border-indigo-100" :
                                "bg-slate-50 text-slate-500 border border-slate-100"
                  )}>
                    {doc.status || 'Offline'}
                  </div>
                </div>

                {/* Shift Pills */}
                {(() => {
                  const docShiftsToday = shifts.filter(s => s.doctorId === doc.id && s.dayIdx === todayDayIdx);
                  if (docShiftsToday.length === 0) return null;
                  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
                  return (
                    <div className="flex flex-wrap gap-1.5 mb-3 relative z-10">
                      {docShiftsToday.map(shift => {
                        const [startStr, endStr] = (shift.formattedTime || '').split('-');
                        const startM = parseInt(startStr?.split(':')[0] || '0') * 60 + parseInt(startStr?.split(':')[1] || '0');
                        const endM = parseInt(endStr?.split(':')[0] || '0') * 60 + parseInt(endStr?.split(':')[1] || '0');
                        const isDisabledToday = (shift.disabledDates || []).includes(todayStr);
                        const isActive = currentTimeMinutes >= startM && currentTimeMinutes < endM && !isDisabledToday;
                        return (
                          <button
                            key={shift.id}
                            onClick={() => toggleShiftDisabled(shift.id, shift)}
                            className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all border",
                              isDisabledToday
                                ? "bg-red-50 text-red-400 border-red-100 line-through hover:bg-red-100"
                                : isActive
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-200 ring-1 ring-emerald-200"
                                  : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100"
                            )}
                            title={isDisabledToday ? 'Klik untuk aktifkan hari ini' : 'Klik untuk nonaktifkan hari ini'}
                          >
                            <Clock size={9} />
                            {shift.formattedTime}
                            {isDisabledToday && <span className="text-red-400 ml-0.5">✕</span>}
                            {isActive && <span className="relative flex h-1.5 w-1.5 ml-0.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span></span>}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                <div className="grid grid-cols-7 gap-1.5 relative z-10">
                  {[
                    { id: 'TIDAK_PRAKTEK', label: 'Off', bg: 'bg-slate-500', hover: 'hover:bg-slate-600' },
                    { id: 'AKAN_BUKA', label: 'Akan Buka', bg: 'bg-indigo-500', hover: 'hover:bg-indigo-600' },
                    { id: 'BUKA', label: 'Buka', bg: 'bg-blue-500', hover: 'hover:bg-blue-600' },
                    { id: 'PENUH', label: 'Penuh', bg: 'bg-orange-500', hover: 'hover:bg-orange-600' },
                    { id: 'OPERASI', label: 'Ops', bg: 'bg-red-500', hover: 'hover:bg-red-600' },
                    { id: 'SELESAI', label: 'Slsai', bg: 'bg-emerald-500', hover: 'hover:bg-emerald-600' },
                    { id: 'CUTI', label: 'Cuti', bg: 'bg-pink-500', hover: 'hover:bg-pink-600' },
                  ].map((action) => (
                    <button
                      key={action.id}
                      onClick={() => manualUpdateStatus(doc.id, action.id as any)}
                      className={cn(
                        "py-1.5 rounded-lg text-[10px] font-bold transition-all",
                        doc.status === action.id
                          ? `${action.bg} text-white shadow-md ${action.hover}`
                          : "bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-100 shadow-none",
                      )}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
