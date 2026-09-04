"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { 
  ShieldCheck, Home, LogOut, Activity, CreditCard, Lock, ArrowLeft, 
  UserCircle, Save, CheckCircle2, AlertCircle, User
} from "lucide-react";

export default function ProfileManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [patientName, setPatientName] = useState("Patient");

  // Form State
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    dob: "",
    email: "",
    phone: "",
    address: ""
  });

  useEffect(() => {
    const token = localStorage.getItem("medcare_token");
    if (!token) { router.push("/login"); return; }
    fetchProfileData(token);
  }, [router]);

  const fetchProfileData = async (token: string) => {
    try {
      const response = await axios.get("http://localhost:8000/patients/me/profile", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = response.data;
      setPatientName(data.first_name || "Patient");
      
      setFormData({
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        dob: data.dob || "",
        email: data.email || "",
        phone: data.phone || "", 
        address: data.address || "" 
      });
    } catch (err: any) {
      console.error("Failed to load profile", err);
      setMessage({ text: "Unable to retrieve profile data.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: "", type: "" });

    try {
      const token = localStorage.getItem("medcare_token");
      
      
      const payload = {
        first_name: formData.first_name || "Unknown",
        last_name: formData.last_name || "Unknown",
        dob: formData.dob || "2000-01-01",
        email: formData.email,
        contact_number: formData.phone,
        home_address: formData.address,
        blood_group: "Not Specified",
        emergency_contact_number: "Not Specified",
        emergency_contact: "Not Specified" // fallback
      };

      await axios.put("http://localhost:8000/patients/me/profile/editable", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage({ text: "Profile information updated successfully.", type: "success" });
      setTimeout(() => setMessage({ text: "", type: "" }), 4000);
    } catch (err: any) {
      console.error("Failed to update profile", err);
      setMessage({ text: err.response?.data?.detail || "Failed to update profile.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => { localStorage.removeItem("medcare_token"); router.push("/login"); };

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
      <div className="flex-1 flex flex-col h-screen overflow-y-auto p-8 md:p-12 max-w-4xl mx-auto relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>

        <Link href="/dashboard/security" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-400 mb-6 text-[10px] font-bold uppercase tracking-widest z-10 transition-colors">
          <ArrowLeft size={14} /> Back to Security Hub
        </Link>

        <div className="mb-8 flex items-center gap-4 z-10">
          <div className="w-12 h-12 bg-indigo-900/20 border border-indigo-900/50 rounded-xl flex items-center justify-center">
            <UserCircle className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-3xl font-light tracking-widest uppercase text-white mb-1">
              Profile <span className="font-bold text-indigo-400">Management</span>
            </h2>
            <p className="text-xs text-slate-500 tracking-widest uppercase">Update your demographic and personal contact information</p>
          </div>
        </div>

        {/* Notifications */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 z-10 animate-fadeIn ${message.type === "success" ? "bg-emerald-950/40 border-emerald-900/50 text-emerald-400" : "bg-red-950/40 border-red-900/50 text-red-400"}`}>
            {message.type === "success" ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
            <p className="text-xs font-medium uppercase tracking-widest leading-relaxed">{message.text}</p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 z-10">
            <UserCircle size={40} className="animate-pulse mb-4 opacity-50 text-indigo-400/50" />
            <p className="text-xs uppercase tracking-widest">Retrieving profile data...</p>
          </div>
        ) : (
          <div className="z-10 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            
            <form onSubmit={handleSaveChanges}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                
                {/* 🔒 FIRST NAME (Read-Only) */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    First Name <Lock size={10} className="text-slate-600" />
                  </label>
                  <input 
                    type="text" 
                    value={formData.first_name} 
                    disabled 
                    className="w-full bg-slate-950/50 border border-slate-800 text-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none cursor-not-allowed"
                  />
                </div>

                {/* 🔒 LAST NAME (Read-Only) */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    Last Name <Lock size={10} className="text-slate-600" />
                  </label>
                  <input 
                    type="text" 
                    value={formData.last_name} 
                    disabled 
                    className="w-full bg-slate-950/50 border border-slate-800 text-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none cursor-not-allowed"
                  />
                </div>

                {/* 🔒 DATE OF BIRTH (Read-Only) */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    Date of Birth <Lock size={10} className="text-slate-600" />
                  </label>
                  <input 
                    type="date" 
                    value={formData.dob} 
                    disabled 
                    className="w-full bg-slate-950/50 border border-slate-800 text-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none cursor-not-allowed"
                  />
                </div>

                {/* ✏️ EMAIL ADDRESS (Editable) */}
                <div>
                  <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">
                    Email Address
                  </label>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email} 
                    onChange={handleInputChange}
                    required
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>

                {/* ✏️ PHONE NUMBER (Editable) */}
                <div>
                  <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">
                    Phone Number
                  </label>
                  <input 
                    type="tel" 
                    name="phone"
                    value={formData.phone} 
                    onChange={handleInputChange}
                    required
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>

              {/* ✏️ RESIDENTIAL ADDRESS (Editable) */}
              <div className="mb-8">
                <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">
                  Residential Address
                </label>
                <textarea 
                  name="address"
                  value={formData.address} 
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                />
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-slate-800">
                <p className="text-[10px] text-slate-500 tracking-widest uppercase hidden md:block">
                  Note: Name and DOB require admin approval to change.
                </p>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="w-full md:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {saving ? (
                    <><Activity size={16} className="animate-spin" /> Saving...</>
                  ) : (
                    <><Save size={16} /> Save Changes</>
                  )}
                </button>
              </div>

            </form>
          </div>
        )}

      </div>
    </div>
  );
}