"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { 
  ShieldCheck, Lock, ArrowLeft, Smartphone, Mail, 
  KeyRound, Laptop, Activity, AlertTriangle, CheckCircle2, Trash2,
  Home, CreditCard, LogOut, User
} from "lucide-react";

export default function DeviceAuthPage() {
  const router = useRouter();

  // Loaders & Messages
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // User Profile States
  const [patientName, setPatientName] = useState("Patient");
  const [email, setEmail] = useState("");
  const [emailMfaEnabled, setEmailMfaEnabled] = useState(false);
  const [appMfaEnabled, setAppMfaEnabled] = useState(false);

  // App Authenticator States
  const [qrUri, setQrUri] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [appVerifyCode, setAppVerifyCode] = useState("");
  const [setupStep, setSetupStep] = useState<"idle" | "qr" | "verifying">("idle");

  // Password States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Session States
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("medcare_token");
    if (!token) { router.push("/login"); return; }
    fetchInitialData(token);
  }, [router]);

  const fetchInitialData = async (token: string) => {
    try {
      // 1. Fetch Profile for MFA Status & Sidebar Name
      const profileRes = await axios.get("http://localhost:8000/patients/me/profile", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatientName(profileRes.data.first_name || "Patient");
      setEmail(profileRes.data.email);
      setEmailMfaEnabled(profileRes.data.mfa_email_enabled);
      setAppMfaEnabled(profileRes.data.mfa_app_enabled);

      // 2. Fetch Active Sessions
      const sessionsRes = await axios.get("http://localhost:8000/auth/sessions/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(sessionsRes.data);

    } catch (err) {
      console.error("Failed to fetch initial data", err);
      showMessage("Failed to load security data.", "error");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  };

  const handleLogout = () => { 
    localStorage.removeItem("medcare_token"); 
    router.push("/login"); 
  };

  // 🚀 1. EMAIL MFA TOGGLE
  const handleToggleEmailMfa = async () => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("medcare_token");
      const newState = !emailMfaEnabled;
      await axios.post(`http://localhost:8000/auth/mfa/toggle-email?enable=${newState}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmailMfaEnabled(newState);
      showMessage(`Email MFA has been ${newState ? 'enabled' : 'disabled'}.`, "success");
    } catch (err: any) {
      showMessage(err.response?.data?.detail || "Failed to toggle Email MFA.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 🚀 2. GOOGLE AUTHENTICATOR LOGIC
  const handleGenerateQr = async () => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("medcare_token");
      const response = await axios.post("http://localhost:8000/auth/mfa/setup-app", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTotpSecret(response.data.secret);
      setQrUri(response.data.qr_uri);
      setSetupStep("qr");
    } catch (err: any) {
      showMessage(err.response?.data?.detail || "Failed to generate QR code.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyAppMfa = async () => {
    if (appVerifyCode.length !== 6) {
      showMessage("Please enter a valid 6-digit code.", "error");
      return;
    }
    setActionLoading(true);
    try {
      const token = localStorage.getItem("medcare_token");
      await axios.post("http://localhost:8000/auth/mfa/verify-app", 
      { app_code: appVerifyCode }, 
      { headers: { Authorization: `Bearer ${token}` } });
      
      setAppMfaEnabled(true);
      setSetupStep("idle");
      setAppVerifyCode("");
      showMessage("Google Authenticator successfully linked and enabled!", "success");
    } catch (err: any) {
      showMessage(err.response?.data?.detail || "Invalid code. Try again.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisableAppMfa = async () => {
    if (!window.confirm("Are you sure you want to disable Authenticator App security?")) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem("medcare_token");
      await axios.post("http://localhost:8000/auth/mfa/disable-app", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAppMfaEnabled(false);
      showMessage("Google Authenticator disabled successfully.", "success");
    } catch (err: any) {
      showMessage(err.response?.data?.detail || "Failed to disable App MFA.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 🚀 3. PASSWORD CHANGE
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showMessage("New passwords do not match!", "error");
      return;
    }
    setActionLoading(true);
    try {
      const token = localStorage.getItem("medcare_token");
      await axios.put("http://localhost:8000/auth/security/change-password", {
        current_password: currentPassword,
        new_password: newPassword
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      showMessage("Password changed successfully. Other devices logged out.", "success");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      fetchInitialData(token as string); // Refresh sessions list
    } catch (err: any) {
      showMessage(err.response?.data?.detail || "Failed to change password.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 🚀 4. REVOKE SESSIONS
  const handleRevokeOthers = async () => {
    if (!window.confirm("This will log you out from all other devices. Continue?")) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem("medcare_token");
      await axios.delete("http://localhost:8000/auth/sessions/revoke-others", {
        headers: { Authorization: `Bearer ${token}` }
      });
      showMessage("All other sessions revoked successfully.", "success");
      fetchInitialData(token as string);
    } catch (err: any) {
      showMessage(err.response?.data?.detail || "Failed to revoke sessions.", "error");
    } finally {
      setActionLoading(false);
    }
  };

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
            <Link href="/dashboard/billing" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50"><CreditCard size={18} /> Billing</Link>
            
            {/* Active Page (Security Context) */}
            <div className="w-full flex items-center gap-3 px-4 py-3 bg-cyan-900/30 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all">
              <Lock size={18} /> Security & Privacy
            </div>
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
      <div className="flex-1 flex flex-col h-screen overflow-y-auto p-8 md:p-12 max-w-6xl mx-auto relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-500/5 rounded-full blur-[120px] pointer-events-none"></div>

        <Link href="/dashboard/security" className="inline-flex items-center gap-2 text-slate-500 hover:text-rose-400 mb-6 text-[10px] font-bold uppercase tracking-widest z-10 transition-colors">
          <ArrowLeft size={14} /> Back to Security Hub
        </Link>

        <div className="mb-8 flex items-center gap-4 z-10">
          <div className="w-12 h-12 bg-rose-900/20 border border-rose-900/50 rounded-xl flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <h2 className="text-3xl font-light tracking-widest uppercase text-white mb-1">
              Device & <span className="font-bold text-rose-400">Auth</span>
            </h2>
            <p className="text-xs text-slate-500 tracking-widest uppercase">Secure your account with passwords and 2FA</p>
          </div>
        </div>

        {/* Global Notifications */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 z-10 animate-fadeIn ${message.type === "success" ? "bg-emerald-950/40 border-emerald-900/50 text-emerald-400" : "bg-red-950/40 border-red-900/50 text-red-400"}`}>
            {message.type === "success" ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <AlertTriangle size={18} className="shrink-0 mt-0.5" />}
            <p className="text-xs font-medium uppercase tracking-widest leading-relaxed">{message.text}</p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 z-10">
            <Activity size={40} className="animate-pulse mb-4 opacity-50 text-rose-400/50" />
            <p className="text-xs uppercase tracking-widest">Loading security configurations...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 z-10">
            
            {/* 🛑 LEFT COLUMN: PASSWORD */}
            <div className="space-y-8">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                <h3 className="text-sm font-bold text-rose-400 uppercase tracking-widest flex items-center gap-2 mb-6 pb-4 border-b border-slate-800">
                  <KeyRound size={16} /> Change Password
                </h3>
                
                <form onSubmit={handleChangePassword} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Current Password</label>
                    <input 
                      type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">New Secure Password</label>
                    <input 
                      type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Confirm New Password</label>
                    <input 
                      type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                  <button 
                    type="submit" disabled={actionLoading || !currentPassword || !newPassword}
                    className="w-full py-4 bg-rose-950/40 hover:bg-rose-900 border border-rose-900 text-rose-100 rounded-xl text-xs font-bold tracking-widest uppercase transition-all mt-4 disabled:opacity-50"
                  >
                    Update Password
                  </button>
                </form>
              </div>
            </div>

            {/* 🛑 RIGHT COLUMN: MFA & SESSIONS */}
            <div className="space-y-8">
              
              {/* MFA CARD */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                <h3 className="text-sm font-bold text-rose-400 uppercase tracking-widest flex items-center gap-2 mb-6 pb-4 border-b border-slate-800">
                  <ShieldCheck size={16} /> Multi-Factor Authentication
                </h3>

                {/* 1. Email OTP Toggle */}
                <div className="flex items-center justify-between p-5 bg-slate-950 border border-slate-800 rounded-2xl mb-4">
                  <div className="flex items-center gap-3">
                    <Mail size={20} className={emailMfaEnabled ? "text-emerald-400" : "text-slate-500"} />
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-widest">Email Validation</h4>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Receive OTPs to {email}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleToggleEmailMfa} disabled={actionLoading}
                    className={`w-12 h-6 rounded-full relative transition-colors ${emailMfaEnabled ? "bg-emerald-500" : "bg-slate-700"}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${emailMfaEnabled ? "left-7" : "left-1"}`}></div>
                  </button>
                </div>

                {/* 2. Google Authenticator */}
                <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Smartphone size={20} className={appMfaEnabled ? "text-emerald-400" : "text-slate-500"} />
                      <h4 className="text-xs font-bold text-white uppercase tracking-widest">Authenticator App</h4>
                    </div>
                    {appMfaEnabled && (
                      <span className="px-2 py-1 bg-emerald-950/50 text-emerald-400 border border-emerald-900 rounded text-[9px] font-bold uppercase tracking-widest">Active</span>
                    )}
                  </div>

                  {!appMfaEnabled && setupStep === "idle" && (
                    <button 
                      onClick={handleGenerateQr} disabled={actionLoading}
                      className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-bold tracking-widest uppercase transition-colors"
                    >
                      Step 1: Generate QR Code
                    </button>
                  )}

                  {!appMfaEnabled && setupStep === "qr" && (
                    <div className="flex flex-col items-center bg-white p-4 rounded-xl animate-fadeIn">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUri)}`} 
                        alt="QR Code" 
                        className="mb-4"
                      />
                      <p className="text-[10px] text-slate-800 font-bold mb-2">Secret: {totpSecret}</p>
                      <input 
                        type="text" value={appVerifyCode} onChange={(e) => setAppVerifyCode(e.target.value)}
                        placeholder="Enter 6-digit code" maxLength={6}
                        className="w-full bg-slate-100 border border-slate-300 text-slate-900 rounded-lg px-4 py-2 text-center text-sm font-mono focus:outline-none focus:border-indigo-500 mb-2"
                      />
                      <div className="flex gap-2 w-full">
                        <button onClick={() => setSetupStep("idle")} className="flex-1 py-2 bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase">Cancel</button>
                        <button onClick={handleVerifyAppMfa} disabled={actionLoading || appVerifyCode.length !== 6} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-bold uppercase">Verify Code</button>
                      </div>
                    </div>
                  )}

                  {appMfaEnabled && (
                    <button 
                      onClick={handleDisableAppMfa} disabled={actionLoading}
                      className="w-full py-3 bg-red-950/30 hover:bg-red-900/50 border border-red-900/50 text-red-400 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-colors"
                    >
                      Disable Authenticator
                    </button>
                  )}
                </div>

                {!emailMfaEnabled && !appMfaEnabled && (
                  <div className="mt-4 p-4 border border-amber-900/50 bg-amber-950/20 rounded-xl flex items-start gap-3">
                    <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                    <p className="text-[9px] text-amber-200/80 font-bold uppercase tracking-widest leading-relaxed">
                      Your account is vulnerable. Enable 2FA to prevent unauthorized access.
                    </p>
                  </div>
                )}
              </div>

              {/* SESSIONS CARD */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-rose-400 uppercase tracking-widest flex items-center gap-2">
                    <Laptop size={16} /> Active Sessions
                  </h3>
                  <button 
                    onClick={handleRevokeOthers} disabled={actionLoading || sessions.length <= 1}
                    className="text-[9px] font-bold uppercase tracking-widest text-red-400 bg-red-950/30 hover:bg-red-900/50 px-3 py-1.5 rounded-lg border border-red-900/50 transition-colors flex items-center gap-1 disabled:opacity-30"
                  >
                    <Trash2 size={12}/> Revoke All Others
                  </button>
                </div>
                
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {sessions.map((session, idx) => (
                    <div key={idx} className={`p-4 rounded-xl border ${session.is_current ? "bg-rose-950/10 border-rose-900/30" : "bg-slate-950 border-slate-800"}`}>
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-xs font-bold text-white font-mono">{session.ip_address}</p>
                        {session.is_current && <span className="text-[9px] text-rose-400 font-bold uppercase tracking-widest">Current Session</span>}
                      </div>
                      <p className="text-[9px] text-slate-500 font-mono truncate">{session.user_agent}</p>
                      <p className="text-[9px] text-slate-600 uppercase tracking-widest mt-2">Started: {new Date(session.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}