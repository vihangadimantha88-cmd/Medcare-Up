"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { 
  FlaskConical, LayoutDashboard, ScrollText, UserCog, LogOut, 
  Activity, AlertTriangle, Filter, BarChart3, PieChart, 
  Clock, CheckCircle2, XOctagon, Hourglass
} from "lucide-react";

export default function LabTechAnalyticsPage() {
  const router = useRouter();
  
  // 🟢 100% Real API States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("daily"); // Dropdown state
  
  // API Data States mapped exactly to main.py response
  const [throughput, setThroughput] = useState({ total: 0, completed: 0, pending: 0, expired: 0 });
  const [tatData, setTatData] = useState<{test_name: string, average_tat_hours: number}[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("medcare_token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchAnalyticsData(token, period);
  }, [router, period]); // Refetches automatically when 'period' changes

  // 🚀 FETCH BI METRICS
  const fetchAnalyticsData = async (token: string, filterPeriod: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get("http://34.229.165.55:8000/lab-tech/dashboard/analytics", {
        headers: { Authorization: `Bearer ${token}` },
        params: { period: filterPeriod }
      });

      const data = response.data;
      
      // Map API Response to States
      setThroughput({
        total: data.throughput_metrics?.total_requests_received || 0,
        completed: data.throughput_metrics?.reports_uploaded || 0,
        pending: data.throughput_metrics?.pending_uploads || 0,
        expired: data.throughput_metrics?.expired_requests || 0
      });

      setTatData(data.test_specific_tat || []);

    } catch (err: any) {
      console.error("Analytics fetch error", err);
      setError("Unable to sync analytical matrix. Please check the secure connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("medcare_token");
    router.push("/login");
  };

  // Math for Native Tailwind Charts
  const getPercentage = (value: number) => throughput.total === 0 ? 0 : Math.round((value / throughput.total) * 100);
  
  const completedPct = getPercentage(throughput.completed);
  const pendingPct = getPercentage(throughput.pending);
  const expiredPct = getPercentage(throughput.expired);

  // Math for TAT Bar Chart scaling
  const maxTat = tatData.length > 0 ? Math.max(...tatData.map(t => t.average_tat_hours), 0.1) : 1;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans overflow-hidden selection:bg-sky-500/30">
      
      {/* 🟢 LAB TECH SIDEBAR */}
      <div className=" w-72 bg-slate-950 border-r border-slate-800/60 hidden md:flex flex-col justify-between z-20 shadow-[4px_0_24px_rgba(0,0,0,0.4)]">
        <div>
          <div className="p-6 border-b border-slate-800/60 flex items-center gap-3 bg-slate-900/20">
            <FlaskConical className="w-10 h-10 text-sky-400 drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]" />
            <div>
              <h1 className="text-sm font-extrabold tracking-widest uppercase text-white leading-tight">MedCare<br/><span className="text-sky-400 text-[10px]">Lab Terminal</span></h1>
            </div>
          </div>
          
          <div className="p-4 space-y-2 mt-4">
            <Link href="/lab-tech" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <LayoutDashboard size={18} /> The Lab Hub
            </Link>
            
            {/* Active Page */}
            <div className="w-full flex items-center gap-3 px-4 py-3 bg-sky-900/30 text-sky-400 border border-sky-500/30 rounded-xl text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(56,189,248,0.15)] transition-all">
              <Activity size={18} /> Efficiency Matrix
            </div>

            <Link href="/lab-tech/logs" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <ScrollText size={18} /> Activity Logs
            </Link>
            <Link href="/lab-tech/security" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <UserCog size={18} /> Profile & Security
            </Link>
          </div>
        </div>
        <div className="p-4 border-t border-slate-800/60 bg-slate-900/20">
          <button onClick={handleLogout} className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-900/50 text-slate-400 hover:text-red-400 rounded-xl text-xs font-bold tracking-widest uppercase transition-all">
            <LogOut size={16} /> Secure Logout
          </button>
        </div>
      </div>

      {/* 🟢 MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative bg-slate-950">
        <div className="absolute top-0 right-0 w-200 h-125 bg-sky-500/5 rounded-full blur-[150px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[length:24px_24px] pointer-events-none"></div>
        
        <div className="p-8 md:p-10 max-w-7xl w-full mx-auto z-10 flex flex-col h-full">
          
          {/* Header & Filter */}
          <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-800 pb-6">
            <div>
              <h2 className="text-3xl font-light tracking-widest uppercase text-white mb-1">
                Efficiency <span className="font-bold text-sky-400">Matrix</span>
              </h2>
              <p className="text-[10px] text-slate-400 tracking-widest uppercase font-mono">Live Turnaround & Throughput Intelligence</p>
            </div>
            
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-1.5 shadow-lg">
              <div className="pl-3 pr-2 flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                <Filter size={12} /> Time Period:
              </div>
              <select 
                value={period} 
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-[10px] text-sky-400 font-bold uppercase tracking-widest px-4 py-2 rounded-lg outline-none cursor-pointer hover:border-sky-500 transition-colors appearance-none"
              >
                <option value="daily">Today (Live)</option>
                <option value="weekly">This Week</option>
                <option value="monthly">This Month</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl border bg-slate-900 border-red-900/50 text-red-400 flex items-start gap-3 z-10 shadow-lg animate-fadeIn">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <div className="text-xs leading-relaxed font-mono">{error}</div>
            </div>
          )}

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-sky-500/50">
              <Activity size={40} className="animate-spin-slow mb-4" />
              <p className="text-xs uppercase tracking-widest font-bold">Syncing Analytical Data...</p>
            </div>
          ) : (
            <div className="animate-fadeIn space-y-6">
              
              {/* 🟢 ROW 1: Throughput Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 flex flex-col shadow-lg">
                  <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-4 flex items-center gap-2"><PieChart size={14} className="text-sky-400"/> Total Requests</span>
                  <span className="text-3xl font-black font-mono text-white">{throughput.total}</span>
                </div>
                <div className="bg-emerald-950/20 backdrop-blur-sm border border-emerald-900/40 rounded-2xl p-6 flex flex-col shadow-lg">
                  <span className="text-[10px] font-bold text-emerald-500/80 tracking-widest uppercase mb-4 flex items-center gap-2"><CheckCircle2 size={14}/> Uploaded / Done</span>
                  <span className="text-3xl font-black font-mono text-emerald-400">{throughput.completed}</span>
                </div>
                <div className="bg-amber-950/20 backdrop-blur-sm border border-amber-900/40 rounded-2xl p-6 flex flex-col shadow-lg">
                  <span className="text-[10px] font-bold text-amber-500/80 tracking-widest uppercase mb-4 flex items-center gap-2"><Hourglass size={14}/> Pending Output</span>
                  <span className="text-3xl font-black font-mono text-amber-400">{throughput.pending}</span>
                </div>
                <div className="bg-red-950/20 backdrop-blur-sm border border-red-900/40 rounded-2xl p-6 flex flex-col shadow-lg">
                  <span className="text-[10px] font-bold text-red-500/80 tracking-widest uppercase mb-4 flex items-center gap-2"><XOctagon size={14}/> Expired (No Show)</span>
                  <span className="text-3xl font-black font-mono text-red-400">{throughput.expired}</span>
                </div>
              </div>

              {/* 🟢 ROW 2: Deep Analytics Visuals */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Visual 1: Throughput Distribution Chart (CSS Native) */}
                <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 shadow-xl flex flex-col justify-between">
                  <div className="mb-6">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-1">
                      <PieChart size={14} className="text-sky-400" /> Request Lifecycle
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono uppercase">Performance Ratio vs Fallout</p>
                  </div>

                  {throughput.total === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl p-6">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No requests available</p>
                    </div>
                  ) : (
                    <div>
                      {/* CSS Stacked Bar Chart */}
                      <div className="w-full h-8 rounded-full flex overflow-hidden border border-slate-800 bg-slate-950 mb-8 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
                        <div className="bg-emerald-500 h-full transition-all duration-1000 flex items-center justify-center overflow-hidden" style={{ width: `${completedPct}%` }} title={`Completed: ${completedPct}%`}>
                          {completedPct > 10 && <span className="text-[10px] font-bold text-emerald-950">{completedPct}%</span>}
                        </div>
                        <div className="bg-amber-500 h-full transition-all duration-1000 border-l border-slate-900 flex items-center justify-center overflow-hidden" style={{ width: `${pendingPct}%` }} title={`Pending: ${pendingPct}%`}>
                          {pendingPct > 10 && <span className="text-[10px] font-bold text-amber-950">{pendingPct}%</span>}
                        </div>
                        <div className="bg-red-500 h-full transition-all duration-1000 border-l border-slate-900 flex items-center justify-center overflow-hidden" style={{ width: `${expiredPct}%` }} title={`Expired: ${expiredPct}%`}>
                          {expiredPct > 10 && <span className="text-[10px] font-bold text-red-950">{expiredPct}%</span>}
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-2 text-slate-400"><div className="w-3 h-3 rounded bg-emerald-500"></div> Successfully Completed</div>
                          <span className="text-emerald-400 font-bold">{throughput.completed} ({completedPct}%)</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-2 text-slate-400"><div className="w-3 h-3 rounded bg-amber-500"></div> Waiting for Results</div>
                          <span className="text-amber-400 font-bold">{throughput.pending} ({pendingPct}%)</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono border-t border-slate-800 pt-3">
                          <div className="flex items-center gap-2 text-slate-500"><div className="w-3 h-3 rounded bg-red-500"></div> Patient Did Not Arrive</div>
                          <span className="text-red-400 font-bold">{throughput.expired} ({expiredPct}%)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Visual 2: TAT Bar Chart (CSS Native) */}
                <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 shadow-xl">
                  <div className="mb-6 flex justify-between items-start">
                    <div>
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-1">
                        <BarChart3 size={14} className="text-purple-400" /> Turnaround Time (TAT)
                      </h3>
                      <p className="text-[10px] text-slate-500 font-mono uppercase">Average hours per test type</p>
                    </div>
                  </div>

                  <div className="space-y-5 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                    {tatData.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl p-10">
                        <Clock size={32} className="text-slate-600 mb-2" />
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">No completed tests yet</p>
                      </div>
                    ) : (
                      tatData.map((test, i) => {
                        // Calculate width relative to the maximum TAT value
                        const barWidth = Math.max((test.average_tat_hours / maxTat) * 100, 2); 
                        
                        return (
                          <div key={i} className="flex flex-col gap-1.5 group">
                            <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest">
                              <span className="text-slate-300 truncate pr-4">{test.test_name}</span>
                              <span className="text-purple-400 font-bold bg-purple-950/30 px-2 py-0.5 rounded shrink-0">
                                {test.average_tat_hours.toFixed(1)} hrs
                              </span>
                            </div>
                            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800/50">
                              <div 
                                className="bg-purple-500 h-full rounded-full transition-all duration-1000 group-hover:bg-purple-400 relative"
                                style={{ width: `${barWidth}%` }}
                              >
                                <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}