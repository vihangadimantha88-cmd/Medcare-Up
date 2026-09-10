"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { 
  ShieldCheck, Home, Activity, CreditCard, Lock, LogOut, ArrowLeft, 
  FileText, CheckCircle2, XCircle, Globe, User
} from "lucide-react";

export default function ActivityLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientName, setPatientName] = useState("Patient");

  useEffect(() => {
    const token = localStorage.getItem("medcare_token");
    if (!token) { router.push("/login"); return; }
    fetchLogs(token);
    fetchProfile(token);
  }, [router]);

  const fetchProfile = async (token: string) => {
    try {
      const response = await axios.get("http://34.229.165.55:8000/patients/me/profile", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatientName(response.data.first_name || "Patient");
    } catch (err) {}
  };

  const fetchLogs = async (token: string) => {
    try {
      const response = await axios.get("http://34.229.165.55:8000/patients/me/activity-logs", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(response.data);
    } catch (err) {
      console.error("Failed to fetch logs", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => { localStorage.removeItem("medcare_token"); router.push("/login"); };

  // Timestamp එක ලස්සනට Format කිරීම (16/08/2026, 04:41:10)
  const formatDateTime = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleString("en-GB", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans overflow-hidden">
      
      {/* 🟢 FIXED PATIENT SIDEBAR */}
      <div className="w-64 bg-slate-950 border-r border-slate-800/60 flex flex-col justify-between hidden md:flex z-20 shadow-[4px_0_24px_rgba(0,0,0,0.4)]">
        <div>
          <div className="p-6 border-b border-slate-800/60 flex items-center gap-3 bg-slate-900/20">
            <ShieldCheck className="w-8 h-8 text-cyan-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
            <div>
              <h1 className="text-sm font-extrabold tracking-widest uppercase text-white leading-tight">MedCare<br/><span className="text-cyan-400 text-[10px]">Patient Portal</span></h1>
            </div>
          </div>
          <div className="p-4 space-y-2 mt-4">
            <Link href="/dashboard" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50"><Home size={18} /> Home</Link>
            <Link href="/dashboard/health-vault" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50"><Activity size={18} /> My Health Vault</Link>
            <Link href="/dashboard/billing" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50"><CreditCard size={18} /> Billing</Link>
            <div className="w-full flex items-center gap-3 px-4 py-3 bg-cyan-900/30 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all">
              <Lock size={18} /> Security & Privacy
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-800/60 bg-slate-900/20 flex flex-col gap-3">
          <div className="flex items-center gap-3 px-4 py-2">
             <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-400 font-bold text-xs"><User size={14} /></div>
             <div>
               <p className="text-[10px] font-bold text-white uppercase tracking-widest">{patientName}</p>
               <p className="text-[8px] text-emerald-400 uppercase font-mono">Verified Access</p>
             </div>
          </div>
          <button onClick={handleLogout} className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-900/50 text-slate-400 hover:text-red-400 rounded-xl text-xs font-bold tracking-widest uppercase transition-all"><LogOut size={16} /> Secure Logout</button>
        </div>
      </div>

      {/* 🟢 MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto p-8 md:p-12 max-w-6xl mx-auto relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none"></div>

        <Link href="/dashboard/security" className="inline-flex items-center gap-2 text-slate-500 hover:text-teal-400 mb-6 text-[10px] font-bold uppercase tracking-widest z-10 transition-colors">
          <ArrowLeft size={14} /> Back to Security Hub
        </Link>

        <div className="mb-8 flex items-center gap-4 z-10">
          <div className="w-12 h-12 bg-teal-900/20 border border-teal-900/50 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <h2 className="text-3xl font-light tracking-widest uppercase text-white mb-1">
              Activity <span className="font-bold text-teal-400">Logs</span>
            </h2>
            <p className="text-xs text-slate-500 tracking-widest uppercase">Monitor account access, IP addresses, and security events</p>
          </div>
        </div>

        <div className="mb-8 p-4 border border-teal-900/50 bg-teal-950/20 rounded-xl flex items-start gap-3 z-10">
          <ShieldCheck size={18} className="text-teal-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-teal-100/70 font-bold uppercase tracking-widest leading-relaxed">
            <span className="text-teal-400">ZERO-TRUST AUDIT LOG:</span> This is a highly secured ledger of your account activities. If you notice any suspicious logins or unrecognizable devices, please change your password immediately and contact support.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 z-10">
            <FileText size={40} className="animate-pulse mb-4 opacity-50 text-teal-400/50" />
            <p className="text-xs uppercase tracking-widest">Loading secure audit trail...</p>
          </div>
        ) : (
          <div className="z-10 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/50 border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    <th className="p-6">Event Type</th>
                    <th className="p-6">Status</th>
                    <th className="p-6">IP Address</th>
                    <th className="p-6">Device / Browser</th>
                    <th className="p-6 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-6 text-xs font-bold text-white tracking-widest uppercase">
                        {log.action}
                      </td>
                      <td className="p-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest ${
                          log.status === "SUCCESS" ? "bg-emerald-950/40 border border-emerald-900/50 text-emerald-400" : "bg-red-950/40 border border-red-900/50 text-red-400"
                        }`}>
                          {log.status === "SUCCESS" ? <CheckCircle2 size={10} /> : <XCircle size={10} />} 
                          {log.status}
                        </span>
                      </td>
                      <td className="p-6 text-xs text-slate-400 font-mono">
                        {log.ip_address}
                      </td>
                      <td className="p-6 text-xs text-slate-400 flex items-center gap-2 mt-2 font-mono">
                        <Globe size={12} className="text-teal-500" />
                        {log.device || "Unknown Device"}
                      </td>
                      <td className="p-6 text-[10px] text-slate-500 font-mono text-right uppercase tracking-widest">
                        {formatDateTime(log.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && (
                <div className="p-12 text-center text-slate-500 text-xs font-bold tracking-widest uppercase">
                  No activity logs found.
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}