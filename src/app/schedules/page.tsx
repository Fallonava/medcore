"use client";

import { useState, useMemo } from "react";
import { RealtimeCalendar } from "@/components/schedules/RealtimeCalendar";
import { UpcomingShifts } from "@/components/schedules/UpcomingShifts";
import { Bell, Search, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function SchedulesPage() {
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Generate 14 days around selected date for the strip
    const stripDays = useMemo(() => {
        return Array.from({ length: 14 }, (_, i) => {
            const d = new Date(selectedDate);
            d.setDate(selectedDate.getDate() - 3 + i);
            return d;
        });
    }, [selectedDate]);

    return (
        <div className="w-full h-full px-2 lg:px-6 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="flex items-center justify-between pt-2 sm:pt-4 mb-5 lg:mb-6 gap-2 sm:gap-4 flex-shrink-0 w-full relative z-20 overflow-hidden">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0 pr-1">
                    <div className="p-2 sm:p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[14px] sm:rounded-2xl shadow-[0_4px_14px_0_rgba(0,92,255,0.3)] text-white flex-shrink-0">
                        <CalendarIcon size={18} className="sm:hidden" />
                        <CalendarIcon size={22} className="hidden sm:block" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <h1 className="text-base sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 leading-tight truncate">
                            Jadwal <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Dokter</span>
                        </h1>
                        <p className="hidden sm:block text-[11px] sm:text-xs lg:text-sm text-slate-500 font-medium mt-0.5 truncate bg-white/60 backdrop-blur-sm self-start px-1.5 -ml-1.5 rounded-md">Kelola jadwal mingguan dan shift dokter</p>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 sm:gap-3 lg:gap-4 flex-nowrap flex-shrink-0 w-auto overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 scrollbar-hide -ml-1 pl-1 sm:pl-0 sm:ml-0">
                    <div className="relative group hidden lg:block flex-shrink-0">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-[14px] blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                            <input
                                type="text"
                                placeholder="Search doctor or shift..."
                                className="bg-white/70 backdrop-blur-xl rounded-[12px] pl-9 pr-4 py-2 text-sm text-slate-700 focus:border-blue-500/30 outline-none transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_10px_-3px_rgba(0,0,0,0.02)] focus:bg-white w-48 xl:w-56 placeholder:text-slate-400 border border-slate-200/50"
                            />
                        </div>
                    </div>

                    <button className="relative p-2 flex-shrink-0 bg-white/70 backdrop-blur-xl rounded-[12px] text-slate-400 hover:text-slate-600 hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all group border border-slate-200/50 shadow-sm">
                        <Bell className="h-[18px] w-[18px] sm:h-5 sm:w-5 group-hover:animate-wiggle" />
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.6)]"></span>
                    </button>

                    <div className="flex items-center gap-2 sm:gap-3 lg:pl-4 border-l border-slate-200/60 ml-1 pl-3 lg:ml-0 flex-shrink-0">
                        <div className="text-right hidden sm:block">
                            <p className="text-[11px] sm:text-xs font-extrabold text-slate-800 leading-tight">Dr. Admin</p>
                            <p className="text-[9px] sm:text-[10px] text-blue-600 font-semibold uppercase tracking-wider mt-0.5">Super Admin</p>
                        </div>
                        <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shadow-sm hover:scale-105 transition-transform duration-300 ring-2 ring-white">
                            <AvatarFallback className="bg-gradient-to-tr from-blue-500 to-cyan-400 text-[10px] sm:text-xs font-bold text-white shadow-inner">AD</AvatarFallback>
                        </Avatar>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex flex-col lg:flex-row flex-1 min-h-0 gap-4 lg:gap-6 overflow-y-auto lg:overflow-visible pb-10 lg:pb-0 custom-scrollbar pr-1 lg:pr-0">
                <div className="flex-none lg:flex-1 w-full flex flex-col min-h-[600px] lg:min-h-0 lg:overflow-hidden">

                    {/* Calendar Strip (Premium Glass) */}
                    <div className="mb-4 lg:mb-8 super-glass-card rounded-[20px] lg:rounded-[32px] p-1.5 lg:p-3 flex items-center gap-1 lg:gap-3 shadow-sm border border-white/40">
                        {/* Month Indicator — compact on mobile */}
                        <div className="hidden sm:flex flex-col items-center justify-center px-4 lg:px-5 py-3 lg:py-4 bg-gradient-to-b from-white/90 to-white/50 text-blue-600 rounded-[16px] lg:rounded-[24px] mr-0.5 lg:mr-1 shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_20px_-6px_rgba(0,92,255,0.1)] backdrop-blur-xl border border-white transition-all flex-shrink-0">
                            <CalendarIcon size={20} className="mb-1 opacity-90 lg:hidden" strokeWidth={2.5} />
                            <CalendarIcon size={24} className="mb-1.5 opacity-90 hidden lg:block" strokeWidth={2.5} />
                            <span className="text-[9px] lg:text-[11px] font-black uppercase tracking-widest whitespace-nowrap">{selectedDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}</span>
                        </div>

                        {/* Prev Button */}
                        <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); }} className="p-2 lg:p-3.5 bg-white/40 hover:bg-white text-slate-400 hover:text-blue-600 rounded-xl lg:rounded-[20px] transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)] border border-transparent hover:border-white active:scale-95 flex-shrink-0">
                            <ChevronLeft size={18} className="lg:hidden" strokeWidth={3} />
                            <ChevronLeft size={22} className="hidden lg:block" strokeWidth={3} />
                        </button>

                        {/* Date Pills — show 7 on mobile, 9 on desktop */}
                        <div className="flex-1 flex justify-between gap-1 lg:gap-2 overflow-hidden px-0.5 lg:px-1 py-0.5 lg:py-1">
                            {stripDays.slice(0, 7).map((date, i) => {
                                const isSelected = date.toDateString() === selectedDate.toDateString();
                                const isToday = date.toDateString() === new Date().toDateString();
                                return (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedDate(date)}
                                        className={cn(
                                            "relative flex flex-col items-center justify-center py-2 lg:py-3.5 px-1.5 sm:px-2.5 lg:px-4 rounded-xl lg:rounded-[22px] transition-all duration-500 ease-out min-w-[40px] sm:min-w-[50px] lg:min-w-[75px] group overflow-hidden border",
                                            isSelected ? "text-white scale-105 shadow-[0_12px_30px_-8px_rgba(0,92,255,0.5)] border-transparent"
                                                : "bg-transparent hover:bg-white/60 text-slate-500 hover:text-slate-800 hover:scale-105 border-transparent hover:border-white shadow-none hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.05)]"
                                        )}
                                    >
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 z-0"></div>
                                        )}
                                        {isSelected && (
                                            <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full animate-shimmer z-0"></div>
                                        )}

                                        <span className={cn("relative z-10 text-[9px] lg:text-[11px] font-black uppercase tracking-widest mb-0.5 lg:mb-1.5 transition-colors duration-300", isSelected ? "text-blue-100" : (isToday ? "text-blue-600" : "text-slate-400 group-hover:text-slate-500"))}>
                                            {date.toLocaleDateString('id-ID', { weekday: 'short' })}
                                        </span>
                                        <span className={cn("relative z-10 text-base lg:text-[22px] font-black transition-colors duration-300 leading-none", isSelected ? "text-white" : "text-slate-800 group-hover:text-slate-900")}>
                                            {date.getDate()}
                                        </span>
                                        {isToday && !isSelected && <div className="absolute bottom-1.5 lg:bottom-2.5 h-1 w-1 lg:h-1.5 lg:w-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]" />}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Next Button */}
                        <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); }} className="p-2 lg:p-3.5 bg-white/40 hover:bg-white text-slate-400 hover:text-blue-600 rounded-xl lg:rounded-[20px] transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)] border border-transparent hover:border-white active:scale-95 flex-shrink-0">
                            <ChevronRight size={18} className="lg:hidden" strokeWidth={3} />
                            <ChevronRight size={22} className="hidden lg:block" strokeWidth={3} />
                        </button>
                    </div>

                    <RealtimeCalendar selectedDate={selectedDate} onDateChange={setSelectedDate} />
                </div>
                <UpcomingShifts />
            </div>
        </div>
    );
}
