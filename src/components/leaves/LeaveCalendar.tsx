"use client";

import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Plus, Upload, X, Check, Search, Calendar as CalendarIcon, Clock, AlignLeft, Download, User, Trash2, CalendarCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { LeaveRequest } from "@/lib/data-service";
import { LeaveRequestModal } from "./LeaveRequestModal";

interface LeaveCalendarProps {
    leaves: LeaveRequest[];
    onRefresh: () => void;
}

const MONTHS_ID = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];
const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const TYPE_CONFIG: Record<string, { color: string; bg: string; emoji: string }> = {
    'Sakit': { color: "text-red-600", bg: "bg-red-50", emoji: "🤒" },
    'Liburan': { color: "text-emerald-600", bg: "bg-emerald-50", emoji: "🏖" },
    'Konferensi': { color: "text-purple-600", bg: "bg-purple-50", emoji: "🎤" },
    'Pribadi': { color: "text-blue-600", bg: "bg-blue-50", emoji: "👤" },
    'Lainnya': { color: "text-slate-600", bg: "bg-slate-100", emoji: "📋" },
    // Fallback untuk data lama (bahasa Inggris)
    'Sick Leave': { color: "text-red-600", bg: "bg-red-50", emoji: "🤒" },
    'Vacation': { color: "text-emerald-600", bg: "bg-emerald-50", emoji: "🏖" },
    'Conference': { color: "text-purple-600", bg: "bg-purple-50", emoji: "🎤" },
    'Personal': { color: "text-blue-600", bg: "bg-blue-50", emoji: "👤" },
};

export function LeaveCalendar({ leaves, onRefresh }: LeaveCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isDateInLeave = (checkDate: Date, leave: LeaveRequest) => {
        const target = new Date(checkDate);
        target.setHours(0, 0, 0, 0);

        const start = leave.startDate ? new Date(leave.startDate) : new Date();
        const end = leave.endDate ? new Date(leave.endDate) : new Date();

        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        return target >= start && target <= end;
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days, firstDay };
    };

    const { days, firstDay } = getDaysInMonth(currentDate);
    const grid: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) grid.push(null);
    for (let i = 1; i <= days; i++) grid.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));

    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

    const handleAddLeave = async (data: any) => {
        await fetch('/api/leaves', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        onRefresh();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus data cuti ini?")) return;
        await fetch(`/api/leaves?id=${id}`, { method: 'DELETE' });
        onRefresh();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n').slice(1);
            const parsedLeaves = lines.filter(l => l.trim()).map(line => {
                const [doctor, type, start, end] = line.split(',').map(s => s.trim());
                if (!doctor || !start) return null;
                return {
                    doctor,
                    type: type || 'Lainnya',
                    dates: end ? `${start} - ${end}` : start,
                    startDate: start,
                    endDate: end || start,
                    avatar: "/avatars/default.png"
                };
            }).filter(Boolean);
            if (parsedLeaves.length > 0) {
                await fetch('/api/leaves', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(parsedLeaves)
                });
                onRefresh();
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleDownloadFormat = () => {
        const csvContent = "Nama Dokter,Tipe Cuti (Tahunan/Sakit/Hamil/Lainnya),Tanggal Mulai (YYYY-MM-DD),Tanggal Selesai (YYYY-MM-DD)\nDr. Sarah Johnson,Tahunan,2026-03-01,2026-03-05\nDr. Michael Chen,Sakit,2026-03-10,";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "format_import_cuti.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const activeLeaves = leaves.filter(l => isDateInLeave(selectedDate, l));

    const selectedDateLabel = selectedDate.toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    // Hitung hari terpadat dalam bulan ini (tanggal dengan dokter cuti terbanyak)
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const busiestDays = (() => {
        const daysWithCount: { date: Date; count: number }[] = [];
        for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
            const dateCopy = new Date(d);
            const count = leaves.filter(l => isDateInLeave(dateCopy, l)).length;
            if (count > 0) {
                daysWithCount.push({ date: dateCopy, count });
            }
        }
        return daysWithCount
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);
    })();

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full overflow-y-auto lg:overflow-hidden pb-6 lg:pb-0 custom-scrollbar pr-1 lg:pr-0">

            {/* ══════════ KIRI: KALENDER ══════════ */}
            <div className="w-full lg:w-[360px] flex-shrink-0 flex flex-col gap-5 lg:overflow-y-auto lg:custom-scrollbar lg:pb-4 lg:pr-2">
                <div className="super-glass-card rounded-[32px] p-6 shadow-sm flex-shrink-0">
                    {/* Month Nav */}
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-black text-slate-800">
                            {MONTHS_ID[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </h2>
                        <div className="flex items-center gap-0.5 bg-slate-50 rounded-xl p-0.5">
                            <button
                                onClick={prevMonth}
                                className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-slate-700 transition-all"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <button
                                onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }}
                                className="px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-all"
                            >
                                Hari ini
                            </button>
                            <button
                                onClick={nextMonth}
                                className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-slate-700 transition-all"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 mb-1">
                        {DAY_LABELS.map(d => (
                            <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-1">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Day Grid */}
                    <div className="grid grid-cols-7 gap-[2px]">
                        {grid.map((date, i) => {
                            if (!date) return <div key={`e-${i}`} className="aspect-square" />;

                            const isSelected = date.toDateString() === selectedDate.toDateString();
                            const isToday = date.toDateString() === new Date().toDateString();
                            const hasLeave = leaves.some(l => isDateInLeave(date, l));

                            return (
                                <button
                                    key={`d-${i}`}
                                    onClick={() => setSelectedDate(date)}
                                    className={cn(
                                        "aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all duration-200 text-[12px] font-semibold",
                                        isSelected
                                            ? "bg-slate-900 text-white shadow-md scale-[1.05]"
                                            : isToday
                                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    {date.getDate()}
                                    {hasLeave && (
                                        <div className={cn(
                                            "w-1 h-1 rounded-full absolute bottom-1",
                                            isSelected ? "bg-white/70" : "bg-amber-400"
                                        )} />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Legenda */}
                    <div className="mt-4 pt-3 border-t border-slate-50 flex items-center gap-4 text-[10px] text-slate-400 font-medium">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-amber-400" />
                            <span>Ada cuti</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span>Hari ini</span>
                        </div>
                    </div>
                </div>

                {/* Tombol Aksi */}
                <div className="flex flex-col gap-3 relative z-10">
                    <div className="flex gap-3">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 h-12 rounded-2xl bg-white/60 text-slate-500 hover:text-slate-800 hover:bg-white border border-slate-100 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm backdrop-blur-md active:scale-95"
                        >
                            <Upload size={13} />
                            Import CSV
                        </button>
                        <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex-1 h-12 rounded-2xl btn-gradient text-white text-xs font-bold transition-all shadow-[0_4px_14px_0_rgba(0,92,255,0.39)] flex items-center justify-center gap-2 active:scale-95 group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:animate-shimmer" />
                            <Plus size={13} className="relative z-10" />
                            <span className="relative z-10">Tambah Cuti</span>
                        </button>
                    </div>

                    <button
                        onClick={handleDownloadFormat}
                        className="w-full h-10 rounded-xl bg-blue-50/50 text-blue-600 hover:bg-blue-100/50 border border-blue-100/30 text-[11px] font-bold transition-all flex items-center justify-center gap-2 shadow-sm backdrop-blur-md active:scale-95 mt-1"
                    >
                        <Download size={13} />
                        Download Format CSV
                    </button>
                </div>

                {/* Hari terpadat bulan ini */}
                <div className="super-glass-card rounded-[32px] p-6 shadow-sm flex-shrink-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                        Hari Terpadat — {MONTHS_ID[currentDate.getMonth()]}
                    </p>
                    {busiestDays.length > 0 ? (
                        <div className="space-y-2">
                            {busiestDays.map(({ date, count }) => (
                                <div key={date.toISOString()} className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-slate-700 truncate mr-2">
                                        {date.toLocaleDateString('id-ID', {
                                            weekday: 'short',
                                            day: 'numeric',
                                            month: 'short'
                                        })}
                                    </span>
                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-lg flex-shrink-0 text-amber-700 bg-amber-50">
                                        {count} dokter cuti
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400 text-center py-2">
                            Belum ada cuti pada bulan ini.
                        </p>
                    )}
                </div>
            </div>

            {/* ══════════ KANAN: DAFTAR CUTI TANGGAL TERPILIH ══════════ */}
            <div className="flex-1 super-glass-card rounded-[32px] p-6 lg:p-8 shadow-sm flex flex-col min-h-[500px] lg:min-h-0 relative z-10 mb-8 lg:mb-0">
                {/* Header Panel Kanan */}
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-50">
                    <div>
                        <h3 className="text-base font-black text-slate-800">Dokter Cuti</h3>
                        <p className="text-xs text-slate-400 font-medium mt-0.5 capitalize">{selectedDateLabel}</p>
                    </div>
                    <div className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black",
                        activeLeaves.length > 0 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                    )}>
                        <CalendarCheck size={12} />
                        {activeLeaves.length > 0 ? `${activeLeaves.length} dokter cuti` : "Semua tersedia"}
                    </div>
                </div>

                {/* Daftar Cuti Tanggal Terpilih */}
                <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
                    {activeLeaves.length > 0 ? (
                        activeLeaves.map(leave => {
                            const conf = TYPE_CONFIG[leave.type] || { color: "text-slate-600", bg: "bg-slate-100", emoji: "📋" };
                            const ringColor = conf.color.replace('text-', 'ring-').replace('-600', '-600/20');
                            const bgColor = conf.color.replace('text-', 'bg-').replace('-600', '-100/60');

                            const startDt = new Date(leave.startDate);
                            const endDt = leave.endDate ? new Date(leave.endDate) : null;
                            let dateStr = startDt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                            if (endDt && endDt > startDt) {
                                dateStr += ` - ${endDt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`;
                            }

                            return (
                                <div
                                    key={leave.id}
                                    className="group relative flex items-center gap-4 p-3.5 rounded-2xl bg-white hover:bg-slate-50/80 transition-all duration-300 border border-slate-100 hover:border-slate-200/60 shadow-sm hover:shadow-md"
                                >
                                    {/* Hapus */}
                                    <button
                                        onClick={() => handleDelete(leave.id)}
                                        className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all z-20"
                                        title="Hapus"
                                    >
                                        <Trash2 size={13} />
                                    </button>

                                    <div className="relative shrink-0 flex items-center justify-center h-12 w-12 rounded-2xl overflow-hidden shadow-inner ring-1 ring-black/5 bg-gradient-to-br from-slate-700 to-slate-900 group-hover:scale-105 transition-transform duration-300 ease-out z-10">
                                        {leave.avatar && leave.avatar !== "/avatars/default.png" ? (
                                            <img src={leave.avatar} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
                                        ) : null}
                                        <span className="text-xs font-black text-white/90 uppercase tracking-wider relative z-10">
                                            {leave.doctor?.[0] || 'D'}
                                        </span>
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    </div>

                                    <div className="min-w-0 flex-1 flex flex-col justify-center pr-8 relative z-10">
                                        <div className="flex items-center gap-2.5 mb-1.5 w-full flex-wrap">
                                            <h4 className="font-extrabold text-[13px] md:text-sm text-slate-800 truncate tracking-tight max-w-[80%]">
                                                {leave.doctor}
                                            </h4>
                                            <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide shrink-0 ${bgColor} ${conf.color} ring-1 ${ringColor} backdrop-blur-sm`}>
                                                <span>{conf.emoji}</span> {leave.type}
                                            </span>
                                        </div>

                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                                                <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span>{dateStr}</span>
                                            </div>
                                            {leave.reason && (
                                                <p className="text-[11px] text-slate-400 font-medium italic mt-0.5 truncate max-w-[90%]">
                                                    "{leave.reason}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center py-20">
                            <div className="w-20 h-20 bg-emerald-50/50 border border-emerald-100 rounded-[28px] flex items-center justify-center mb-6 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] backdrop-blur-sm">
                                <User size={28} className="text-emerald-400" />
                            </div>
                            <p className="text-xl font-black text-slate-800">Semua dokter tersedia</p>
                            <p className="text-sm font-medium text-slate-400 mt-2">Tidak ada jadwal cuti pada tanggal ini.</p>
                        </div>
                    )}
                </div>

            </div>

            <LeaveRequestModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleAddLeave}
            />
        </div>
    );
}
