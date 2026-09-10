"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { 
  ShieldCheck, Home, Activity, CreditCard, Lock, LogOut, 
  ArrowLeft, Receipt, History, ChevronRight, User
} from "lucide-react";

export default function BillingHubPage() {
  const router = useRouter();
  const [patientName, setPatientName] = useState("Patient");

  useEffect(() => {
    const token = localStorage.getItem("medcare_token");
    if (!token) {
      router.push("/login");
      return;
    }

    // 🚀 Fetch real patient name from backend for the unified sidebar
    const fetchProfile = async () => {
      try {
        const response = await axios.get("http://34.229.165.55:8000/patients/me/profile", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPatientName(response.data.first_name || "Patient");
      } catch (err) {
        console.error("Failed to fetch profile", err);
      }
    };

    fetchProfile();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("medcare_token");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans overflow-hidden selection:bg-cyan-500/30">
      
      {/* 🟢 FIXED PATIENT SIDEBAR (Unified) */}
      <div className="w-64 bg-slate-950 border-r border-slate-800/60 flex flex-col justify-between hidden md:flex z-20 shadow-[4px_0_24px_rgba(0,0,0,0.4)]">
        <div>
          <div className="p-6 border-b border-slate-800/60 flex items-center gap-3 bg-slate-900/20">
            <ShieldCheck className="w-8 h-8 text-cyan-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
            <div>
              <h1 className="text-sm font-extrabold tracking-widest uppercase text-white leading-tight">MedCare<br/><span className="text-cyan-400 text-[10px]">Patient Portal</span></h1>
            </div>
          </div>
          
          <div className="p-4 space-y-2 mt-4">
            <Link href="/dashboard" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <Home size={18} /> Home
            </Link>
            
            <Link href="/dashboard/health-vault" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <Activity size={18} /> My Health Vault
            </Link>

            {/* Active Page */}
            <div className="w-full flex items-center gap-3 px-4 py-3 bg-cyan-900/30 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all">
              <CreditCard size={18} /> Billing
            </div>

            <Link href="/dashboard/security" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <Lock size={18} /> Security & Privacy
            </Link>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800/60 bg-slate-900/20 flex flex-col gap-3">
          <div className="flex items-center gap-3 px-4 py-2">
             <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-400 font-bold text-xs">
               <User size={14} />
             </div>
             <div>
               <p className="text-[10px] font-bold text-white uppercase tracking-widest">{patientName}</p>
               <p className="text-[8px] text-emerald-400 uppercase font-mono">Verified Access</p>
             </div>
          </div>
          <button onClick={handleLogout} className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-900/50 text-slate-400 hover:text-red-400 rounded-xl text-xs font-bold tracking-widest uppercase transition-all">
            <LogOut size={16} /> Secure Logout
          </button>
        </div>
      </div>

      {/* 🟢 MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative bg-slate-950">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="p-8 md:p-12 max-w-6xl w-full mx-auto z-10 flex flex-col h-full">
          
          {/* Header */}
          <div className="mb-10">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-cyan-400 transition-colors mb-6">
              <ArrowLeft size={12} /> Back to Dashboard
            </Link>
            <h2 className="text-3xl md:text-4xl font-light tracking-widest uppercase text-white mb-2">
              My <span className="font-bold text-cyan-400">Billing</span>
            </h2>
            <p className="text-xs md:text-sm text-slate-400 tracking-widest uppercase font-mono">
              Manage your current invoices and review payment history
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. Current Bill (🛑 FAKE PENDING BADGE REMOVED) */}
            <Link href="/dashboard/billing/current" className="group bg-slate-900/80 backdrop-blur-sm border border-slate-800 hover:border-cyan-500/50 p-8 rounded-3xl relative overflow-hidden transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <Receipt className="w-7 h-7 text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-widest uppercase mb-3">Current Bill</h3>
                <p className="text-xs text-slate-500 tracking-wide leading-relaxed mb-8">
                  View your active pending invoices, consultation fees, and lab charges.
                </p>
              </div>
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold tracking-widest uppercase group-hover:translate-x-2 transition-transform">
                View Current Bill <ChevronRight size={16} />
              </div>
            </Link>

            {/* 2. Bill History */}
            <Link href="/dashboard/billing/history" className="group bg-slate-900/80 backdrop-blur-sm border border-slate-800 hover:border-emerald-500/50 p-8 rounded-3xl relative overflow-hidden transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <History className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-widest uppercase mb-3">Bill History</h3>
                <p className="text-xs text-slate-500 tracking-wide leading-relaxed mb-8">
                  Access records of all your past transactions. Review settled payments for completed consultations and insurance claims.
                </p>
              </div>
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold tracking-widest uppercase group-hover:translate-x-2 transition-transform">
                View Payment History <ChevronRight size={16} />
              </div>
            </Link>

          </div>
        </div>
      </div>
    </div>
  );
}