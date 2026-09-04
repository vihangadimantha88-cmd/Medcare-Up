"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { ShieldCheck, Lock, User, Eye, EyeOff, Activity, Mail, Smartphone, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  
  // Basic Login States
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🚀 MFA States
  const [isMfaStep, setIsMfaStep] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [appTotp, setAppTotp] = useState("");
  const [mfaMessage, setMfaMessage] = useState("");

  // 1. Initial Login Handler
  const handleInitialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      const response = await axios.post("http://localhost:8000/login", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      // 🛑 MFA Required! Switch UI to OTP mode
      if (response.data.mfa_required) {
        setIsMfaStep(true);
        setTempToken(response.data.temp_token);
        setMfaMessage(response.data.message);
        setLoading(false);
        return;
      }

      // Normal Login (No MFA)
      processSuccessfulLogin(response.data);

    } catch (err: any) {
      console.error("Login Error:", err);
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Network error. Unable to reach MedCare servers.");
      }
      setLoading(false);
    }
  };

  // 2. MFA Verification Handler
  const handleMfaVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await axios.post("http://localhost:8000/login/mfa", {
        temp_token: tempToken,
        email_otp: emailOtp || undefined,
        app_totp: appTotp || undefined
      });

      processSuccessfulLogin(response.data);

    } catch (err: any) {
      console.error("MFA Error:", err);
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Verification failed. Please try again.");
      }
      setLoading(false);
    }
  };

  // 3. Smart Redirection Logic (Unified)
  const processSuccessfulLogin = (data: any) => {
    const { access_token, is_first_login, role } = data;
    localStorage.setItem("medcare_token", access_token);

    if (role === "Admin") {
      router.push("/admin");
    } else if (role === "Doctor") {
      if (is_first_login) router.push("/force-change-password");
      else router.push("/doctor");
    } else if (role === "Lab Technician") {
      if (is_first_login) router.push("/force-change-password");
      else router.push("/lab-tech");
    } else {
      // Patient
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-cyan-500/30">
      
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Top Left Link */}
      <Link href="/" className="absolute top-8 left-8 inline-flex items-center gap-2 text-slate-500 hover:text-cyan-400 text-xs font-bold uppercase tracking-widest transition-colors z-20">
        <ArrowLeft size={14} /> Return to Home
      </Link>

      <div className="w-full max-w-md p-8 relative z-10">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-[2rem] p-10 shadow-2xl">
          
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center mb-6 relative group">
              <div className="absolute inset-0 bg-cyan-500/20 rounded-2xl blur-lg group-hover:bg-cyan-500/30 transition-all"></div>
              <ShieldCheck className="w-8 h-8 text-cyan-400 relative z-10" />
            </div>
            <h1 className="text-2xl font-light tracking-widest uppercase text-white mb-2">
              System <span className="font-bold text-cyan-400">Login</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
              {isMfaStep ? "2-Step Verification Required" : "Zero-Trust Authentication"}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-950/30 border border-red-900/50 rounded-xl flex items-start gap-3 animate-fadeIn">
              <Activity className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-red-200 leading-relaxed uppercase tracking-widest">{error}</p>
            </div>
          )}

          {/* 🟢 MFA STEP UI */}
          {isMfaStep ? (
            <form onSubmit={handleMfaVerification} className="space-y-6 animate-fadeIn">
              <div className="p-4 bg-cyan-950/20 border border-cyan-900/50 rounded-xl mb-6 text-center">
                <p className="text-xs text-cyan-400 leading-relaxed">{mfaMessage}</p>
              </div>

              <div className="space-y-4">
                {/* Email OTP Field */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Mail size={12} /> Email OTP Code (If Enabled)
                  </label>
                  <input
                    type="text"
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value)}
                    placeholder="6-digit code from email"
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono tracking-widest text-center"
                    maxLength={6}
                  />
                </div>

                {/* Google Auth Field */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Smartphone size={12} /> Authenticator App Code (If Enabled)
                  </label>
                  <input
                    type="text"
                    value={appTotp}
                    onChange={(e) => setAppTotp(e.target.value)}
                    placeholder="6-digit TOTP code"
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono tracking-widest text-center"
                    maxLength={6}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || (!emailOtp && !appTotp)}
                className="w-full py-4 bg-cyan-950/50 hover:bg-cyan-900 border border-cyan-800 text-cyan-400 rounded-xl text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(6,182,212,0.1)] disabled:opacity-50 mt-4"
              >
                {loading ? "Verifying..." : "Verify & Login"}
              </button>
              
              <button 
                type="button" 
                onClick={() => { setIsMfaStep(false); setError(""); setTempToken(""); }}
                className="w-full text-[10px] text-slate-500 hover:text-white uppercase tracking-widest mt-4 transition-colors"
              >
                Cancel & Return
              </button>
            </form>
          ) : (
            
            /* 🟢 STANDARD LOGIN UI */
            <form onSubmit={handleInitialLogin} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <User size={12} /> Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Lock size={12} /> Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-slate-800 hover:bg-cyan-900 border border-slate-700 hover:border-cyan-800 text-white hover:text-cyan-400 rounded-xl text-xs font-bold tracking-widest uppercase transition-all shadow-lg disabled:opacity-50"
              >
                {loading ? "Authenticating..." : "Authenticate"}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}