"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ShieldAlert, Lock, CheckCircle2, AlertTriangle, ArrowRight, EyeOff, Eye, User } from "lucide-react";

export default function ForceChangePasswordPage() {
  const router = useRouter();
  
  // 🟢 No Hardcoded Values! (Universal States)
  const [username, setUsername] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Session එකේ token එකක් නැත්නම් කෙලින්ම ලොගින් එකට පන්නනවා
    const token = localStorage.getItem("medcare_token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 1. Frontend Security Validation
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please try again.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long for security reasons.");
      return;
    }
    if (tempPassword === newPassword) {
      setError("New password cannot be the same as the temporary password.");
      return;
    }

    setLoading(true);

    try {
      // 🚀 2. Backend API - ඔයාගේ ෆොටෝ එකේ තිබුණු Endpoint එක සහ Payload එක
      await axios.post("http://localhost:8000/auth/force-change-password", {
        username: username,
        temp_password: tempPassword,
        new_password: newPassword
      });

      // 3. සාර්ථක වූ පසු (Session Kill & Redirect)
      setSuccess(true);
      localStorage.removeItem("medcare_token"); // පරණ Token එක මකා දමයි
      
      setTimeout(() => {
        router.push("/login"); // අලුත් පාස්වර්ඩ් එකෙන් ලොග් වීමට යවයි
      }, 3000);

    } catch (err: any) {
      console.error("Password Change Error:", err);
      setError(err.response?.data?.detail || "Failed to update password. Check your temporary credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      
      {/* Background Warning Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-md border-2 border-amber-500/30 rounded-3xl p-8 md:p-10 shadow-[0_0_50px_rgba(245,158,11,0.1)] relative z-10">
        
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 bg-amber-950/50 border border-amber-900 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-amber-500 animate-pulse" />
          </div>
          <h1 className="text-xl font-black tracking-widest uppercase text-white mb-2">
            Security Checkpoint
          </h1>
          <p className="text-[10px] text-slate-400 tracking-widest uppercase font-mono leading-relaxed px-4">
            You are using a temporary password. You must set a new personal password to access the system.
          </p>
        </div>

        {success ? (
          <div className="text-center py-8 animate-fadeIn">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <p className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-2">Password Updated Securely</p>
            <p className="text-[10px] text-slate-500 font-mono">Session cleared. Redirecting you to the secure login portal...</p>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {error && (
              <div className="p-3 bg-red-950/50 border border-red-900 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-red-200 uppercase tracking-widest font-bold leading-relaxed">{error}</p>
              </div>
            )}

            {/* Username Field */}
            <div>
              <label className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2 ml-1 flex items-center gap-2">
                <User className="w-3 h-3" /> Employee ID (Username)
              </label>
              <input 
                type="text" 
                required 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors font-mono" 
                placeholder="e.g. DOC-2026-089"
              />
            </div>

            {/* Current/Temp Password Field */}
            <div>
              <label className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2 ml-1 flex items-center gap-2">
                <Lock className="w-3 h-3" /> Temporary Password
              </label>
              <input 
                type="password" 
                required 
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-amber-400 focus:outline-none focus:border-amber-500 transition-colors font-mono" 
                placeholder="Enter current temp password"
              />
            </div>

            {/* New Password Field */}
            <div className="pt-2 border-t border-slate-800">
              <label className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2 ml-1 flex items-center gap-2">
                <Lock className="w-3 h-3 text-emerald-500" /> New Password
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 pr-10 text-sm text-emerald-400 focus:outline-none focus:border-emerald-500 transition-colors font-mono" 
                  placeholder="Enter a strong password"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-emerald-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password Field */}
            <div>
              <label className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2 ml-1 flex items-center gap-2">
                <Lock className="w-3 h-3 text-emerald-500" /> Confirm New Password
              </label>
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-emerald-400 focus:outline-none focus:border-emerald-500 transition-colors font-mono" 
                placeholder="Re-enter your new password"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 mt-2 bg-amber-600 hover:bg-amber-500 border border-amber-500 text-slate-950 rounded-xl text-xs font-black tracking-widest uppercase transition-all flex justify-center items-center gap-3 shadow-[0_0_20px_rgba(245,158,11,0.2)] disabled:opacity-50"
            >
              {loading ? "Updating Security Clearance..." : "Set Password & Proceed"} <ArrowRight className="w-4 h-4" />
            </button>

          </form>
        )}
      </div>
    </div>
  );
}