"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ShieldCheck, Home, LogOut, Activity, ArrowLeft, 
  CreditCard, LockKeyhole, UserCog, SmartphoneNfc, ScrollText, ChevronRight 
} from "lucide-react";

export default function SecurityPrivacyHubPage() {
  const router = useRouter();
  const [patientName, setPatientName] = useState("Patient");

  useEffect(() => {
    const token = localStorage.getItem("medcare_token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("medcare_token");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans overflow-hidden">
      
      {/* 🟢 SIDEBAR NAVIGATION */}
      <div className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col justify-between hidden md:flex z-10">
        <div>
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <ShieldCheck className="w-10 h-10 text-cyan-400" />
            <div><h1 className="text-sm font-bold tracking-widest uppercase text-white">MedCare<br/><span className="text-cyan-400">Patient Portal</span></h1></div>
          </div>
          <div className="p-4 space-y-2 mt-4">
            
            <Link href="/dashboard" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-all">
              <Home size={18} /> Home
            </Link>
            
            <Link href="/dashboard/health-vault" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-all">
              <Activity size={18} /> My Health Vault
            </Link>
            
            <Link href="/dashboard/billing" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-all">
              <CreditCard size={18} /> Billing
            </Link>

            {/* Security is ACTIVE in this page */}
            <div className="w-full flex items-center gap-3 px-4 py-3 bg-rose-900/40 text-rose-400 border border-rose-800/50 rounded-xl text-xs font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(225,29,72,0.1)] transition-all">
              <LockKeyhole size={18} /> Security & Privacy
            </div>

          </div>
        </div>
        <div className="p-4 border-t border-slate-800">
          <button onClick={handleLogout} className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-red-950/40 border border-red-900 text-red-400 rounded-xl text-xs font-bold tracking-widest uppercase hover:bg-red-900/60 transition-colors">
            <LogOut size={16} /> Secure Logout
          </button>
        </div>
      </div>

      {/* 🟢 MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto p-8 md:p-12 max-w-5xl mx-auto relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-500/5 rounded-full blur-[120px] pointer-events-none"></div>

        <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-rose-400 mb-6 text-[10px] font-bold uppercase tracking-widest z-10 transition-colors">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>

        <div className="mb-10 flex items-center gap-4 z-10">
          <div className="w-12 h-12 bg-rose-900/20 border border-rose-900/50 rounded-xl flex items-center justify-center">
            <LockKeyhole className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <h2 className="text-3xl font-light tracking-widest uppercase text-white mb-1">
              Security & <span className="font-bold text-rose-400">Privacy</span>
            </h2>
            <p className="text-xs text-slate-500 tracking-widest uppercase">Manage your Zero-Trust account settings and audit logs</p>
          </div>
        </div>

        {/* 🚀 SUB-SECTIONS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 z-10">
          
          {/* 4.1 Profile Management */}
          <Link href="/dashboard/security/profile" className="group bg-slate-900 border border-slate-800 p-8 rounded-3xl relative overflow-hidden hover:border-indigo-500 transition-all shadow-lg hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] flex flex-col justify-between h-full">
            <div>
              <div className="w-14 h-14 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform group-hover:border-indigo-500">
                <UserCog className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 className="text-base font-bold text-white tracking-widest uppercase mb-2">Profile Management</h3>
              <p className="text-[10px] text-slate-500 tracking-wide leading-relaxed mb-6">
                Update your personal details, residential address, emergency contacts, and demographic information securely.
              </p>
            </div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold tracking-widest uppercase group-hover:translate-x-2 transition-transform">
              Manage Profile <ChevronRight size={16} />
            </div>
          </Link>

          {/* 4.2 Device Security and Authentication */}
          <Link href="/dashboard/security/authentication" className="group bg-slate-900 border border-slate-800 p-8 rounded-3xl relative overflow-hidden hover:border-rose-500 transition-all shadow-lg hover:shadow-[0_0_30px_rgba(244,63,94,0.15)] flex flex-col justify-between h-full">
            <div>
              <div className="w-14 h-14 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform group-hover:border-rose-500">
                <SmartphoneNfc className="w-7 h-7 text-rose-400" />
              </div>
              <h3 className="text-base font-bold text-white tracking-widest uppercase mb-2">Device & Authentication</h3>
              <p className="text-[10px] text-slate-500 tracking-wide leading-relaxed mb-6">
                Change your password, configure Two-Factor Authentication (2FA), and secure your account from unauthorized access.
              </p>
            </div>
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold tracking-widest uppercase group-hover:translate-x-2 transition-transform">
              Security Settings <ChevronRight size={16} />
            </div>
          </Link>

          {/* 4.3 Activity Logs */}
          <Link href="/dashboard/security/logs" className="group bg-slate-900 border border-slate-800 p-8 rounded-3xl relative overflow-hidden hover:border-teal-500 transition-all shadow-lg hover:shadow-[0_0_30px_rgba(20,184,166,0.15)] flex flex-col justify-between h-full md:col-span-2 lg:col-span-1">
            <div>
              <div className="w-14 h-14 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform group-hover:border-teal-500">
                <ScrollText className="w-7 h-7 text-teal-400" />
              </div>
              <h3 className="text-base font-bold text-white tracking-widest uppercase mb-2">Activity Logs</h3>
              <p className="text-[10px] text-slate-500 tracking-wide leading-relaxed mb-6">
                Monitor your account activity. View detailed audit logs of recent logins, IP addresses, and device usage history.
              </p>
            </div>
            <div className="flex items-center gap-2 text-teal-400 text-xs font-bold tracking-widest uppercase group-hover:translate-x-2 transition-transform">
              View Audit Logs <ChevronRight size={16} />
            </div>
          </Link>

        </div>

      </div>
    </div>
  );
}