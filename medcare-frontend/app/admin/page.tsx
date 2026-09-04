"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { ShieldCheck, LayoutDashboard, Receipt, CalendarClock, Users, Fingerprint, UserCog, LogOut, AlertTriangle, TrendingUp, Activity, ShieldAlert, Filter } from "lucide-react";

export default function AdminCommandCenter() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("monthly"); 
  
  const [threatStatus, setThreatStatus] = useState({ level: "normal", message: "All Services Operational" });
  const [revenue, setRevenue] = useState({ doctorFees: 0, labFees: 0, total: 0 });
  const [securityStats, setSecurityStats] = useState({ failedLogins: 0, mfaBypasses: 0, sessionWipes: 0 });
  const [heatmapData, setHeatmapData] = useState<number[][]>([]);

  useEffect(() => {
    const token = localStorage.getItem("medcare_token");
    if (!token) { router.push("/login"); return; }
    fetchRealTimeData(token, period);
  }, [router, period]);

  const fetchRealTimeData = async (token: string, filterPeriod: string) => {
    setLoading(true);
    try {
      const response = await axios.get("http://localhost:8000/admin/dashboard/bi-metrics", {
        headers: { Authorization: `Bearer ${token}` },
        params: { period: filterPeriod }
      });
      const data = response.data;
      setRevenue({ doctorFees: data.revenue_analytics.total_doctor_fees, labFees: data.revenue_analytics.total_lab_fees, total: data.revenue_analytics.overall_revenue });
      setSecurityStats({ failedLogins: data.security_metrics.failed_logins, mfaBypasses: data.security_metrics.mfa_bypasses_blocked, sessionWipes: data.security_metrics.remote_session_wipes });
      if (data.live_threat_monitor) setThreatStatus({ level: "critical", message: data.live_threat_monitor });
      setHeatmapData(data.operational_heatmap.grid || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const getHeatmapColor = (density: number) => {
    if (!density || density === 0) return "bg-cyan-500/10";
    if (density < 5) return "bg-cyan-500/40";
    if (density < 15) return "bg-amber-500/70";
    return "bg-red-500/90";
  };

  const handleLogout = () => {
    localStorage.removeItem("medcare_token");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans overflow-hidden">
      
      {/* 🟢 ADMIN SIDEBAR */}
      <div className="w-72 bg-slate-950 border-r border-slate-800/60 flex flex-col justify-between hidden md:flex z-20 shadow-[4px_0_24px_rgba(0,0,0,0.4)]">
        <div>
          <div className="p-6 border-b border-slate-800/60 flex items-center gap-3 bg-slate-900/20">
            <ShieldCheck className="w-10 h-10 text-indigo-500 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
            <div>
              <h1 className="text-sm font-extrabold tracking-widest uppercase text-white leading-tight">MedCare<br/><span className="text-indigo-400 text-[10px]">Admin Console</span></h1>
            </div>
          </div>
          
          <div className="p-4 space-y-2 mt-4">
            <div className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-900/30 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all">
              <LayoutDashboard size={18} /> Command Center
            </div>
            <Link href="/admin/billing" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <Receipt size={18} /> Automated Billing
            </Link>
            <Link href="/admin/schedule" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <CalendarClock size={18} /> Schedule & Ops
            </Link>
            <Link href="/admin/employees" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <Users size={18} /> Employee Management
            </Link>
            <Link href="/admin/forensics" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50 group">
              <Fingerprint size={18} className="group-hover:text-red-400 transition-colors" /> Digital Forensics
            </Link>
            <Link href="/admin/security" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
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

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto p-10 relative">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-light tracking-widest uppercase text-white mb-1">Command <span className="font-bold text-indigo-500">Center</span></h2>
          </div>
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-1.5 shadow-lg">
            <div className="pl-3 pr-2 flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase"><Filter size={12} /> Period:</div>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="bg-slate-950 text-[10px] text-indigo-400 font-bold uppercase px-4 py-2 rounded-lg outline-none cursor-pointer">
              <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
            </select>
          </div>
        </div>

        {loading ? <div className="py-20 flex justify-center"><Activity size={40} className="animate-spin text-indigo-500 mb-4" /></div> : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-8">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6"><TrendingUp size={14} className="inline text-emerald-400 mr-2"/> Revenue Analytics</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800"><span className="text-[10px] text-slate-500 uppercase block mb-2">Doctor Fees</span><span className="text-xl font-mono text-white">LKR {revenue.doctorFees.toLocaleString()}</span></div>
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800"><span className="text-[10px] text-slate-500 uppercase block mb-2">Lab Fees</span><span className="text-xl font-mono text-white">LKR {revenue.labFees.toLocaleString()}</span></div>
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 border-b-2 border-emerald-500"><span className="text-[10px] text-slate-500 uppercase block mb-2">Total Revenue</span><span className="text-2xl font-mono text-emerald-400">LKR {revenue.total.toLocaleString()}</span></div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6"><ShieldCheck size={14} className="inline text-amber-400 mr-2"/> Security & Audit</h3>
              <div className="space-y-4">
                <div className="flex justify-between p-4 bg-slate-950 rounded-xl border border-slate-800"><span className="text-[11px] text-slate-400 uppercase">Failed Logins</span><span className="text-sm font-mono font-bold text-amber-500">{securityStats.failedLogins}</span></div>
                <div className="flex justify-between p-4 bg-slate-950 rounded-xl border border-slate-800"><span className="text-[11px] text-slate-400 uppercase">MFA Bypasses Blocked</span><span className="text-sm font-mono font-bold text-emerald-500">{securityStats.mfaBypasses}</span></div>
                <div className="flex justify-between p-4 bg-slate-950 rounded-xl border border-slate-800"><span className="text-[11px] text-slate-400 uppercase">Session Wipes</span><span className="text-sm font-mono font-bold text-indigo-400">{securityStats.sessionWipes}</span></div>
              </div>
            </div>

            <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl p-8">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6"><Activity size={14} className="inline text-cyan-400 mr-2"/> Operational Heatmap</h3>
              <div className="flex flex-col gap-2">
                {heatmapData.length > 0 ? ['MON', 'TUE', 'WED', 'THU', 'FRI'].map((day, rowIndex) => (
                  <div key={day} className="flex gap-2 items-center">
                    <div className="w-12 text-[10px] font-bold text-slate-500">{day}</div>
                    {[0, 1, 2, 3, 4, 5].map((colIndex) => (
                      <div key={colIndex} className={`flex-1 h-8 rounded-md transition-colors ${getHeatmapColor(heatmapData[rowIndex]?.[colIndex])}`}></div>
                    ))}
                  </div>
                )) : <p className="text-center text-slate-500 text-xs py-10">No operational data available for this period.</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}