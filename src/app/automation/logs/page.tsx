"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { RefreshCw, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface AutomationLog {
    id: bigint;
    type: string;
    details: any;
    createdAt: string;
}

export default function AutomationLogsPage() {
    const { data: logsData, mutate, isLoading, error } = useSWR<AutomationLog[]>('/api/automation-logs', {
        refreshInterval: 10000
    });
    // Ensure logs is always an array, even if API returns unexpected response
    const logs = Array.isArray(logsData) ? logsData : [];
    const [typeFilter, setTypeFilter] = useState<string | null>(null);

    // Calculate metrics
    const metrics = useMemo(() => {
        const filtered = typeFilter ? logs.filter(l => l.type === typeFilter) : logs;
        const runLogs = logs.filter(l => l.type === 'run' || l.type === 'error');
        const successLogs = runLogs.filter(l => l.type === 'run');
        const errorLogs = runLogs.filter(l => l.type === 'error');

        let totalApplied = 0, totalFailed = 0;
        runLogs.forEach(log => {
            totalApplied += (log.details?.applied || 0);
            totalFailed += (log.details?.failed || 0);
        });

        const totalRuns = runLogs.length;
        const successRate = totalRuns > 0 ? ((successLogs.length / totalRuns) * 100).toFixed(1) : 'N/A';
        const lastRun = runLogs.length > 0 ? new Date(runLogs[0].createdAt) : null;
        const avgDuration = runLogs.length > 0
            ? (runLogs.reduce((sum, l) => sum + (l.details?.durationMs || 0), 0) / runLogs.length).toFixed(0)
            : 'N/A';

        return { totalApplied, totalFailed, totalRuns, successRate, lastRun, avgDuration };
    }, [logs]);

    const filtered = typeFilter ? logs.filter(l => l.type === typeFilter) : logs;
    const types = Array.from(new Set(logs.map(l => l.type)));

    return (
        <div className="p-4 sm:p-6 max-w-5xl mx-auto">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 sm:mb-6">
                <h1 className="text-xl sm:text-2xl font-bold">Automation Logs & Metrics</h1>
                <button
                    onClick={() => mutate()}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm font-semibold w-full sm:w-auto"
                >
                    <RefreshCw size={16} /> Refresh
                </button>
            </header>

            {isLoading && (
                <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                    Loading logs...
                </div>
            )}

            {error && (
                <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    Failed to load logs. Please ensure you have admin access.
                </div>
            )}

            {/* Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <div className="p-3 sm:p-4 border rounded-xl bg-blue-50/50">
                    <div className="text-[10px] sm:text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">Total Runs</div>
                    <div className="text-xl sm:text-2xl font-bold text-blue-900">{metrics.totalRuns}</div>
                </div>
                <div className="p-3 sm:p-4 border rounded-xl bg-green-50/50">
                    <div className="text-[10px] sm:text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">Success</div>
                    <div className="text-xl sm:text-2xl font-bold text-green-900">{metrics.successRate}%</div>
                </div>
                <div className="p-3 sm:p-4 border rounded-xl bg-purple-50/50">
                    <div className="text-[10px] sm:text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">Applied</div>
                    <div className="text-xl sm:text-2xl font-bold text-purple-900">{metrics.totalApplied}</div>
                </div>
                <div className="p-3 sm:p-4 border rounded-xl bg-orange-50/50">
                    <div className="text-[10px] sm:text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">Avg Time <span className="lowercase normal-case sm:hidden">(ms)</span></div>
                    <div className="text-xl sm:text-2xl font-bold text-orange-900">{metrics.avgDuration} <span className="text-sm font-medium text-slate-500 hidden sm:inline">ms</span></div>
                </div>
            </div>

            {metrics.lastRun && (
                <div className="mb-6 p-3 bg-slate-50 border rounded text-sm">
                    Last run: <span className="font-mono">{metrics.lastRun.toLocaleString()}</span>
                </div>
            )}

            {/* Filter */}
            <div className="flex items-center gap-2 mb-4">
                <Filter size={16} className="text-slate-500" />
                <select
                    value={typeFilter || ''}
                    onChange={e => setTypeFilter(e.target.value || null)}
                    className="px-3 py-2 border rounded text-sm"
                >
                    <option value="">All types</option>
                    {types.map(t => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>
                {typeFilter && (
                    <button
                        onClick={() => setTypeFilter(null)}
                        className="text-xs text-blue-600 hover:underline"
                    >Clear</button>
                )}
            </div>

            {/* Logs */}
            <div className="space-y-2">
                {filtered.map(log => {
                    const isError = log.type === 'error';
                    const isRun = log.type === 'run';
                    return (
                        <div
                            key={log.id.toString()}
                            className={cn(
                                "p-3 sm:p-4 border rounded-xl transition-colors",
                                isError ? 'bg-red-50/50 border-red-200/60' :
                                isRun ? 'bg-green-50/50 border-green-200/60' :
                                'bg-slate-50/50 border-slate-200'
                            )}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "px-2 py-1 rounded-md text-[10px] font-bold tracking-widest",
                                        isError ? 'bg-red-200 text-red-800' :
                                        isRun ? 'bg-green-200 text-green-800' :
                                        'bg-slate-200 text-slate-800'
                                    )}>
                                        {log.type.toUpperCase()}
                                    </span>
                                </div>
                                <div className="text-[10px] sm:text-xs text-slate-500 font-medium whitespace-nowrap">
                                    {new Date(log.createdAt).toLocaleString()}
                                </div>
                            </div>
                            {isRun && log.details && (
                                <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                                    <div><span className="text-slate-600">Applied:</span> <span className="font-mono font-bold">{log.details.applied || 0}</span></div>
                                    <div><span className="text-slate-600">Failed:</span> <span className="font-mono font-bold">{log.details.failed || 0}</span></div>
                                    <div><span className="text-slate-600">Duration:</span> <span className="font-mono font-bold">{log.details.durationMs || 0}ms</span></div>
                                </div>
                            )}
                            {log.details?.error && (
                                <div className="text-sm text-red-700 font-mono mb-2">
                                    Error: {log.details.error}
                                </div>
                            )}
                            {log.details && Object.keys(log.details).length > 0 && (
                                <details className="text-xs">
                                    <summary className="cursor-pointer text-slate-600 hover:text-slate-900">Details</summary>
                                    <pre className="mt-2 max-h-32 overflow-auto bg-slate-100 p-2 rounded font-mono text-[10px]">
                                        {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                </details>
                            )}
                        </div>
                    );
                })}
                {filtered.length === 0 && (
                    <p className="text-slate-500 text-center py-8">No logs {typeFilter ? `for type "${typeFilter}"` : ''}yet.</p>
                )}
            </div>
        </div>
    );
}
