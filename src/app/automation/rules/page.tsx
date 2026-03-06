"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Plus, Edit2, Trash2, Save, X } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogClose, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface AutomationRule {
    id: number;
    name: string;
    condition: any;
    action: any;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export default function AutomationRulesPage() {
    const { data: rulesData, mutate, isLoading, error } = useSWR<AutomationRule[]>('/api/automation-rules');
    // Ensure rules is always an array
    const rules = Array.isArray(rulesData) ? rulesData : [];
    const [editing, setEditing] = useState<AutomationRule | null>(null);
    const [open, setOpen] = useState(false);

    const openEditor = (rule?: AutomationRule) => {
        if (rule) setEditing(rule);
        else setEditing({ id: 0, name: '', condition: {}, action: {}, active: true, createdAt: '', updatedAt: '' });
        setOpen(true);
    };

    const closeEditor = () => {
        setOpen(false);
    };

    // reset preview when editing item changes
    useEffect(() => {
        setPreview(null);
    }, [editing]);

    const [preview, setPreview] = useState<any>(null);

    const saveRule = async () => {
        if (!editing) return;
        const method = editing.id ? 'PUT' : 'POST';
        const dto = { ...editing };
        const res = await fetch('/api/automation-rules', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        });
        if (res.ok) {
            mutate();
            closeEditor();
            setPreview(null);
        } else {
            alert('Failed to save rule');
        }
    };

    const deleteRule = async (id: number) => {
        if (!confirm('Delete this rule?')) return;
        await fetch(`/api/automation-rules?id=${id}`, { method: 'DELETE' });
        mutate();
    };

    return (
        <div className="p-4 sm:p-6 max-w-4xl mx-auto">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 sm:mb-6">
                <h1 className="text-xl sm:text-2xl font-bold">Automation Rules</h1>
                <button
                    onClick={() => openEditor()}
                    className="btn-gradient px-4 py-2 rounded-xl text-white flex items-center justify-center gap-2 text-sm sm:text-base w-full sm:w-auto"
                >
                    <Plus size={16} /> New Rule
                </button>
            </header>
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    Failed to load rules. Please ensure you have admin access.
                </div>
            )}
            <div className="space-y-4">
                {rules.map(rule => (
                    <div key={rule.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl gap-4">
                        <div>
                            <p className="font-semibold text-sm sm:text-base">{rule.name}</p>
                            <p className="text-xs sm:text-sm text-slate-500">{rule.active ? 'Active' : 'Inactive'}</p>
                        </div>
                        <div className="flex items-center justify-end gap-3 sm:gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 mt-3 sm:mt-0">
                            <button onClick={() => openEditor(rule)} className="text-blue-600 hover:text-blue-800 p-2 sm:p-0"><Edit2 size={18} className="sm:w-5 sm:h-5" /></button>
                            <button onClick={() => deleteRule(rule.id)} className="text-red-600 hover:text-red-800 p-2 sm:p-0"><Trash2 size={18} className="sm:w-5 sm:h-5" /></button>
                        </div>
                    </div>
                ))}
                {rules.length === 0 && <p className="text-center text-slate-400">No rules defined.</p>}
            </div>

            {/* Editor dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg">
                    <div className="flex justify-between items-center mb-4">
                        <DialogTitle className="text-xl font-bold">{editing?.id ? 'Edit Rule' : 'New Rule'}</DialogTitle>
                        <DialogClose asChild>
                            <button className="text-slate-500 hover:text-slate-800"><X /></button>
                        </DialogClose>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium">Name</label>
                            <input
                                type="text"
                                className="w-full border rounded px-3 py-2"
                                value={editing?.name || ''}
                                onChange={e => setEditing(editing ? { ...editing, name: e.target.value } : null)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Condition (JSON)</label>
                            <textarea
                                className="w-full border rounded px-3 py-2 font-mono text-sm"
                                rows={4}
                                value={editing ? JSON.stringify(editing.condition, null, 2) : ''}
                                onChange={e => {
                                    try {
                                        const obj = JSON.parse(e.target.value);
                                        setEditing(editing ? { ...editing, condition: obj } : null);
                                    } catch { }
                                }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Action (JSON)</label>
                            <textarea
                                className="w-full border rounded px-3 py-2 font-mono text-sm"
                                rows={4}
                                value={editing ? JSON.stringify(editing.action, null, 2) : ''}
                                onChange={e => {
                                    try {
                                        const obj = JSON.parse(e.target.value);
                                        setEditing(editing ? { ...editing, action: obj } : null);
                                    } catch { }
                                }}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={editing?.active || false}
                                onChange={e => setEditing(editing ? { ...editing, active: e.target.checked } : null)}
                            />
                            <label className="text-sm">Active</label>
                        </div>
                    </div>
                    <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                        <button
                            onClick={async () => {
                                if (!editing) return;
                                const res = await fetch('/api/automation-rules/test', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ rule: editing })
                                });
                                if (res.ok) {
                                    const data = await res.json();
                                    setPreview(data.updates);
                                } else {
                                    alert('Preview failed');
                                }
                            }}
                            className="px-4 py-2 rounded-xl bg-yellow-500 text-white font-semibold text-sm w-full sm:w-auto text-center"
                        >Preview</button>
                        <button onClick={closeEditor} className="px-4 py-2 rounded-xl bg-slate-200 font-semibold text-sm w-full sm:w-auto text-center">Cancel</button>
                        <button onClick={saveRule} className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-sm w-full sm:w-auto text-center">Save</button>
                    </div>
                    {preview && (
                        <div className="mt-4 p-3 bg-gray-50 border rounded">
                            <h3 className="font-semibold mb-2">Preview updates</h3>
                            {preview.length > 0 ? (
                                <ul className="list-disc pl-5 text-sm">
                                    {preview.map((u: any, idx: number) => (
                                        <li key={idx}>{`id=${u.id} → status=${u.status}`}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-slate-500">No updates would be applied.</p>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
