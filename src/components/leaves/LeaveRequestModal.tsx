import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, CalendarDays, Search } from "lucide-react";
import useSWR from "swr";
import type { Doctor } from "@/lib/data-service";

const TIPE_CUTI = [
    { value: "Sakit", label: "🤒 Sakit" },
    { value: "Liburan", label: "🏖 Liburan" },
    { value: "Pribadi", label: "👤 Keperluan Pribadi" },
    { value: "Konferensi", label: "🎤 Konferensi / Seminar" },
    { value: "Lainnya", label: "📋 Lainnya" },
];

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
}

export function LeaveRequestModal({ isOpen, onClose, onSubmit }: Props) {
    const { data: doctors = [] } = useSWR<Doctor[]>('/api/doctors');
    const [form, setForm] = useState({
        doctor: "",
        type: "Sakit",
        startDate: "",
        endDate: "",
        reason: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [doctorSearch, setDoctorSearch] = useState("");
    const [isDoctorListOpen, setIsDoctorListOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const filteredDoctors = useMemo(
        () =>
            doctors.filter(doc =>
                doc.name.toLowerCase().includes(doctorSearch.toLowerCase())
            ),
        [doctors, doctorSearch]
    );

    useEffect(() => { setMounted(true); }, []);

    if (!isOpen || !mounted) return null;

    const isValid = form.doctor && form.startDate && form.endDate;
    const isEndBeforeStart = form.endDate && form.startDate && new Date(form.endDate) < new Date(form.startDate);

    const handleSubmit = async () => {
        if (!isValid || isEndBeforeStart) return;
        setIsSubmitting(true);
        try {
            await onSubmit({
                doctor: form.doctor,
                type: form.type,
                dates: `${form.startDate} - ${form.endDate}`,
                startDate: form.startDate,
                endDate: form.endDate,
                reason: form.reason,
                avatar: "/avatars/default.png",
            });
            setForm({ doctor: "", type: "Sakit", startDate: "", endDate: "", reason: "" });
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-[28px] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                            <CalendarDays className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-800">Tambah Cuti</h3>
                            <p className="text-xs text-slate-400">Catat jadwal cuti dokter</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Dokter - Combobox modern */}
                    <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                            Nama Dokter
                        </label>
                        <div className="relative">
                            <button
                                type="button"
                                className="w-full bg-slate-50 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all flex items-center justify-between"
                                aria-haspopup="listbox"
                                aria-expanded={isDoctorListOpen}
                                onClick={() => {
                                    setIsDoctorListOpen((prev) => !prev);
                                    setTimeout(() => {
                                        setHighlightedIndex(0);
                                    }, 0);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                                        e.preventDefault();
                                        if (!isDoctorListOpen) {
                                            setIsDoctorListOpen(true);
                                            setHighlightedIndex(0);
                                        }
                                    }
                                }}
                            >
                                <span className={form.doctor ? "truncate text-slate-800" : "text-slate-400"}>
                                    {form.doctor || "Pilih dokter..."}
                                </span>
                                <Search className="h-4 w-4 text-slate-400 ml-2 flex-shrink-0" />
                            </button>

                            {isDoctorListOpen && (
                                <div className="absolute z-50 mt-1 w-full rounded-2xl bg-white shadow-xl border border-slate-100 max-h-56 overflow-y-auto py-1">
                                    <div className="px-3 pb-2 pt-1 border-b border-slate-100 sticky top-0 bg-white">
                                        <div className="relative">
                                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Ketik nama atau spesialisasi..."
                                                className="w-full bg-slate-50 rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all placeholder:text-slate-300"
                                                value={doctorSearch}
                                                onChange={(e) => {
                                                    setDoctorSearch(e.target.value);
                                                    setHighlightedIndex(0);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === "ArrowDown") {
                                                        e.preventDefault();
                                                        setHighlightedIndex((prev) =>
                                                            prev < filteredDoctors.length - 1 ? prev + 1 : prev
                                                        );
                                                    } else if (e.key === "ArrowUp") {
                                                        e.preventDefault();
                                                        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
                                                    } else if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        const doc = filteredDoctors[highlightedIndex];
                                                        if (doc) {
                                                            setForm({ ...form, doctor: doc.name });
                                                            setIsDoctorListOpen(false);
                                                        }
                                                    } else if (e.key === "Escape") {
                                                        e.preventDefault();
                                                        setIsDoctorListOpen(false);
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <ul role="listbox" className="py-1">
                                        {filteredDoctors.length === 0 ? (
                                            <li className="px-4 py-2 text-[11px] text-slate-400">
                                                Tidak ada dokter ditemukan
                                            </li>
                                        ) : (
                                            filteredDoctors.map((doc, index) => (
                                                <li
                                                    key={doc.id}
                                                    role="option"
                                                    aria-selected={form.doctor === doc.name}
                                                    className={`px-4 py-2 text-xs cursor-pointer flex items-center justify-between ${
                                                        index === highlightedIndex
                                                            ? "bg-emerald-50 text-emerald-700"
                                                            : "hover:bg-slate-50 text-slate-700"
                                                    }`}
                                                    onMouseEnter={() => setHighlightedIndex(index)}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setForm({ ...form, doctor: doc.name });
                                                        setIsDoctorListOpen(false);
                                                    }}
                                                >
                                                    <span className="truncate">{doc.name}</span>
                                                </li>
                                            ))
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tipe */}
                    <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                            Jenis Cuti
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {TIPE_CUTI.map((t, i) => (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => setForm({ ...form, type: t.value })}
                                    className={`px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all ${i === TIPE_CUTI.length - 1 && TIPE_CUTI.length % 2 !== 0 ? "col-span-2 text-center" : ""
                                        } ${form.type === t.value
                                            ? "bg-slate-900 text-white shadow-md"
                                            : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                                        }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tanggal */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                                Mulai
                            </label>
                            <input
                                type="date"
                                className="w-full bg-slate-50 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                                value={form.startDate}
                                onChange={e => setForm({ ...form, startDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                                Selesai
                            </label>
                            <input
                                type="date"
                                className={`w-full bg-slate-50 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 transition-all ${isEndBeforeStart ? "ring-2 ring-red-300 bg-red-50" : "focus:ring-emerald-500/20 focus:bg-white"
                                    }`}
                                value={form.endDate}
                                min={form.startDate}
                                onChange={e => setForm({ ...form, endDate: e.target.value })}
                            />
                        </div>
                    </div>
                    {isEndBeforeStart && (
                        <p className="text-xs text-red-500 font-medium -mt-2">Tanggal selesai tidak boleh sebelum tanggal mulai</p>
                    )}

                    {/* Keterangan (opsional) */}
                    <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                            Keterangan <span className="normal-case font-medium">(opsional)</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Tambahkan keterangan..."
                            className="w-full bg-slate-50 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all placeholder:text-slate-300"
                            value={form.reason}
                            onChange={e => setForm({ ...form, reason: e.target.value })}
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={!isValid || !!isEndBeforeStart || isSubmitting}
                        className="w-full py-3.5 mt-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-sm transition-all shadow-md active:scale-[0.98]"
                    >
                        {isSubmitting ? "Menyimpan..." : "Simpan Cuti"}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
