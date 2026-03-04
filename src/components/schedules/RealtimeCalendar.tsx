"use client";

import { useState, Fragment, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { ChevronLeft, ChevronRight, Plus, X, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Shift, Doctor } from "@/lib/data-service";

const HOURS = [
    { label: "07:00", hour: 7 },
    { label: "08:00", hour: 8 },
    { label: "09:00", hour: 9 },
    { label: "10:00", hour: 10 },
    { label: "11:00", hour: 11 },
    { label: "12:00", hour: 12 },
    { label: "13:00", hour: 13 },
    { label: "14:00", hour: 14 },
    { label: "15:00", hour: 15 },
    { label: "16:00", hour: 16 },
    { label: "17:00", hour: 17 },
    { label: "18:00", hour: 18 },
    { label: "19:00", hour: 19 },
    { label: "20:00", hour: 20 },
];

const SHIFT_COLORS = [
    { bg: "bg-blue-500/10 backdrop-blur-md", border: "border-blue-500/20 text-blue-700", text: "text-blue-800", dot: "bg-blue-500", innerBg: "bg-white/40", timeText: "text-blue-700", dotIcon: "text-blue-500" },
    { bg: "bg-emerald-500/10 backdrop-blur-md", border: "border-emerald-500/20 text-emerald-700", text: "text-emerald-800", dot: "bg-emerald-500", innerBg: "bg-white/40", timeText: "text-emerald-700", dotIcon: "text-emerald-500" },
    { bg: "bg-violet-500/10 backdrop-blur-md", border: "border-violet-500/20 text-violet-700", text: "text-violet-800", dot: "bg-violet-500", innerBg: "bg-white/40", timeText: "text-violet-700", dotIcon: "text-violet-500" },
    { bg: "bg-amber-500/10 backdrop-blur-md", border: "border-amber-500/20 text-amber-700", text: "text-amber-800", dot: "bg-amber-500", innerBg: "bg-white/40", timeText: "text-amber-700", dotIcon: "text-amber-500" },
    { bg: "bg-rose-500/10 backdrop-blur-md", border: "border-rose-500/20 text-rose-700", text: "text-rose-800", dot: "bg-rose-500", innerBg: "bg-white/40", timeText: "text-rose-700", dotIcon: "text-rose-500" },
    { bg: "bg-cyan-500/10 backdrop-blur-md", border: "border-cyan-500/20 text-cyan-700", text: "text-cyan-800", dot: "bg-cyan-500", innerBg: "bg-white/40", timeText: "text-cyan-700", dotIcon: "text-cyan-500" },
];

interface RealtimeCalendarProps {
    selectedDate: Date;
    onDateChange: (date: Date) => void;
}

export function RealtimeCalendar({ selectedDate, onDateChange }: RealtimeCalendarProps) {
    const { data: shifts = [] } = useSWR<Shift[]>('/api/shifts');
    const { data: doctors = [] } = useSWR<Doctor[]>('/api/doctors');

    // ─── Real-time Updates via SSE ───
    useEffect(() => {
        const eventSource = new EventSource('/api/realtime/doctors');

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('[SSE] Received doctor updates:', data);
                // Trigger SWR mutation to re-fetch data
                mutate('/api/doctors');
                mutate('/api/shifts');
            } catch (err) {
                console.error('[SSE] Failed to parse message:', err);
            }
        };

        eventSource.onerror = (err) => {
            console.error('[SSE] EventSource failed:', err);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, []);

    const [showAddModal, setShowAddModal] = useState(false);
    const [newShift, setNewShift] = useState({
        doctor: "",
        doctorId: "",
        dayIdx: 0,
        start: "08:00",
        end: "12:00",
        title: "Praktek",
        registrationTime: "07:30"
    });

    const fetchData = () => {
        mutate('/api/shifts');
        mutate('/api/doctors');
    };

    // Since we are showing daily view, weekDays and weekly navigation are no longer needed
    // We only need info for the single selectedDate
    const currentDayIdx = selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1;

    // Date formatter for header
    const formatDateObj = (d: Date) => {
        return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    };

    // Map shift to hour row
    const getShiftHour = (shift: Shift): number => {
        if (shift.formattedTime) {
            const h = parseInt(shift.formattedTime.split(':')[0]);
            if (!isNaN(h)) return h;
        }
        return 8;
    };

    // Color by doctor name (consistent)
    const getColor = (name: string) => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return SHIFT_COLORS[Math.abs(hash) % SHIFT_COLORS.length];
    };

    const handleAddShift = async () => {
        const formattedTime = `${newShift.start}-${newShift.end}`;
        await fetch('/api/shifts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                doctor: newShift.doctor,
                doctorId: newShift.doctorId,
                title: newShift.title,
                dayIdx: newShift.dayIdx,
                timeIdx: 0,
                formattedTime,
                registrationTime: newShift.registrationTime,
                color: 'blue'
            })
        });
        setShowAddModal(false);
        setNewShift({ doctor: "", doctorId: "", dayIdx: 0, start: "08:00", end: "12:00", title: "Praktek", registrationTime: "07:30" });
        fetchData();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this shift?")) return;
        await fetch(`/api/shifts?id=${id}`, { method: 'DELETE' });
        fetchData();
    };

    // Selected Date formatted for disabled date checks
    const todayStr = selectedDate.getFullYear() + '-' + String(selectedDate.getMonth() + 1).padStart(2, '0') + '-' + String(selectedDate.getDate()).padStart(2, '0');

    return (
        <div className="flex-1 flex flex-col min-h-0 relative h-full">
            {/* ── Header Controls ──────────────────────────────── */}
            <div className="flex items-center justify-between mb-4 px-1 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-extrabold text-foreground capitalize tracking-tight">{formatDateObj(selectedDate)}</h2>
                </div>

                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn-gradient px-4 py-2.5 rounded-[14px] flex items-center gap-2 text-sm font-black shadow-[0_4px_14px_0_rgba(0,92,255,0.39)] transition-all active:scale-95 group overflow-hidden relative text-white"
                >
                    <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:animate-shimmer" />
                    <Plus size={16} className="relative z-10" />
                    <span className="relative z-10">Add Shift</span>
                </button>
            </div>

            {/* ── Daily Grid ──────────────────────────────────── */}
            <div className="flex-1 min-h-0 super-glass-card rounded-[32px] shadow-sm overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto w-full custom-scrollbar pr-1 pb-4">
                    <div className="min-w-full">

                        {/* Hour Rows for single day */}
                        {HOURS.map((slot, hIdx) => {
                            // Filter shifts that fall on this day and hour, AND are not disabled for this specific date
                            const cellShifts = shifts.filter(s =>
                                s.dayIdx === currentDayIdx &&
                                getShiftHour(s) === slot.hour &&
                                !(s.disabledDates || []).includes(todayStr)
                            );

                            return (
                                <div key={`h-${hIdx}`} className="grid grid-cols-[80px_1fr] border-b border-slate-200/50 last:border-b-0 min-h-[72px] group/row hover:bg-white/40 transition-colors relative">

                                    {/* Time label */}
                                    <div className="p-4 text-right bg-white/40 flex flex-col items-end backdrop-blur-md border-r border-white/50">
                                        <span className="text-[12px] font-black text-slate-500 tracking-wider bg-white/60 px-2 py-1 rounded-lg shadow-sm border border-slate-100/50">{slot.label}</span>
                                    </div>

                                    {/* Timeline content */}
                                    <div className="p-2.5 relative">
                                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-slate-200/50 pointer-events-none" />

                                        <div className="flex flex-wrap gap-2.5 relative z-10">
                                            {cellShifts.map((shift, sIdx) => {
                                                const color = getColor(shift.doctor || 'Unknown');
                                                return (
                                                    <div
                                                        key={shift.id}
                                                        className={cn(
                                                            "group/card flex-1 min-w-[220px] max-w-[300px] p-3 rounded-2xl cursor-default transition-all duration-300 hover:-translate-y-0.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] hover:shadow-[0_12px_30px_-8px_rgba(0,0,0,0.15)]",
                                                            color.bg, color.border
                                                        )}
                                                    >
                                                        <div className="flex items-start justify-between gap-2 mb-2">
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <div className={cn("w-2 h-2 rounded-full flex-shrink-0 shadow-sm", color.dot)} />
                                                                <p className={cn("text-xs font-bold truncate tracking-tight", color.text)}>{shift.doctor || 'Unknown'}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => handleDelete(shift.id)}
                                                                className="opacity-0 group-hover/card:opacity-100 p-1.5 bg-white/60 rounded-lg text-slate-400 hover:text-destructive hover:bg-white shadow-sm transition-all flex-shrink-0"
                                                                title="Hapus Jadwal"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>

                                                        <div className={cn("flex flex-col gap-2 pl-2 border-l-2 ml-1", color.border)}>
                                                            <p className={cn("text-[10px] font-extrabold uppercase tracking-widest", color.text)}>{shift.title}</p>

                                                            <div className="flex items-center justify-between mt-0.5">
                                                                <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold shadow-sm", color.innerBg, color.timeText)}>
                                                                    <Clock size={12} className={color.dotIcon} />
                                                                    {shift.formattedTime}
                                                                </div>

                                                                {shift.registrationTime && (
                                                                    <div className={cn("text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm uppercase tracking-wider", color.innerBg, color.timeText)}>
                                                                        Reg: {shift.registrationTime}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {cellShifts.length === 0 && (
                                                <div className="w-full h-full flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity">
                                                    <span className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest">+ Kosong</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Add Shift Modal ──────────────────────────────── */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm">
                    <div className="bg-white/70 backdrop-blur-[50px] saturate-200 rounded-3xl p-6 w-full max-w-md shadow-[0_16px_60px_-15px_rgba(0,0,0,0.2)] relative">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-extrabold text-foreground tracking-tight">Add New Shift</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground bg-slate-100 hover:bg-slate-200 p-2 rounded-xl transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider block mb-1.5">Doctor</label>
                                <select
                                    className="w-full bg-white/50 backdrop-blur-md rounded-2xl p-3 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_10px_-3px_rgba(0,0,0,0.02)] appearance-none focus:bg-white/70"
                                    value={newShift.doctorId}
                                    onChange={e => {
                                        const docId = e.target.value;
                                        const docName = doctors.find(d => d.id === docId)?.name || "";
                                        setNewShift({ ...newShift, doctorId: docId, doctor: docName });
                                    }}
                                >
                                    <option value="" disabled>Select Doctor</option>
                                    {doctors.map(d => (
                                        <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider block mb-1.5">Day</label>
                                    <select
                                        className="w-full bg-white/50 backdrop-blur-md rounded-2xl p-3 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_10px_-3px_rgba(0,0,0,0.02)] appearance-none focus:bg-white/70"
                                        value={newShift.dayIdx}
                                        onChange={e => setNewShift({ ...newShift, dayIdx: parseInt(e.target.value) })}
                                    >
                                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d, i) => (
                                            <option key={i} value={i}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider block mb-1.5">Type</label>
                                    <input
                                        className="w-full bg-white/50 backdrop-blur-md rounded-2xl p-3 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_10px_-3px_rgba(0,0,0,0.02)] placeholder:text-muted-foreground/60 focus:bg-white/70"
                                        value={newShift.title}
                                        onChange={e => setNewShift({ ...newShift, title: e.target.value })}
                                        placeholder="e.g. Praktek"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider block mb-1.5">Start</label>
                                    <input
                                        type="time"
                                        className="w-full bg-white/50 backdrop-blur-md rounded-2xl p-3 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_10px_-3px_rgba(0,0,0,0.02)] focus:bg-white/70"
                                        value={newShift.start}
                                        onChange={e => setNewShift({ ...newShift, start: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider block mb-1.5">End</label>
                                    <input
                                        type="time"
                                        className="w-full bg-white/50 backdrop-blur-md rounded-2xl p-3 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_10px_-3px_rgba(0,0,0,0.02)] focus:bg-white/70"
                                        value={newShift.end}
                                        onChange={e => setNewShift({ ...newShift, end: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider block mb-1.5">Registration Time</label>
                                <input
                                    type="time"
                                    className="w-full bg-white/50 backdrop-blur-md rounded-2xl p-3 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_10px_-3px_rgba(0,0,0,0.02)] focus:bg-white/70"
                                    value={newShift.registrationTime || ''}
                                    onChange={e => setNewShift({ ...newShift, registrationTime: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-3 rounded-2xl border border-slate-200 text-foreground text-sm font-bold hover:bg-slate-50 hover:shadow-[0_4px_14px_0_rgba(0,0,0,0.02)] transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddShift}
                                    className="flex-1 py-3 rounded-2xl btn-gradient text-white text-sm font-bold hover:shadow-[0_6px_20px_rgba(0,92,255,0.23)] transition-all shadow-[0_4px_14px_0_rgba(0,92,255,0.39)] active:scale-[0.98]"
                                >
                                    Save Shift
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
