"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { 
  Stethoscope, LayoutDashboard, Users, ScrollText, UserCog, LogOut, 
  Activity, CheckCircle2, Clock, AlertTriangle, Pill, Microscope, 
  UserCheck, BarChart3, Filter, ShieldAlert
} from "lucide-react";

export default function DoctorClinicalHub() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("today"); 
  const [doctorName, setDoctorName] = useState("");

  const [workload, setWorkload] = useState({ pending: 0, completed: 0, total: 0 });
  const [attendance, setAttendance] = useState({ attended: 0, noShows: 0 });
  const [ddiOverrides, setDdiOverrides] = useState(0);
  const [topMedicines, setTopMedicines] = useState<{name: string, count: number}[]>([]);
  const [topLabTests, setTopLabTests] = useState<{name: string, count: number}[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("medcare_token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchClinicalAnalytics(token, period);
  }, [router, period]);

  // 🚀 SINGLE DEEP API CALL (100% matched with main.py)
  const fetchClinicalAnalytics = async (token: string, filterPeriod: string) => {
    setLoading(true);
    setError("");
    
    try {
      const response = await axios.get("http://34.229.165.55:8000/doctors/me/analytics", {
        headers: { Authorization: `Bearer ${token}` },
        params: { period: filterPeriod }
      });

      const data = response.data;
      
      // Setting states directly from the unified backend JSON
      setDoctorName(data.doctor_name);
      
      setWorkload({
        total: data.workload_gauge.total_appointments || 0,
        completed: data.workload_gauge.completed_attended || 0,
        pending: data.workload_gauge.pending_in_queue || 0
      });

      setAttendance({
        attended: data.workload_gauge.completed_attended || 0,
        noShows: data.workload_gauge.no_shows || 0
      });

      setDdiOverrides(data.clinical_stats.ddi_overrides_count || 0);
      setTopMedicines(data.top_prescribed_medicines || []);
      setTopLabTests(data.top_lab_tests || []);

    } catch (err) {
      console.error("Critical error fetching clinical data", err);
      setError("Unable to sync clinical analytics. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("medcare_token");
    router.push("/login");
  };

  const attendanceTotal = attendance.attended + attendance.noShows;
  const attendedPercentage = attendanceTotal === 0 ? 0 : Math.round((attendance.attended / attendanceTotal) * 100);
  const noShowPercentage = attendanceTotal === 0 ? 0 : Math.round((attendance.noShows / attendanceTotal) * 100);
  const workloadPercentage = workload.total === 0 ? 0 : Math.round((workload.completed / workload.total) * 100);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans overflow-hidden selection:bg-sky-500/30">
      
      {/* 🟢 DOCTOR SIDEBAR */}
      <div className="w-72 bg-slate-950 border-r border-slate-800/60 flex flex-col justify-between hidden md:flex z-20 shadow-[4px_0_24px_rgba(0,0,0,0.4)]">
        <div>
          <div className="p-6 border-b border-slate-800/60 flex items-center gap-3 bg-slate-900/20">
            <Stethoscope className="w-10 h-10 text-sky-400 drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]" />
            <div>
              <h1 className="text-sm font-extrabold tracking-widest uppercase text-white leading-tight">MedCare<br/><span className="text-sky-400 text-[10px]">Clinical Workspace</span></h1>
            </div>
          </div>
          
          <div className="p-4 space-y-2 mt-4">
            <div className="w-full flex items-center gap-3 px-4 py-3 bg-sky-900/30 text-sky-400 border border-sky-500/30 rounded-xl text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(56,189,248,0.15)] transition-all">
              <LayoutDashboard size={18} /> The Clinical Hub
            </div>
            <Link href="/doctor/queue" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <Users size={18} /> Today's Queue
            </Link>
            <Link href="/doctor/logs" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <ScrollText size={18} /> Activity Logs
            </Link>
            <Link href="/doctor/security" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
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
        <div className="absolute top-0 right-0 w-[800px] h-[500px] bg-sky-500/5 rounded-full blur-[150px] pointer-events-none"></div>
        
        <div className="p-8 md:p-10 max-w-7xl w-full mx-auto z-10">
          
          <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h2 className="text-3xl font-light tracking-widest uppercase text-white mb-1">
                Welcome, <span className="font-bold text-sky-400">{doctorName || "Doctor"}</span>
              </h2>
              <p className="text-[10px] text-slate-400 tracking-widest uppercase font-mono">Real-time Clinical & Workload Analytics</p>
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
                <option value="today">Today (Live)</option>
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
            <div className="py-20 flex flex-col items-center justify-center text-sky-500/50">
              <Activity size={40} className="animate-pulse mb-4" />
              <p className="text-xs uppercase tracking-widest font-bold">Syncing Clinical Data Matrix...</p>
            </div>
          ) : (
            <div className="animate-fadeIn space-y-6">
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Workload Gauge */}
                <div className="lg:col-span-2 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 flex flex-col justify-between shadow-xl">
                  <div className="mb-6 flex justify-between items-start">
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                        <Activity size={14} className="text-sky-400" /> Workload Gauge ({period})
                      </h3>
                      <p className="text-[10px] text-slate-600 font-mono uppercase">Consultation Progress</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-slate-950/50 border border-slate-800/50 p-5 rounded-2xl text-center">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-2 font-bold">Total Slots</span>
                      <span className="text-2xl font-mono text-white">{workload.total}</span>
                    </div>
                    <div className="bg-slate-950/50 border border-slate-800/50 p-5 rounded-2xl text-center border-b-2 border-b-emerald-500/50">
                      <span className="text-[10px] text-emerald-500/70 uppercase tracking-widest block mb-2 font-bold flex items-center justify-center gap-1"><CheckCircle2 size={10}/> Completed</span>
                      <span className="text-2xl font-mono text-emerald-400">{workload.completed}</span>
                    </div>
                    <div className="bg-slate-950/50 border border-slate-800/50 p-5 rounded-2xl text-center border-b-2 border-b-amber-500/50">
                      <span className="text-[10px] text-amber-500/70 uppercase tracking-widest block mb-2 font-bold flex items-center justify-center gap-1"><Clock size={10}/> Pending</span>
                      <span className="text-2xl font-mono text-amber-400">{workload.pending}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-2">
                      <span>Progress Overview</span>
                      <span className="text-sky-400 font-bold">{workloadPercentage}%</span>
                    </div>
                    <div className="w-full bg-slate-950 border border-slate-800 h-3 rounded-full overflow-hidden">
                      <div className="bg-sky-500 h-full transition-all duration-1000 relative" style={{ width: `${workloadPercentage}%` }}>
                        <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* DDI Override Stats */}
                <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 flex flex-col justify-center items-center text-center relative overflow-hidden group shadow-xl">
                  <div className={`absolute inset-0 opacity-10 transition-opacity ${ddiOverrides > 0 ? 'bg-red-500 group-hover:opacity-20' : 'bg-slate-500'}`}></div>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 z-10 border ${ddiOverrides > 0 ? 'bg-red-950/50 border-red-900/80 text-red-500' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                    <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 z-10">DDI Override Events</h3>
                  <p className="text-[9px] text-slate-600 font-mono uppercase mb-4 px-4 z-10">High-risk AI warnings bypassed by you</p>
                  <span className={`text-5xl font-black font-mono z-10 ${ddiOverrides > 0 ? 'text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]' : 'text-slate-600'}`}>
                    {ddiOverrides}
                  </span>
                  {ddiOverrides > 0 && (
                     <p className="text-[9px] text-red-500/70 font-mono uppercase mt-4 z-10 flex items-center gap-1 bg-red-950/30 px-3 py-1 rounded-full border border-red-900/50">
                       <ShieldAlert size={10} /> Anchored to Blockchain
                     </p>
                  )}
                </div>

              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Attendance Analytics */}
                <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 shadow-xl">
                  <div className="mb-6">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                      <UserCheck size={14} className="text-emerald-400" /> Attendance Analytics
                    </h3>
                    <p className="text-[10px] text-slate-600 font-mono uppercase">Patient turn-up ratio ({period})</p>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                      <div>
                        <p className="text-lg font-mono font-bold text-emerald-400">{attendance.attended}</p>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Attended</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <p className="text-lg font-mono font-bold text-amber-500">{attendance.noShows}</p>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">No-Shows</p>
                      </div>
                      <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
                    </div>
                  </div>
                  <div className="w-full h-4 rounded-full flex overflow-hidden border border-slate-800 bg-slate-950">
                    {attendanceTotal === 0 ? (
                      <div className="w-full bg-slate-800/50 flex items-center justify-center text-[8px] text-slate-500 uppercase tracking-widest">No Data Available</div>
                    ) : (
                      <>
                        <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${attendedPercentage}%` }} title={`Attended: ${attendedPercentage}%`}></div>
                        <div className="bg-amber-500 h-full transition-all duration-1000 border-l border-slate-900" style={{ width: `${noShowPercentage}%` }} title={`No Shows: ${noShowPercentage}%`}></div>
                      </>
                    )}
                  </div>
                </div>

                {/* Treatment Patterns */}
                <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 shadow-xl">
                  <div className="mb-6 flex justify-between items-start">
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                        <BarChart3 size={14} className="text-purple-400" /> Treatment Patterns
                      </h3>
                      <p className="text-[10px] text-slate-600 font-mono uppercase">Top prescribed items ({period})</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/50">
                      <h4 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                        <Pill size={12} className="text-sky-400" /> Top Medicines
                      </h4>
                      {topMedicines.length === 0 ? (
                        <p className="text-[9px] text-slate-600 font-mono uppercase text-center mt-4">No prescriptions</p>
                      ) : (
                        <div className="space-y-2">
                          {topMedicines.map((med, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[10px] font-mono">
                              <span className="text-slate-400 truncate max-w-[100px]" title={med.name}>{med.name}</span>
                              <span className="text-sky-400 font-bold bg-sky-950/50 px-2 py-0.5 rounded border border-sky-900/30">{med.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/50">
                      <h4 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                        <Microscope size={12} className="text-purple-400" /> Top Lab Tests
                      </h4>
                      {topLabTests.length === 0 ? (
                        <p className="text-[9px] text-slate-600 font-mono uppercase text-center mt-4">No lab requests</p>
                      ) : (
                        <div className="space-y-2">
                          {topLabTests.map((lab, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[10px] font-mono">
                              <span className="text-slate-400 truncate max-w-[100px]" title={lab.name}>{lab.name}</span>
                              <span className="text-purple-400 font-bold bg-purple-950/50 px-2 py-0.5 rounded border border-purple-900/30">{lab.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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