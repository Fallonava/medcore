import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, CalendarDays } from "lucide-react";
import type { LeaveRequest } from "@/lib/data-service";
import { cn } from "@/lib/utils";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    leaves: LeaveRequest[];
    onDelete: (id: string) => Promise<void>;
}

export function AllLeavesModal({ isOpen, onClose, leaves, onDelete }: Props) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-[28px] p-6 w-full max-w-lg max-h-[80vh] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                            <CalendarDays className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-800">
                                Semua Data Cuti ({leaves.length})
                            </h3>
                            <p className="text-xs text-slate-400">
                                Daftar lengkap jadwal cuti dokter
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* List */}
                {leaves.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
                            <CalendarDays className="h-7 w-7 text-slate-300" />
                        </div>
                        <p className="text-sm font-semibold text-slate-600">
                            Belum ada data cuti.
                        </p>
                        <p className="text-xs text-slate-400 mt-1 max-w-xs">
                            Tambahkan data cuti baru dari tombol &quot;Tambah Cuti&quot; di halaman utama.
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar -mr-1 pr-1">
                        <div className="space-y-1.5">
                            {leaves.map(leave => {
                                const start = new Date(leave.startDate);
                                const end = new Date(leave.endDate);
                                const dateLabel = `${start.toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short'
                                })} - ${end.toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short'
                                })}`;

                                const typeColor = "text-slate-500";
                                const typeBg = "bg-slate-50";

                                return (
                                    <div
                                        key={leave.id}
                                        className="group flex items-center justify-between text-xs py-2 px-3 rounded-xl hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="h-7 w-7 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-[10px] font-black uppercase">
                                                {leave.doctor?.[0] || "D"}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-semibold text-slate-700 truncate">
                                                    {leave.doctor}
                                                </span>
                                                <span className="text-[11px] text-slate-400 truncate">
                                                    {dateLabel}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                            <span
                                                className={cn(
                                                    "text-[9px] font-black px-1.5 py-0.5 rounded-md flex-shrink-0",
                                                    typeColor,
                                                    typeBg
                                                )}
                                            >
                                                {leave.type}
                                            </span>
                                            <button
                                                onClick={() => onDelete(leave.id)}
                                                className="text-[11px] font-semibold text-red-500/70 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}

