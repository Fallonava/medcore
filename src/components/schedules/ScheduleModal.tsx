"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Clock, Plus, Trash2, Save, Copy, Power, CalendarOff, Edit3, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Doctor, Shift } from "@/lib/data-service";
import { ShiftCalendarGrid } from "./ShiftCalendarGrid";

interface ScheduleModalProps {
    doctor: Doctor | null;
    shifts: Shift[];
    isOpen: boolean;
    onClose: () => void;
    onUpdate?: () => void;
}

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

const COLORS = [
    { value: 'blue', bg: 'bg-blue-500', ring: 'ring-blue-400' },
    { value: 'emerald', bg: 'bg-emerald-500', ring: 'ring-emerald-400' },
    { value: 'violet', bg: 'bg-violet-500', ring: 'ring-violet-400' },
    { value: 'amber', bg: 'bg-amber-500', ring: 'ring-amber-400' },
    { value: 'rose', bg: 'bg-rose-500', ring: 'ring-rose-400' },
    { value: 'cyan', bg: 'bg-cyan-500', ring: 'ring-cyan-400' },
];

const BAR: Record<string, string> = {
    blue: 'bg-blue-500', emerald: 'bg-emerald-500', violet: 'bg-violet-500',
    amber: 'bg-amber-500', rose: 'bg-rose-500', cyan: 'bg-cyan-500',
    red: 'bg-red-500', green: 'bg-green-500', purple: 'bg-purple-500',
    orange: 'bg-orange-500', pink: 'bg-pink-500', teal: 'bg-teal-500',
};
const LIGHT: Record<string, string> = {
    blue: 'bg-blue-50', emerald: 'bg-emerald-50', violet: 'bg-violet-50',
    amber: 'bg-amber-50', rose: 'bg-rose-50', cyan: 'bg-cyan-50',
    red: 'bg-red-50', green: 'bg-green-50', purple: 'bg-purple-50',
    orange: 'bg-orange-50', pink: 'bg-pink-50', teal: 'bg-teal-50',
};

const todayStr = () => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
const todayIdx = () => (new Date().getDay() + 6) % 7;

const gradient = (name: string) => {
    const g = ['from-blue-500 to-cyan-400', 'from-violet-500 to-purple-400', 'from-rose-500 to-pink-400',
        'from-amber-500 to-orange-400', 'from-emerald-500 to-teal-400', 'from-indigo-500 to-blue-400'];
    let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return g[Math.abs(h) % g.length];
};

const INIT: Partial<Shift> = { title: "Praktek", formattedTime: "08:00-12:00", registrationTime: "07:30", color: "blue" };

export function ScheduleModal({ doctor, shifts, isOpen, onClose, onUpdate }: ScheduleModalProps) {
    const [activeDay, setActiveDay] = useState(todayIdx());
    const [editId, setEditId] = useState<string | null>(null);
    const [adding, setAdding] = useState(false);
    const [expandId, setExpandId] = useState<string | null>(null);
    const [form, setForm] = useState<Partial<Shift>>(INIT);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    if (!isOpen || !doctor || !mounted) return null;

    const today = todayStr();
    const tIdx = todayIdx();
    const allShifts = shifts.filter(s => s.doctor === doctor.name);
    const dayShifts = allShifts.filter(s => s.dayIdx === activeDay);

    const reset = () => { setForm(INIT); setEditId(null); setAdding(false); };

    const save = async () => {
        if (!form.title || !form.formattedTime) return;
        await fetch('/api/shifts', {
            method: editId ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, id: editId, doctorId: doctor.id, doctor: doctor.name, dayIdx: activeDay })
        });
        onUpdate?.(); reset();
    };

    const updateShiftTime = async (id: string, newStartMatch: string) => {
        const shiftToMove = shifts.find(s => s.id === id);
        if (!shiftToMove) return;

        const oldTimes = shiftToMove.formattedTime?.split('-').map(t => t.trim()) || ["08:00", "12:00"];
        const oldStartStr = oldTimes[0] || "08:00";
        const oldEndStr = oldTimes[1] || "12:00";

        let oldStartH = parseInt(oldStartStr.split(':')[0] || '8');
        let oldEndH = parseInt(oldEndStr.split(':')[0] || '12');
        const duration = Math.max(1, oldEndH - oldStartH); // minimum 1 hour if parsed wrong

        const newStartHStr = newStartMatch.split(':')[0];
        const newStartH = parseInt(newStartHStr);
        const newEndH = newStartH + duration;

        const newFormattedTime = `${newStartHStr.padStart(2,'0')}:00-${String(newEndH).padStart(2,'0')}:00`;

        await fetch('/api/shifts', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: shiftToMove.id, formattedTime: newFormattedTime })
        });
        onUpdate?.();
    };

    const del = async (id: string) => {
        if (!confirm("Hapus shift ini?")) return;
        await fetch(`/api/shifts?id=${id}`, { method: 'DELETE' });
        onUpdate?.();
    };

    const dup = (s: Shift) => {
        setForm({ title: s.title, formattedTime: s.formattedTime, registrationTime: s.registrationTime || "", color: s.color, statusOverride: s.statusOverride });
        setAdding(true); setEditId(null);
    };

    const toggle = async (s: Shift) => {
        const dates = s.disabledDates || [];
        const nd = dates.includes(today) ? dates.filter(d => d !== today) : [...dates, today];
        await fetch('/api/shifts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, disabledDates: nd }) });
        onUpdate?.();
    };

    const addDis = async (s: Shift, d: string) => {
        if (!d || (s.disabledDates || []).includes(d)) return;
        await fetch('/api/shifts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, disabledDates: [...(s.disabledDates || []), d].sort() }) });
        onUpdate?.();
    };

    const rmDis = async (s: Shift, d: string) => {
        await fetch('/api/shifts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, disabledDates: (s.disabledDates || []).filter(x => x !== d) }) });
        onUpdate?.();
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 lg:p-10 bg-black/40 backdrop-blur-md" onClick={onClose}>
            <div className="bg-white w-full max-w-3xl max-h-[85vh] rounded-[28px] shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

                {/* ══ HEADER ══ */}
                <div className="flex items-center gap-4 px-7 py-5 border-b border-slate-100 shrink-0">
                    <div className={cn("h-14 w-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-lg font-black shadow-md shrink-0", gradient(doctor.name))}>
                        {doctor.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold text-slate-800 truncate">{doctor.name}</h2>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-sm text-slate-400">{doctor.specialty}</span>
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-lg",
                                doctor.category === 'Bedah' ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                            )}>{doctor.category}</span>
                        </div>
                    </div>
                    <div className="text-right shrink-0 mr-2">
                        <p className="text-2xl font-black text-slate-800">{allShifts.length}</p>
                        <p className="text-[10px] text-slate-400 font-bold">Total Shift</p>
                    </div>
                    <button onClick={onClose} className="p-2.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0">
                        <X size={18} />
                    </button>
                </div>

                {/* ══ DAY TABS ══ */}
                <div className="flex items-center gap-1.5 px-7 py-3 border-b border-slate-50 bg-slate-50/50 shrink-0">
                    {DAYS.map((day, idx) => {
                        const count = allShifts.filter(s => s.dayIdx === idx).length;
                        const isToday = idx === tIdx;
                        const isActive = idx === activeDay;
                        return (
                            <button key={day} onClick={() => { setActiveDay(idx); reset(); }}
                                className={cn(
                                    "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all relative flex flex-col items-center justify-center",
                                    isActive
                                        ? "bg-white text-slate-800 shadow-md border border-slate-200"
                                        : "text-slate-400 hover:text-slate-600 hover:bg-white/60"
                                )}
                            >
                                <span className="relative">
                                    {day}
                                    {count > 0 && (
                                        <span className={cn("absolute -top-2 -right-4 w-4 h-4 rounded-full text-[8px] font-black flex items-center justify-center shadow-sm",
                                            isActive ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-500"
                                        )}>{count}</span>
                                    )}
                                </span>
                                {isToday && <div className={cn("w-1 h-1 rounded-full mx-auto mt-0.5", isActive ? "bg-blue-500" : "bg-slate-300")} />}
                            </button>
                        );
                    })}
                </div>

                {/* ══ CONTENT ══ */}
                <div className="flex-1 overflow-y-auto px-7 py-5">
                    {/* Day title + add button */}
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-base font-bold text-slate-700">{DAYS[activeDay]}</h3>
                            <p className="text-xs text-slate-400">
                                {dayShifts.length} shift {activeDay === tIdx && "· Hari ini"}
                            </p>
                        </div>
                        {!adding && !editId && (
                            <button onClick={() => { setAdding(true); setForm(INIT); }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-colors shadow-sm active:scale-95"
                            >
                                <Plus size={16} /> Tambah Shift
                            </button>
                        )}
                    </div>

                    {/* Add Form */}
                    {adding && !editId && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-4 space-y-4">
                            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Shift Baru</p>
                            <input autoFocus className="w-full bg-white rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-300 border border-emerald-100 placeholder:text-slate-300"
                                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Nama shift, cth: Praktek Pagi"
                            />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs text-slate-500 font-semibold block mb-1.5">Jam Praktek</label>
                                    <input className="w-full bg-white rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-300 border border-emerald-100"
                                        value={form.formattedTime} onChange={e => setForm({ ...form, formattedTime: e.target.value })} placeholder="08:00-12:00"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 font-semibold block mb-1.5">Jam Daftar</label>
                                    <input className="w-full bg-white rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-300 border border-emerald-100"
                                        value={form.registrationTime} onChange={e => setForm({ ...form, registrationTime: e.target.value })} placeholder="07:30"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 font-semibold block mb-1.5">Status Bawaan</label>
                                    <select className="w-full bg-white rounded-xl px-4 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-300 border border-emerald-100"
                                        value={form.statusOverride || ''} onChange={e => setForm({ ...form, statusOverride: (e.target.value as Doctor['status']) || null })}
                                    >
                                        <option value="">Standar (Buka)</option>
                                        <option value="AKAN_BUKA">Akan Buka</option>
                                        <option value="OPERASI">Operasi</option>
                                        <option value="PENUH">Penuh</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-slate-500">Warna</span>
                                <div className="flex gap-2">
                                    {COLORS.map(c => (
                                        <button key={c.value} onClick={() => setForm({ ...form, color: c.value })}
                                            className={cn("w-7 h-7 rounded-lg transition-all", c.bg,
                                                form.color === c.value ? `ring-2 ring-offset-2 ${c.ring} scale-110` : "opacity-30 hover:opacity-60"
                                            )} />
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button onClick={reset} className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 text-sm font-semibold hover:bg-slate-50">Batal</button>
                                <button onClick={save} disabled={!form.title} className="flex-[2] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98]">
                                    <Save size={14} /> Buat Shift
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Shift Calendar Grid */}
                    <div className="space-y-3">
                        {editId && (
                           <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-4 mb-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Edit Shift</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => {
                                            const s = shifts.find(x=>x.id===editId);
                                            if(s) toggle(s);
                                        }} className="p-1 hover:bg-white rounded" title="Toggle hari ini" type="button">
                                            <Power size={14} className="text-emerald-500"/>
                                        </button>
                                        <button onClick={() => del(editId)} className="p-1 hover:bg-white rounded" title="Hapus" type="button">
                                            <Trash2 size={14} className="text-red-500" />
                                        </button>
                                    </div>
                                </div>
                                <input autoFocus className="w-full bg-white rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-300 border border-blue-100"
                                    value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Nama shift"
                                />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-xs text-slate-500 font-semibold block mb-1.5">Jam Praktek</label>
                                        <input className="w-full bg-white rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-300 border border-blue-100"
                                            value={form.formattedTime} onChange={e => setForm({ ...form, formattedTime: e.target.value })} placeholder="08:00-12:00"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 font-semibold block mb-1.5">Jam Daftar</label>
                                        <input className="w-full bg-white rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-300 border border-blue-100"
                                            value={form.registrationTime} onChange={e => setForm({ ...form, registrationTime: e.target.value })} placeholder="07:30"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 font-semibold block mb-1.5">Status Bawaan</label>
                                        <select className="w-full bg-white rounded-xl px-4 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-300 border border-blue-100"
                                            value={form.statusOverride || ''} onChange={e => setForm({ ...form, statusOverride: (e.target.value as Doctor['status']) || null })}
                                        >
                                            <option value="">Standar (Buka)</option>
                                            <option value="AKAN_BUKA">Akan Buka</option>
                                            <option value="OPERASI">Operasi</option>
                                            <option value="PENUH">Penuh</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-semibold text-slate-500">Warna</span>
                                    <div className="flex gap-2">
                                        {COLORS.map(c => (
                                            <button key={c.value} onClick={() => setForm({ ...form, color: c.value })}
                                                className={cn("w-7 h-7 rounded-lg transition-all", c.bg,
                                                    form.color === c.value ? `ring-2 ring-offset-2 ${c.ring} scale-110` : "opacity-30 hover:opacity-60"
                                                )} />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-1">
                                    <button onClick={reset} className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 text-sm font-semibold hover:bg-slate-50">Batal</button>
                                    <button onClick={save} disabled={!form.title} className="flex-[2] py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98]">
                                        <Save size={14} /> Simpan
                                    </button>
                                </div>
                            </div>
                        )}

                        <ShiftCalendarGrid
                            shifts={dayShifts}
                            activeDay={activeDay}
                            onUpdateShiftTime={updateShiftTime}
                            onSlotClick={(timeStr) => {
                                const startH = parseInt(timeStr.split(':')[0]);
                                setForm({ ...INIT, formattedTime: `${timeStr}-${String(startH+4).padStart(2,'0')}:00` });
                                setAdding(true);
                                setEditId(null);
                            }}
                            onShiftClick={(s) => {
                                setForm({ title: s.title, formattedTime: s.formattedTime, registrationTime: s.registrationTime || "", color: s.color, statusOverride: s.statusOverride });
                                setEditId(s.id);
                                setAdding(false);
                            }}
                        />
                    </div>
                </div>

                {/* ══ FOOTER ══ */}
                <div className="px-7 py-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                    <div className="flex items-center gap-5 text-xs text-slate-400 font-medium">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                            Aktif
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
                            Nonaktif hari ini
                        </div>
                    </div>
                    <button onClick={onClose} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-colors">
                        Tutup
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
