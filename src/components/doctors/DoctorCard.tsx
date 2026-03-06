"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Tilt from "react-parallax-tilt";
import { UserRound, Edit2, Trash2, Activity, Clock, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Doctor } from "@/lib/data-service";
import { useEffect, useState } from "react";

// Palet warna avatar berdasarkan indeks
const avatarGradients = [
    "from-blue-500 to-cyan-400",
    "from-violet-500 to-purple-400",
    "from-rose-500 to-pink-400",
    "from-amber-500 to-orange-400",
    "from-emerald-500 to-teal-400",
    "from-indigo-500 to-blue-400",
    "from-fuchsia-500 to-pink-400",
    "from-sky-500 to-cyan-400",
];

const statusConfig: Record<string, { label: string; color: string; bg: string; dot?: string; pulse?: boolean }> = {
    'BUKA': { label: 'Aktif', color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' },
    'OPERASI': { label: 'Operasi', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500', pulse: true },
    'PENUH': { label: 'Penuh', color: 'text-amber-600', bg: 'bg-amber-50' },
    'CUTI': { label: 'Cuti', color: 'text-purple-600', bg: 'bg-purple-50' },
    'SELESAI': { label: 'Selesai', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    'TIDAK PRAKTEK': { label: 'Tidak Aktif', color: 'text-slate-400', bg: 'bg-slate-50' },
    'TIDAK_PRAKTEK': { label: 'Tidak Aktif', color: 'text-slate-400', bg: 'bg-slate-50' },
};

export function getStatusConfig(status?: string | null) {
    if (!status) return { label: 'Auto', color: 'text-slate-400', bg: 'bg-slate-50' };
    return statusConfig[status] || { label: status, color: 'text-slate-400', bg: 'bg-slate-50' };
}

interface DoctorCardProps {
    doctor: Doctor;
    index: number;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
    onEdit: (doc: Doctor) => void;
    onDelete: (id: string) => void;
    isOverlay?: boolean;
}

export function DoctorCard({ doctor, index, isSelected, onToggleSelect, onEdit, onDelete, isOverlay }: DoctorCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: doctor.id, data: { doctor } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 50 : 1,
    };

    const gradientClass = avatarGradients[index % avatarGradients.length];
    const status = getStatusConfig(doctor.status);

    // Countdown Logic
    const [timeRemaining, setTimeRemaining] = useState<string>("Buka");

    useEffect(() => {
        if (doctor.status === "TIDAK_PRAKTEK" || doctor.status === "TIDAK PRAKTEK" || doctor.status === "SELESAI" || doctor.status === "CUTI") {
            setTimeRemaining("");
            return;
        }

        const updateTime = () => {
            const now = new Date();
            const [endHour, endMin] = doctor.endTime.split(':').map(Number);
            if (isNaN(endHour)) {
                setTimeRemaining("");
                return;
            }

            const endDate = new Date();
            endDate.setHours(endHour, endMin, 0, 0);

            const diff = endDate.getTime() - now.getTime();
            if (diff <= 0) {
                setTimeRemaining("Selesai");
            } else {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                setTimeRemaining(`Sisa ${hours > 0 ? `${hours}j ` : ''}${minutes}m`);
            }
        };

        updateTime();
        const interval = setInterval(updateTime, 60000);
        return () => clearInterval(interval);
    }, [doctor.endTime, doctor.status]);

    const cardContent = (
        <div className={cn(
            "group bg-white/70 backdrop-blur-2xl p-6 rounded-[32px] flex flex-col min-h-[190px] cursor-grab active:cursor-grabbing border hover:-translate-y-1 transition-all relative overflow-hidden",
            isSelected ? "border-blue-500 shadow-[0_0_0_2px_rgba(59,130,246,0.3)] bg-blue-50/20" : "border-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_4px_16px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.08)]",
            isOverlay && "rotate-2 shadow-2xl scale-105"
        )}
            {...attributes} {...listeners}
        >
            {/* Glowing ambient light inside card */}
            <div className={cn("absolute -top-12 -right-12 w-28 h-28 bg-gradient-to-br rounded-full opacity-[0.08] blur-2xl group-hover:opacity-[0.15] transition-opacity duration-500 pointer-events-none", gradientClass)} />

            {/* Checkbox Overlay for Bulk Select */}
            <div 
                onClick={(e) => { e.stopPropagation(); onToggleSelect(doctor.id); }}
                className={cn(
                    "absolute top-4 left-4 h-6 w-6 rounded-[8px] border-2 flex items-center justify-center transition-all z-30 cursor-pointer",
                    isSelected ? "bg-blue-500 border-blue-500 text-white" : "border-slate-200 bg-white/50 opacity-0 group-hover:opacity-100 hover:border-blue-400"
                )}
            >
                {isSelected && <Check size={14} strokeWidth={3} />}
            </div>

            {/* ── Baris Atas: Avatar + Info ── */}
            <div className="flex items-center gap-4 mb-6 relative z-10 pl-6">
                <div className="relative flex-shrink-0">
                    <div className={cn(
                        "h-16 w-16 rounded-[22px] bg-gradient-to-br flex items-center justify-center text-white font-black text-2xl shadow-lg ring-1 ring-white/20 group-hover:scale-[1.03] group-hover:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.2)] transition-all duration-400",
                        gradientClass
                    )}>
                        {doctor.queueCode || doctor.name.charAt(0)}
                    </div>
                    {status.dot && (
                        <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                            {status.pulse && <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-60", status.dot)} />}
                            <span className={cn("relative inline-flex rounded-full h-4 w-4 ring-[3px] ring-white shadow-sm", status.dot)} />
                        </span>
                    )}
                </div>

                <div className="flex-1 min-w-0 pr-6" onDoubleClick={(e) => { e.stopPropagation(); onEdit(doctor); }}>
                    <h3 className="font-extrabold text-slate-800 text-lg tracking-tight leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {doctor.name}
                    </h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.12em] line-clamp-2 mt-1">
                        {doctor.specialty}
                    </p>
                    {timeRemaining && (
                        <p className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 mt-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            <Clock size={10} className="text-blue-500" /> {timeRemaining}
                        </p>
                    )}
                </div>
            </div>

            {/* ── Badges Kategori & Status ── */}
            <div className="mt-auto flex items-center justify-between gap-2 relative z-10 pl-2">
                <span className={cn(
                    "inline-flex items-center gap-1.5 text-[10px] px-3.5 py-1.5 rounded-xl font-bold uppercase tracking-wider backdrop-blur-sm border shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]",
                    doctor.category === 'Bedah'
                        ? "text-rose-600 bg-rose-50/80 border-rose-100/50"
                        : "text-emerald-600 bg-emerald-50/80 border-emerald-100/50"
                )}>
                    <Activity size={10} strokeWidth={2.5} />
                    {doctor.category === 'NonBedah' ? 'Non Bedah' : doctor.category}
                </span>

                <span className={cn(
                    "inline-flex items-center gap-1.5 text-[10px] px-3.5 py-1.5 rounded-xl font-black uppercase tracking-wider backdrop-blur-sm border shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]",
                    status.color, status.bg, "border-transparent text-opacity-90",
                    status.pulse && "animate-pulse"
                )}>
                    {status.label}
                </span>
            </div>

            {/* ── Tombol Aksi Hover ── */}
            <div className="absolute top-4 right-4 flex flex-col items-center gap-1.5 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300 z-20">
                <button
                    onPointerDown={(e) => { e.stopPropagation(); onEdit(doctor); }}
                    className="h-9 w-9 flex items-center justify-center rounded-[14px] bg-white/90 backdrop-blur-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] border border-slate-100 transition-all duration-200 hover:scale-105 active:scale-95"
                    title="Edit Dokter"
                >
                    <Edit2 size={14} strokeWidth={2.5} />
                </button>
                <button
                    onPointerDown={(e) => { e.stopPropagation(); onDelete(doctor.id); }}
                    className="h-9 w-9 flex items-center justify-center rounded-[14px] bg-white/90 backdrop-blur-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] border border-slate-100 transition-all duration-200 hover:scale-105 active:scale-95"
                    title="Hapus Dokter"
                >
                    <Trash2 size={14} strokeWidth={2.5} />
                </button>
            </div>
        </div>
    );

    if (isOverlay) return cardContent;

    return (
        <div ref={setNodeRef} style={style}>
            <Tilt 
                tiltMaxAngleX={isDragging ? 0 : 5} 
                tiltMaxAngleY={isDragging ? 0 : 5} 
                scale={isDragging ? 1 : 1.02} 
                transitionSpeed={2500} 
                className="h-full"
                glareEnable={false}
            >
                {cardContent}
            </Tilt>
        </div>
    );
}
