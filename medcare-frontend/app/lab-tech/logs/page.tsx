"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { 
  FlaskConical, LayoutDashboard, ScrollText, UserCog, LogOut, 
  Activity, AlertTriangle, Clock, Monitor, Globe, Droplet, 
  UploadCloud, ShieldCheck, KeyRound
} from "lucide-react";

export default function LabTechActivityLogsPage() {
  const router = useRouter();
  
  // 🟢 100% Real API States
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("medcare_token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchActivityLogs(token);
  }, [router]);

  // 🚀 Fetch Immutable Logs from Backend
  const fetchActivityLogs = async (token: string) => {
    try {
      const response = await axios.get("http://34.229.165.55:8000/lab-tech/me/activity-logs", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(response.data);
    } catch (err: any) {
      console.error("Logs fetch error", err);
      setError("Unable to retrieve activity logs. Please check the secure connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("medcare_token");
    router.push("/login");
  };

  
  const getActionStyles = (action: string) => {
    switch (action) {
      case "REPORT_UPLOADED":
        // This is the most critical action (Contains Steganography Hash)
        return { icon: <UploadCloud size={16} />, color: "text-emerald-400", bg: "bg-emerald-950/30", border: "border-emerald-900/50" };
      case "SAMPLE_COLLECTED":
        return { icon: <Droplet size={16} />, color: "text-sky-400", bg: "bg-sky-950/30", border: "border-sky-900/50" };
      case "PASSWORD_CHANGED":
      case "MFA_ENABLED":
        return { icon: <KeyRound size={16} />, color: "text-amber-400", bg: "bg-amber-950/30", border: "border-amber-900/50" };
      case "LOGIN":
      case "LOGOUT":
      case "FAILED_LOGIN":
        return { icon: <Monitor size={16} />, color: "text-slate-400", bg: "bg-slate-900", border: "border-slate-800" };
      default:
        return { icon: <Activity size={16} />, color: "text-slate-500", bg: "bg-slate-900/50", border: "border-slate-800/50" };
    }
  };

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
            <Link href="/lab-tech/analytics" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <Activity size={18} /> Efficiency Matrix
            </Link>
            
            {/* Active Page */}
            <div className="w-full flex items-center gap-3 px-4 py-3 bg-sky-900/30 text-sky-400 border border-sky-500/30 rounded-xl text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(56,189,248,0.15)] transition-all">
              <ScrollText size={18} /> Activity Logs
            </div>

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
        
        <div className="p-8 md:p-10 max-w-6xl w-full mx-auto z-10 flex flex-col h-full">
          
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-light tracking-widest uppercase text-white mb-1">
                Activity <span className="font-bold text-sky-400">Logs</span>
              </h2>
              <p className="text-[10px] text-slate-400 tracking-widest uppercase font-mono">Immutable Lab Operations & Security Audit</p>
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
              <p className="text-xs uppercase tracking-widest font-bold">Decrypting Secure Lab Logs...</p>
            </div>
          ) : (
            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl flex-1 flex flex-col animate-fadeIn">
              
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
                <ShieldCheck size={16} className="text-emerald-400" />
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">System Receipts & Audit Trail</h3>
              </div>

              {logs.length === 0 && !error ? (
                <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl p-10 opacity-50">
                  <ScrollText size={48} className="text-slate-600 mb-4" />
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No activity recorded</p>
                </div>
              ) : (
                <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                  {logs.map((log) => {
                    const style = getActionStyles(log.action);
                    // Checking if this log is a report upload containing a Hash
                    const isReportUpload = log.action === "REPORT_UPLOADED" && log.details.includes("Hash:");

                    return (
                      <div key={log.id} className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${style.bg} ${style.border}`}>
                        
                        <div className="flex items-start gap-4 w-full">
                          <div className={`w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center shrink-0 border border-slate-800 ${style.color}`}>
                            {style.icon}
                          </div>
                          <div className="w-full">
                            <h4 className={`text-xs font-bold tracking-widest uppercase mb-1 ${style.color}`}>
                              {log.action.replace(/_/g, " ")}
                            </h4>
                            <p className="text-[11px] text-slate-300 font-mono leading-relaxed break-words">
                              {log.details}
                            </p>
                            
                            {/* Special Receipt Badge for Uploaded Reports (System Receipt Logic) */}
                            {isReportUpload && (
                               <div className="mt-3 inline-flex flex-col sm:flex-row sm:items-center gap-2 bg-emerald-950/30 border border-emerald-900/50 px-3 py-2 rounded-lg shadow-sm w-full md:w-max">
                                 <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-500 uppercase tracking-widest shrink-0">
                                   <ShieldCheck size={12} /> Legal System Receipt
                                 </div>
                               </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 border-t md:border-t-0 border-slate-800/50 pt-3 md:pt-0 shrink-0">
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                            <Clock size={12} />
                            {new Date(log.timestamp).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px] text-slate-600 uppercase tracking-widest">
                            <Globe size={10} />
                            {log.ip_address}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}