"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { 
  ShieldCheck, Home, LogOut, Activity, ArrowLeft, 
  FlaskConical, Download, Maximize2, X, Calendar, Clock, CheckCircle2, AlertCircle,
  CreditCard, Lock, User
} from "lucide-react";

export default function LabReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  
  const [patientName, setPatientName] = useState("Patient");

  useEffect(() => {
    const token = localStorage.getItem("medcare_token");
    if (!token) { router.push("/login"); return; }
    fetchReports(token);
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

  const fetchReports = async (token: string) => {
    try {
      const response = await axios.get("http://localhost:8000/patients/me/reports", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(response.data);
    } catch (err: any) {
      if (err.response?.status === 404) setReports([]); 
      else setError("Unable to connect to the laboratory database.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => { localStorage.removeItem("medcare_token"); router.push("/login"); };

  const handleDownload = async (fileUrl: string, testName: string, date: string) => {
    if (!fileUrl) return;
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `MedCare_${testName.replace(/\s+/g, '_')}_${date}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans overflow-hidden">
      
      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fadeIn">
          <button onClick={() => setSelectedImage(null)} className="absolute top-6 right-6 p-3 bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:bg-red-900/50 hover:border-red-500 rounded-full transition-all">
            <X size={24} />
          </button>
          <img src={selectedImage} alt="Lab Report Fullscreen" className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-800" />
        </div>
      )}

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
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none"></div>

        <Link href="/dashboard/health-vault" className="inline-flex items-center gap-2 text-slate-500 hover:text-amber-400 mb-6 text-[10px] font-bold uppercase tracking-widest z-10 transition-colors">
          <ArrowLeft size={14} /> Back to Health Vault
        </Link>

        <div className="mb-10 flex items-center gap-4 z-10">
          <div className="w-12 h-12 bg-amber-900/20 border border-amber-900/50 rounded-xl flex items-center justify-center">
            <FlaskConical className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-3xl font-light tracking-widest uppercase text-white mb-1">
              My <span className="font-bold text-amber-400">Reports</span>
            </h2>
            <p className="text-xs text-slate-500 tracking-widest uppercase">View and analyze your verified laboratory results</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 z-10">
            <FlaskConical size={40} className="animate-pulse mb-4 opacity-50 text-amber-400/50" />
            <p className="text-xs uppercase tracking-widest">Retrieving laboratory records...</p>
          </div>
        ) : (
          <div className="z-10 animate-fadeIn">
            {reports.length === 0 && !error ? (
              <div className="text-center py-24 border border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
                <p className="text-sm text-slate-500 tracking-widest uppercase font-bold">No laboratory reports available.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {reports.map((report) => (
                  <div key={report.id} className="bg-slate-900 border border-slate-800 hover:border-amber-900/50 rounded-3xl p-6 shadow-xl transition-all flex flex-col h-full">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-white mb-2">{report.test_name}</h3>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 border rounded-lg text-[9px] font-bold uppercase tracking-widest ${report.status === 'Completed' ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-400' : 'bg-amber-950/30 border-amber-900/50 text-amber-400'}`}>
                          {report.status === 'Completed' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />} 
                          {report.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-4 text-[10px] text-slate-400 uppercase tracking-widest font-bold bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6">
                      <span className="flex items-center gap-2"><Calendar size={14} className="text-amber-500/70" /> {report.date}</span>
                      <span className="flex items-center gap-2"><Clock size={14} className="text-amber-500/70" /> {report.time}</span>
                    </div>

                    {report.status === "Completed" ? (
                      <div className="mt-auto grid grid-cols-2 gap-3">
                        <button onClick={() => setSelectedImage(report.file_url)} className="w-full py-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 text-slate-300 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all flex justify-center items-center gap-2">
                          <Maximize2 size={14} className="text-amber-400" /> View Report
                        </button>
                        <button onClick={() => handleDownload(report.file_url, report.test_name, report.date)} className="w-full py-3 bg-amber-600/10 hover:bg-amber-600/20 border border-amber-900/50 text-amber-400 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all flex justify-center items-center gap-2">
                          <Download size={14} /> Download (.PNG)
                        </button>
                      </div>
                    ) : (
                      <div className="mt-auto bg-slate-950/50 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                        <p className="text-[10px] text-amber-500/70 font-bold uppercase tracking-widest animate-pulse">Awaiting Laboratory Processing</p>
                        <p className="text-[9px] text-slate-600 uppercase mt-1">Check back later for results</p>
                      </div>
                    )}
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