"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { 
  ShieldCheck, LayoutDashboard, Receipt, CalendarClock, Users, 
  Fingerprint, UserCog, LogOut, ShieldAlert, Upload, Activity, 
  CheckCircle2 
} from "lucide-react";

export default function DigitalForensicsPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      setResult(null); 
      setError("");
    }
  };

  // 🚀 100% Correct Backend Forensics API Call
  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("medcare_token");
      
      
      const response = await axios.post("http://localhost:8000/admin/forensics/decrypt", formData, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "multipart/form-data" 
        }
      });
      
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Forensic analysis failed. Invalid file or system error.");
    } finally {
      setAnalyzing(false);
    }
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
            <Link href="/admin" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <LayoutDashboard size={18} /> Command Center
            </Link>
            <Link href="/admin/billing" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <Receipt size={18} /> Automated Billing
            </Link>
            <Link href="/admin/schedule" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <CalendarClock size={18} /> Schedule & Ops
            </Link>
            <Link href="/admin/employees" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <Users size={18} /> Employee Management
            </Link>
            {/* Active Page */}
            <div className="w-full flex items-center gap-3 px-4 py-3 bg-red-900/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(220,38,38,0.1)] transition-all">
              <Fingerprint size={18} /> Digital Forensics
            </div>
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

      {/* 🟢 MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative bg-slate-950">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        <div className="p-8 md:p-10 max-w-4xl w-full mx-auto z-10">
          
          <div className="mb-8 border-b border-slate-800 pb-6">
            <h2 className="text-3xl font-light tracking-widest uppercase text-white mb-1">
              Digital <span className="font-bold text-red-500">Forensics</span>
            </h2>
            <p className="text-[10px] text-slate-400 tracking-widest uppercase font-mono">MILITARY-GRADE DATA LEAK TRACING</p>
          </div>

          {/* Upload Area */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 mb-8 shadow-2xl">
            <div className="border-2 border-dashed border-slate-700 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-red-500 transition-colors bg-slate-950/50"
                 onClick={() => document.getElementById('fileInput')?.click()}>
              <Upload size={40} className="text-slate-600 mb-4" />
              <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Upload Leaked PNG Report</p>
              {/* Steganography only works for .png files in our backend */}
              <input id="fileInput" type="file" className="hidden" onChange={handleFileChange} accept="image/png" />
              <p className="text-[10px] text-sky-400 mt-3 font-mono font-bold">{file ? file.name : "Click to select file"}</p>
            </div>
            
            <button 
              onClick={handleAnalyze}
              disabled={!file || analyzing}
              className="w-full mt-6 py-4 bg-red-900/50 hover:bg-red-800 border border-red-700 text-red-100 rounded-xl text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(220,38,38,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {analyzing ? <><Activity size={16} className="animate-spin" /> Running Decryption Algorithms...</> : <><Fingerprint size={16} /> Decrypt & Analyze Source</>}
            </button>
          </div>

          {/* Results Area */}
          {error && (
            <div className="p-5 rounded-2xl border bg-slate-900 border-red-900/50 text-red-400 flex items-start gap-3 shadow-lg animate-fadeIn">
              <ShieldAlert size={18} className="mt-0.5 shrink-0" />
              <div className="text-xs font-mono leading-relaxed">{error}</div>
            </div>
          )}

          {result && (
            <div className="bg-slate-900 border-2 border-red-500/50 rounded-3xl p-8 shadow-[0_0_50px_rgba(220,38,38,0.15)] animate-fadeIn">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-5 mb-6">
                <div className="w-10 h-10 bg-red-950/50 border border-red-900 rounded-full flex items-center justify-center shrink-0">
                  <CheckCircle2 size={20} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-red-500 uppercase tracking-widest mb-1">
                    Forensic Decryption Result
                  </h3>
                  <p className="text-[10px] text-slate-500 uppercase font-mono tracking-widest">{result.status || "Leak Source Identified"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-mono text-xs text-slate-300">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Source IP Address</span>
                  <span className="text-white text-sm">{result.source_ip}</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Handler ID</span>
                  <span className="text-white text-sm">{result.handler_id}</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Handler Name</span>
                  <span className="text-white text-sm">{result.handler_name}</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Timestamp</span>
                  <span className="text-white text-sm">{result.timestamp}</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}