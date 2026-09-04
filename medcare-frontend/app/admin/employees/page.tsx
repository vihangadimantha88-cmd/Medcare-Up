"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { 
  ShieldCheck, LayoutDashboard, Receipt, CalendarClock, Users, 
  Fingerprint, UserCog, LogOut, UserPlus, PowerOff, 
  CheckCircle2, Key, Copy, ShieldAlert, Activity, Mail, User,
  CreditCard, CalendarDays, MapPin, Stethoscope, FileBadge, Building2,
  GraduationCap, Briefcase, AlertTriangle
} from "lucide-react";

export default function EmployeeManagementPage() {
  const router = useRouter();
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sysMessage, setSysMessage] = useState({ text: "", type: "" });

  const [showAddForm, setShowAddForm] = useState(false);
  const [registering, setRegistering] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: "", last_name: "", email: "", phone: "", nic: "", dob: "",
    gender: "", address: "", role: "Doctor", specialization: "", license_number: "", department: "",
    qualifications: "", experience_years: "" 
  });

  const [generatedCredentials, setGeneratedCredentials] = useState<{empId: string, tempPass: string} | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("medcare_token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchEmployees(token);
  }, [router]);

  const fetchEmployees = async (token: string) => {
    try {
      const response = await axios.get("http://localhost:8000/admin/users/", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const staff = response.data.filter((u: any) => u.role === "Doctor" || u.role === "Lab Technician");
      setEmployees(staff);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setEmployees([]); 
      } else {
        setError("Unable to retrieve employee records from the server.");
      }
    } finally {
      setLoading(false);
    }
  };

  const showToast = (text: string, type: "success" | "error") => {
    setSysMessage({ text, type });
    setTimeout(() => setSysMessage({ text: "", type: "" }), 5000);
  };

  const handleRegisterEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    setError("");

    try {
      const token = localStorage.getItem("medcare_token");
      let endpoint = "";
      let payload = {};

      if (formData.role === "Doctor") {
        endpoint = "http://localhost:8000/admin/doctors/";
        payload = {
          full_name: `${formData.first_name} ${formData.last_name}`,
          dob: formData.dob,
          gender: formData.gender,
          contact_number: formData.phone,
          nic: formData.nic,
          email: formData.email,
          home_address: formData.address,
          specialization: formData.specialization,
          slmc_number: formData.license_number,
          qualifications: formData.qualifications, 
          experience_years: parseInt(formData.experience_years) || 0 
        };
      } else {
        endpoint = "http://localhost:8000/admin/lab-techs/";
        payload = {
          full_name: `${formData.first_name} ${formData.last_name}`,
          dob: formData.dob,
          gender: formData.gender,
          mobile_number: formData.phone, 
          nic: formData.nic,
          email: formData.email,
          residential_address: formData.address, 
          mlt_id: formData.license_number,
          department: formData.department, // <-- FIXED: Added missing department payload
          qualifications: formData.qualifications 
        };
      }

      const response = await axios.post(endpoint, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setGeneratedCredentials({
        empId: response.data.employee_id,
        tempPass: response.data.temporary_password 
      });

      fetchEmployees(token);
      
      setFormData({ 
        first_name: "", last_name: "", email: "", phone: "", nic: "", dob: "", 
        gender: "", address: "", role: "Doctor", specialization: "", license_number: "", department: "",
        qualifications: "", experience_years: ""
      });
      setShowAddForm(false);
      
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed. Please check the inputs or NIC/Email uniqueness.");
    } finally {
      setRegistering(false);
    }
  };

  const handleDeactivate = async (employeeId: string, employeeName: string) => {
    if (!window.confirm(`⚠️ SOFT DELETE WARNING:\nAre you sure you want to deactivate ${employeeName} (${employeeId})?\n\nTheir active sessions will be terminated immediately. All past clinical records and audit logs will safely remain in the system.`)) return;

    setDeactivatingId(employeeId);
    setError("");

    try {
      const token = localStorage.getItem("medcare_token");
      await axios.put(`http://localhost:8000/admin/users/${employeeId}/deactivate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showToast(`${employeeName} has been securely deactivated.`, "success");
      
      setEmployees(prev => prev.map(emp => 
        (emp.username === employeeId || emp.employee_id === employeeId) ? { ...emp, is_active: false } : emp
      ));
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to deactivate employee.");
    } finally {
      setDeactivatingId(null);
    }
  };

  const copyToClipboard = () => {
    if (generatedCredentials) {
      navigator.clipboard.writeText(`Employee ID: ${generatedCredentials.empId}\nTemp Password: ${generatedCredentials.tempPass}`);
      alert("Credentials copied to clipboard. Share securely!");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("medcare_token");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans overflow-hidden selection:bg-indigo-500/30">
      
      {sysMessage.text && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full text-xs font-bold tracking-widest uppercase shadow-2xl flex items-center gap-2 animate-fadeIn border ${
          sysMessage.type === "success" ? "bg-emerald-950/80 text-emerald-400 border-emerald-900/50" : "bg-red-950/80 text-red-400 border-red-900/50"
        }`}>
          {sysMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {sysMessage.text}
        </div>
      )}

      {/* 🟢 ADMIN SIDEBAR (100% Fully Restored) */}
      <div className="w-72 bg-slate-950 border-r border-slate-800/60 flex flex-col justify-between hidden md:flex z-20 shadow-[4px_0_24px_rgba(0,0,0,0.4)]">
        <div>
          <div className="p-6 border-b border-slate-800/60 flex items-center gap-3 bg-indigo-950/20">
            <ShieldCheck className="w-10 h-10 text-indigo-500 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
            <div>
              <h1 className="text-sm font-extrabold tracking-widest uppercase text-white leading-tight">MedCare<br/><span className="text-indigo-400 text-[10px]">Admin Console</span></h1>
            </div>
          </div>
          
          <div className="p-4 space-y-2 mt-4">
            {/* 🟢 FIXED: Route changed to /admin */}
            <Link href="/admin" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <LayoutDashboard size={18} /> Command Center
            </Link>
            
            {/* 🟢 RESTORED: Missing Navigation Links */}
            <Link href="/admin/billing" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <Receipt size={18} /> Automated Billing
            </Link>
            
            <Link href="/admin/schedule" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <CalendarClock size={18} /> Schedule & Ops
            </Link>
            
            {/* Active Page */}
            <div className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-900/30 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all">
              <Users size={18} /> Employee Management
            </div>

            <Link href="/admin/forensics" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50 group">
              <Fingerprint size={18} className="group-hover:text-red-400 transition-colors" /> Digital Forensics
            </Link>

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

      {/* 🟢 MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative bg-slate-950">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none"></div>
        
        <div className="p-8 md:p-10 max-w-6xl w-full mx-auto z-10 flex flex-col h-full">
          
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-light tracking-widest uppercase text-white mb-1">
                Employee <span className="font-bold text-indigo-500">Management</span>
              </h2>
              <p className="text-[10px] text-slate-400 tracking-widest uppercase font-mono">Secure Onboarding & Offboarding Controls</p>
            </div>
            
            <button 
              onClick={() => { setShowAddForm(!showAddForm); setGeneratedCredentials(null); }}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-white rounded-xl text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] flex items-center gap-2"
            >
              <UserPlus size={16} /> {showAddForm ? "Close Form" : "Add New Employee"}
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl border bg-slate-900 border-red-900/50 text-red-400 flex items-start gap-3 shadow-lg animate-fadeIn">
              <ShieldAlert size={18} className="mt-0.5 shrink-0" />
              <div className="text-xs leading-relaxed font-mono">{error}</div>
            </div>
          )}

          {generatedCredentials && (
            <div className="mb-8 bg-emerald-950/30 border border-emerald-900/50 rounded-2xl p-6 shadow-[0_0_30px_rgba(16,185,129,0.15)] animate-fadeIn">
              <div className="flex items-center gap-3 text-emerald-400 mb-4 border-b border-emerald-900/50 pb-4">
                <Key size={20} />
                <h3 className="text-sm font-black uppercase tracking-widest">Account Created Successfully</h3>
              </div>
              <p className="text-[11px] text-emerald-200/80 font-mono leading-relaxed mb-6">
                <strong>SECURITY TRAP ACTIVE:</strong> A temporary password has been auto-generated. The system will force the employee to change this password and configure 2FA upon their first login. Admin does not have access to the final password.
              </p>
              
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <span className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1">Employee ID (Username)</span>
                  <span className="text-lg font-mono text-white font-bold">{generatedCredentials.empId}</span>
                </div>
                <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <span className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1">Temporary Password</span>
                  <span className="text-lg font-mono text-amber-400 font-bold">{generatedCredentials.tempPass}</span>
                </div>
              </div>

              <button 
                onClick={copyToClipboard}
                className="w-full md:w-auto px-6 py-3 bg-emerald-900/50 hover:bg-emerald-800 border border-emerald-700 text-emerald-100 rounded-xl text-xs font-bold tracking-widest uppercase transition-all flex justify-center items-center gap-2"
              >
                <Copy size={16} /> Copy Credentials to Share
              </button>
            </div>
          )}

          {showAddForm && !generatedCredentials && (
            <div className="mb-8 bg-slate-900/80 backdrop-blur-sm border border-indigo-500/30 rounded-3xl p-8 shadow-[0_0_30px_rgba(79,70,229,0.1)] animate-fadeIn">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 pb-4 border-b border-slate-800 flex items-center gap-2">
                <UserPlus size={16} className="text-indigo-400" /> Employee Registration Portal
              </h3>
              
              <form onSubmit={handleRegisterEmployee} className="space-y-8">
                
                {/* Section 1 */}
                <div>
                  <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4">Section 1: Personal Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2">First Name</label>
                      <input type="text" required value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2">Last Name</label>
                      <input type="text" required value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5"><CreditCard size={12}/> NIC Number</label>
                      <input type="text" required value={formData.nic} onChange={(e) => setFormData({...formData, nic: e.target.value})} placeholder="National ID" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors font-mono" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5"><CalendarDays size={12}/> Date of Birth</label>
                      <input type="date" required value={formData.dob} onChange={(e) => setFormData({...formData, dob: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2">Gender</label>
                      <select required value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none">
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5"><Mail size={12}/> Email Address</label>
                      <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2">Phone Number</label>
                      <input type="text" required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors font-mono" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5"><MapPin size={12}/> Residential Address</label>
                    <textarea rows={2} required value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none" />
                  </div>
                </div>

                {/* Section 2 */}
                <div className="pt-6 border-t border-slate-800">
                  <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4">Section 2: Professional Details</h4>
                  
                  <div className="mb-5">
                    <label className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2">System Role / Designation</label>
                    <select required value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full bg-slate-950 border border-indigo-900/50 rounded-xl px-4 py-3 text-sm text-indigo-400 font-bold focus:outline-none focus:border-indigo-500 transition-colors appearance-none">
                      <option value="Doctor">Consultant Doctor</option>
                      <option value="Lab Technician">Laboratory Technician</option>
                    </select>
                  </div>

                  {formData.role === "Doctor" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fadeIn bg-slate-950/50 border border-slate-800/80 rounded-2xl p-5">
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5"><FileBadge size={12}/> SLMC License Number</label>
                        <input type="text" required value={formData.license_number} onChange={(e) => setFormData({...formData, license_number: e.target.value})} placeholder="e.g. SLMC-12345" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors font-mono" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5"><Stethoscope size={12}/> Specialization</label>
                        <select required value={formData.specialization} onChange={(e) => setFormData({...formData, specialization: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none">
                          <option value="">Select Specialization</option>
                          <option value="Nephrology">Nephrology (CKD, High BP)</option>
                          <option value="Urology">Urology (Stones, Hematuria)</option>
                          <option value="Dialysis Unit">Dialysis Unit</option>
                          <option value="Transplant Unit">Transplant Unit</option>
                          <option value="General Physician">General Physician (OPD)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5"><GraduationCap size={12}/> Qualifications</label>
                        <input type="text" required value={formData.qualifications} onChange={(e) => setFormData({...formData, qualifications: e.target.value})} placeholder="e.g. MBBS, MD, FRCS" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5"><Briefcase size={12}/> Experience (Years)</label>
                        <input type="number" min="0" required value={formData.experience_years} onChange={(e) => setFormData({...formData, experience_years: e.target.value})} placeholder="e.g. 12" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors font-mono" />
                      </div>
                    </div>
                  )}

                  {formData.role === "Lab Technician" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fadeIn bg-slate-950/50 border border-slate-800/80 rounded-2xl p-5">
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5"><FileBadge size={12}/> MLT License Number</label>
                        <input type="text" required value={formData.license_number} onChange={(e) => setFormData({...formData, license_number: e.target.value})} placeholder="e.g. MLT-7890" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors font-mono" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5"><Building2 size={12}/> Department</label>
                        <select required value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none">
                          <option value="">Select Department</option>
                          <option value="Pathology">Pathology & Urinalysis</option>
                          <option value="Microbiology">Microbiology (Cultures)</option>
                          <option value="Biochemistry">Biochemistry (Blood Tests)</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5"><GraduationCap size={12}/> Qualifications</label>
                        <input type="text" required value={formData.qualifications} onChange={(e) => setFormData({...formData, qualifications: e.target.value})} placeholder="e.g. BSc MLT, Dip in Lab Sciences" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 flex justify-end border-t border-slate-800">
                  <button type="submit" disabled={registering} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-white rounded-xl text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-50 flex items-center gap-2">
                    {registering ? <><Activity size={16} className="animate-spin" /> Processing Secure Registration...</> : <><UserPlus size={16} /> Register Personnel & Generate Access</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 📋 EMPLOYEES LIST */}
          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <Briefcase size={16} className="text-indigo-400" /> Active & Inactive Personnel
              </h3>
              <span className="text-[10px] text-slate-500 font-mono uppercase">Total Records: {employees.length}</span>
            </div>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-indigo-500/50">
                <Activity size={40} className="animate-spin-slow mb-4" />
                <p className="text-xs uppercase tracking-widest">Fetching secure personnel records...</p>
              </div>
            ) : employees.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/50">
                <User size={48} className="text-slate-700 mb-4 opacity-50" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">No Employees Found</p>
                <p className="text-[10px] text-slate-600 font-mono uppercase">Click 'Add New Employee' to start onboarding.</p>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/50 border-b border-slate-800 text-[9px] text-slate-500 uppercase tracking-widest font-bold">
                      <th className="p-4">Employee ID</th>
                      <th className="p-4">Full Name & Email</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">System Status</th>
                      <th className="p-4 text-right">Access Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {employees.map((emp) => {
                      const isActive = emp.is_active;
                      // FIXED: Better fallback for ID if username is missing
                      const idToUse = emp.employee_id || emp.username || emp.id; 
                      
                      return (
                        <tr key={emp.id || Math.random()} className="hover:bg-slate-800/30 transition-colors group">
                          
                          <td className="p-4">
                            <span className="text-xs font-black text-white font-mono tracking-widest">{idToUse}</span>
                          </td>
                          
                          <td className="p-4">
                            <p className="text-xs font-bold text-slate-200 mb-1">{emp.full_name || "Name not provided"}</p>
                            <p className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5"><Mail size={10}/> {emp.email}</p>
                          </td>
                          
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${
                              emp.role === "Doctor" ? "bg-sky-950/30 text-sky-400 border border-sky-900/50" : "bg-purple-950/30 text-purple-400 border border-purple-900/50"
                            }`}>
                              {emp.role}
                            </span>
                          </td>
                          
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border ${
                              isActive ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/50" : "bg-red-950/20 text-red-400 border-red-900/50"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-red-500"}`}></span>
                              {isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          
                          <td className="p-4 text-right">
                            {isActive ? (
                              <button 
                                onClick={() => handleDeactivate(idToUse, emp.full_name || idToUse)}
                                disabled={deactivatingId === idToUse}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-950/30 hover:bg-red-900/60 border border-red-900/50 text-red-400 hover:text-white rounded-lg text-[9px] font-bold tracking-widest uppercase transition-all disabled:opacity-50"
                                title="Soft Delete & Instant Session Kill"
                              >
                                {deactivatingId === idToUse ? <Activity size={12} className="animate-spin" /> : <PowerOff size={12} />}
                                Revoke
                              </button>
                            ) : (
                              <span className="text-[9px] text-slate-600 font-mono uppercase tracking-widest italic">
                                Terminated
                              </span>
                            )}
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}