"use client";

import { useState, useMemo } from "react";
import useSWR, { mutate } from "swr";
import { useDebounce } from "@/hooks/use-debounce";
import { LeaveCalendar } from "@/components/leaves/LeaveCalendar";
import { Search, CalendarDays, UserCheck, Clock3, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeaveRequest, Doctor } from "@/lib/data-service";
import { AllLeavesModal } from "@/components/leaves/AllLeavesModal";

export default function LeavesPage() {
    const { data: rawLeaves, mutate: mutateLeaves } = useSWR<LeaveRequest[]>('/api/leaves');
    const { data: rawDoctors } = useSWR<Doctor[]>('/api/doctors');

    const leaves = Array.isArray(rawLeaves) ? rawLeaves : [];
    const doctors = Array.isArray(rawDoctors) ? rawDoctors : [];
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearch = useDebounce(searchQuery, 400); // 400ms delay for visual feedback
    const isSearching = searchQuery !== debouncedSearch;
    const [isAllLeavesOpen, setIsAllLeavesOpen] = useState(false);

    const totalLeaves = leaves.length;

    function isDateInLeave(checkDate: Date, leave: LeaveRequest) {
        const target = new Date(checkDate);
        target.setHours(0, 0, 0, 0);

        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        return target >= start && target <= end;
    }

    const { onLeaveToday, cutiBuilanIni, stats } = useMemo(() => {
        const now = new Date();
        const onLeaveToday = leaves.filter(l => isDateInLeave(now, l)).length;
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const cutiBuilanIni = leaves.filter(l => {
            for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
                if (isDateInLeave(new Date(d), l)) return true;
            }
            return false;
        }).length;

        const stats = [
            { label: "Total Data Cuti", value: totalLeaves, icon: CalendarDays, color: "text-blue-600", bg: "bg-blue-50", iconBg: "bg-blue-100" },
            { label: "Cuti Hari Ini", value: onLeaveToday, icon: UserCheck, color: "text-amber-600", bg: "bg-amber-50", iconBg: "bg-amber-100" },
            { label: "Cuti Bulan Ini", value: cutiBuilanIni, icon: Clock3, color: "text-emerald-600", bg: "bg-emerald-50", iconBg: "bg-emerald-100" },
        ];

        return { onLeaveToday, cutiBuilanIni, stats };
    }, [leaves, totalLeaves]);

    const filteredLeaves = useMemo(() =>
        debouncedSearch === ""
            ? leaves
            : leaves.filter(l => (l.doctor || "").toLowerCase().includes(debouncedSearch.toLowerCase())),
        [leaves, debouncedSearch]
    );

    return (
        <div className="w-full h-full flex flex-col px-2 lg:px-4">

            {/* ═══ HEADER ═══ */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 sm:pt-4 mb-5 lg:mb-6 gap-3 sm:gap-4 flex-shrink-0 w-full relative z-20">
                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                    <div className="p-2 sm:p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[14px] sm:rounded-2xl shadow-[0_4px_14px_0_rgba(16,185,129,0.3)] text-white flex-shrink-0">
                        <CalendarDays size={18} className="sm:hidden" />
                        <CalendarDays size={22} className="hidden sm:block" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0 pr-2 sm:pr-0">
                        <h1 className="text-lg sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 leading-tight truncate">
                            Jadwal <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">Cuti</span>
                        </h1>
                        <p className="text-[11px] sm:text-xs lg:text-sm text-slate-500 font-medium mt-0.5 truncate bg-white/60 backdrop-blur-sm self-start px-1.5 -ml-1.5 rounded-md">Kelola dan pantau jadwal cuti seluruh dokter</p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-auto flex-shrink-0 -ml-1 pl-1 sm:pl-0 sm:ml-0 translate-y-[-2px] sm:translate-y-0 group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-[14px] blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
                    <div className="relative">
                        {isSearching ? (
                            <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500 h-4 w-4 animate-spin" />
                        ) : (
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        )}
                        <input
                            type="text"
                            placeholder="Cari dokter..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-48 xl:w-56 bg-white/70 backdrop-blur-xl rounded-[12px] pl-9 pr-4 py-2 text-sm font-semibold text-slate-700 outline-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_10px_-3px_rgba(0,0,0,0.02)] focus:bg-white focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:text-slate-400 border border-slate-200/50"
                        />
                    </div>
                </div>
            </header>

            {/* ═══ STATS CARDS ═══ */}
            <div className="flex overflow-x-auto md:grid md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8 pb-3 md:pb-0 custom-scrollbar snap-x snap-mandatory pr-1 md:pr-0 -mx-2 px-2 md:px-0 md:mx-0">
                {stats.map((stat, idx) => {
                    const Icon = stat.icon;
                const isTotalCard = stat.label === "Total Data Cuti";
                    return (
                    <div
                            key={stat.label}
                        onClick={isTotalCard ? () => setIsAllLeavesOpen(true) : undefined}
                        className={cn(
                            "super-glass-card p-5 md:p-6 rounded-[28px] md:rounded-[32px] flex items-center gap-4 md:gap-5 transition-all duration-500 hover:-translate-y-1 min-w-[260px] md:min-w-0 flex-shrink-0 snap-center md:snap-align-none",
                            isTotalCard && "cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-blue-100"
                        )}
                        >
                            <div className={cn("flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-[20px] md:rounded-[24px] flex items-center justify-center shadow-inner", stat.iconBg)}>
                                <Icon className={cn("h-6 w-6 md:h-8 md:w-8", stat.color)} />
                            </div>
                            <div>
                                <p className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">{stat.value}</p>
                                <p className="text-[10px] md:text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">{stat.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ═══ CALENDAR CONTENT ═══ */}
            <div className="flex-1 min-h-0">
                <LeaveCalendar
                    leaves={filteredLeaves}
                    onRefresh={() => mutate('/api/leaves')}
                />
            </div>

            <AllLeavesModal
                isOpen={isAllLeavesOpen}
                onClose={() => setIsAllLeavesOpen(false)}
                leaves={leaves}
                onDelete={async (id: string) => {
                    await fetch(`/api/leaves?id=${id}`, { method: 'DELETE' });
                    mutate('/api/leaves');
                }}
            />
        </div>
    );
}
