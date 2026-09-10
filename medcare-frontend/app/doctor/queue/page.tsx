"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { 
  Stethoscope, LayoutDashboard, Users, ScrollText, UserCog, LogOut, 
  Activity, ArrowRight, UserCheck, AlertTriangle, PlayCircle, Clock
} from "lucide-react";

export default function TodaysQueuePage() {
  const router = useRouter();
  
  // 🟢 100% Real Data States (No Dummy Data)
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState({ total: 0, completed: 0, pending: 0 });

  useEffect(() => {
    const token = localStorage.getItem("medcare_token");
    if (!token) {
      router.push("/login");
      return;
    }
    
    fetchQueueData(token);

    // 🚀 Auto-refresh the queue every 15 seconds for live updates
    const interval = setInterval(() => {
      fetchQueueData(token, false); // false = don't show loading spinner on refresh
    }, 15000);
    
    return () => clearInterval(interval);
  }, [router]);

  // 🚀 Backend API Call (Exact match with main.py logic)
  const fetchQueueData = async (token: string, showLoader = true) => {
    if (showLoader) setLoading(true);
    setError("");

    try {
      const response = await axios.get("http://34.229.165.55:8000/doctors/me/dashboard", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Backend returns: { summary_cards: {...}, todays_queue: [...] }
      setSummary({
        total: response.data.summary_cards.total_patients_today || 0,
        completed: response.data.summary_cards.completed || 0,
        pending: response.data.summary_cards.pending || 0
      });
      
      setQueue(response.data.todays_queue || []);

    } catch (err: any) {
      console.error("Queue fetch error", err);
      if (err.response?.status === 403 && err.response?.data?.detail?.includes("First-time")) {
        // Backend Defense-in-depth: First login trap catch
        router.push("/force-change-password");
      } else {
        setError("Unable to sync live queue. Checking connection...");
      }
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("medcare_token");
    router.push("/login");
  };

  // Date Formatting for Header
  const todayDate = new Date().toLocaleDateString('en-GB', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

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
            <Link href="/doctor" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <LayoutDashboard size={18} /> The Clinical Hub
            </Link>
            
            {/* Active Page */}
            <div className="w-full flex items-center gap-3 px-4 py-3 bg-sky-900/30 text-sky-400 border border-sky-500/30 rounded-xl text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(56,189,248,0.15)] transition-all">
              <Users size={18} /> Today's Queue
            </div>

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
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        
        <div className="p-8 md:p-10 max-w-5xl w-full mx-auto z-10 flex flex-col h-full">
          
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-light tracking-widest uppercase text-white mb-1">
                Live Patient <span className="font-bold text-sky-400">Queue</span>
              </h2>
              <p className="text-[10px] text-slate-400 tracking-widest uppercase font-mono flex items-center gap-2">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
                {todayDate}
              </p>
            </div>
            
            <div className="text-right hidden sm:block bg-slate-900 border border-slate-800 rounded-xl px-5 py-2 shadow-lg">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Waiting in Queue</p>
              <p className="text-2xl font-mono text-white font-bold">{summary.pending}</p>
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
              <p className="text-xs uppercase tracking-widest font-bold">Loading Patient Queue...</p>
            </div>
          ) : (
            <div className="flex-1 animate-fadeIn flex flex-col">
              
              {queue.length === 0 && !error ? (
                <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-3xl bg-slate-900/50 backdrop-blur-sm p-10">
                  <UserCheck size={64} className="text-emerald-500/50 mb-6" />
                  <p className="text-lg font-bold text-slate-300 uppercase tracking-widest mb-2">Queue is Empty</p>
                  <p className="text-[10px] text-slate-500 font-mono uppercase text-center max-w-sm leading-relaxed">
                    There are no pending patients in your queue right now. You have completed {summary.completed} consultations today.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {queue.map((patient, index) => (
                    <div 
                      key={patient.appointment_id} 
                      className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 hover:border-sky-500/50 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 transition-all shadow-lg group"
                    >
                      {/* Left: Slot & Status */}
                      <div className="flex items-center gap-5 w-full sm:w-auto">
                        <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center shrink-0 group-hover:border-sky-500/50 transition-colors">
                          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Slot</span>
                          <span className="text-2xl font-mono font-black text-white">{patient.slot_number}</span>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-bold text-slate-200 mb-1">{patient.patient_name}</h3>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-500 font-mono">APT: {patient.appointment_number}</span>
                            
                            {/* Dynamic Status Badge */}
                            {patient.status === "In Progress" ? (
                               <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-950/50 border border-amber-900/50 text-amber-500 rounded text-[9px] font-black uppercase tracking-widest animate-pulse">
                                 <PlayCircle size={10} /> In Progress
                               </span>
                            ) : (
                               <span className="flex items-center gap-1 px-2 py-0.5 bg-sky-950/30 border border-sky-900/50 text-sky-400 rounded text-[9px] font-black uppercase tracking-widest">
                                 <Clock size={10} /> Waiting
                               </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: The Critical Action Button */}
                      <div className="w-full sm:w-auto">
                        <Link 
                          href={`/doctor/consultation/${patient.appointment_id}`}
                          className={`w-full sm:w-auto px-6 py-4 rounded-xl text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(56,189,248,0.1)] flex items-center justify-center gap-2 ${
                            index === 0 
                              ? "bg-sky-600 hover:bg-sky-500 border border-sky-500 text-white shadow-[0_0_20px_rgba(56,189,248,0.3)]" 
                              : "bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
                          }`}
                        >
                          View Panel <ArrowRight size={16} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}