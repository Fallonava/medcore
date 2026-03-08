'use client';

import { useState } from 'react';

export default function SimulatorPage() {
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runSim = async () => {
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      let body: any = {};
      if (jsonText.trim()) {
        body.rules = JSON.parse(jsonText);
      }
      const res = await fetch('/api/automation-rules/simulate', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Simulation failed');
      setResult(data.result);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const suggestResolutions = async () => {
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      let body: any = {};
      if (jsonText.trim()) body.rules = JSON.parse(jsonText);
      body.resolutionStrategy = 'priority';
      const res = await fetch('/api/automation-rules/simulate', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Suggestion failed');
      setResult(data.result);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Dry-run Simulator</h1>
      <p className="text-sm text-slate-400 mb-4">Paste rules JSON or leave empty to simulate active rules from DB.</p>

      <textarea
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        placeholder='[ { "id": 1, "name": "Sample", "condition": {"status":"TIDAK_PRAKTEK"}, "action": {"status":"CUTI"} } ]'
        className="w-full h-48 bg-slate-900 border border-slate-700 rounded p-3 mb-4 text-sm"
      />

      <div className="flex gap-3 mb-6">
        <button onClick={runSim} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">{loading ? 'Running...' : 'Run Simulation'}</button>
        <button onClick={suggestResolutions} disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded">{loading ? '...' : 'Suggest Resolutions'}</button>
        <button onClick={() => { setJsonText(''); setResult(null); setError(null); }} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded">Reset</button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 rounded p-3 text-red-400 mb-4">{error}</div>}

      {result && (
        <section className="space-y-4">
          <div className="bg-slate-900 border border-slate-700 rounded p-4">
            <h3 className="font-semibold">Summary</h3>
            <p className="text-sm text-slate-400">Rules: {result.summary.totalRules} — Affected: {result.summary.totalAffected} — Conflicts: {result.summary.totalConflicts}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-700 rounded p-4">
              <h4 className="font-semibold mb-2">Per Rule Impact</h4>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {result.perRule.map((r: any, idx: number) => (
                  <div key={idx} className="border border-slate-800 rounded p-2">
                    <div className="text-sm font-medium">{r.name || `Rule ${r.ruleId || idx}`}</div>
                    <div className="text-xs text-slate-400">Affected: {r.affectedCount}</div>
                    {r.updates.length > 0 && (
                      <details className="mt-2 text-xs text-slate-300">
                        <summary className="cursor-pointer">Show updates</summary>
                        <pre className="text-xs mt-2 overflow-auto max-h-40">{JSON.stringify(r.updates.slice(0,50), null, 2)}</pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded p-4">
              <h4 className="font-semibold mb-2">Conflicts</h4>
              {result.conflicts.length === 0 ? (
                <p className="text-sm text-slate-400">No conflicts detected.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {result.conflicts.map((c: any, i: number) => (
                    <div key={i} className="border border-red-700 rounded p-2">
                      <div className="text-sm">Doctor ID: {c.id}</div>
                      <div className="text-xs text-slate-400">Statuses: {c.statuses.join(', ')}</div>
                      <details className="mt-2 text-xs text-slate-300">
                        <summary className="cursor-pointer">Rule details</summary>
                        <pre className="text-xs mt-2 overflow-auto max-h-40">{JSON.stringify(c.rules, null, 2)}</pre>
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {result.resolutions && (
            <div className="mt-6 bg-slate-900 border border-slate-700 rounded p-4">
              <h4 className="font-semibold mb-2">Suggested Resolutions</h4>
              <div className="space-y-2">
                {result.resolutions.map((r: any, ix: number) => (
                  <div key={ix} className="border border-slate-800 rounded p-2">
                    <div className="text-sm">Doctor ID: {r.id}</div>
                    <div className="text-xs text-slate-400">Chosen Rule: {String(r.chosenRuleId)} — Status: {r.chosenStatus}</div>
                    <details className="mt-2 text-xs text-slate-300">
                      <summary className="cursor-pointer">Candidates</summary>
                      <pre className="text-xs mt-2 overflow-auto max-h-40">{JSON.stringify(r.candidates, null, 2)}</pre>
                    </details>
                  </div>
                ))}
              </div>
              {result.resolved && (
                <div className="mt-4 text-sm text-slate-400">After applying suggestions, affected doctors: {result.resolved.affected}</div>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
