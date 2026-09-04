"use client";

import { useState } from "react";
import Link from "next/link";
import axios from "axios";
import { ShieldCheck, UserPlus, ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  
  const [formData, setFormData] = useState({
    username: "",
    nic: "",
    full_name: "",
    email: "",
    date_of_birth: "",
    gender: "",
    contact_number: "",
    city: "",
    province: "",
    home_address: "",
  });

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);

  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  
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

  const strength = getPasswordStrength(password);

  const handleRegistrationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match!");
      return;
    }
    setPasswordError("");
    setShowConsent(true); 
  };

  
  const sendDataToBackend = async () => {
    setShowConsent(false);
    setLoading(true);

    try {
      
      const response = await axios.post("http://localhost:8000/register", {
        ...formData,
        password: password,
      });

      alert("Registration Successful!");
      window.location.href = "/login"; 

    } catch (error) {
      console.error("Error registering patient:", error);
      alert("Registration Failed. Please check the backend connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center py-10 px-4 font-sans">
      
      {/* Top Navigation Bar */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-8">
        <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-xs font-bold tracking-widest uppercase">Return to Home</span>
        </Link>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-cyan-400" />
          <span className="text-xs font-bold tracking-widest uppercase text-slate-300">MedCare</span>
        </div>
      </div>

      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8 border-b border-slate-800 pb-6">
          <h1 className="text-2xl md:text-3xl font-light tracking-widest uppercase text-white mb-2">
            Patient <span className="font-bold text-cyan-400">Registration</span>
          </h1>
          <p className="text-xs text-slate-500 tracking-widest uppercase">Secure Zero-Trust Onboarding</p>
        </div>

        <form className="space-y-6" onSubmit={handleRegistrationSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Identity Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-cyan-400 tracking-widest uppercase mb-4">Identity Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 uppercase font-semibold mb-2">Username</label>
                  <input type="text" name="username" value={formData.username} onChange={handleChange} required className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 uppercase font-semibold mb-2">NIC Number</label>
                  <input type="text" name="nic" value={formData.nic} onChange={handleChange} required className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-cyan-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 uppercase font-semibold mb-2">Full Name</label>
                <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} required className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-cyan-500" />
              </div>

              <div>
                <label className="block text-xs text-slate-400 uppercase font-semibold mb-2">Email Address</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-cyan-500" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 uppercase font-semibold mb-2">Date of Birth</label>
                  <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} required className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-cyan-500" style={{ colorScheme: 'dark' }} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 uppercase font-semibold mb-2">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} required className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-cyan-500">
                    <option value="" className="text-slate-500">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Contact & Security */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-cyan-400 tracking-widest uppercase mb-4">Contact & Security</h3>

              <div>
                <label className="block text-xs text-slate-400 uppercase font-semibold mb-2">Contact Number</label>
                <input type="text" name="contact_number" value={formData.contact_number} onChange={handleChange} required className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-cyan-500" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 uppercase font-semibold mb-2">City</label>
                  <input type="text" name="city" value={formData.city} onChange={handleChange} required className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 uppercase font-semibold mb-2">Province</label>
                  <input type="text" name="province" value={formData.province} onChange={handleChange} required className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-cyan-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 uppercase font-semibold mb-2">Home Address</label>
                <input type="text" name="home_address" value={formData.home_address} onChange={handleChange} required className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-cyan-500" />
              </div>

              <div className="mt-4 p-5 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="mb-4">
                  <label className="block text-xs text-cyan-400 uppercase tracking-widest font-bold mb-2">Master Password</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 pr-10 text-sm text-white focus:outline-none focus:border-cyan-500" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-400">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full mt-3 mb-1"><div className={`h-full transition-all ${strength.width} ${strength.color}`} /></div>
                  <div className="flex justify-end h-4"><span className={`text-[10px] uppercase font-bold ${strength.color.replace('bg-', 'text-')}`}>{password.length > 0 ? strength.text : ""}</span></div>
                </div>

                <div>
                  <label className="block text-xs text-cyan-400 uppercase tracking-widest font-bold mb-2">Confirm Password</label>
                  <div className="relative">
                    <input type={showConfirmPassword ? "text" : "password"} required value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); if (passwordError) setPasswordError(""); }} className={`w-full bg-slate-900 border rounded-lg p-3 pr-10 text-sm text-white focus:outline-none ${passwordError ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-cyan-500'}`} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-400">
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordError && <p className="text-red-500 text-[10px] uppercase font-bold mt-2 text-right">{passwordError}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-800 flex justify-end">
            <button type="submit" disabled={loading} className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold tracking-widest uppercase transition-colors flex items-center gap-3">
              {loading ? "Processing..." : "Initialize Account"} <UserPlus className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {showConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl max-w-md w-full shadow-2xl">
            <div className="flex justify-center mb-6"><ShieldCheck className="w-16 h-16 text-emerald-500" /></div>
            <h3 className="text-xl font-bold text-white text-center mb-4 uppercase tracking-widest">Privacy Consent</h3>
            <p className="text-sm text-slate-400 text-center mb-8 leading-relaxed">I agree to the collection and processing of my personal and medical information in accordance with the MedCare Zero-Trust Privacy Policy.</p>
            <div className="flex gap-4">
              <button onClick={() => setShowConsent(false)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg tracking-widest text-xs font-bold transition-colors">DECLINE</button>
              <button onClick={sendDataToBackend} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg tracking-widest text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                <CheckCircle2 className="w-4 h-4" /> I AGREE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}