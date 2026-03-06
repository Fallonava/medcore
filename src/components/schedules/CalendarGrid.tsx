"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, X, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import useSWR from "swr";
import type { Shift, Doctor } from "@/lib/data-service";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

const DAYS = [
    { day: "MON", date: 12 },
    { day: "TUE", date: 13 },
    { day: "WED", date: 14 },
    { day: "THU", date: 15 },
    { day: "FRI", date: 16 },
    { day: "SAT", date: 17 },
    { day: "SUN", date: 18 },
];

const TIME_SLOTS = [
    "08:00 AM",
    "12:00 PM",
    "04:00 PM",
    "08:00 PM",
];

const colorStyles: Record<string, string> = {
    blue: "bg-blue-900/40-4-500 text-blue-100 hover:bg-blue-900/60",
    emerald: "bg-emerald-900/40-4-500 text-emerald-100 hover:bg-emerald-900/60",
    purple: "bg-purple-900/40-4-500 text-purple-100 hover:bg-purple-900/60",
    orange: "bg-orange-900/40-4-500 text-orange-100 hover:bg-orange-900/60",
    rose: "bg-rose-900/40-4-500 text-rose-100 hover:bg-rose-900/60",
    indigo: "bg-indigo-900/40-4-500 text-indigo-100 hover:bg-indigo-900/60",
};

export function CalendarGrid() {
    const [view, setView] = useState("Week");
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [showModal, setShowModal] = useState(false);

    // Helper Custom Dropdown
    const CustomDropdown = ({ value, options, onChange, label, placeholder }: any) => {
        const [open, setOpen] = useState(false);
        const selectedLabel = options.find((o: any) => o.value === value)?.label || placeholder || "Select";

        return (
            <div className="relative z-30 flex-1" onMouseLeave={() => setOpen(false)}>
                {label && <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5">{label}</label>}
                <button 
                    type="button"
                    onClick={() => setOpen(!open)}
                    className="flex justify-between items-center w-full bg-white rounded-2xl p-3 text-sm text-slate-700 focus:ring-2 focus:ring-blue-500/30 outline-none transition-all border border-slate-100 min-h-[46px]"
                >
                    <span className="truncate pr-2 font-medium">{selectedLabel}</span>
                    <ChevronDown size={14} className={cn("text-slate-400 transition-transform flex-shrink-0", open && "rotate-180")} />
                </button>
                
                <div className={cn(
                    "absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-slate-100 rounded-2xl shadow-xl p-1.5 transition-all duration-300 origin-top z-50 max-h-[200px] overflow-y-auto custom-scrollbar",
                    open ? "opacity-100 scale-y-100 translate-y-0" : "opacity-0 scale-y-95 -translate-y-2 pointer-events-none"
                )}>
                    {options.map((opt: any) => (
                        <button
                            type="button"
                            key={opt.value}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(opt.value); setOpen(false); }}
                            className={cn(
                                "w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all mb-1 last:mb-0 truncate",
                                value === opt.value 
                                    ? "bg-blue-50/80 text-blue-600" 
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const { data: doctors = [] } = useSWR<Doctor[]>('/api/doctors');

    // Form State
    const [newShift, setNewShift] = useState<Partial<Shift>>({
        dayIdx: 0,
        timeIdx: 0,
        color: 'blue',
        doctorId: '',
        doctor: '',
        title: ''
    });

    useEffect(() => {
        fetchShifts();
    }, []);

    const fetchShifts = async () => {
        const res = await fetch('/api/shifts');
        const data = await res.json();
        setShifts(data);
    };

    const handleAddShift = async () => {
        if (!newShift.title || !newShift.doctor) return;

        await fetch('/api/shifts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newShift)
        });

        setShowModal(false);
        setNewShift({ dayIdx: 0, timeIdx: 0, color: 'blue', title: '', doctor: '', doctorId: '' });
        fetchShifts();
    };

    const handleDeleteShift = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("Delete this shift?")) return;

        await fetch(`/api/shifts?id=${id}`, { method: 'DELETE' });
        fetchShifts();
    };

    return (
        <div className="flex-1 bg-slate-900/30 backdrop-blur-md rounded-2xl p-6 min-h-[600px] flex flex-col relative">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="bg-slate-800/50 p-1 rounded-lg flex text-sm">
                    {["Week", "Month", "Day"].map((v) => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={cn(
                                "px-4 py-1.5 rounded-md transition-all font-medium",
                                view === v ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                            )}
                        >
                            {v}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4 text-slate-300">
                    <button className="p-1 hover:text-white hover:bg-white/10 rounded-full"><ChevronLeft size={20} /></button>
                    <span className="text-white font-medium text-lg">Oct 12 - 18, 2026</span>
                    <button className="p-1 hover:text-white hover:bg-white/10 rounded-full"><ChevronRight size={20} /></button>
                </div>

                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-lg shadow-blue-500/20 transition-all"
                >
                    <Plus size={18} />
                    Add Shift
                </button>
            </div>

            {/* Grid Header */}
            <div className="grid grid-cols-8 gap-px bg-slate-800 rounded-t-lg overflow-hidden border-800">
                <div className="p-4 bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</div>
                {DAYS.map((d) => (
                    <div key={d.day} className="p-4 bg-slate-900/50 text-center-800">
                        <div className="text-[10px] text-slate-500 font-bold">{d.day}</div>
                        <div className="text-xl font-bold text-white mt-1">{d.date}</div>
                    </div>
                ))}
            </div>

            {/* Grid Body */}
            <div className="grid grid-cols-8 gap-px bg-slate-800-800 rounded-b-lg overflow-hidden flex-1">
                {TIME_SLOTS.map((time, timeIdx) => (
                    <>
                        <div key={time} className="p-4 bg-slate-900/30 text-xs text-slate-400-800/50 relative">
                            <span className="-top-3 relative">{time}</span>
                        </div>
                        {DAYS.map((day, dayIdx) => {
                            const shift = shifts.find(s => s.dayIdx === dayIdx && s.timeIdx === timeIdx);
                            return (
                                <div key={`${day.day}-${time}`} className="bg-slate-900/30 min-h-[120px] p-2-800/50 relative group transition-colors hover:bg-white/[0.02]">
                                    {shift && (
                                        <div className={cn("p-3 rounded-lg text-xs cursor-pointer shadow-lg transition-all hover:scale-[1.02] relative group/item", colorStyles[shift.color])}>
                                            <div className="flex justify-between items-start">
                                                <p className="font-bold mb-1">{shift.title}</p>
                                                <button
                                                    onClick={(e) => handleDeleteShift(e, shift.id)}
                                                    className="opacity-0 group-hover/item:opacity-100 text-slate-300 hover:text-white transition-opacity"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-1.5 opacity-90">
                                                <div className="h-4 w-4 rounded-full bg-white/20" />
                                                <span>{shift.doctor || 'Unknown'}</span>
                                            </div>
                                            {shift.extra && (
                                                <p className="mt-2 text-[10px] opacity-70 bg-black/20 px-1.5 py-0.5 rounded w-fit">{shift.extra}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </>
                ))}
            </div>

            {/* Add Shift Modal */}
            {showModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm rounded-2xl">
                    <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-6 w-full max-w-md shadow-2xl border border-white/40">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Tambah Shift Baru</h3>
                            <button onClick={() => setShowModal(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <SearchableSelect
                                label="Pilih Dokter"
                                placeholder="Cari Dokter..."
                                searchPlaceholder="Cari nama atau spesialisasi..."
                                noResultsText="Dokter tidak ditemukan"
                                options={doctors.map(d => ({ 
                                    value: d.id, 
                                    label: d.name,
                                    sublabel: d.specialty,
                                    image: d.image
                                }))}
                                value={newShift.doctorId}
                                onChange={(docId: string) => {
                                    const doc = doctors.find(d => d.id === docId);
                                    if (doc) {
                                        setNewShift({ ...newShift, doctorId: doc.id, doctor: doc.name });
                                    }
                                }}
                            />

                            <div>
                                <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5">Judul Shift</label>
                                <input
                                    className="w-full bg-white rounded-2xl p-3 text-sm text-slate-800 outline-none transition-all shadow-[inset_0_1px_1px_rgba(0,0,0,0.05)] border border-slate-200 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10"
                                    placeholder="cth. Operasi, Konsultasi"
                                    value={newShift.title || ''}
                                    onChange={e => setNewShift({ ...newShift, title: e.target.value })}
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <CustomDropdown 
                                    label="Day"
                                    value={newShift.dayIdx}
                                    options={DAYS.map((d, i) => ({ value: i, label: d.day }))}
                                    onChange={(v: number) => setNewShift({ ...newShift, dayIdx: v })}
                                />
                                <CustomDropdown 
                                    label="Time Slot"
                                    value={newShift.timeIdx}
                                    options={TIME_SLOTS.map((t, i) => ({ value: i, label: t }))}
                                    onChange={(v: number) => setNewShift({ ...newShift, timeIdx: v })}
                                />
                            </div>

                            <CustomDropdown 
                                label="Color Tag"
                                value={newShift.color}
                                options={Object.keys(colorStyles).map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))}
                                onChange={(v: string) => setNewShift({ ...newShift, color: v })}
                            />

                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3.5 rounded-2xl bg-slate-50 text-slate-500 text-sm font-bold hover:bg-slate-100 transition-all border border-slate-200"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleAddShift}
                                    className="flex-[2] py-3.5 rounded-2xl btn-gradient text-white text-sm font-black shadow-[0_4px_14px_rgba(0,0,0,0.15)] active:scale-95 transition-all"
                                >
                                    Buat Shift
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
