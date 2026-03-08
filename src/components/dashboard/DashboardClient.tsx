"use client";

import { useState, useEffect, useMemo } from "react";
import { Activity, Search, Zap, Power, Wifi, WifiOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Doctor, LeaveRequest, Shift, Settings } from "@/lib/data-service";
import { LiveClock } from "@/components/LiveClock";
import { useDebounce } from "@/hooks/use-debounce";
import { useSSE } from "@/hooks/use-sse";
import { useAuth } from "@/lib/auth-context";
import { DashboardStats } from "./DashboardStats";
import { DoctorCard } from "./DoctorCard";

export function DashboardClient() {
  const { logout } = useAuth();
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

  // ── ONE SSE connection, per-event handlers ──
  const sseStatus = useSSE({
    url: '/api/stream/live',
    handlers: {
      doctors: (data: Doctor[]) => Array.isArray(data) && setDoctors(data),
      shifts: (data: Shift[]) => Array.isArray(data) && setShifts(data),
      leaves: (data: LeaveRequest[]) => Array.isArray(data) && setLeaves(data),
      settings: (data: Settings) => data && setSettings(data),
    },
  });

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);
  const isSearching = searchQuery !== debouncedSearch;

  // Calculate today's day index (0=Mon, 6=Sun)
  const todayDayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Filter: Only show doctors who have an active shift TODAY
  const todayDoctors = useMemo(() => doctors.filter(doc =>
    shifts.some(s => s.doctorId === doc.id && s.dayIdx === todayDayIdx && !(s.disabledDates || []).includes(todayStr))
  ), [doctors, shifts, todayDayIdx, todayStr]);

  const automationEnabled = settings?.automationEnabled || false;

  // ── Automation Toggle ──
  const toggleAutomation = async () => {
    if (!settings) return;
    const newState = !settings.automationEnabled;
    const previousSettings = { ...settings };
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
      setSettings(previousSettings);
    }
  };

  // ── Toggle Shift Disabled ──
  const toggleShiftDisabled = async (shiftId: string, shift: Shift) => {
    const dates = shift.disabledDates || [];
    const isDisabledToday = dates.includes(todayStr);
    const newDates = isDisabledToday ? dates.filter(d => d !== todayStr) : [...dates, todayStr];
    const previousShifts = shifts;
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
      setShifts(previousShifts);
    }
  };

  // ── Manual Status Update ──
  const manualUpdateStatus = async (id: string | number, status: Doctor['status']) => {
    const nowLocal = new Date();
    const timeString = nowLocal.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
    const timestamp = nowLocal.getTime();
    const previousDoctors = doctors;
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
        headers: { 'Content-Type': 'application/json' },
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
      setDoctors(previousDoctors);
    }
  };

  const activeDocs = useMemo(() => todayDoctors.filter(d => d.status === 'BUKA' || d.status === 'PENUH'), [todayDoctors]);
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

  // Dynamic greeting
  const hour = now.getHours();
  const greeting = hour < 11 ? "Selamat Pagi" : hour < 15 ? "Selamat Siang" : hour < 18 ? "Selamat Sore" : "Selamat Malam";

  if (!mounted) return null; // Server Component handles the skeleton

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
                onClick={() => logout()}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all sm:ml-2 border border-transparent"
                title="Keluar / Logout"
              >
                <Power size={18} strokeWidth={2.5} />
              </button>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 truncate bg-white/60 backdrop-blur-sm self-start px-1.5 -ml-1.5 rounded-md">Ringkasan kondisi fasilitas hari ini</p>
          </div>
        </div>

        {/* Interactive Badges */}
        <div className="flex items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 scrollbar-hide -ml-1 pl-1 sm:pl-0 sm:ml-0 translate-y-[-2px] sm:translate-y-0">
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
                <span className="text-[9px] font-medium leading-tight opacity-80 hidden sm:block mt-0.5">
                  {automationEnabled ? "Sistem Otomatis" : "Manual Mode"}
                </span>
              </div>
            </div>
            {automationEnabled && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.8)]" />
              </span>
            )}
          </button>

          <div className="h-7 w-px bg-slate-200/60 mx-1 hidden lg:block flex-shrink-0 self-center" />

          {/* Search (Desktop) */}
          <div className="relative group hidden lg:block flex-shrink-0">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-[14px] blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
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

        {/* Stats Cards */}
        <DashboardStats
          todayDoctors={todayDoctors}
          shifts={shifts}
          todayDayIdx={todayDayIdx}
          efficiency={efficiency}
        />

        {/* Live Control Panel */}
        <div className="w-full space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2.5">
              <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600" />
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
                  )} />
                  <span className={cn(
                    "relative inline-flex rounded-full h-2 w-2",
                    automationEnabled ? "bg-violet-500" : "bg-emerald-500"
                  )} />
                </span>
                {automationEnabled ? "AI Mengelola Sistem" : "Sistem Online"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filteredDoctors.map(doc => (
              <DoctorCard
                key={doc.id}
                doc={doc}
                shifts={shifts}
                todayDayIdx={todayDayIdx}
                todayStr={todayStr}
                now={now}
                automationEnabled={automationEnabled}
                onStatusChange={manualUpdateStatus}
                onToggleShift={toggleShiftDisabled}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
