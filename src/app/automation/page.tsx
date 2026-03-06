import { NeuralCore } from "@/components/automation/NeuralCore";
import { BroadcastControl } from "@/components/automation/BroadcastControl";
import { ActivityStream } from "@/components/automation/ActivityStream";
import { Bell, Sparkles } from "lucide-react";
import Link from "next/link";

export default function AutomationPage() {
    return (
        <div className="relative flex h-full flex-col rounded-3xl bg-slate-50 w-full overflow-hidden shadow-sm border border-slate-200/60">
            {/* Ambient Multi-Color Glows behind the scene - Light Mode version */}
            <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-blue-100/50 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] h-[400px] w-[400px] rounded-full bg-indigo-100/50 blur-[100px] pointer-events-none" />
            <div className="absolute top-[40%] left-[50%] h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-100/30 blur-[80px] pointer-events-none" />

            {/* Header Area */}
            <header className="flex items-center justify-between pt-2 sm:pt-4 mb-5 lg:mb-6 gap-2 sm:gap-4 flex-shrink-0 w-full relative z-20 px-2 lg:px-6 overflow-hidden">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0 pr-1">
                    <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-[14px] sm:rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_4px_14px_0_rgba(99,102,241,0.3)] text-white flex-shrink-0">
                        <Sparkles size={18} className="sm:hidden" />
                        <Sparkles size={22} className="hidden sm:block" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <h1 className="text-base sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 leading-tight truncate">
                            Automasi <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">& Siaran</span>
                        </h1>
                        <p className="hidden sm:block text-[11px] sm:text-xs lg:text-sm text-slate-500 font-medium mt-0.5 truncate bg-white/60 backdrop-blur-sm self-start px-1.5 -ml-1.5 rounded-md">Pusat kontrol jadwal real-time dan TV</p>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 sm:gap-3 lg:gap-4 flex-nowrap flex-shrink-0 w-auto overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 scrollbar-hide -ml-1 pl-1 sm:pl-0 sm:ml-0">
                    <Link href="/automation/rules" className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white text-[11px] sm:text-sm font-semibold rounded-xl shadow hover:bg-blue-500 transition whitespace-nowrap">
                        Rules
                    </Link>
                    <Link href="/automation/logs" className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-200 text-slate-800 text-[11px] sm:text-sm font-semibold rounded-xl shadow hover:bg-slate-300 transition whitespace-nowrap">
                        Logs
                    </Link>
                    <div className="hidden lg:flex items-center gap-2 bg-emerald-50 border border-emerald-200/60 px-4 py-1.5 rounded-full backdrop-blur-md shadow-sm">
                        <div className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 tracking-widest uppercase">
                            System Online
                        </span>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 lg:pl-4 border-l border-slate-200/60 ml-1 pl-3 lg:ml-0 flex-shrink-0">
                        <div className="text-right hidden sm:block">
                            <p className="text-[11px] sm:text-xs font-extrabold text-slate-800 leading-tight">Dr. Admin</p>
                            <p className="text-[9px] sm:text-[10px] text-blue-600 font-semibold uppercase tracking-wider mt-0.5">Super Admin</p>
                        </div>
                        <div className="relative flex shrink-0 overflow-hidden rounded-full h-8 w-8 sm:h-9 sm:w-9 shadow-sm hover:scale-105 transition-transform duration-300 ring-2 ring-white border border-slate-100/50">
                            <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-purple-400 text-[10px] sm:text-xs font-bold text-white shadow-inner">
                                AD
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Grid */}
            <div className="relative z-10 flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6 px-4 lg:px-8 pb-4 lg:pb-8 pt-2 overflow-y-auto custom-scrollbar">
                {/* Left Column — System Status + Activity */}
                <div className="lg:col-span-5 flex flex-col gap-4 lg:gap-6 h-max">
                    <NeuralCore />
                    <ActivityStream />
                </div>

                {/* Right Column — Broadcast Control */}
                <div className="lg:col-span-7 h-max">
                    <BroadcastControl />
                </div>
            </div>
        </div>
    );
}
