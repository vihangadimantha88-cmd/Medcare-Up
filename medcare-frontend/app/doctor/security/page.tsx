"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { 
  Stethoscope, LayoutDashboard, Users, ScrollText, UserCog, LogOut, 
  Activity, ShieldCheck, Lock, Smartphone, Mail, AlertTriangle, 
  CheckCircle2, Trash2, Monitor, Globe, KeyRound
} from "lucide-react";

export default function DoctorSecurityPage() {
  const router = useRouter();
  
  // 🟢 Loaders & Messages
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [sysMessage, setSysMessage] = useState({ text: "", type: "" });
  
  // 🟢 Profile States
  const [profile, setProfile] = useState<any>(null);
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const getPasswordStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 2) return { text: "WEAK", color: "bg-red-500", width: "w-1/4" };
    if (score === 3 || score === 4) return { text: "MODERATE", color: "bg-yellow-500", width: "w-2/4" };
    if (score === 5) return { text: "STRONG", color: "bg-cyan-500", width: "w-full" };
    return { text: "", color: "bg-slate-700", width: "w-0" };
  };

  // 🟢 Security States (Passwords)
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const strength = getPasswordStrength(newPassword);

  // 🟢 MFA States (Exactly like Patient Portal)
  const [mfaEmailEnabled, setMfaEmailEnabled] = useState(false);
  const [mfaAppEnabled, setMfaAppEnabled] = useState(false);
  const [qrUri, setQrUri] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [appVerifyCode, setAppVerifyCode] = useState("");
  const [setupStep, setSetupStep] = useState<"idle" | "qr" | "verifying">("idle");

  // 🟢 Audit States
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("medcare_token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchAllSecurityData(token);
  }, [router]);

  // 🚀 Deep Backend API Fetching
  const fetchAllSecurityData = async (token: string) => {
    setLoading(true);
    const config = { headers: { Authorization: `Bearer ${token}` } };
    
    try {
      const [profileRes, sessionsRes] = await Promise.all([
        axios.get("http://34.229.165.55:8000/doctor/profile", config),
        axios.get("http://34.229.165.55:8000/auth/sessions/me", config)
      ]);

      const profData = profileRes.data;
      setProfile(profData);
      setEditPhone(profData.contact_number || "");
      setEditEmail(profData.email || "");
      
      // Sync MFA States
      setMfaEmailEnabled(profData.mfa_email_enabled || false);
      setMfaAppEnabled(profData.mfa_app_enabled || false);

      setSessions(sessionsRes.data);
    } catch (err) {
      console.error("Failed to fetch security data", err);
      showToast("Unable to load security profile securely.", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (text: string, type: "success" | "error") => {
    setSysMessage({ text, type });
    setTimeout(() => setSysMessage({ text: "", type: "" }), 5000);
  };

  // 🚀 ACTION 1: Update Editable Profile Fields
  const handleProfileUpdate = async () => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("medcare_token");
      await axios.put("http://34.229.165.55:8000/doctors/me/profile/editable", {
        contact_number: editPhone,
        email: editEmail
      }, { headers: { Authorization: `Bearer ${token}` } });
      showToast("Contact details updated successfully.", "success");
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Update failed.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 🚀 ACTION 2: Change Password (Zero-Trust)
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match.", "error");
      return;
    }
    
    setActionLoading(true);
    try {
      const token = localStorage.getItem("medcare_token");
      await axios.put("http://34.229.165.55:8000/auth/security/change-password", {
        current_password: currentPassword,
        new_password: newPassword
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      showToast("Password updated. Other sessions revoked automatically.", "success");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      fetchAllSecurityData(token!); // Refresh sessions
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Password change failed.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 🚀 ACTION 3: Toggle Email MFA
  const handleToggleEmailMfa = async () => {
    setActionLoading(true);
    const newStatus = !mfaEmailEnabled;
    try {
      const token = localStorage.getItem("medcare_token");
      await axios.post(`http://34.229.165.55:8000/auth/mfa/toggle-email?enable=${newStatus}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMfaEmailEnabled(newStatus);
      showToast(`Email MFA has been ${newStatus ? 'Enabled' : 'Disabled'}`, "success");
    } catch (err: any) {
      showToast(err.response?.data?.detail || "MFA toggle failed.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 🚀 ACTION 4: Google Authenticator Logic (Brought from Patient Portal)
  const handleGenerateQr = async () => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("medcare_token");
      const response = await axios.post("http://34.229.165.55:8000/auth/mfa/setup-app", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTotpSecret(response.data.secret);
      setQrUri(response.data.qr_uri);
      setSetupStep("qr");
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to generate QR code.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyAppMfa = async () => {
    if (appVerifyCode.length !== 6) {
      showToast("Please enter a valid 6-digit code.", "error");
      return;
    }
    setActionLoading(true);
    try {
      const token = localStorage.getItem("medcare_token");
      await axios.post("http://34.229.165.55:8000/auth/mfa/verify-app", { app_code: appVerifyCode }, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      setMfaAppEnabled(true);
      setSetupStep("idle");
      setAppVerifyCode("");
      showToast("Google Authenticator successfully linked and enabled!", "success");
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Invalid code. Try again.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisableAppMfa = async () => {
    if (!window.confirm("Are you sure you want to disable Authenticator App security?")) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem("medcare_token");
      await axios.post("http://34.229.165.55:8000/auth/mfa/disable-app", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMfaAppEnabled(false);
      showToast("Google Authenticator disabled successfully.", "success");
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to disable App MFA.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 🚀 ACTION 5: Revoke Remote Sessions (Kill Switch)
  const handleRevokeSessions = async () => {
    if (!window.confirm("This will log out all other active devices immediately. Continue?")) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem("medcare_token");
      await axios.delete("http://34.229.165.55:8000/auth/sessions/revoke-others", {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast("All other remote sessions have been securely wiped.", "success");
      fetchAllSecurityData(token!); // Refresh sessions list
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to wipe remote sessions.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("medcare_token");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-sky-500/50">
        <Activity size={50} className="animate-pulse mb-4" />
        <p className="text-xs uppercase tracking-widest font-bold">Decrypting Security Clearance...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans overflow-hidden selection:bg-sky-500/30">
      
      {/* Toast Notification */}
      {sysMessage.text && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full text-xs font-bold tracking-widest uppercase shadow-2xl flex items-center gap-2 animate-fadeIn border ${
          sysMessage.type === "success" ? "bg-emerald-950/80 text-emerald-400 border-emerald-900/50" : "bg-red-950/80 text-red-400 border-red-900/50"
        }`}>
          {sysMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {sysMessage.text}
        </div>
      )}

      {/* 🟢 DOCTOR SIDEBAR */}
      <div className="w-72 bg-slate-950 border-r border-slate-800/60 flex flex-col justify-between hidden md:flex z-20 shadow-[4px_0_24px_rgba(0,0,0,0.4)]">
        <div>
          <div className="p-6 border-b border-slate-800/60 flex items-center gap-3 bg-slate-900/20">
            <Stethoscope className="w-10 h-10 text-sky-400 drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]" />
            <div>
              <h1 className="text-sm font-extrabold tracking-widest uppercase text-white leading-tight">MedCare<br/><span className="text-sky-400 text-[10px]">Clinical Workspace</span></h1>
            </div>
          </div>
          
          <div className="p-4 space-y-2 mt-4">
            <Link href="/doctor" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <LayoutDashboard size={18} /> The Clinical Hub
            </Link>
            <Link href="/doctor/queue" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <Users size={18} /> Today's Queue
            </Link>
            <Link href="/doctor/logs" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <ScrollText size={18} /> Activity Logs
            </Link>
            {/* Active Page */}
            <div className="w-full flex items-center gap-3 px-4 py-3 bg-sky-900/30 text-sky-400 border border-sky-500/30 rounded-xl text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(56,189,248,0.15)] transition-all">
              <UserCog size={18} /> Profile & Security
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-800/60 bg-slate-900/20">
          <button onClick={handleLogout} className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-900/50 text-slate-400 hover:text-red-400 rounded-xl text-xs font-bold tracking-widest uppercase transition-all">
            <LogOut size={16} /> Secure Logout
          </button>
        </div>
      </div>

      {/* 🟢 MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative bg-slate-950">
        <div className="absolute top-0 right-0 w-[800px] h-[500px] bg-sky-500/5 rounded-full blur-[150px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        
        <div className="p-8 md:p-10 max-w-6xl w-full mx-auto z-10">
          
          <div className="mb-8 border-b border-slate-800 pb-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-sky-900/20 border border-sky-900/50 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <h2 className="text-3xl font-light tracking-widest uppercase text-white mb-1">
                Profile & <span className="font-bold text-sky-400">Security</span>
              </h2>
              <p className="text-[10px] text-slate-400 tracking-widest uppercase font-mono">Account Integrity & Access Control</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-fadeIn">
            
            {/* 🔴 COLUMN 1: Profile & Password */}
            <div className="space-y-8">
              
              {/* Locked Identity */}
              <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-slate-800/50 px-4 py-1 rounded-bl-xl text-[9px] font-bold tracking-widest uppercase text-slate-500 flex items-center gap-1">
                  <Lock size={10} /> Locked by Admin
                </div>
                
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-slate-800 pb-3">
                  <UserCog size={14} className="text-sky-400" /> Professional Identity
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Full Name</label>
                    <input type="text" value={profile?.full_name} disabled className="w-full bg-slate-950/50 border border-slate-800/50 rounded-xl px-4 py-3 text-sm text-slate-500 cursor-not-allowed font-mono" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">SLMC Number</label>
                      <input type="text" value={profile?.slmc_number || "N/A"} disabled className="w-full bg-slate-950/50 border border-slate-800/50 rounded-xl px-4 py-3 text-sm text-slate-500 cursor-not-allowed font-mono" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Department</label>
                      <input type="text" value={profile?.specialization || "N/A"} disabled className="w-full bg-slate-950/50 border border-slate-800/50 rounded-xl px-4 py-3 text-sm text-slate-500 cursor-not-allowed font-mono" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Editable Contact Info */}
              <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Smartphone size={14} className="text-emerald-400" /> Editable Contact Info
                </h3>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Email Address</label>
                    <input 
                      type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors font-mono" 
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Mobile Number</label>
                    <input 
                      type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors font-mono" 
                    />
                  </div>
                </div>

                <button 
                  onClick={handleProfileUpdate} disabled={actionLoading}
                  className="w-full py-3 bg-emerald-900/30 hover:bg-emerald-800/50 border border-emerald-700 text-emerald-400 rounded-xl text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading ? <Activity size={14} className="animate-spin" /> : "Save Changes"}
                </button>
              </div>

              {/* Change Password */}
              <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-6 pb-4 border-b border-slate-800">
                  <KeyRound size={16} className="text-red-400" /> Change Password
                </h3>
                
                <form onSubmit={handlePasswordChange} className="space-y-5">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Current Password</label>
                    <input 
                      type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">New Secure Password</label>
                      <input 
                        type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 font-mono"
                      />
                      <div className="w-full h-1.5 bg-slate-800 rounded-full mt-3 mb-1"><div className={`h-full transition-all ${strength.width} ${strength.color}`} /></div>
                  <div className="flex justify-end h-4"><span className={`text-[10px] uppercase font-bold ${strength.color.replace('bg-', 'text-')}`}>{newPassword.length > 0 ? strength.text : ""}</span></div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Confirm New Password</label>
                      <input 
                        type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 font-mono"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit" disabled={actionLoading || !currentPassword || !newPassword}
                    className="w-full py-4 bg-red-950/40 hover:bg-red-900 border border-red-900 text-red-100 rounded-xl text-xs font-bold tracking-widest uppercase transition-all mt-4 disabled:opacity-50"
                  >
                    Update Password
                  </button>
                </form>
              </div>

            </div>

            {/* 🔴 COLUMN 2: MFA & Sessions (The EXACT Patient Components) */}
            <div className="space-y-8">
              
              {/* Multi-Factor Authentication (MFA) */}
              <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-6 pb-4 border-b border-slate-800">
                  <ShieldCheck size={16} className="text-sky-400" /> Multi-Factor Authentication
                </h3>

                {/* Email OTP Toggle */}
                <div className="flex items-center justify-between p-5 bg-slate-950 border border-slate-800 rounded-2xl mb-4">
                  <div className="flex items-center gap-3">
                    <Mail size={20} className={mfaEmailEnabled ? "text-emerald-400" : "text-slate-500"} />
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-widest">Email Validation</h4>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Receive OTPs to {editEmail || "your email"}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleToggleEmailMfa} disabled={actionLoading}
                    className={`w-12 h-6 rounded-full relative transition-colors ${mfaEmailEnabled ? "bg-emerald-500" : "bg-slate-700"}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${mfaEmailEnabled ? "left-7" : "left-1"}`}></div>
                  </button>
                </div>

                {/* Google Authenticator Setup */}
                <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Smartphone size={20} className={mfaAppEnabled ? "text-emerald-400" : "text-slate-500"} />
                      <h4 className="text-xs font-bold text-white uppercase tracking-widest">Authenticator App</h4>
                    </div>
                    {mfaAppEnabled && (
                      <span className="px-2 py-1 bg-emerald-950/50 text-emerald-400 border border-emerald-900 rounded text-[9px] font-bold uppercase tracking-widest">Active</span>
                    )}
                  </div>

                  {!mfaAppEnabled && setupStep === "idle" && (
                    <button 
                      onClick={handleGenerateQr} disabled={actionLoading}
                      className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-bold tracking-widest uppercase transition-colors"
                    >
                      Step 1: Generate QR Code
                    </button>
                  )}

                  {!mfaAppEnabled && setupStep === "qr" && (
                    <div className="flex flex-col items-center bg-white p-6 rounded-xl animate-fadeIn">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUri)}`} 
                        alt="QR Code" 
                        className="mb-4 w-40 h-40"
                      />
                      <p className="text-[10px] text-slate-800 font-bold mb-4 font-mono">Secret: {totpSecret}</p>
                      <input 
                        type="text" value={appVerifyCode} onChange={(e) => setAppVerifyCode(e.target.value)}
                        placeholder="Enter 6-digit code" maxLength={6}
                        className="w-full bg-slate-100 border border-slate-300 text-slate-900 rounded-lg px-4 py-3 text-center text-sm font-mono focus:outline-none focus:border-sky-500 mb-3 tracking-widest"
                      />
                      <div className="flex gap-2 w-full">
                        <button onClick={() => setSetupStep("idle")} className="flex-1 py-2.5 bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase">Cancel</button>
                        <button onClick={handleVerifyAppMfa} disabled={actionLoading || appVerifyCode.length !== 6} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold uppercase transition-colors">Verify Code</button>
                      </div>
                    </div>
                  )}

                  {mfaAppEnabled && (
                    <button 
                      onClick={handleDisableAppMfa} disabled={actionLoading}
                      className="w-full py-3 bg-red-950/30 hover:bg-red-900/50 border border-red-900/50 text-red-400 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-colors"
                    >
                      Disable Authenticator
                    </button>
                  )}
                </div>

                {!mfaEmailEnabled && !mfaAppEnabled && (
                  <div className="mt-4 p-4 border border-amber-900/50 bg-amber-950/20 rounded-xl flex items-start gap-3">
                    <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                    <p className="text-[9px] text-amber-200/80 font-bold uppercase tracking-widest leading-relaxed">
                      Your account is vulnerable. Enable 2FA to prevent unauthorized access.
                    </p>
                  </div>
                )}
              </div>

              {/* Active Sessions (Kill Switch) */}
              <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col max-h-[500px]">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800 shrink-0">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                    <Monitor size={14} className="text-sky-400" /> Active Devices
                  </h3>
                  <button 
                    onClick={handleRevokeSessions} disabled={actionLoading || sessions.length <= 1}
                    className="text-[9px] font-bold uppercase tracking-widest text-red-400 bg-red-950/30 hover:bg-red-900/50 px-3 py-1.5 rounded-lg border border-red-900/50 transition-colors flex items-center gap-1 disabled:opacity-30"
                  >
                    <Trash2 size={12}/> Kill Switch (Revoke All)
                  </button>
                </div>
                
                <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                  {sessions.length === 0 ? (
                    <p className="text-[10px] text-slate-500 font-mono uppercase text-center py-4">No active sessions found.</p>
                  ) : (
                    sessions.map((sess, i) => (
                      <div key={sess.id || i} className={`p-4 rounded-xl flex items-center justify-between border transition-all ${sess.is_current ? 'bg-sky-950/10 border-sky-900/30' : 'bg-slate-950 border-slate-800'}`}>
                        <div>
                          <p className="text-[11px] font-mono text-slate-300 flex items-center gap-2 mb-1.5">
                            {sess.ip_address}
                            {sess.is_current && <span className="bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest">Current Device</span>}
                          </p>
                          <p className="text-[9px] text-slate-500 uppercase tracking-widest">{sess.user_agent}</p>
                        </div>
                        <Globe size={16} className="text-slate-600" />
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}