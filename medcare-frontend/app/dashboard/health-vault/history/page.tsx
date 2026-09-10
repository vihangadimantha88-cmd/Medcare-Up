"use client";

import { formatDateTime } from "@/utils/dateFormatter";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { 
  ShieldCheck, Home, LogOut, Activity, ArrowLeft, 
  History as HistoryIcon, Stethoscope, Calendar, FileType2, AlertCircle, FileText,
  CreditCard, Lock, User
} from "lucide-react";

export default function MedicalHistoryPage() {
  const router = useRouter();
  const [medicalHistory, setMedicalHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  
  const [patientName, setPatientName] = useState("Patient");

  useEffect(() => {
    const token = localStorage.getItem("medcare_token");
    if (!token) { router.push("/login"); return; }
    
    fetchMedicalHistory(token);
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

  // 🚀 1. 100% Correct API Endpoint for fetching History
  const fetchMedicalHistory = async (token: string) => {
    try {
      const response = await axios.get("http://34.229.165.55:8000/patients/me/history", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const sortedHistory = response.data.sort((a: any, b: any) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setMedicalHistory(sortedHistory);
    } catch (err: any) {
      console.error("Failed to load medical history", err);
      if (err.response?.status === 404) {
        setMedicalHistory([]); 
      } else {
        setError("Unable to connect to the medical history database.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => { localStorage.removeItem("medcare_token"); router.push("/login"); };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans overflow-hidden">
      
      {/* 🟢 FULL SIDEBAR NAVIGATION (100% Restored) */}
      <div className="w-72 bg-slate-950 border-r border-slate-800/60 flex flex-col justify-between hidden md:flex z-20 shadow-[4px_0_24px_rgba(0,0,0,0.4)] print:hidden">        <div>
          <div className="p-6 border-b border-slate-800/60 flex items-center gap-3 bg-slate-900/20">
            <ShieldCheck className="w-10 h-10 text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
            <div>
              <h1 className="text-sm font-extrabold tracking-widest uppercase text-white leading-tight">MedCare<br/><span className="text-cyan-400 text-[10px]">Patient Portal</span></h1>
            </div>
          </div>
          <div className="p-4 space-y-2 mt-4">
            <Link href="/dashboard" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <Home size={18} /> Home
            </Link>
            
            {/* Active Link */}
            <div className="w-full flex items-center gap-3 px-4 py-3 bg-cyan-900/30 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all">
              <Activity size={18} /> My Health Vault
            </div>
            
            <Link href="/dashboard/billing" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <CreditCard size={18} /> Billing
            </Link>
            <Link href="/dashboard/security" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <Lock size={18} /> Security & Privacy
            </Link>
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
      <div className="flex-1 flex flex-col h-screen overflow-y-auto p-8 md:p-12 w-full relative print:h-auto print:overflow-visible print:bg-white print:text-black">        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>

        <Link href="/dashboard/health-vault" className="inline-flex items-center gap-2 text-slate-500 hover:text-cyan-400 mb-6 text-[10px] font-bold uppercase tracking-widest z-10 transition-colors">
          <ArrowLeft size={14} /> Back to Health Vault
        </Link>

        <div className="mb-10 flex items-center gap-4 z-10">
          <div className="w-12 h-12 bg-emerald-900/20 border border-emerald-900/50 rounded-xl flex items-center justify-center">
            <HistoryIcon className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-3xl font-light tracking-widest uppercase text-white mb-1">
              Medical <span className="font-bold text-emerald-400">History</span>
            </h2>
            <p className="text-xs text-slate-500 tracking-widest uppercase">Your comprehensive clinical timeline and past diagnoses</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl border bg-slate-900 border-slate-800 text-slate-400 flex items-start gap-3 z-10 shadow-lg">
            <AlertCircle size={18} className="text-amber-500 mt-0.5 shrink-0" />
            <div className="text-xs leading-relaxed"><span className="font-bold text-amber-500 uppercase tracking-widest block mb-1">System Notice</span>{error}</div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 z-10">
            <HistoryIcon size={32} className="animate-spin-slow mb-4 opacity-50 text-emerald-400/50" />
            <p className="text-xs uppercase tracking-widest">Retrieving clinical records...</p>
          </div>
        ) : (
          <div className="relative z-10">
            <div className="absolute left-[27px] top-4 bottom-4 w-[2px] bg-slate-800 rounded-full hidden md:block"></div>

            {medicalHistory.length === 0 && !error ? (
              <div className="text-center py-24 border border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
                <p className="text-sm text-slate-500 tracking-widest uppercase font-bold">No clinical history records found.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {medicalHistory.map((record) => (
                  <div key={record.id} className="relative flex gap-6 md:gap-8 items-start animate-fadeIn">
                    
                    <div className="hidden md:flex flex-col items-center mt-1 z-10">
                      <div className="w-14 h-14 bg-slate-950 border-4 border-slate-900 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.15)] relative">
                        <div className="absolute w-full h-full border-2 border-emerald-900/50 rounded-full animate-pulse"></div>
                        <Calendar size={18} className={record.status === "No Show" ? "text-amber-500" : "text-emerald-500"} />
                      </div>
                    </div>

                    <div className={`flex-1 bg-slate-900 border rounded-3xl p-6 md:p-8 shadow-xl transition-colors group ${record.status === "No Show" ? "border-amber-900/30 hover:border-amber-900/50" : "border-slate-800 hover:border-emerald-900/50"}`}>
                      
                      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-6 border-b border-slate-800/50">
                        <div>
                          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block mb-2 md:hidden">{formatDateTime(record.date)}</span>                           <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                            <Stethoscope size={16} className={record.status === "No Show" ? "text-amber-500" : "text-slate-400"} /> Dr. {record.doctor_name}
                          </h3>
                        </div>
                        <div className="hidden md:flex items-center gap-2 bg-emerald-950/30 border border-emerald-900/50 px-4 py-1.5 rounded-full">
                          <Calendar size={12} className="text-emerald-500" />
                          <span className="text-[10px] text-emerald-200 font-bold uppercase tracking-widest">{formatDateTime(record.date)}</span>                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className={`bg-slate-950/50 rounded-2xl p-5 border border-slate-800/50 border-l-2 ${record.status === "No Show" ? "border-l-amber-500/50" : "border-l-emerald-500/50"}`}>
                          <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                            <AlertCircle size={12} className={record.status === "No Show" ? "text-amber-400" : "text-emerald-400"} /> Status & Summary
                          </h4>
                          <p className={`text-sm font-medium leading-relaxed ${record.status === "No Show" ? "text-amber-100" : "text-emerald-100"}`}>
                            {record.diagnosis}
                          </p>
                        </div>

                        <div>
                          <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                            <FileType2 size={12} className="text-cyan-400" /> Clinical Notes & Observations
                          </h4>
                          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/30 p-4 rounded-xl border border-slate-800/30">
                            {record.clinical_notes}
                          </p>
                        </div>

                        <div>
                          <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                            <FileText size={12} className="text-purple-400" /> Linked Records
                          </h4>
                          <p className="text-xs text-purple-100/70 leading-relaxed bg-purple-950/20 p-4 rounded-xl border border-purple-900/30 font-mono uppercase tracking-widest">
                            {record.treatment_plan}
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}