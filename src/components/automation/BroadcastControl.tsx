"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Megaphone, Plus, Trash2, Edit3, X, Power, PowerOff, Save, MonitorPlay, Sparkles, AlertTriangle, Zap, ShieldAlert, Wrench, Info, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BroadcastRule } from "@/lib/data-service";

const ALERT_COLORS: Record<string, { bg: string; text: string; badgeBg: string; border: string; cardBg: string; cardBorder: string }> = {
    Information: {
        bg: "bg-blue-50", text: "text-blue-700", badgeBg: "bg-blue-500",
        border: "border-blue-200", cardBg: "bg-blue-50/60", cardBorder: "border-blue-200",
    },
    Warning: {
        bg: "bg-amber-50", text: "text-amber-700", badgeBg: "bg-amber-500",
        border: "border-amber-200", cardBg: "bg-amber-50/60", cardBorder: "border-amber-200",
    },
    Critical: {
        bg: "bg-red-50", text: "text-red-700", badgeBg: "bg-red-500",
        border: "border-red-200", cardBg: "bg-red-50/60", cardBorder: "border-red-200",
    },
};

const PRESETS = [
    { icon: Wrench, label: "Gangguan Sistem", message: "Mohon maaf, sedang terjadi gangguan pada sistem pendaftaran. Silakan hubungi petugas untuk bantuan.", alertLevel: "Warning" as const, color: "bg-amber-100 text-amber-700 border-amber-200" },
    { icon: ShieldAlert, label: "Maintenance", message: "Sistem sedang dalam pemeliharaan terjadwal. Layanan akan kembali normal dalam beberapa saat.", alertLevel: "Information" as const, color: "bg-blue-100 text-blue-700 border-blue-200" },
    { icon: AlertTriangle, label: "Darurat", message: "PERHATIAN: Terjadi situasi darurat. Mohon ikuti instruksi petugas keamanan.", alertLevel: "Critical" as const, color: "bg-red-100 text-red-700 border-red-200" },
    { icon: Info, label: "Info Umum", message: "", alertLevel: "Information" as const, color: "bg-slate-100 text-slate-700 border-slate-200" },
];

const EMPTY_RULE: Partial<BroadcastRule> = {
    message: "",
    alertLevel: "Information",
    targetZone: "All Zones",
    duration: 60,
    active: true,
};

export function BroadcastControl() {
    const { data: rules = [] } = useSWR<BroadcastRule[]>('/api/automation');
    const [editingRule, setEditingRule] = useState<Partial<BroadcastRule> | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [stoppingAll, setStoppingAll] = useState(false);

    // Helper Custom Dropdown
    const CustomDropdown = ({ value, options, onChange, label, placeholder, className }: any) => {
        const [open, setOpen] = useState(false);
        const selectedLabel = options.find((o: any) => o.value === value)?.label || placeholder || "Select";

        return (
            <div className={cn("relative z-30 flex-1", className)} onMouseLeave={() => setOpen(false)}>
                {label && <label className="text-[11px] text-slate-500 font-bold uppercase tracking-widest block mb-2">{label}</label>}
                <button 
                    type="button"
                    onClick={() => setOpen(!open)}
                    className="flex justify-between items-center w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 focus:ring-2 focus:ring-orange-100 outline-none transition-all min-h-[46px]"
                >
                    <span className="truncate pr-2 font-semibold">{selectedLabel}</span>
                    <ChevronDown size={14} className={cn("text-slate-400 transition-transform flex-shrink-0", open && "rotate-180")} />
                </button>
                
                <div className={cn(
                    "absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-slate-100 rounded-2xl shadow-xl p-1.5 transition-all duration-300 origin-top z-50 max-h-[200px] overflow-y-auto custom-scrollbar",
                    open ? "opacity-100 scale-y-100 translate-y-0" : "opacity-0 scale-y-95 -translate-y-2 pointer-events-none"
                )}>
                    {options.map((opt: any) => (
                        <button
                            type="button"
                            key={opt.value}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(opt.value); setOpen(false); }}
                            className={cn(
                                "w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all mb-1 last:mb-0 truncate",
                                value === opt.value 
                                    ? "bg-orange-50 text-orange-600" 
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const handleSave = async () => {
        if (!editingRule?.message?.trim()) return;
        setSaving(true);
        const method = editingRule.id ? 'PUT' : 'POST';
        await fetch('/api/automation', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editingRule)
        });
        setSaving(false);
        setEditingRule(null);
        setIsCreating(false);
        mutate('/api/automation');
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus broadcast rule ini?")) return;
        await fetch(`/api/automation?id=${id}`, { method: 'DELETE' });
        mutate('/api/automation');
    };

    const handleToggle = async (rule: BroadcastRule) => {
        await fetch('/api/automation', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...rule, active: !rule.active })
        });
        mutate('/api/automation');
    };

    const handleStopAll = async () => {
        setStoppingAll(true);
        const activeRules = rules.filter(r => r.active);
        await Promise.all(activeRules.map(rule =>
            fetch('/api/automation', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...rule, active: false })
            })
        ));
        setStoppingAll(false);
        mutate('/api/automation');
    };

    const handlePreset = (preset: typeof PRESETS[0]) => {
        setIsCreating(true);
        setEditingRule({
            ...EMPTY_RULE,
            message: preset.message,
            alertLevel: preset.alertLevel,
        });
    };

    const activePreview = rules.find(r => r.active);
    const alertColor = activePreview ? ALERT_COLORS[activePreview.alertLevel] : null;
    const hasActiveBroadcast = rules.some(r => r.active);

    return (
        <div className="relative rounded-3xl border border-slate-200 bg-white p-6 flex flex-col overflow-hidden shadow-lg shadow-slate-200/60 transition-all duration-500 hover:border-slate-300 hover:shadow-xl group">
            {/* Soft ambient glow */}
            <div className="absolute -top-24 -right-24 h-56 w-56 bg-orange-50 blur-[80px] -z-10 pointer-events-none" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 relative z-10">
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-300/40">
                        <div className="absolute inset-0 rounded-2xl border border-white/30" />
                        <Megaphone className="text-white h-7 w-7" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 tracking-tight">Emergency Broadcast</h3>
                        <p className="text-[11px] text-orange-600 font-mono uppercase tracking-widest mt-0.5 font-semibold">Popup Display Control</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto mt-1 sm:mt-0">
                    {hasActiveBroadcast && (
                        <button
                            onClick={handleStopAll}
                            disabled={stoppingAll}
                            className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-xl flex items-center gap-1.5 text-xs font-bold border border-red-200 transition-all active:scale-95"
                        >
                            <PowerOff size={14} />
                            {stoppingAll ? 'Stopping...' : 'Stop All'}
                        </button>
                    )}
                    <button
                        onClick={() => { setIsCreating(true); setEditingRule({ ...EMPTY_RULE }); }}
                        className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-bold shadow-md shadow-orange-200 transition-all active:scale-95"
                    >
                        <Plus size={16} /> Custom
                    </button>
                </div>
            </div>

            {/* Quick Presets */}
            <div className="mb-5 relative z-10">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2.5 px-1">Template Cepat</span>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {PRESETS.map((preset, i) => {
                        const Icon = preset.icon;
                        return (
                            <button
                                key={i}
                                onClick={() => handlePreset(preset)}
                                className={cn(
                                    "flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all duration-200 hover:shadow-md active:scale-95",
                                    preset.color
                                )}
                            >
                                <Icon size={18} />
                                <span className="text-[10px] font-bold">{preset.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Live Preview */}
            <div className="mb-5 relative z-10">
                <div className="flex justify-between items-center mb-2.5 px-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Live Display Preview</span>
                    {activePreview && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full shadow-sm">
                            <div className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                            </div>
                            <span className="text-[9px] text-red-600 font-bold tracking-widest uppercase">ON AIR</span>
                        </div>
                    )}
                </div>

                <div className="relative aspect-[21/9] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-200 opacity-60 pointer-events-none" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                        <MonitorPlay className="h-16 w-16 text-slate-400" />
                    </div>

                    {activePreview && alertColor ? (
                        <>
                            {/* Simulated popup overlay inside preview */}
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                <div className={cn("bg-white/95 backdrop-blur-sm rounded-xl p-4 max-w-[280px] text-center border shadow-xl", alertColor.border)}>
                                    <div className={cn("inline-flex items-center justify-center w-10 h-10 rounded-full mb-2", alertColor.bg)}>
                                        <AlertTriangle size={20} className={alertColor.text} />
                                    </div>
                                    <div className={cn("text-[9px] font-black uppercase tracking-widest mb-1", alertColor.text)}>
                                        {activePreview.alertLevel}
                                    </div>
                                    <p className="text-[11px] text-slate-700 leading-relaxed font-medium line-clamp-2">
                                        {activePreview.message}
                                    </p>
                                    <div className="text-[8px] text-slate-400 font-mono mt-2">{activePreview.targetZone.replace('_', ' ')} • {activePreview.duration}m</div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                            <MonitorPlay className="h-8 w-8 text-slate-300" />
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">No active broadcast</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Rules List */}
            <div className="space-y-3 relative z-10 mt-4">
                <div className="flex items-center justify-between px-1 mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Broadcast Rules</span>
                    <span className="text-[10px] font-mono text-slate-400">{rules.length} total</span>
                </div>

                {rules.length === 0 && (
                    <div className="text-center py-10 bg-slate-50 border border-slate-100 rounded-2xl">
                        <Megaphone size={28} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-sm font-semibold text-slate-400">Belum ada broadcast rule</p>
                        <p className="text-xs text-slate-400 mt-1">Gunakan template di atas atau buat custom.</p>
                    </div>
                )}

                {rules.map((rule) => {
                    const color = ALERT_COLORS[rule.alertLevel] || ALERT_COLORS.Information;
                    return (
                        <div
                            key={rule.id}
                            className={cn(
                                "group/item relative rounded-2xl p-4 transition-all duration-300 border shadow-sm",
                                rule.active
                                    ? `${color.cardBg} ${color.cardBorder} shadow-md`
                                    : "bg-slate-50 border-slate-100 opacity-60 hover:opacity-100 hover:bg-slate-100/60"
                            )}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={cn(
                                            "text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-md",
                                            color.bg, color.text
                                        )}>
                                            {rule.alertLevel}
                                        </span>
                                        {rule.active && (
                                            <span className="text-[9px] font-black uppercase tracking-widest text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                                LIVE
                                            </span>
                                        )}
                                        <span className="text-[10px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                            {rule.targetZone.replace('_', ' ')}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                            {rule.duration}m
                                        </span>
                                    </div>
                                    <p className={cn("text-sm leading-snug font-medium line-clamp-2", rule.active ? "text-slate-800" : "text-slate-500")}>
                                        {rule.message}
                                    </p>
                                </div>

                                <div className="flex items-center gap-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity flex-shrink-0 bg-white/90 backdrop-blur-md px-1.5 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                                    <button
                                        onClick={() => handleToggle(rule)}
                                        className={cn(
                                            "p-2 rounded-lg transition-all duration-200",
                                            rule.active
                                                ? "text-emerald-600 bg-emerald-100 hover:bg-emerald-200"
                                                : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-100"
                                        )}
                                        title={rule.active ? "Stop Broadcast" : "Activate"}
                                    >
                                        {rule.active ? <Power size={14} /> : <PowerOff size={14} />}
                                    </button>
                                    <div className="w-px h-4 bg-slate-200" />
                                    <button
                                        onClick={() => { setEditingRule({ ...rule }); setIsCreating(false); }}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                    >
                                        <Edit3 size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(String(rule.id))}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Edit / Create Modal */}
            {editingRule && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 h-24 w-24 bg-orange-50 blur-[60px] -z-10 pointer-events-none" />

                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-orange-100 text-orange-600 border border-orange-200">
                                    <Sparkles size={18} />
                                </div>
                                <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">
                                    {isCreating ? "Buat Broadcast Baru" : "Edit Broadcast"}
                                </h3>
                            </div>
                            <button
                                onClick={() => { setEditingRule(null); setIsCreating(false); }}
                                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-800 transition-colors border border-slate-200"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="text-[11px] text-slate-500 font-bold uppercase tracking-widest block mb-2">Pesan Broadcast</label>
                                <textarea
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-800 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all h-24 resize-none placeholder:text-slate-300 shadow-inner"
                                    placeholder="Tulis pesan broadcast untuk ditampilkan di layar display..."
                                    value={editingRule.message}
                                    onChange={e => setEditingRule({ ...editingRule, message: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <CustomDropdown 
                                    label="Level Alert"
                                    value={editingRule.alertLevel}
                                    options={[
                                        { value: 'Information', label: 'ℹ️ Information' },
                                        { value: 'Warning', label: '⚠️ Warning' },
                                        { value: 'Critical', label: '🚨 Critical' },
                                    ]}
                                    onChange={(v: any) => setEditingRule({ ...editingRule, alertLevel: v })}
                                />
                                <CustomDropdown 
                                    label="Target Zone"
                                    value={editingRule.targetZone}
                                    options={[
                                        { value: 'All_Zones', label: 'All Zones' },
                                        { value: 'Lobby_Only', label: 'Lobby Only' },
                                        { value: 'ER_Wards', label: 'ER & Wards' },
                                    ]}
                                    onChange={(v: any) => setEditingRule({ ...editingRule, targetZone: v })}
                                />
                            </div>

                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                <div className="flex justify-between mb-3 items-center">
                                    <label className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Durasi Broadcast</label>
                                    <span className="text-xs text-orange-600 font-mono font-bold bg-orange-100 px-2 py-1 rounded-md border border-orange-200">{editingRule.duration} Menit</span>
                                </div>
                                <input
                                    type="range"
                                    min="15" max="120" step="15"
                                    value={editingRule.duration}
                                    onChange={e => setEditingRule({ ...editingRule, duration: Number(e.target.value) })}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500 transition-all"
                                />
                                <div className="flex justify-between mt-2 px-1 text-[9px] text-slate-400 font-mono">
                                    <span>15m</span><span>60m</span><span>120m</span>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => { setEditingRule(null); setIsCreating(false); }}
                                    className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-bold hover:from-orange-400 hover:to-red-400 transition-all shadow-md shadow-orange-200 active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    {saving ? <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Zap size={16} />}
                                    {saving ? 'Menyimpan...' : isCreating ? 'Broadcast Sekarang' : 'Update Broadcast'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
