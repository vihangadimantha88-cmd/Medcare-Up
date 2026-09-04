"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { 
  ShieldCheck, Home, LogOut, Activity, CreditCard, Lock, ArrowLeft, 
  History as HistoryIcon, Download, CheckCircle2, User, FileText, Search
} from "lucide-react";

export default function BillHistoryPage() {
  const router = useRouter();
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [patientName, setPatientName] = useState("Patient");

  useEffect(() => {
    const token = localStorage.getItem("medcare_token");
    if (!token) { router.push("/login"); return; }
    fetchHistoryData(token);
    fetchProfile(token);
  }, [router]);

  const fetchProfile = async (token: string) => {
    try {
      const response = await axios.get("http://localhost:8000/patients/me/profile", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatientName(response.data.first_name || "Patient");
    } catch (err) {}
  };

  const fetchHistoryData = async (token: string) => {
    try {
      // 🚀 FIXED: Exactly matching the Backend Endpoint
      const response = await axios.get("http://localhost:8000/patients/me/billing/history", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistoryData(response.data);
    } catch (err: any) {
      console.error("Failed to load bill history", err);
      
      if (err.response?.status === 404) {
        setHistoryData([]);
      } else {
        setError("Unable to connect to the billing database.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => { localStorage.removeItem("medcare_token"); router.push("/login"); };

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
            <Link href="/dashboard/billing" className="w-full flex items-center gap-3 px-4 py-3 bg-cyan-900/30 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all"><CreditCard size={18} /> Billing</Link>
            <Link href="/dashboard/security" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50"><Lock size={18} /> Security & Privacy</Link>
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
      <div className="flex-1 flex flex-col h-screen overflow-y-auto p-8 md:p-12 max-w-5xl mx-auto relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>

        <Link href="/dashboard/billing" className="inline-flex items-center gap-2 text-slate-500 hover:text-emerald-400 mb-6 text-[10px] font-bold uppercase tracking-widest z-10 transition-colors">
          <ArrowLeft size={14} /> Back to Billing Hub
        </Link>

        <div className="mb-10 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-900/20 border border-emerald-900/50 rounded-xl flex items-center justify-center">
              <HistoryIcon className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-3xl font-light tracking-widest uppercase text-white mb-1">
                Bill <span className="font-bold text-emerald-400">History</span>
              </h2>
              <p className="text-xs text-slate-500 tracking-widest uppercase">Past transactions and verified receipts</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 z-10">
            <HistoryIcon size={40} className="animate-spin-slow mb-4 opacity-50 text-emerald-400/50" />
            <p className="text-xs uppercase tracking-widest">Retrieving transaction records...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl border bg-slate-900 border-slate-800 text-red-400 flex items-start gap-3 z-10">
            <ShieldCheck size={18} className="mt-0.5 shrink-0" />
            <div className="text-xs leading-relaxed uppercase tracking-widest">{error}</div>
          </div>
        ) : historyData.length === 0 ? (
          <div className="z-10 text-center py-24 border border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
            <FileText size={48} className="mx-auto text-slate-700 mb-4 opacity-50" />
            <p className="text-sm text-slate-400 tracking-widest uppercase font-bold mb-2">No History Found</p>
            <p className="text-xs text-slate-600 tracking-widest uppercase">You don't have any past billing records in the system.</p>
          </div>
        ) : (
          <div className="z-10 animate-fadeIn grid grid-cols-1 xl:grid-cols-2 gap-6">
            {historyData.map((record, index) => (
              <div key={index} className="bg-slate-900 border border-slate-800 hover:border-emerald-900/50 rounded-3xl p-6 md:p-8 shadow-xl transition-all group flex flex-col justify-between">
                
                <div className="flex justify-between items-start border-b border-slate-800/50 pb-5 mb-5">
                  <div>
                    <span className="px-3 py-1 bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 mb-3 w-fit">
                      <CheckCircle2 size={12} /> {record.status}
                    </span>
                    <h3 className="text-lg font-bold text-white mb-1">Dr. {record.doctor_name}</h3>
                    <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">REF: {record.bill_id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-emerald-400 font-mono">
                      <span className="text-xs text-slate-500 mr-1">LKR</span>
                      {parseFloat(record.total_amount).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-1">Total Paid</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Date of Visit</p>
                    <p className="text-xs text-slate-300 font-mono">{record.bill_date}</p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Appointment No</p>
                    <p className="text-xs text-slate-300 font-mono">{record.appointment_id}</p>
                  </div>
                </div>

                <button 
                  onClick={() => window.print()}
                  className="w-full py-3 bg-emerald-950/20 hover:bg-emerald-900/40 border border-emerald-900/50 text-emerald-400 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all flex justify-center items-center gap-2"
                >
                  <Download size={14} /> Download E-Receipt
                </button>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}