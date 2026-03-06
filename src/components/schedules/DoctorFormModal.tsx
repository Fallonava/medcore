"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Save, Plus, User, Clock, Tag, Activity } from "lucide-react";
import type { Doctor } from "@/lib/data-service";
import { cn } from "@/lib/utils";

interface DoctorFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    doctor?: Doctor | null;
    onSuccess: () => void;
}

const STATUS_OPTIONS = [
    { value: 'TIDAK_PRAKTEK', label: 'Tidak Praktek', color: 'text-slate-500', bg: 'bg-slate-100', activeBg: 'bg-slate-800', activeText: 'text-white' },
    { value: 'BUKA', label: 'Buka', color: 'text-blue-600', bg: 'bg-blue-50', activeBg: 'bg-blue-600', activeText: 'text-white' },
    { value: 'PENUH', label: 'Penuh', color: 'text-amber-600', bg: 'bg-amber-50', activeBg: 'bg-amber-500', activeText: 'text-white' },
    { value: 'OPERASI', label: 'Operasi', color: 'text-red-600', bg: 'bg-red-50', activeBg: 'bg-red-600', activeText: 'text-white' },
    { value: 'CUTI', label: 'Cuti', color: 'text-purple-600', bg: 'bg-purple-50', activeBg: 'bg-purple-600', activeText: 'text-white' },
    { value: 'SELESAI', label: 'Selesai', color: 'text-emerald-600', bg: 'bg-emerald-50', activeBg: 'bg-emerald-600', activeText: 'text-white' },
];

export function DoctorFormModal({ isOpen, onClose, doctor, onSuccess }: DoctorFormModalProps) {
    const isEditing = !!doctor;
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const [formData, setFormData] = useState({
        name: "",
        specialty: "",
        category: "NonBedah" as "NonBedah" | "Bedah",
        status: "TIDAK_PRAKTEK" as string,
        queueCode: "",
        startTime: "",
        endTime: "",
        lastCall: "",
    });

    useEffect(() => {
        if (isOpen) {
            if (doctor) {
                setFormData({
                    name: doctor.name ?? "",
                    specialty: doctor.specialty ?? "",
                    category: doctor.category ?? "NonBedah",
                    status: doctor.status ?? "TIDAK_PRAKTEK",
                    queueCode: doctor.queueCode ?? "",
                    startTime: doctor.startTime ?? "",
                    endTime: doctor.endTime ?? "",
                    lastCall: (doctor as any).lastCall ?? "",
                });
            } else {
                setFormData({
                    name: "", specialty: "", category: "NonBedah",
                    status: "TIDAK_PRAKTEK", queueCode: "",
                    startTime: "", endTime: "", lastCall: "",
                });
            }
        }
    }, [isOpen, doctor]);

    const handleSubmit = async () => {
        if (!formData.name || !formData.specialty) return;
        setLoading(true);
        try {
            const method = isEditing ? 'PUT' : 'POST';
            const body = isEditing ? { ...formData, id: doctor!.id } : formData;
            await fetch('/api/doctors', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            onSuccess();
            onClose();
        } catch (err) {
            console.error("Failed to save doctor", err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !mounted) return null;

    // Custom Time Picker Helper
    const CustomTimeSelect = ({ value, onChange, label }: { value: string, onChange: (v: string) => void, label: string }) => {
        const [h, m] = (value || "08:00").split(":");
        return (
            <div>
                <label className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    <Clock size={9} /> {label}
                </label>
                <div className="flex items-center gap-1 bg-white/50 backdrop-blur-md rounded-2xl px-2 py-2.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_10px_-3px_rgba(0,0,0,0.02)] focus-within:bg-white/90 focus-within:ring-1 focus-within:ring-blue-500/30 transition-all">
                    <select 
                        value={h || "08"}
                        onChange={e => onChange(`${e.target.value}:${m || "00"}`)}
                        className="bg-transparent text-sm font-bold text-slate-800 outline-none w-10 text-center appearance-none cursor-pointer hover:text-blue-600 transition-colors"
                    >
                        {Array.from({length: 24}).map((_, i) => (
                            <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>
                        ))}
                    </select>
                    <span className="text-slate-400 font-bold">:</span>
                    <select 
                        value={m || "00"}
                        onChange={e => onChange(`${h || "08"}:${e.target.value}`)}
                        className="bg-transparent text-sm font-bold text-slate-800 outline-none w-10 text-center appearance-none cursor-pointer hover:text-blue-600 transition-colors"
                    >
                        {["00", "15", "30", "45"].map((min) => (
                            <option key={min} value={min}>{min}</option>
                        ))}
                    </select>
                </div>
            </div>
        );
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-md animate-in fade-in duration-300">
            <div
                className="bg-white/80 backdrop-blur-[50px] saturate-200 rounded-[32px] w-full max-w-md shadow-[0_24px_80px_-12px_rgba(0,0,0,0.2)] border border-white/60 animate-in zoom-in-95 duration-300 relative overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* ── Header ── */}
                <div className="flex items-center gap-4 p-6 pb-0">
                    <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0",
                        isEditing ? "bg-blue-50" : "bg-slate-900"
                    )}>
                        {isEditing
                            ? <Save className="h-5 w-5 text-blue-600" />
                            : <Plus className="h-5 w-5 text-white" />
                        }
                    </div>
                    <div className="flex-1">
                        <h3 className="text-base font-black text-slate-900">
                            {isEditing ? 'Edit Dokter' : 'Tambah Dokter Baru'}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                            {isEditing ? `Mengubah data ${doctor?.name}` : 'Isi data profil dokter di bawah ini'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* ── Form Fields ── */}
                <div className="p-6 space-y-5">

                    {/* Nama & Spesialis */}
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                <User size={10} />
                                Nama Lengkap
                            </label>
                            <input
                                autoFocus={!isEditing}
                                placeholder="cth. dr. Sarah Johnson, Sp. B"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-white/50 backdrop-blur-md rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-800 outline-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_10px_-3px_rgba(0,0,0,0.02)] focus:bg-white/90 focus:shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_4px_20px_-4px_rgba(0,92,255,0.15)] focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-slate-400"
                            />
                        </div>
                        <div>
                            <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                <Tag size={10} />
                                Spesialisasi
                            </label>
                            <input
                                placeholder="cth. Bedah Umum, Penyakit Dalam..."
                                value={formData.specialty}
                                onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                                className="w-full bg-white/50 backdrop-blur-md rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-800 outline-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_10px_-3px_rgba(0,0,0,0.02)] focus:bg-white/90 focus:shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_4px_20px_-4px_rgba(0,92,255,0.15)] focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    {/* Kategori */}
                    <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Kategori</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { value: 'NonBedah', label: '🩺 Non-Bedah', selColor: 'bg-emerald-600', selShadow: 'shadow-emerald-500/20' },
                                { value: 'Bedah', label: '🔪 Bedah', selColor: 'bg-red-600', selShadow: 'shadow-red-500/20' },
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, category: opt.value as any })}
                                    className={cn(
                                        "py-3 rounded-2xl text-xs font-bold transition-all shadow-sm",
                                        formData.category === opt.value
                                            ? `${opt.selColor} text-white shadow-md ${opt.selShadow}`
                                            : "bg-white/60 text-slate-500 hover:bg-white hover:text-slate-800 border border-slate-100"
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                            <Activity size={10} />
                            Status
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                            {STATUS_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status: opt.value })}
                                    className={cn(
                                        "py-2.5 rounded-xl text-[10px] font-black transition-all",
                                        formData.status === opt.value
                                            ? `${opt.activeBg} ${opt.activeText} shadow-sm`
                                            : `${opt.bg} ${opt.color} hover:opacity-80`
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Kode antrian + Waktu */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                                Kode Antrian
                            </label>
                            <input
                                placeholder="A-01"
                                value={formData.queueCode}
                                onChange={e => setFormData({ ...formData, queueCode: e.target.value })}
                                className="w-full bg-white/50 backdrop-blur-md rounded-2xl px-3 py-3.5 text-sm font-bold text-slate-800 outline-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_10px_-3px_rgba(0,0,0,0.02)] focus:bg-white/90 focus:ring-1 focus:ring-blue-500/30 transition-all text-center placeholder:text-slate-400"
                            />
                        </div>
                        <CustomTimeSelect 
                            label="Mulai"
                            value={formData.startTime}
                            onChange={(v) => setFormData(f => ({ ...f, startTime: v }))}
                        />
                        <CustomTimeSelect 
                            label="Selesai"
                            value={formData.endTime}
                            onChange={(v) => setFormData(f => ({ ...f, endTime: v }))}
                        />
                    </div>
                </div>

                {/* ── Footer Actions ── */}
                <div className="px-6 pb-6 pt-2 flex gap-3 relative z-10">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 rounded-2xl bg-white/60 hover:bg-white border border-slate-100/80 text-slate-600 text-sm font-bold shadow-sm backdrop-blur-md transition-all active:scale-95"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !formData.name || !formData.specialty}
                        className={cn(
                            "flex-[2] py-4 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 active:scale-95 group relative overflow-hidden",
                            loading || !formData.name || !formData.specialty
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                : "btn-gradient text-white shadow-[0_4px_14px_0_rgba(0,92,255,0.39)]"
                        )}
                    >
                        {(!loading && formData.name && formData.specialty) && <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:animate-shimmer" />}
                        {loading ? (
                            <span className="relative z-10 animate-pulse">Menyimpan...</span>
                        ) : (
                            <>
                                {isEditing ? <Save size={16} className="relative z-10" /> : <Plus size={16} className="relative z-10" />}
                                <span className="relative z-10">{isEditing ? 'Simpan Perubahan' : 'Tambah Dokter'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Backdrop click to close */}
            <div className="absolute inset-0 -z-10" onClick={onClose} />
        </div>,
        document.body
    );
}
