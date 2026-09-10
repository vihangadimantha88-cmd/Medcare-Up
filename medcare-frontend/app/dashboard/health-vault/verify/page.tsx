"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { 
  ShieldCheck, Home, LogOut, Activity, ArrowLeft, 
  UploadCloud, FileImage, Server, CheckCircle, XCircle, ShieldAlert, Fingerprint, FileCheck,
  CreditCard, Lock, User
} from "lucide-react";

export default function ReportVerificationPage() {
  const router = useRouter();
  
  // File Upload States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Verification Process States
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<"valid" | "invalid" | null>(null);
  const [reportDetails, setReportDetails] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState("");
  
  // Sidebar Dynamic User State
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

  // Handle File Selection with STRICT .PNG Validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      if (file.type !== "image/png" && !file.name.toLowerCase().endsWith('.png')) {
        setErrorMessage("Invalid file format. Strictly ONLY .PNG files are supported for SHA-256 cryptographic verification.");
        setVerificationResult("invalid");
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
      setVerificationResult(null); 
      setErrorMessage("");
    }
  };

  
  const handleVerifyReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setLoading(true);
    setVerificationResult(null);
    setReportDetails(null);
    setErrorMessage("");

    try {
      const token = localStorage.getItem("medcare_token");
      
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await axios.post("http://34.229.165.55:8000/patients/verify-report", formData, {
        headers: { 
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}` 
        }
      });

      
      setVerificationResult("valid");
      setReportDetails(response.data);

    } catch (err: any) {
      console.error("Verification failed", err);
      setVerificationResult("invalid");
      
      
      if (err.response?.status === 406) {
        setErrorMessage("🔴 WARNING: This report has been altered!");
      } else {
        setErrorMessage(err.response?.data?.detail || "Verification failed due to a network error.");
      }
    } finally {
      
      setLoading(false); 
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("medcare_token");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans overflow-hidden">
      
      {/* 🟢 FIXED PATIENT SIDEBAR (Unified with Health Vault) */}
      <div className="w-64 bg-slate-950 border-r border-slate-800/60 hidden md:flex flex-col justify-between z-20 shadow-[4px_0_24px_rgba(0,0,0,0.4)]">
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
            
            <Link href="/dashboard/health-vault" className="w-full flex items-center gap-3 px-4 py-3 bg-cyan-900/30 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all">
              <Activity size={18} /> My Health Vault
            </Link>

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

      {/* 🟢 MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto p-8 md:p-12 max-w-4xl mx-auto relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none"></div>

        <Link href="/dashboard/health-vault" className="inline-flex items-center gap-2 text-slate-500 hover:text-cyan-400 mb-6 text-[10px] font-bold uppercase tracking-widest z-10">
          <ArrowLeft size={14} /> Back to Health Vault
        </Link>

        <div className="mb-10 flex items-center gap-4 z-10">
          <div className="w-12 h-12 bg-purple-900/20 border border-purple-900/50 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-3xl font-light tracking-widest uppercase text-white mb-1">
              Report <span className="font-bold text-purple-400">Verification</span>
            </h2>
            <p className="text-xs text-slate-500 tracking-widest uppercase">SHA-256 Cryptographic Authenticity Check</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 z-10">
          
          {/* 📝 STRICT .PNG FILE UPLOAD FORM */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl h-fit">
            <div className="flex items-center gap-2 text-slate-400 mb-6 pb-4 border-b border-slate-800">
              <UploadCloud size={16} className="text-purple-400" />
              <h3 className="text-xs font-bold uppercase tracking-widest">Upload Original .PNG</h3>
            </div>
            
            <form onSubmit={handleVerifyReport} className="space-y-6">
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${selectedFile ? "border-purple-500 bg-purple-950/20" : "border-slate-700 bg-slate-950 hover:border-slate-500 hover:bg-slate-900"}`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".png, image/png" 
                  className="hidden" 
                />
                
                {selectedFile ? (
                  <>
                    <FileImage size={40} className="text-purple-400 mb-3" />
                    <p className="text-sm font-bold text-white mb-1">{selectedFile.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                  </>
                ) : (
                  <>
                    <UploadCloud size={40} className="text-slate-600 mb-3" />
                    <p className="text-sm font-bold text-slate-300 mb-1">Click to browse or drag file</p>
                    <p className="text-[10px] text-red-400/80 font-bold uppercase tracking-widest mt-1">Supports ONLY .PNG files</p>
                  </>
                )}
              </div>

              <button 
                type="submit" 
                disabled={loading || !selectedFile}
                className="w-full py-4 bg-purple-900/50 hover:bg-purple-800 border border-purple-700 text-purple-100 rounded-xl text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(168,85,247,0.2)] disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {loading ? (
                  <><Server size={16} className="animate-pulse" /> Verifying SHA-256...</>
                ) : (
                  <><FileCheck size={16} /> Verify File Authenticity</>
                )}
              </button>
            </form>
          </div>

          {/* 🛡️ VERIFICATION RESULT AREA */}
          <div className="flex flex-col">
            {!verificationResult && !loading && (
              <div className="flex-1 border border-dashed border-slate-800 rounded-3xl bg-slate-900/30 flex flex-col items-center justify-center p-8 text-center">
                <Fingerprint size={48} className="text-slate-700 mb-4" />
                <p className="text-xs text-slate-500 tracking-widest uppercase leading-relaxed">
                  Upload the original .PNG report file to calculate its SHA-256 hash and verify its integrity against the MedCare backend database.
                </p>
              </div>
            )}

            {loading && (
              <div className="flex-1 border border-purple-900/30 rounded-3xl bg-purple-950/10 flex flex-col items-center justify-center p-8 text-center animate-pulse">
                <Fingerprint size={48} className="text-purple-500/50 mb-4" />
                <p className="text-xs text-purple-400 tracking-widest uppercase">Cross-checking Cryptographic Hash...</p>
              </div>
            )}

            {/* ✅ VALID REPORT */}
            {verificationResult === "valid" && reportDetails && (
              <div className="flex-1 bg-emerald-950/20 border border-emerald-900/50 rounded-3xl p-8 shadow-[0_0_30px_rgba(16,185,129,0.1)] animate-fadeIn">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-emerald-900/50 flex items-center justify-center">
                    <CheckCircle size={24} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-emerald-400 uppercase tracking-widest">Report Verified</h3>
                    <p className="text-[10px] text-emerald-500 uppercase tracking-widest">SHA-256 Hash Match Confirmed</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/50">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Report Identity</span>
                    <p className="text-sm text-white font-bold">{reportDetails.test_name || "Verified Document"}</p>
                  </div>
                  
                  <div className="bg-emerald-950/30 rounded-xl p-4 border border-emerald-900/50 mt-2">
                     <p className="text-[10px] text-emerald-300 leading-relaxed text-center font-medium">
                       The uploaded .PNG file is 100% authentic. Its cryptographic hash exactly matches the original record generated by the MedCare laboratory.
                     </p>
                  </div>
                </div>
              </div>
            )}

            {/* ❌ INVALID REPORT */}
            {verificationResult === "invalid" && (
              <div className="flex-1 bg-red-950/20 border border-red-900/50 rounded-3xl p-8 shadow-[0_0_30px_rgba(239,68,68,0.1)] animate-fadeIn">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center">
                    <XCircle size={24} className="text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-red-400 uppercase tracking-widest">Verification Failed</h3>
                    <p className="text-[10px] text-red-500 uppercase tracking-widest">Invalid Hash / Unverified Format</p>
                  </div>
                </div>

                <div className="bg-red-950/40 rounded-xl p-6 border border-red-900/60 flex flex-col items-center text-center">
                  <ShieldAlert size={40} className="text-red-500 mb-4" />
                  <span className="text-[10px] text-red-400 uppercase tracking-widest font-bold block mb-2">Critical Security Alert</span>
                  <p className="text-xs text-red-200 leading-relaxed font-medium">
                    {errorMessage}
                  </p>
                  <div className="mt-6 w-full p-3 bg-red-950 rounded-lg text-[9px] text-red-500 font-mono text-left break-all">
                    ERR_CODE: CRYPTOGRAPHIC_SECURITY_ALERT<br/>
                    FILE: {selectedFile?.name || "Invalid File Input"}<br/>
                    ACTION: REPORT_FLAGGED_AS_UNVERIFIED
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}