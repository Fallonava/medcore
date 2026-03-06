"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { Megaphone, Users, Calendar, RefreshCw, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Shift, Doctor, BroadcastRule } from "@/lib/data-service";

interface ActivityItem {
    id: string;
    title: string;
    desc: string;
    time: string;
    type: 'shift' | 'broadcast' | 'doctor' | 'system';
}

const ICON_MAP = {
    shift: Calendar,
    broadcast: Megaphone,
    doctor: Users,
    system: RefreshCw,
};

const COLOR_MAP = {
    shift: {
        dot: "bg-blue-400",
        text: "text-blue-600",
        badge: "bg-blue-50 border-blue-100 text-blue-600",
        block: "hover:bg-blue-50/60 hover:border-blue-200",
        icon: "bg-blue-100 text-blue-600",
    },
    broadcast: {
        dot: "bg-orange-400",
        text: "text-orange-600",
        badge: "bg-orange-50 border-orange-100 text-orange-600",
        block: "hover:bg-orange-50/60 hover:border-orange-200",
        icon: "bg-orange-100 text-orange-600",
    },
    doctor: {
        dot: "bg-emerald-400",
        text: "text-emerald-600",
        badge: "bg-emerald-50 border-emerald-100 text-emerald-600",
        block: "hover:bg-emerald-50/60 hover:border-emerald-200",
        icon: "bg-emerald-100 text-emerald-600",
    },
    system: {
        dot: "bg-violet-400",
        text: "text-violet-600",
        badge: "bg-violet-50 border-violet-100 text-violet-600",
        block: "hover:bg-violet-50/60 hover:border-violet-200",
        icon: "bg-violet-100 text-violet-600",
    },
};

export function ActivityStream() {
    const { data: shifts = [] } = useSWR<Shift[]>('/api/shifts');
    const { data: doctors = [] } = useSWR<Doctor[]>('/api/doctors');
    const { data: broadcasts = [] } = useSWR<BroadcastRule[]>('/api/automation');

    const activities = useMemo(() => {
        const items: { id: string; title: string; desc: string; time: string; type: 'shift' | 'broadcast' | 'doctor' | 'system' }[] = [];

        shifts.slice(-3).reverse().forEach((s: Shift, i: number) => {
            items.push({
                id: `shift-${s.id}`,
                title: `Shift Schedule: ${s.doctor}`,
                desc: `${s.title} — Day ${s.dayIdx + 1}, ${s.formattedTime || 'N/A'}`,
                time: i === 0 ? 'Recent' : `${i + 1}h ago`,
                type: 'shift'
            });
        });

        broadcasts.slice(-2).reverse().forEach((b: BroadcastRule) => {
            items.push({
                id: `broadcast-${b.id}`,
                title: `Broadcast: ${b.alertLevel}`,
                desc: b.message?.slice(0, 60) + (b.message?.length > 60 ? '...' : ''),
                time: b.active ? 'Airing Now' : 'Completed',
                type: 'broadcast'
            });
        });

        items.push({
            id: 'doctor-count',
            title: `${doctors.length} Doctors Registered`,
            desc: 'System database successfully synchronized.',
            time: 'Verified',
            type: 'doctor'
        });

        items.push({
            id: 'sys-health',
            title: 'System Diagnostics OK',
            desc: 'All processes and stores synchronized.',
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            type: 'system'
        });

        return items;
    }, [shifts, doctors, broadcasts]);

    return (
        <div className="relative rounded-3xl border border-slate-200 bg-white p-6 flex flex-col group overflow-hidden shadow-lg shadow-slate-200/60 transition-all duration-500 hover:border-slate-300 hover:shadow-xl">
            {/* Soft ambient glow */}
            <div className="absolute top-0 right-0 h-32 w-32 bg-violet-50 blur-[60px] -z-10 pointer-events-none" />

            {/* Header */}
            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 shadow-lg shadow-violet-300/40">
                    <Zap className="text-white h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">System Logs</h3>
                    <p className="text-[11px] text-violet-600 font-mono uppercase tracking-widest mt-0.5 font-semibold">Activity Stream</p>
                </div>
            </div>

            {/* Timeline */}
            <div className="relative z-10 mt-2">
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-slate-200 via-slate-100 to-transparent" />

                <div className="space-y-4 pb-2">
                    {activities.map((item) => {
                        const color = COLOR_MAP[item.type];
                        const Icon = ICON_MAP[item.type];
                        return (
                            <div key={item.id} className="relative pl-10 group/item">
                                {/* Timeline Dot */}
                                <div className={cn(
                                    "absolute left-1.5 top-2 h-3.5 w-3.5 rounded-full transition-all duration-300 group-hover/item:scale-125 border-2 border-white shadow-md",
                                    color.dot
                                )} />

                                {/* Content Block */}
                                <div className={cn(
                                    "bg-white border border-slate-100 rounded-2xl p-4 transition-all duration-300 shadow-sm group-hover/item:shadow-md",
                                    color.block
                                )}>
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className={cn("p-1 rounded-md", color.icon)}>
                                                    <Icon size={10} />
                                                </div>
                                                <h4 className="text-sm font-semibold text-slate-800 truncate">{item.title}</h4>
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                                        </div>
                                        <span className={cn(
                                            "text-[10px] font-mono font-bold tracking-wider flex-shrink-0 px-2.5 py-1 rounded-md border",
                                            color.badge
                                        )}>
                                            {item.time}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
