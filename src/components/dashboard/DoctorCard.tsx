"use client";

import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Doctor, Shift } from "@/lib/data-service";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const STATUS_BUTTONS = [
  { id: 'TIDAK_PRAKTEK', label: 'Off', bg: 'bg-slate-500', hover: 'hover:bg-slate-600' },
  { id: 'AKAN_BUKA', label: 'Akan Buka', bg: 'bg-indigo-500', hover: 'hover:bg-indigo-600' },
  { id: 'BUKA', label: 'Buka', bg: 'bg-blue-500', hover: 'hover:bg-blue-600' },
  { id: 'PENUH', label: 'Penuh', bg: 'bg-orange-500', hover: 'hover:bg-orange-600' },
  { id: 'OPERASI', label: 'Ops', bg: 'bg-red-500', hover: 'hover:bg-red-600' },
  { id: 'SELESAI', label: 'Slsai', bg: 'bg-emerald-500', hover: 'hover:bg-emerald-600' },
  { id: 'CUTI', label: 'Cuti', bg: 'bg-pink-500', hover: 'hover:bg-pink-600' },
] as const;

function getStatusDotColor(status: Doctor['status']) {
  switch (status) {
    case 'BUKA': return "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]";
    case 'PENUH': return "bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.6)]";
    case 'CUTI': return "bg-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.6)]";
    case 'OPERASI': return "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]";
    case 'SELESAI': return "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]";
    case 'AKAN_BUKA': return "bg-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.6)]";
    default: return "bg-slate-300";
  }
}

function getAvatarGradient(status: Doctor['status']) {
  switch (status) {
    case 'BUKA': return "bg-gradient-to-br from-blue-500 to-indigo-500";
    case 'PENUH': return "bg-gradient-to-br from-orange-500 to-amber-500";
    case 'CUTI': return "bg-gradient-to-br from-pink-500 to-rose-500";
    case 'OPERASI': return "bg-gradient-to-br from-red-500 to-rose-600";
    case 'AKAN_BUKA': return "bg-gradient-to-br from-indigo-400 to-purple-500";
    default: return "bg-gradient-to-br from-slate-400 to-slate-500";
  }
}

function getStatusBadgeStyle(status: Doctor['status']) {
  switch (status) {
    case 'BUKA': return "bg-blue-50 text-blue-600 border border-blue-100";
    case 'PENUH': return "bg-orange-50 text-orange-600 border border-orange-100";
    case 'CUTI': return "bg-pink-50 text-pink-600 border border-pink-100";
    case 'OPERASI': return "bg-red-50 text-red-600 border border-red-100";
    case 'SELESAI': return "bg-emerald-50 text-emerald-600 border border-emerald-100";
    case 'AKAN_BUKA': return "bg-indigo-50 text-indigo-600 border border-indigo-100";
    default: return "bg-slate-50 text-slate-500 border border-slate-100";
  }
}

interface DoctorCardProps {
  doc: Doctor;
  shifts: Shift[];
  todayDayIdx: number;
  todayStr: string;
  now: Date;
  automationEnabled: boolean;
  onStatusChange: (id: string | number, status: Doctor['status']) => void;
  onToggleShift: (shiftId: string, shift: Shift) => void;
}

export function DoctorCard({
  doc, shifts, todayDayIdx, todayStr, now,
  automationEnabled, onStatusChange, onToggleShift
}: DoctorCardProps) {
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
  const docShiftsToday = shifts.filter(s => s.doctorId === doc.id && s.dayIdx === todayDayIdx);

  // Find active shift with registration time
  const activeShift = shifts.find(s =>
    s.doctorId === doc.id && s.dayIdx === todayDayIdx &&
    !(s.disabledDates || []).includes(todayStr) &&
    s.registrationTime
  );

  return (
    <div className={cn(
      "super-glass-card p-4 rounded-[24px] group relative overflow-hidden border border-white/30 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300",
      automationEnabled && "hover:opacity-100"
    )}>
      {automationEnabled && (
        <div className="absolute inset-0 bg-violet-500/3 pointer-events-none" />
      )}

      {/* Status dot */}
      <div className={cn("absolute top-4 right-4 w-3 h-3 rounded-full z-20 shadow-sm", getStatusDotColor(doc.status))} />

      {/* Doctor info */}
      <div className="flex items-start gap-3 mb-3 relative z-10">
        <Avatar className="h-12 w-12 shadow-sm border-2 border-white/50">
          <AvatarFallback className={cn("text-sm font-bold text-white", getAvatarGradient(doc.status))}>
            {doc.queueCode || doc.name.charAt(4)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-sm text-slate-800 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">{doc.name}</h4>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-[11px] text-slate-400 font-medium line-clamp-2">{doc.specialty}</p>
            {activeShift?.registrationTime && (
              <div className="flex items-center gap-1 bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md border border-blue-100">
                <Clock size={9} />
                <span className="text-[9px] font-bold">{activeShift.registrationTime}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status badge */}
      <div className="mb-3 relative z-10">
        <div className={cn("inline-flex px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider", getStatusBadgeStyle(doc.status))}>
          {doc.status || 'Offline'}
        </div>
      </div>

      {/* Shift pills */}
      {docShiftsToday.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3 relative z-10">
          {docShiftsToday.map(shift => {
            const [startStr, endStr] = (shift.formattedTime || '').split('-');
            const startM = parseInt(startStr?.split(':')[0] || '0') * 60 + parseInt(startStr?.split(':')[1] || '0');
            const endM = parseInt(endStr?.split(':')[0] || '0') * 60 + parseInt(endStr?.split(':')[1] || '0');
            const isDisabledToday = (shift.disabledDates || []).includes(todayStr);
            const isActive = currentTimeMinutes >= startM && currentTimeMinutes < endM && !isDisabledToday;
            return (
              <button
                key={shift.id}
                onClick={() => onToggleShift(shift.id, shift)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all border",
                  isDisabledToday
                    ? "bg-red-50 text-red-400 border-red-100 line-through hover:bg-red-100"
                    : isActive
                      ? "bg-emerald-50 text-emerald-600 border-emerald-200 ring-1 ring-emerald-200"
                      : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100"
                )}
                title={isDisabledToday ? 'Klik untuk aktifkan hari ini' : 'Klik untuk nonaktifkan hari ini'}
              >
                <Clock size={9} />
                {shift.formattedTime}
                {isDisabledToday && <span className="text-red-400 ml-0.5">✕</span>}
                {isActive && <span className="relative flex h-1.5 w-1.5 ml-0.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" /></span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Status change buttons */}
      <div className="grid grid-cols-7 gap-1.5 relative z-10">
        {STATUS_BUTTONS.map((action) => (
          <button
            key={action.id}
            onClick={() => onStatusChange(doc.id, action.id as Doctor['status'])}
            className={cn(
              "py-1.5 rounded-lg text-[10px] font-bold transition-all",
              doc.status === action.id
                ? `${action.bg} text-white shadow-md ${action.hover}`
                : "bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-100 shadow-none",
            )}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
