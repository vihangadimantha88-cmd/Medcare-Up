"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { 
  ShieldCheck, Home, LogOut, Activity, ArrowLeft, 
  Pill, Stethoscope, Calendar, Clock, AlertCircle, CheckCircle2, Building,
  CreditCard, Lock, User 
} from "lucide-react";

export default function PrescriptionsPage() {
  const router = useRouter();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  
  const [patientName, setPatientName] = useState("Patient");

  useEffect(() => {
    const token = localStorage.getItem("medcare_token");
    if (!token) { router.push("/login"); return; }
    
    fetchPrescriptions(token);
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

  const fetchPrescriptions = async (token: string) => {
    try {
      const response = await axios.get("http://localhost:8000/patients/me/prescriptions", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPrescriptions(response.data);
    } catch (err: any) {
      if (err.response?.status === 404) setPrescriptions([]); 
      else setError("Unable to connect to the prescription database.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => { localStorage.removeItem("medcare_token"); router.push("/login"); };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans overflow-hidden">
      
      {/* 🟢 FULL SIDEBAR NAVIGATION (100% Restored) */}
      <div className="w-72 bg-slate-950 border-r border-slate-800/60 flex flex-col justify-between hidden md:flex z-20 shadow-[4px_0_24px_rgba(0,0,0,0.4)]">
        <div>
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
      <div className="flex-1 flex flex-col h-screen overflow-y-auto p-8 md:p-12 max-w-5xl mx-auto relative w-full">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none"></div>

        <Link href="/dashboard/health-vault" className="inline-flex items-center gap-2 text-slate-500 hover:text-cyan-400 mb-6 text-[10px] font-bold uppercase tracking-widest z-10 transition-colors">
          <ArrowLeft size={14} /> Back to Health Vault
        </Link>

        <div className="mb-10 flex items-center gap-4 z-10">
          <div className="w-12 h-12 bg-cyan-900/20 border border-cyan-900/50 rounded-xl flex items-center justify-center">
            <Pill className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-3xl font-light tracking-widest uppercase text-white mb-1">
              E-<span className="font-bold text-cyan-400">Prescriptions</span>
            </h2>
            <p className="text-xs text-slate-500 tracking-widest uppercase">Digital Medical Prescriptions and Drug Instructions</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl border bg-slate-900 border-slate-800 text-slate-400 flex items-start gap-3 z-10 shadow-lg">
            <AlertCircle size={18} className="text-amber-500 mt-0.5 shrink-0" />
            <div className="text-xs leading-relaxed"><span className="font-bold text-amber-500 uppercase tracking-widest block mb-1">System Notice</span>{error}</div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-cyan-500/50 z-10">
            <Pill size={40} className="animate-pulse mb-4 opacity-50" />
            <p className="text-xs uppercase tracking-widest">Retrieving Secure Prescriptions...</p>
          </div>
        ) : (
          <div className="z-10 space-y-8 animate-fadeIn">
            {prescriptions.length === 0 && !error ? (
              <div className="text-center py-24 border border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
                <p className="text-sm text-slate-500 tracking-widest uppercase font-bold">No E-Prescriptions Found.</p>
              </div>
            ) : (
              prescriptions.map((rx, index) => (
                <div key={index} className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
                  
                  {/* Header Area with QR Code (RESTORED) */}
                  <div className="p-8 border-b border-slate-800 flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-black text-white mb-3 flex items-center gap-3">
                        <Stethoscope size={24} className="text-cyan-400" /> Dr. {rx.doctor_name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                        <span className="flex items-center gap-1.5"><Calendar size={12} className="text-cyan-500/70" /> {rx.issue_date}</span>
                        <span className="flex items-center gap-1.5"><Clock size={12} className="text-cyan-500/70" /> {rx.issue_time}</span>
                        <span className="flex items-center gap-1.5"><Building size={12} className="text-cyan-500/70" /> DEPT: {rx.doctor_department || "General"}</span>
                      </div>
                    </div>
                    
                    {/* 🟢 QR CODE SECTION */}
                    <div className="flex flex-col items-end gap-3">
                      <div className="bg-cyan-950/40 border border-cyan-900/50 px-4 py-2 rounded-xl text-cyan-400 flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                        <span className="text-sm font-black italic">Rx</span>
                        <span className="text-[9px] font-mono tracking-widest uppercase font-bold">REF: {rx.prescription_number}</span>
                      </div>
                      <div className="p-1.5 bg-white rounded-lg shadow-lg border border-slate-700">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(rx.verification_url)}`} 
                          alt="Verification QR" 
                          className="w-16 h-16"
                        />
                      </div>
                      <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">Scan to Verify</span>
                    </div>
                  </div>

                  {/* Medicines Table */}
                  <div className="p-8">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-[9px] text-slate-500 uppercase tracking-widest">
                          <th className="pb-4 font-bold">Medicine Name</th>
                          <th className="pb-4 font-bold">Dosage</th>
                          <th className="pb-4 font-bold">Frequency</th>
                          <th className="pb-4 font-bold">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/30">
                        {rx.medicines && rx.medicines.map((med: any, mIdx: number) => (
                          <tr key={mIdx} className="hover:bg-slate-800/20 transition-colors">
                            <td className="py-5">
                              <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
                                <Pill size={12} className="text-cyan-500" /> {med.medicine_name}
                              </span>
                            </td>
                            <td className="py-5 text-xs text-slate-400 font-mono">{med.dose}</td>
                            <td className="py-5">
                              <span className="px-2 py-1 bg-cyan-950/30 border border-cyan-900/50 text-cyan-400 rounded text-[9px] font-black uppercase tracking-widest block w-fit mb-1">
                                {med.frequency}
                              </span>
                              <span className="text-[9px] text-slate-500 font-mono">{med.before_after_meals}</span>
                            </td>
                            <td className="py-5 text-xs text-slate-400 font-mono">{med.duration}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Doctor's Notes */}
                  {rx.doctor_note && (
                    <div className="p-6 bg-slate-950 border-t border-slate-800 mx-8 mb-8 rounded-2xl flex items-start gap-3">
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Consultant's Instructions</p>
                        <p className="text-xs text-slate-300 leading-relaxed font-mono">{rx.doctor_note}</p>
                      </div>
                    </div>
                  )}
                  
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}