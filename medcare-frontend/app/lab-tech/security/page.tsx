"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { 
  FlaskConical, LayoutDashboard, ScrollText, UserCog, LogOut, 
  Activity, ShieldCheck, Lock, Smartphone, AlertTriangle, 
  CheckCircle2, Trash2, Monitor, Globe, Mail, SmartphoneNfc, QrCode
} from "lucide-react";

export default function LabTechSecurityPage() {
  const router = useRouter();
  
  // 🟢 States
  const [loading, setLoading] = useState(true);
  const [sysMessage, setSysMessage] = useState({ text: "", type: "" });
  
  // Profile States
  const [profile, setProfile] = useState<any>(null);
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

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

  // Password States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
   const strength = getPasswordStrength(newPassword);

  // MFA States
  const [mfaEmailEnabled, setMfaEmailEnabled] = useState(false);
  const [mfaAppEnabled, setMfaAppEnabled] = useState(false);
  const [togglingMfa, setTogglingMfa] = useState(false);
  
  // Google Authenticator Setup States
  const [setupStep, setSetupStep] = useState(0); // 0 = Not setting up, 1 = Show QR & Enter Code
  const [qrCodeUri, setQrCodeUri] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verifyingApp, setVerifyingApp] = useState(false);

  // Session States
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("medcare_token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchAllSecurityData(token);
  }, [router]);

  // 🚀 FETCH ALL SECURITY DATA
  const fetchAllSecurityData = async (token: string) => {
    setLoading(true);
    const config = { headers: { Authorization: `Bearer ${token}` } };
    
    try {
      const [profileRes, sessionsRes] = await Promise.all([
        axios.get("http://34.229.165.55:8000/lab-tech/profile", config),
        axios.get("http://34.229.165.55:8000/auth/sessions/me", config)
      ]);

      const profData = profileRes.data;
      setProfile(profData);
      setEditPhone(profData.contact_number || "");
      setEditEmail(profData.email || "");
      
      
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

  // 🚀 ACTION: Update Profile
  const handleProfileUpdate = async () => {
    setSavingProfile(true);
    try {
      const token = localStorage.getItem("medcare_token");
      if (!token) return;
      await axios.put("http://34.229.165.55:8000/lab-tech/me/profile/editable", {
        contact_number: editPhone,
        email: editEmail
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      showToast("Contact details updated successfully.", "success");
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Update failed.", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  // 🚀 ACTION: Change Password
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match.", "error");
      return;
    }
    setSavingPassword(true);
    try {
      const token = localStorage.getItem("medcare_token");
      if (!token) return;
      await axios.put("http://34.229.165.55:8000/auth/security/change-password", {
        current_password: currentPassword,
        new_password: newPassword
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      showToast("Password updated. Other sessions revoked automatically.", "success");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      fetchAllSecurityData(token); 
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Password change failed.", "error");
    } finally {
      setSavingPassword(false);
    }
  };

  // 🚀 ACTION: Toggle Email MFA
  const handleEmailMfaToggle = async () => {
    setTogglingMfa(true);
    const newStatus = !mfaEmailEnabled;
    try {
      const token = localStorage.getItem("medcare_token");
      if (!token) return;
      await axios.post(`http://34.229.165.55:8000/auth/mfa/toggle-email?enable=${newStatus}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMfaEmailEnabled(newStatus);
      showToast(`Email MFA has been ${newStatus ? 'Enabled' : 'Disabled'}`, "success");
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Email MFA toggle failed.", "error");
    } finally {
      setTogglingMfa(false);
    }
  };

  // 🚀 ACTION: Setup Google Authenticator
  const handleSetupAppMfa = async () => {
    try {
      const token = localStorage.getItem("medcare_token");
      if (!token) return;
      const res = await axios.post("http://34.229.165.55:8000/auth/mfa/setup-app", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQrCodeUri(res.data.qr_uri);
      setMfaSecret(res.data.secret);
      setSetupStep(1);
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to initiate MFA setup.", "error");
    }
  };

  // 🚀 ACTION: Verify Google Authenticator
  const handleVerifyAppMfa = async () => {
    if (verificationCode.length !== 6) {
      showToast("Please enter a valid 6-digit code.", "error");
      return;
    }
    setVerifyingApp(true);
    try {
      const token = localStorage.getItem("medcare_token");
      if (!token) return;
      await axios.post("http://34.229.165.55:8000/auth/mfa/verify-app", { app_code: verificationCode }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMfaAppEnabled(true);
      setSetupStep(0);
      setVerificationCode("");
      showToast("Authenticator App successfully enabled!", "success");
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Invalid verification code.", "error");
    } finally {
      setVerifyingApp(false);
    }
  };

  // 🚀 ACTION: Disable Google Authenticator
  const handleDisableAppMfa = async () => {
    if (!confirm("Are you sure you want to disable Authenticator App security?")) return;
    try {
      const token = localStorage.getItem("medcare_token");
      if (!token) return;
      await axios.post("http://34.229.165.55:8000/auth/mfa/disable-app", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMfaAppEnabled(false);
      showToast("Authenticator App security disabled.", "success");
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to disable Authenticator.", "error");
    }
  };

  // 🚀 ACTION: Revoke Remote Sessions (Kill Switch)
  const handleRevokeSessions = async () => {
    if (!confirm("Are you sure? This will log out all other active devices immediately.")) return;
    try {
      const token = localStorage.getItem("medcare_token");
      if (!token) return;
      await axios.delete("http://34.229.165.55:8000/auth/sessions/revoke-others", {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast("All other remote sessions have been securely wiped.", "success");
      fetchAllSecurityData(token); 
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to wipe remote sessions.", "error");
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

  const isVulnerable = !mfaEmailEnabled && !mfaAppEnabled;

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

      {/* 🟢 LAB TECH SIDEBAR */}
      <div className="w-72 bg-slate-950 border-r border-slate-800/60 hidden md:flex flex-col justify-between z-20 shadow-[4px_0_24px_rgba(0,0,0,0.4)]">
        <div>
          <div className="p-6 border-b border-slate-800/60 flex items-center gap-3 bg-slate-900/20">
            <FlaskConical className="w-10 h-10 text-sky-400 drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]" />
            <div>
              <h1 className="text-sm font-extrabold tracking-widest uppercase text-white leading-tight">MedCare<br/><span className="text-sky-400 text-[10px]">Lab Terminal</span></h1>
            </div>
          </div>
          
          <div className="p-4 space-y-2 mt-4">
            <Link href="/lab-tech" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <LayoutDashboard size={18} /> The Lab Hub
            </Link>
            <Link href="/lab-tech/analytics" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <Activity size={18} /> Efficiency Matrix
            </Link>
            <Link href="/lab-tech/logs" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
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
        <div className="absolute top-0 right-0 w-200 h-125 bg-sky-500/5 rounded-full blur-[150px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[length:24px_24px] bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] pointer-events-none"></div>
        
        <div className="p-8 md:p-10 max-w-6xl w-full mx-auto z-10">
          
          <div className="mb-8 border-b border-slate-800 pb-6">
            <h2 className="text-3xl font-light tracking-widest uppercase text-white mb-1">
              Profile & <span className="font-bold text-sky-400">Security</span>
            </h2>
            <p className="text-[10px] text-slate-400 tracking-widest uppercase font-mono">Forensic Identity & Access Control</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn pb-12">
            
            {/* 🔴 COLUMN 1: Profile, Identity & Password */}
            <div className="space-y-8">
              
              {/* Locked Identity */}
              <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-slate-800/50 px-4 py-1 rounded-bl-xl text-[9px] font-bold tracking-widest uppercase text-slate-500 flex items-center gap-1">
                  <Lock size={10} /> Locked by Admin
                </div>
                
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-slate-800 pb-3">
                  <ShieldCheck size={14} className="text-sky-400" /> Professional Identity
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Full Name</label>
                    <input type="text" value={profile?.full_name} disabled className="w-full bg-slate-950/50 border border-slate-800/50 rounded-xl px-4 py-3 text-sm text-slate-500 cursor-not-allowed font-mono" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Employee ID</label>
                      <input type="text" value={profile?.username} disabled className="w-full bg-slate-950/50 border border-slate-800/50 rounded-xl px-4 py-3 text-sm text-slate-500 cursor-not-allowed font-mono" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">MLT License No</label>
                      <input type="text" value={profile?.mlt_id || "N/A"} disabled className="w-full bg-slate-950/50 border border-slate-800/50 rounded-xl px-4 py-3 text-sm text-slate-500 cursor-not-allowed font-mono" />
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
                  onClick={handleProfileUpdate} disabled={savingProfile}
                  className="w-full py-3 bg-emerald-900/30 hover:bg-emerald-800/50 border border-emerald-700 text-emerald-400 rounded-xl text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingProfile ? <Activity size={14} className="animate-spin" /> : "Save Changes"}
                </button>
              </div>

              {/* Change Password */}
              <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Lock size={14} className="text-amber-400" /> Change Password
                </h3>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Current Password</label>
                    <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 font-mono" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">New Secure Password</label>
                      <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-amber-400 focus:outline-none focus:border-amber-500 font-mono" />
                      <div className="w-full h-1.5 bg-slate-800 rounded-full mt-3 mb-1"><div className={`h-full transition-all ${strength.width} ${strength.color}`} /></div>
                  <div className="flex justify-end h-4"><span className={`text-[10px] uppercase font-bold ${strength.color.replace('bg-', 'text-')}`}>{newPassword.length > 0 ? strength.text : ""}</span></div>
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Confirm New Password</label>
                      <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-amber-400 focus:outline-none focus:border-amber-500 font-mono" />
                    </div>
                  </div>
                  <button 
                    type="submit" disabled={savingPassword}
                    className="w-full mt-2 py-3 bg-amber-900/30 hover:bg-amber-800/50 border border-amber-700 text-amber-400 rounded-xl text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(245,158,11,0.1)] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {savingPassword ? <Activity size={14} className="animate-spin" /> : "Update Password"}
                  </button>
                </form>
              </div>

            </div>

            {/* 🔴 COLUMN 2: Security, MFA & Sessions */}
            <div className="space-y-8">
              
              {/* 🛡️ MULTI-FACTOR AUTHENTICATION */}
              <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-slate-800 pb-3">
                  <ShieldCheck size={14} className="text-red-400" /> Multi-Factor Authentication
                </h3>

                <div className="space-y-4">
                  
                  {/* 1. Email MFA Toggle */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800">
                        <Mail size={16} className="text-slate-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white uppercase tracking-widest">Email Validation</p>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest">Receive OTPs to {profile?.email}</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleEmailMfaToggle} disabled={togglingMfa}
                      className={`relative w-10 h-5 rounded-full transition-colors ${mfaEmailEnabled ? "bg-sky-500" : "bg-slate-700"}`}
                    >
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${mfaEmailEnabled ? "translate-x-5" : "translate-x-0"}`}></div>
                    </button>
                  </div>

                  {/* 2. Authenticator App Toggle/Setup */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800">
                          <SmartphoneNfc size={16} className="text-slate-400" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white uppercase tracking-widest">Authenticator App</p>
                          <p className="text-[9px] text-slate-500 uppercase tracking-widest">Google Authenticator / Authy</p>
                        </div>
                      </div>
                      
                      {!mfaAppEnabled && setupStep === 0 && (
                        <button onClick={handleSetupAppMfa} className="px-4 py-2 bg-sky-900/30 hover:bg-sky-800/50 text-sky-400 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-sky-900/50 transition-colors">
                          Enable
                        </button>
                      )}
                      
                      {mfaAppEnabled && (
                        <button onClick={handleDisableAppMfa} className="px-4 py-2 bg-red-900/30 hover:bg-red-800/50 text-red-400 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-red-900/50 transition-colors">
                          Disable
                        </button>
                      )}
                    </div>

                    {/* QR Code & Setup Area */}
                    {setupStep === 1 && !mfaAppEnabled && (
                      <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col items-center animate-fadeIn">
                        <div className="bg-white p-3 rounded-xl mb-3 shadow-lg">
                           <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrCodeUri)}`} alt="MFA QR Code" className="w-32 h-32" />
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mb-4 text-center">
                          Secret: <span className="text-white font-bold tracking-wider">{mfaSecret}</span>
                        </p>
                        
                        <input 
                          type="text" 
                          placeholder="Enter 6-digit code" 
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="w-full text-center bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-lg font-mono text-white focus:outline-none focus:border-sky-500 tracking-[0.5em] mb-4"
                        />
                        
                        <div className="flex gap-3 w-full">
                          <button onClick={() => setSetupStep(0)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors">
                            Cancel
                          </button>
                          <button 
                            onClick={handleVerifyAppMfa} 
                            disabled={verifyingApp || verificationCode.length !== 6}
                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
                          >
                            {verifyingApp ? "Verifying..." : "Verify Code"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Vulnerability Banner */}
                  {isVulnerable && (
                    <div className="bg-amber-950/20 border border-amber-900/50 rounded-xl p-4 flex items-start gap-3 mt-4">
                      <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-[9px] text-amber-500 uppercase tracking-widest font-bold leading-relaxed">
                        Your account is vulnerable. Enable 2FA (Email or Authenticator) to prevent unauthorized access.
                      </p>
                    </div>
                  )}

                </div>
              </div>

              {/* Active Sessions Kill Switch */}
              <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
                <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                    <Monitor size={14} className="text-red-400" /> Active Devices
                  </h3>
                  <button 
                    onClick={handleRevokeSessions}
                    className="text-[9px] bg-red-950/50 text-red-400 border border-red-900 px-3 py-1.5 rounded-lg font-bold uppercase hover:bg-red-900 transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 size={12}/> Kill Switch (Revoke All)
                  </button>
                </div>

                <div className="space-y-3 max-h-[160px] overflow-y-auto custom-scrollbar pr-2">
                  {sessions.length === 0 ? (
                    <p className="text-[10px] text-slate-500 font-mono uppercase text-center">No active sessions found.</p>
                  ) : (
                    sessions.map((sess, i) => (
                      <div key={sess.id || i} className={`p-4 rounded-xl flex items-center justify-between border ${sess.is_current ? 'bg-sky-950/20 border-sky-900/50' : 'bg-slate-950 border-slate-800'}`}>
                        <div>
                          <p className="text-[11px] font-mono text-slate-300 flex items-center gap-2">
                            {sess.ip_address}
                            {sess.is_current && <span className="bg-sky-500 text-slate-950 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">Current Device</span>}
                          </p>
                          <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">{sess.user_agent}</p>
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