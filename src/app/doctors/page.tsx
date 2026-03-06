"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import useSWR, { mutate } from "swr";
import { useDebounce } from "@/hooks/use-debounce";
import { Plus, Search, UserRound, Activity, Users, CheckSquare, Trash2, X, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Doctor } from "@/lib/data-service";
import { DoctorFormModal } from "@/components/schedules/DoctorFormModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DoctorCard } from "@/components/doctors/DoctorCard";

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay, defaultDropAnimationSideEffects } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from "@dnd-kit/sortable";

// Custom Dropdown Component moved outside to prevent re-definitions on parent render
const CustomDropdown = ({ value, options, onChange, icon }: any) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const selectedLabel = options.find((o: any) => o.value === value)?.label || value;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative z-30" ref={containerRef}>
            <button 
                type="button"
                onClick={() => setOpen(!open)}
                className={cn(
                    "w-full sm:w-auto flex items-center justify-between gap-1.5 sm:gap-2.5 bg-white/70 backdrop-blur-xl rounded-xl sm:rounded-[20px] px-3 sm:px-5 py-2 sm:py-3.5 text-[11px] sm:text-sm font-semibold text-slate-700 outline-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_8px_-3px_rgba(0,0,0,0.05)] border border-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all whitespace-nowrap",
                    open && "ring-4 ring-blue-500/20 border-blue-500/30 bg-white shadow-md"
                )}
            >
                <span className="flex items-center gap-1.5 sm:gap-2 truncate">{icon} {selectedLabel}</span>
                <ChevronDown className={cn("w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 transition-transform duration-300 flex-shrink-0", open && "rotate-180")} />
            </button>
            
            <div className={cn(
                "absolute top-[calc(100%+8px)] left-0 w-full min-w-[200px] bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)] border border-white/50 p-2 transition-all duration-300 origin-top z-50 overflow-y-auto max-h-[300px] custom-scrollbar",
                open ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
            )}>
                {options.map((opt: any) => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => { onChange(opt.value); setOpen(false); }}
                        className={cn(
                            "w-full text-left px-3 sm:px-4 py-2 sm:py-3 rounded-[12px] sm:rounded-[16px] text-xs sm:text-sm font-semibold transition-all flex items-center justify-between group/item",
                            value === opt.value 
                                ? "bg-blue-600 text-white shadow-md sm:shadow-lg shadow-blue-500/20" 
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        )}
                    >
                        <span>{opt.label}</span>
                        {value === opt.value ? (
                            <div className="w-2 h-2 rounded-full bg-white animate-in zoom-in-50 duration-300" />
                        ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover/item:bg-slate-300 transition-colors" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default function DoctorsPage() {
    const { data } = useSWR<Doctor[]>('/api/doctors');
    const doctors = data || [];

    // Local state for doctors to handle optimistic UI during drag-and-drop
    const [localDoctors, setLocalDoctors] = useState<Doctor[]>([]);
    useEffect(() => {
        // Sync with SWR data but keep order if previously dragged (unless SWR is fresh)
        if (data) {
            setLocalDoctors(data);
        }
    }, [data]);

    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 400); // 400ms delay for visual feedback

    // isSearching checks if the user is typing but the debounce hasn't caught up yet
    const isSearching = searchTerm !== debouncedSearch;
    
    // Filters & Sorting
    const [catFilter, setCatFilter] = useState<"Semua" | "Bedah" | "NonBedah">("Semua");
    const [statusFilter, setStatusFilter] = useState<string>("Semua");
    const [sortMode, setSortMode] = useState<"default" | "A-Z" | "Z-A">("default");

    // Modal States
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingDoctor, setEditingDoctor] = useState<Doctor | undefined>(undefined);

    // Bulk Select State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Delete State
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // DND States
    const [activeId, setActiveId] = useState<string | null>(null);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const isReorderEnabled = catFilter === "Semua" && statusFilter === "Semua" && sortMode === "default" && debouncedSearch === "";

    // ── Computed Data ──
    const filteredDoctors = useMemo(() => {
        let result = [...localDoctors];

        if (debouncedSearch) {
            result = result.filter(d => d.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || d.specialty.toLowerCase().includes(debouncedSearch.toLowerCase()));
        }
        if (catFilter !== "Semua") {
            result = result.filter(d => d.category === catFilter);
        }
        if (statusFilter !== "Semua") {
            result = result.filter(d => statusFilter === "Aktif" ? (d.status === "BUKA" || d.status === "PENUH" || d.status === "OPERASI") : d.status === statusFilter.toUpperCase());
        }

        if (sortMode === "A-Z") result.sort((a,b) => a.name.localeCompare(b.name));
        if (sortMode === "Z-A") result.sort((a,b) => b.name.localeCompare(a.name));
        
        return result;
    }, [localDoctors, debouncedSearch, catFilter, statusFilter, sortMode]);

    const { totalCuti, totalBedah, totalNonBedah } = useMemo(() => ({
        totalCuti: doctors.filter(d => d.status === 'CUTI').length,
        totalBedah: doctors.filter(d => d.category === 'Bedah').length,
        totalNonBedah: doctors.filter(d => d.category === 'NonBedah').length,
    }), [doctors]);

    // ── Event Handlers ──
    const handleEdit = (doc: Doctor) => {
        setEditingDoctor(doc);
        setIsFormOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteId && selectedIds.size === 0) return;
        setIsDeleting(true);
        try {
            if (deleteId) {
                // Delete single
                await fetch(`/api/doctors?id=${deleteId}`, { method: 'DELETE' });
            } else if (selectedIds.size > 0) {
                for (const id of Array.from(selectedIds)) {
                    await fetch(`/api/doctors?id=${id}`, { method: 'DELETE' });
                }
            }
            mutate('/api/doctors');
            setDeleteId(null);
            setSelectedIds(new Set());
        } catch (error) {
            console.error("Gagal menghapus dokter", error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleBulkStatusChange = async (newStatus: string) => {
        if (selectedIds.size === 0) return;
        try {
            const updates = Array.from(selectedIds).map(id => ({ id, status: newStatus }));
            await fetch('/api/doctors?action=bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            mutate('/api/doctors');
            setSelectedIds(new Set());
        } catch (error) {
            console.error("Gagal update massal", error);
        }
    };

    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredDoctors.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredDoctors.map(d => d.id)));
        }
    };

    // ── DND Logic ──
    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event: any) => {
        const { active, over } = event;
        setActiveId(null);

        if (over && active.id !== over.id) {
            const oldIndex = localDoctors.findIndex(d => d.id === active.id);
            const newIndex = localDoctors.findIndex(d => d.id === over.id);

            const reordered = arrayMove(localDoctors, oldIndex, newIndex);
            setLocalDoctors(reordered); // Optimistic

            // Prepare payload
            const payload = reordered.map((doc, idx) => ({ id: doc.id, order: idx }));
            
            try {
                await fetch('/api/doctors?action=reorder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                mutate('/api/doctors'); // Revalidate
            } catch (err) {
                console.error("Failed to reorder", err);
            }
        }
    };

    return (
        <div className="w-full h-full flex flex-col px-2 lg:px-4 relative">
            {/* ═══════════════════ HEADER ═══════════════════ */}
            <header className="flex flex-col lg:flex-row lg:items-center justify-between mb-5 lg:mb-8 gap-4 lg:gap-6 flex-shrink-0 w-full relative z-20">
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[300px] h-[150px] bg-blue-500/10 rounded-full blur-[60px] animate-pulse pointer-events-none" />

                <div className="flex items-center gap-3 sm:gap-4 relative w-full lg:w-auto">
                    <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-[14px] sm:rounded-[22px] shadow-[0_10px_20px_-8px_rgba(79,70,229,0.7)] text-white flex-shrink-0 relative overflow-hidden group">
                        <Users size={18} className="sm:hidden relative z-10" />
                        <Users size={24} className="hidden sm:block sm:w-7 sm:h-7 relative z-10 drop-shadow-md" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center justify-between lg:justify-start w-full">
                            <h1 className="text-lg sm:text-2xl lg:text-3xl font-black tracking-tight flex items-center gap-1 sm:gap-2 truncate">
                                <span className="text-slate-900">Direktori</span>
                                <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent">Dokter</span>
                            </h1>
                            {/* Mobile-only Compact Toggle Select All */}
                            <button
                                onClick={toggleSelectAll}
                                className="lg:hidden bg-white/70 hover:bg-white backdrop-blur-xl rounded-xl p-2 shadow-sm border border-white text-slate-500 hover:text-blue-600 transition-all active:scale-95 flex-shrink-0"
                            >
                                <CheckSquare size={18} />
                            </button>
                        </div>
                        <p className="text-[11px] sm:text-xs lg:text-sm text-slate-500 font-medium truncate mt-0.5 sm:mt-1">
                            Kelola profil dan jadwal tayang dokter secara real-time
                        </p>
                    </div>
                </div>

                <div className="relative z-10 w-full lg:w-auto -ml-1 pl-1 lg:pl-0">
                    <button
                        onClick={() => { setEditingDoctor(undefined); setIsFormOpen(true); }}
                        className="w-full sm:w-auto bg-slate-900 text-white px-5 sm:px-6 lg:px-7 py-2.5 sm:py-3 lg:py-3.5 rounded-[12px] sm:rounded-[18px] lg:rounded-[20px] flex items-center justify-center gap-2 font-bold text-xs sm:text-sm shadow-md sm:shadow-lg hover:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95"
                    >
                        <Plus size={16} className="sm:w-[18px] sm:h-[18px] lg:w-5 lg:h-5" />
                        <span>Tambah Dokter</span>
                    </button>
                </div>
            </header>

            {/* ═══════════════════ TOOLBAR PENCARIAN & FILTER ═══════════════════ */}
            <div className="flex flex-col xl:flex-row gap-3 xl:gap-4 mb-6 xl:mb-8 relative z-10 w-full items-center">
                {/* Search Input */}
                <div className="relative group overflow-hidden rounded-[18px] sm:rounded-[22px] w-full xl:flex-1 shadow-sm transition-all hover:shadow-md">
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_12px_-4px_rgba(0,0,0,0.05)] transition-all group-focus-within:shadow-[0_4px_20px_-4px_rgba(59,130,246,0.15)] group-focus-within:border-blue-500/30 group-hover:bg-white/80 z-0" />
                    {isSearching ? (
                        <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 h-4 w-4 sm:h-5 sm:w-5 animate-spin z-10" />
                    ) : (
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 sm:h-5 sm:w-5 group-focus-within:text-blue-500 transition-colors z-10" />
                    )}
                    <input
                        type="text"
                        placeholder="Cari dokter..."
                        className="relative z-10 w-full bg-transparent pl-10 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3.5 text-[11px] sm:text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400/80 transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Filters Row - Horizontal Scroll on Mobile, Grid on Desktop */}
                <div className="flex flex-nowrap xl:grid xl:grid-cols-3 gap-3 xl:gap-3 overflow-x-auto xl:overflow-visible pb-4 pt-1 px-1 -mx-1 xl:mx-0 xl:px-0 sm:pb-4 xl:pb-0 no-scrollbar items-center min-h-[48px] xl:w-auto w-full snap-x snap-mandatory shrink-0">
                    <div className="flex-shrink-0 snap-center min-w-[140px] sm:min-w-[160px]">
                        <CustomDropdown 
                            value={catFilter} 
                            onChange={setCatFilter}
                            options={[
                                { value: "Semua", label: "Semua Kategori" },
                                { value: "Bedah", label: "Bedah" },
                                { value: "NonBedah", label: "Non Bedah" },
                            ]}
                        />
                    </div>

                    <div className="flex-shrink-0 snap-center min-w-[140px] sm:min-w-[160px]">
                        <CustomDropdown 
                            value={statusFilter} 
                            onChange={setStatusFilter}
                            options={[
                                { value: "Semua", label: "Semua Status" },
                                { value: "Aktif", label: "Aktif (Tayang)" },
                                { value: "Cuti", label: "Cuti" },
                                { value: "Selesai", label: "Selesai" },
                                { value: "TIDAK PRAKTEK", label: "Tidak Praktek" },
                            ]}
                        />
                    </div>

                    <div className="flex-shrink-0 snap-center pr-4 xl:pr-0">
                        <div className="flex items-center gap-2">
                            <div className="min-w-[150px] sm:min-w-[170px]">
                                <CustomDropdown 
                                    value={sortMode} 
                                    onChange={setSortMode}
                                options={[
                                    { value: "default", label: "Urutan Default" },
                                    { value: "A-Z", label: "Abjad A-Z" },
                                    { value: "Z-A", label: "Abjad Z-A" },
                                ]}
                            />
                            </div>
                            {/* Desktop only Select All Icon */}
                            <button
                                onClick={toggleSelectAll}
                                title="Pilih Semua"
                                className="hidden xl:flex items-center justify-center w-[46px] h-[46px] sm:w-[52px] sm:h-[52px] bg-white/70 hover:bg-white backdrop-blur-xl rounded-[18px] sm:rounded-[20px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_8px_-3px_rgba(0,0,0,0.05)] border border-white text-slate-500 hover:text-blue-600 transition-all active:scale-95 flex-shrink-0 relative group"
                            >
                                <CheckSquare className="w-[18px] h-[18px] sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Warning if DND is disabled */}
            {!isReorderEnabled && (
                <div className="mb-4 text-xs font-semibold text-amber-600 bg-amber-50 px-4 py-2 rounded-xl inline-flex items-center gap-2">
                    <Activity size={14} /> Drag & Drop untuk mengurutkan dokter dinonaktifkan asaat pencarian/filter aktif.
                </div>
            )}

            {/* ═══════════════════ GRID KARTU DOKTER ═══════════════════ */}
            {filteredDoctors.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-24 animate-in fade-in zoom-in-95 duration-500">
                    <div className="h-28 w-28 bg-gradient-to-br from-blue-50 to-indigo-50/30 rounded-[32px] flex items-center justify-center mb-8 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_12px_24px_-8px_rgba(99,102,241,0.15)] ring-1 ring-white">
                        <UserRound size={44} className="text-blue-400/80 drop-shadow-sm" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Tidak Ada Dokter</h3>
                    <p className="text-sm text-slate-400 font-medium max-w-sm leading-relaxed">
                        Kami tidak dapat menemukan nama dokter dengan pencarian tersebut. Coba ubah kata kunci Anda.
                    </p>
                </div>
            ) : (
                <DndContext 
                    sensors={sensors} 
                    collisionDetection={closestCenter} 
                    onDragStart={handleDragStart} 
                    onDragEnd={isReorderEnabled ? handleDragEnd : undefined}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6 gap-6 overflow-y-auto pb-32 custom-scrollbar px-1">
                        <SortableContext items={filteredDoctors.map(d => d.id)} strategy={rectSortingStrategy}>
                            {filteredDoctors.map((doc, idx) => (
                                <DoctorCard 
                                    key={doc.id}
                                    doctor={doc}
                                    index={idx}
                                    isSelected={selectedIds.has(doc.id)}
                                    onToggleSelect={handleToggleSelect}
                                    onEdit={handleEdit}
                                    onDelete={(id) => { setDeleteId(id); setIsDeleting(true); }}
                                />
                            ))}
                        </SortableContext>
                    </div>
                    
                    {/* Drag Overlay smoothly floats the card while moving */}
                    <DragOverlay dropAnimation={{
                        sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
                    }}>
                        {activeId ? (() => {
                            const actDoc = localDoctors.find(d => d.id === activeId);
                            if (!actDoc) return null;
                            const dIndex = localDoctors.findIndex(d => d.id === activeId);
                            return (
                                <DoctorCard 
                                    doctor={actDoc} 
                                    index={dIndex} 
                                    isSelected={selectedIds.has(activeId)}
                                    onToggleSelect={() => {}}
                                    onEdit={() => {}}
                                    onDelete={() => {}}
                                    isOverlay 
                                />
                            );
                        })() : null}
                    </DragOverlay>
                </DndContext>
            )}

            {/* ═══════════════════ FLOATING ACTION BAR (BULK) ═══════════════════ */}
            <div className={cn(
                "fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-[24px] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.5)] p-2 flex items-center gap-4 transition-all duration-500 z-50",
                selectedIds.size > 0 ? "translate-y-0 opacity-100 scale-100" : "translate-y-20 opacity-0 scale-95 pointer-events-none"
            )}>
                <div className="bg-white/10 px-4 py-2 rounded-[16px] text-sm font-bold flex items-center gap-2">
                    <CheckSquare size={16} className="text-blue-400" />
                    <span>{selectedIds.size} dipilih</span>
                </div>
                
                <div className="h-6 w-px bg-white/20" />
                
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400 ml-2">Ubah Status:</span>
                    <button onClick={() => handleBulkStatusChange('CUTI')} className="px-3 py-2 rounded-xl text-xs font-bold hover:bg-purple-500/20 text-purple-300 transition-colors">Cuti</button>
                    <button onClick={() => handleBulkStatusChange('TIDAK PRAKTEK')} className="px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-500/20 text-slate-300 transition-colors">Nonaktif</button>
                    <button onClick={() => handleBulkStatusChange('BUKA')} className="px-3 py-2 rounded-xl text-xs font-bold hover:bg-blue-500/20 text-blue-300 transition-colors">Buka</button>
                </div>

                <div className="h-6 w-px bg-white/20" />

                <button 
                    onClick={() => setIsDeleting(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-[16px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-sm transition-colors"
                >
                    <Trash2 size={16} /> Massal
                </button>

                <button onClick={() => setSelectedIds(new Set())} className="p-2 ml-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                    <X size={20} />
                </button>
            </div>

            {/* ═══════════════════ MODALS ═══════════════════ */}
            <DoctorFormModal
                isOpen={isFormOpen}
                onClose={() => { setIsFormOpen(false); setEditingDoctor(undefined); }}
                doctor={editingDoctor || null}
                onSuccess={() => mutate('/api/doctors')}
            />

            <ConfirmDialog
                isOpen={isDeleting}
                onClose={() => { setIsDeleting(false); setDeleteId(null); }}
                onConfirm={confirmDelete}
                title={deleteId ? "Hapus Dokter" : "Hapus Massal"}
                description={`Apakah Anda yakin ingin menghapus ${deleteId ? 'dokter ini' : `${selectedIds.size} dokter yang dipilih`}? Tindakan ini tidak dapat dibatalkan.`}
                confirmText={deleteId ? "Hapus" : "Hapus Semua"}
                variant="danger"
                isLoading={isDeleting}
            />
        </div>
    );
}
