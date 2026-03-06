"use client";

import { useState, useMemo } from "react";
import useSWR, { mutate } from "swr";
import Image from "next/image";
import { useDebounce } from "@/hooks/use-debounce";
import { Users, Search, Plus, Edit2, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Shift, Doctor } from "@/lib/data-service";
import { ScheduleModal } from "./ScheduleModal";
import { DoctorFormModal } from "./DoctorFormModal";
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useEffect } from "react";
import { useSocket } from "@/hooks/use-socket";

// Color hash for doctor initials
const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

export function UpcomingShifts() {
    const { data: shifts = [] } = useSWR<Shift[]>('/api/shifts');
    const { data: doctors = [] } = useSWR<Doctor[]>('/api/doctors');
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

    // CRUD State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearch = useDebounce(searchQuery, 200);

    const parentRef = useRef<HTMLDivElement>(null);

    const fetchAll = () => {
        mutate('/api/shifts');
        mutate('/api/doctors');
    };

    // WebSocket Integration
    const { socket } = useSocket('schedules');
    useEffect(() => {
        if (!socket) return;
        
        socket.on('schedule_changed', () => {
            fetchAll(); // Real-time UI refresh for all schedules
        });
        
        return () => {
            socket.off('schedule_changed');
        };
    }, [socket]);

    const filteredDoctors = useMemo(() => {
        return doctors.filter(d =>
            d.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            d.specialty.toLowerCase().includes(debouncedSearch.toLowerCase())
        );
    }, [doctors, debouncedSearch]);

    const rowVirtualizer = useVirtualizer({
        count: filteredDoctors.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 76,
        overscan: 5,
    });

    const handleDoctorClick = (doc: Doctor) => {
        setSelectedDoctor(doc);
        setIsScheduleModalOpen(true);
    };

    const handleAdd = () => {
        setEditingDoctor(null);
        setIsFormOpen(true);
    };

    const handleEdit = (e: React.MouseEvent, doc: Doctor) => {
        e.stopPropagation(); // Prevent opening schedule modal
        setEditingDoctor(doc);
        setIsFormOpen(true);
    };

    const handleDelete = async (e: React.MouseEvent, id: string | number) => {
        e.stopPropagation();
        if (!confirm("Apakah Anda yakin ingin menghapus dokter ini?")) return;

        try {
            await fetch(`/api/doctors?id=${id}`, { method: 'DELETE' });
            fetchAll();
        } catch (error) {
            console.error("Failed to delete", error);
        }
    };

    return (
        <div className="w-full xl:w-[380px] super-glass-card rounded-[32px] h-[600px] xl:h-full ml-0 flex flex-col z-10 p-2 shadow-sm min-h-0 flex-shrink-0">

            {/* ── All Doctors List (Full Sidebar) ───────────── */}
            <div className="p-6 flex-1 flex flex-col min-h-0 bg-white/40 rounded-[24px]">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shadow-inner">
                            <Users size={16} className="text-blue-500" />
                        </div>
                        <h3 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-widest">Semua Dokter</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-500 font-bold bg-white/60 px-2 py-1 rounded-lg shadow-sm border border-slate-100">{filteredDoctors.length}</span>
                        <button
                            onClick={handleAdd}
                            className="btn-gradient text-white p-2 rounded-xl transition-transform active:scale-95 shadow-[0_4px_14px_0_rgba(0,92,255,0.39)] group relative overflow-hidden"
                            title="Tambah Dokter"
                        >
                            <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:animate-shimmer" />
                            <Plus size={14} className="relative z-10" />
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-6 group">
                    <div className="absolute -inset-0.5 bg-primary/10 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Cari dokter..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/60 backdrop-blur-xl rounded-2xl pl-10 pr-4 py-3 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_10px_-3px_rgba(0,0,0,0.02)] focus:bg-white/90"
                        />
                    </div>
                </div>

                {/* Scrollable List */}
                <div ref={parentRef} className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    <div
                        style={{
                            height: `${rowVirtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative',
                        }}
                    >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const doc = filteredDoctors[virtualRow.index];
                            return (
                                <div
                                    key={doc.id}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                        paddingBottom: '8px'
                                    }}
                                >
                                    <div
                                        onClick={() => handleDoctorClick(doc)}
                                        className="w-full h-full flex items-center gap-4 p-3 rounded-[20px] bg-white/30 hover:bg-white/80 hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 text-left group cursor-pointer relative border border-transparent hover:border-slate-100"
                                    >
                                        <Avatar className="h-12 w-12 border-2 border-white/50 shadow-sm group-hover:scale-105 transition-transform">
                                            {doc.image ? (
                                                <Image src={doc.image} alt={doc.name} width={48} height={48} className="h-full w-full object-cover" />
                                            ) : (
                                                <AvatarFallback className="bg-slate-100 text-[12px] font-extrabold text-slate-500 group-hover:text-blue-600 transition-colors">
                                                    {doc.queueCode || getInitials(doc.name)}
                                                </AvatarFallback>
                                            )}
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">{doc.name}</p>
                                            <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{doc.specialty}</p>
                                        </div>

                                        {/* CRUD Actions (Visible on Hover) */}
                                        <div className="absolute right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 bg-white/90 p-1.5 rounded-xl shadow-sm backdrop-blur-xl border border-slate-100/50">
                                            <button
                                                onClick={(e) => handleEdit(e, doc)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 size={13} />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(e, doc.id)}
                                                className="p-1.5 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                title="Hapus"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <ScheduleModal
                doctor={selectedDoctor}
                shifts={shifts}
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                onUpdate={fetchAll}
            />

            <DoctorFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                doctor={editingDoctor}
                onSuccess={fetchAll}
            />
        </div>
    );
}
