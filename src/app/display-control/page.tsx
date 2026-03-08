"use client";

import { useState } from 'react';
import useSWR from 'swr';
import { Settings } from '@/lib/data-service';
import { Save, RefreshCw, Plus, Trash2, MonitorPlay, RotateCcw, Users, ListRestart, Tv, MessageSquare, Zap, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DisplayControl() {
    const { data: settings, mutate: mutateSettings } = useSWR<Settings>('/api/settings');
    const [saving, setSaving] = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);

    const isLoading = !settings;

    const saveData = async () => {
        if (!settings) return;
        try {
            setSaving(true);
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            mutateSettings();
            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 2000);
        } catch (error) {
            console.error('Failed to save settings', error);
        } finally {
            setSaving(false);
        }
    };

    const updateSetting = (field: keyof Settings, value: any) => {
        if (!settings) return;
        mutateSettings({ ...settings, [field]: value }, false);
    };

    const handleResetStatus = async () => {
        if (!confirm("Reset status semua dokter menjadi 'TIDAK_PRAKTEK'?")) return;
        try {
            await fetch('/api/doctors?action=reset', { method: 'POST' });
            alert("Status berhasil di-reset.");
        } catch (e) {
            console.error(e);
            alert("Gagal mereset status.");
        }
    };

    const handleClearQueue = async () => {
        if (!confirm("Reset semua antrian? Ini akan menghapus data antrian hari ini.")) return;
        try {
            await fetch('/api/queue?action=reset', { method: 'POST' });
            alert("Antrian berhasil di-reset.");
        } catch (e) {
            console.error(e);
            alert("Gagal mereset antrian.");
        }
    };

    if (isLoading) return (
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
            <div className="flex items-center gap-3 text-slate-400">
                <RefreshCw size={20} className="animate-spin" />
                <span className="text-sm font-medium">Memuat pengaturan...</span>
            </div>
        </div>
    );
    if (!settings) return (
        <div className="p-8 text-center text-red-500 font-medium">Error loading data.</div>
    );

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-300/40">
                        <Tv className="text-white h-7 w-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Pusat Kontrol Layar</h1>
                        <p className="text-sm text-slate-400 mt-0.5">Kelola pesan tampilan & notifikasi display TV</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => mutateSettings()}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-semibold shadow-sm"
                    >
                        <RefreshCw size={16} /> Refresh
                    </button>
                    <button
                        onClick={saveData}
                        disabled={saving}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md active:scale-[0.98]",
                            savedFlash
                                ? "bg-emerald-500 text-white shadow-emerald-200"
                                : "bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-indigo-200 hover:from-indigo-400 hover:to-blue-500"
                        )}
                    >
                        <Save size={16} />
                        {saving ? 'Menyimpan...' : savedFlash ? '✓ Tersimpan' : 'Simpan Perubahan'}
                    </button>
                </div>
            </header>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* ── Running Text ────────────────────────────── */}
                <div className="relative rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60 transition-all duration-300 hover:shadow-xl hover:border-slate-300 group overflow-hidden">
                    <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-50 blur-[60px] -z-10 pointer-events-none" />

                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600 border border-indigo-200">
                            <MonitorPlay size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800">Running Text</h2>
                            <p className="text-[11px] text-slate-400 font-medium">Teks berjalan di layar display</p>
                        </div>
                    </div>

                    <textarea
                        value={settings.runTextMessage || ''}
                        onChange={(e) => updateSetting('runTextMessage', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl p-4 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm min-h-[120px] resize-none transition-all placeholder:text-slate-300 shadow-inner"
                        placeholder="Tulis teks yang akan ditampilkan di layar TV..."
                    />

                    {/* Live Preview Ticker */}
                    {settings.runTextMessage && (
                        <div className="mt-4">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] block mb-2">Preview</span>
                            <div className="bg-slate-900 rounded-xl p-3 overflow-hidden relative">
                                <div className="flex items-center gap-2 mb-0">
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                    </div>
                                </div>
                                <div className="overflow-hidden mt-2 relative">
                                    <div className="animate-[marquee_15s_linear_infinite] whitespace-nowrap text-xs text-white/80 font-medium">
                                        {settings.runTextMessage} &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; {settings.runTextMessage}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Quick Actions ───────────────────────────── */}
                <div className="relative rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60 transition-all duration-300 hover:shadow-xl hover:border-slate-300 group overflow-hidden">
                    <div className="absolute bottom-0 left-0 h-32 w-32 bg-orange-50 blur-[60px] -z-10 pointer-events-none" />

                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-2.5 rounded-xl bg-orange-100 text-orange-600 border border-orange-200">
                            <Zap size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800">Aksi Cepat</h2>
                            <p className="text-[11px] text-slate-400 font-medium">Reset data & manajemen sistem</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {/* Reset Status Card */}
                        <button
                            onClick={handleResetStatus}
                            className="w-full group/action flex items-center gap-4 p-4 bg-blue-50 hover:bg-blue-100/80 border border-blue-100 rounded-2xl transition-all duration-200 active:scale-[0.98] text-left"
                        >
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-200/60 text-blue-700 group-hover/action:scale-110 transition-transform">
                                <RotateCcw size={18} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-blue-800">Reset Status Dokter</div>
                                <div className="text-[11px] text-blue-600/70 mt-0.5">Ubah semua status menjadi "TIDAK_PRAKTEK"</div>
                            </div>
                        </button>

                        {/* Clear Queue Card */}
                        <button
                            onClick={handleClearQueue}
                            className="w-full group/action flex items-center gap-4 p-4 bg-violet-50 hover:bg-violet-100/80 border border-violet-100 rounded-2xl transition-all duration-200 active:scale-[0.98] text-left"
                        >
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-200/60 text-violet-700 group-hover/action:scale-110 transition-transform">
                                <ListRestart size={18} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-violet-800">Reset Antrian</div>
                                <div className="text-[11px] text-violet-600/70 mt-0.5">Hapus semua data antrian hari ini</div>
                            </div>
                        </button>

                        {/* Open TV Display Link */}
                        <a
                            href="/tv.html"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full group/action flex items-center gap-4 p-4 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-100 rounded-2xl transition-all duration-200 active:scale-[0.98]"
                        >
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-200/60 text-emerald-700 group-hover/action:scale-110 transition-transform">
                                <Tv size={18} />
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-bold text-emerald-800">Buka Tampilan TV</div>
                                <div className="text-[11px] text-emerald-600/70 mt-0.5">Buka display TV di tab baru</div>
                            </div>
                        </a>
                    </div>
                </div>

                {/* ── Dynamic Island Messages ────────────────── */}
                <div className="relative rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60 transition-all duration-300 hover:shadow-xl hover:border-slate-300 group overflow-hidden lg:col-span-2">
                    <div className="absolute top-0 right-0 h-32 w-32 bg-violet-50 blur-[60px] -z-10 pointer-events-none" />

                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-violet-100 text-violet-600 border border-violet-200">
                                <Bell size={18} />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-slate-800">Dynamic Island Messages</h2>
                                <p className="text-[11px] text-slate-400 font-medium">Pesan notifikasi yang ditampilkan di layar TV secara bergiliran</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                const msgs = settings.customMessages || [];
                                updateSetting('customMessages', [...msgs, { title: 'Info', text: 'Pesan Baru' }]);
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-xl text-xs font-bold border border-violet-200 transition-all active:scale-95"
                        >
                            <Plus size={14} /> Tambah Pesan
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1 hide-scrollbar">
                        {(settings.customMessages || []).map((msg, idx) => (
                            <div
                                key={idx}
                                className="group/msg bg-slate-50 hover:bg-white p-4 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all duration-200 hover:shadow-md relative"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600 shrink-0 mt-0.5">
                                        <MessageSquare size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                        <input
                                            value={msg.title}
                                            onChange={(e) => {
                                                const newMsgs = [...(settings.customMessages || [])];
                                                newMsgs[idx] = { ...newMsgs[idx], title: e.target.value };
                                                updateSetting('customMessages', newMsgs);
                                            }}
                                            className="bg-transparent text-[10px] font-bold text-slate-400 w-full outline-none uppercase tracking-wider border-b border-transparent focus:border-violet-300 transition-colors pb-0.5"
                                            placeholder="JUDUL"
                                        />
                                        <input
                                            value={msg.text}
                                            onChange={(e) => {
                                                const newMsgs = [...(settings.customMessages || [])];
                                                newMsgs[idx] = { ...newMsgs[idx], text: e.target.value };
                                                updateSetting('customMessages', newMsgs);
                                            }}
                                            className="bg-transparent text-sm text-slate-700 w-full outline-none focus:text-slate-900 transition-colors"
                                            placeholder="Isi pesan..."
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            const newMsgs = (settings.customMessages || []).filter((_, i) => i !== idx);
                                            updateSetting('customMessages', newMsgs);
                                        }}
                                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover/msg:opacity-100 transition-all p-1.5 hover:bg-red-50 rounded-lg shrink-0"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {(!settings.customMessages || settings.customMessages.length === 0) && (
                            <div className="md:col-span-2 text-center py-10 bg-slate-50 border border-slate-100 rounded-2xl">
                                <Bell size={24} className="mx-auto text-slate-300 mb-2" />
                                <p className="text-sm text-slate-400 font-medium">Belum ada pesan kustom</p>
                                <p className="text-xs text-slate-400 mt-1">Pesan default akan digunakan di Dynamic Island.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Marquee animation keyframe */}
            <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(0%); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>
        </div>
    );
}
