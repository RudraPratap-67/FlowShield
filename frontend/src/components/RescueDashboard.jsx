import React from 'react';
import { Target, AlertTriangle, Users, Route } from 'lucide-react';

export function RescueDashboard({ rescuePlan, loading }) {
    if (loading) {
        return (
            <div className="p-5 flex-1 flex items-center justify-center">
                <div className="text-sm font-bold text-slate-500 animate-pulse flex items-center">
                    <Target className="w-5 h-5 mr-2 animate-spin text-cyan-500" /> Computing Optimal Rescue Plan...
                </div>
            </div>
        );
    }

    if (!rescuePlan) {
        return (
            <div className="text-sm text-slate-500 text-center p-6 border-2 border-dashed border-slate-800 rounded-lg bg-slate-900/30">
                Run simulation and enable Rescue Mobilisation to view allocation plan.
            </div>
        );
    }

    return (
        <div className="p-5 flex-1 space-y-4">
            <h3 className="text-md font-bold flex items-center mb-4 uppercase tracking-wide text-slate-300">
                <Target className="w-5 h-5 mr-2 text-blue-500" /> Mobilisation Plan
            </h3>

            {/* Main Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/50 p-3 rounded shadow-sm border border-slate-700/50">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Teams Deployed</p>
                    <p className="text-xl font-black text-blue-400">
                        {rescuePlan.teams_assigned} <span className="text-slate-500 text-sm font-medium">/ {rescuePlan.available_teams}</span>
                    </p>
                </div>

                <div className={`bg-slate-800/50 p-3 rounded shadow-sm border ${rescuePlan.unassigned_high_priority_zones > 0 ? 'border-red-500/50 bg-red-950/30' : 'border-slate-700/50'}`}>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Uncovered Zones</p>
                    <p className={`text-xl font-black ${rescuePlan.unassigned_high_priority_zones > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {rescuePlan.unassigned_high_priority_zones}
                    </p>
                </div>

                <div className="bg-slate-800/50 p-3 rounded shadow-sm border border-slate-700/50 col-span-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Total Population Covered</p>
                    <p className="text-xl font-black text-amber-500">
                        {rescuePlan.total_population_covered.toLocaleString()}
                    </p>
                </div>
            </div>

            {/* List of active Deployments */}
            <div className="pt-2">
                <h4 className="text-[11px] uppercase font-bold text-slate-500 mb-2">Team Assignments</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {rescuePlan.assignments.map(a => (
                        <div key={a.team_id} className="bg-slate-900/50 border border-slate-800 p-2 rounded-lg text-xs hover:border-slate-700 transition-colors">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-black text-blue-400">{a.team_id}</span>
                                <span className="text-slate-400 font-mono text-[9px] bg-slate-950 px-1 py-0.5 rounded">Score: {a.priority_score.toFixed(2)}</span>
                            </div>
                            <p className="text-slate-300 font-medium mb-1">Target: {a.zone_id}</p>
                            <div className="flex items-center text-slate-400 space-x-3 text-[10px]">
                                <span className="flex items-center"><Users className="w-3 h-3 mr-1" /> {a.estimated_affected_population.toLocaleString()} pax</span>
                                <span className="flex items-center"><Route className="w-3 h-3 mr-1" /> {a.estimated_travel_distance_km.toFixed(1)}km inward</span>
                            </div>
                        </div>
                    ))}
                    {rescuePlan.assignments.length === 0 && (
                        <div className="text-xs text-slate-500 italic p-2">No active assignments.</div>
                    )}
                </div>
            </div>

            {/* Uncovered Warning */}
            {rescuePlan.uncovered_zones.length > 0 && (
                <div className="pt-2">
                    <h4 className="text-[11px] uppercase font-bold text-red-500 mb-2 flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-1 text-red-500" /> Resource Constrained Zones
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {rescuePlan.uncovered_zones.map(z => (
                            <div key={z.zone_id} className="bg-red-950/20 border border-red-900/30 p-2 rounded-lg text-xs">
                                <div className="flex justify-between">
                                    <span className="font-bold text-red-400">{z.zone_id}</span>
                                    <span className="text-slate-400 text-[10px]">Pop: {Math.round(z.affected_population).toLocaleString()}</span>
                                </div>
                                <p className="text-slate-500 text-[10px] mt-1">{Math.round(z.time_to_critical)}m to critical event</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Disclaimer */}
            <div className="mt-4 p-3 bg-indigo-950/20 border-l-2 border-indigo-500/50 text-[10px] text-indigo-300/80 leading-tight">
                <strong className="block mb-1 text-indigo-300">Decision-Support Sandbox</strong>
                {rescuePlan.assumptions.map((a, i) => <span key={i} className="block">• {a}</span>)}
            </div>

        </div>
    );
}
