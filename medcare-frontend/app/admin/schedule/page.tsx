"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { ShieldCheck, LayoutDashboard, Receipt, CalendarClock, Users, Fingerprint, UserCog, LogOut, CalendarDays, Search, Save } from "lucide-react";

export default function ScheduleManagementPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [existingSchedules, setExistingSchedules] = useState<string[]>([]);
  const [selectedDoctorName, setSelectedDoctorName] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [formData, setFormData] = useState({ startTime: "09:00", endTime: "12:00", maxPatients: 10 });
  
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("medcare_token");
    if (!token) { router.push("/login"); return; }
    axios.get("http://34.229.165.55:8000/admin/users/", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setDoctors(res.data.filter((u: any) => u.role === "Doctor")));
  }, [router]);

  const selectDoctor = async (username: string, fullName: string) => {
    setSelectedDoctorName(username);
    const displayName = fullName ? `Dr. ${fullName}` : `Dr. (Profile Not Updated)`;
    setSearchTerm(`${displayName} [${username}]`);
    setDropdownOpen(false);
    setSelectedDate("");
    
    try {
      const res = await axios.get(`http://34.229.165.55:8000/admin/schedules/doctor/${username}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("medcare_token")}` }
      });
      setExistingSchedules(res.data);
    } catch (err) { console.error(err); }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorName || !selectedDate) return alert("Select Doctor & Date!");
    try {
      await axios.post("http://34.229.165.55:8000/admin/schedules/", {
        doctor_name: selectedDoctorName, date: selectedDate, start_time: formData.startTime, end_time: formData.endTime, max_patients: formData.maxPatients
      }, { headers: { Authorization: `Bearer ${localStorage.getItem("medcare_token")}` } });
      alert("Schedule Created!");
      setExistingSchedules([...existingSchedules, selectedDate]);
      setSelectedDate("");
    } catch (err: any) { alert(err.response?.data?.detail || "Error occurred."); }
  };

  const handleLogout = () => {
    localStorage.removeItem("medcare_token");
    router.push("/login");
  };

  // 🟢 LOGICAL FIX: Search EXCLUSIVELY by Doctor ID (username)
  const filteredDoctors = doctors.filter(d => 
    d.username.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const today = new Date();
  const todayDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); 
  const emptySlotsCount = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <div className="w-72 bg-slate-950 border-r border-slate-800/60 flex flex-col justify-between hidden md:flex z-20 shadow-[4px_0_24px_rgba(0,0,0,0.4)]">
        <div>
          <div className="p-6 border-b border-slate-800/60 flex items-center gap-3 bg-slate-900/20">
            <ShieldCheck className="w-10 h-10 text-indigo-500 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
            <div>
              <h1 className="text-sm font-extrabold tracking-widest uppercase text-white leading-tight">MedCare<br/><span className="text-indigo-400 text-[10px]">Admin Console</span></h1>
            </div>
          </div>
          <div className="p-4 space-y-2 mt-4">
            <Link href="/admin" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50"><LayoutDashboard size={18} /> Command Center</Link>
            <Link href="/admin/billing" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50"><Receipt size={18} /> Automated Billing</Link>
            <div className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-900/30 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all"><CalendarClock size={18} /> Schedule & Ops</div>
            <Link href="/admin/employees" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50"><Users size={18} /> Employee Management</Link>
            <Link href="/admin/forensics" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50 group"><Fingerprint size={18} className="group-hover:text-red-400 transition-colors" /> Digital Forensics</Link>
            <Link href="/admin/security" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50"><UserCog size={18} /> Profile & Security</Link>
          </div>
        </div>
        <div className="p-4 border-t border-slate-800/60 bg-slate-900/20">
          <button onClick={handleLogout} className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-900/50 text-slate-400 hover:text-red-400 rounded-xl text-xs font-bold tracking-widest uppercase transition-all"><LogOut size={16} /> Secure Logout</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-10">
        <h2 className="text-3xl font-light text-white mb-8 tracking-widest uppercase">Doctor <span className="font-bold text-indigo-500">Scheduling</span></h2>
        
        {/* 🟢 Searchable Dropdown (ID Based Only) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 mb-6 relative">
          <label className="block text-[10px] text-slate-400 uppercase font-bold mb-3">Search & Select Doctor by ID</label>
          <div className="relative">
            <Search className="absolute left-4 top-3 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search exclusively by Doctor ID (e.g. D2649)..." 
              value={searchTerm}
              onClick={() => setDropdownOpen(true)}
              onChange={(e) => { setSearchTerm(e.target.value); setDropdownOpen(true); }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:border-indigo-500 transition-colors font-mono"
            />
            {dropdownOpen && (
              <div className="absolute top-full left-0 w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden z-50 max-h-48 overflow-y-auto shadow-2xl">
                {filteredDoctors.length > 0 ? filteredDoctors.map(doc => (
                  <div key={doc.id} onClick={() => selectDoctor(doc.username, doc.full_name)} className="p-4 hover:bg-indigo-600 cursor-pointer border-b border-slate-700/50 transition-colors flex justify-between items-center">
                    <span className="text-sm font-bold text-white">Dr. {doc.full_name || "Name Not Set"}</span>
                    <span className="text-xs text-slate-300 font-mono bg-slate-950/50 px-2 py-1 rounded">ID: {doc.username}</span>
                  </div>
                )) : (
                  <div className="p-4 text-sm text-slate-400 text-center font-mono">No doctors found matching this ID.</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
            <h3 className="text-xs font-bold text-slate-300 uppercase mb-6"><CalendarDays size={16} className="inline mr-2 text-indigo-400"/> Select Date ({today.toLocaleString('default', { month: 'long' })} {currentYear})</h3>
            <div className="grid grid-cols-7 gap-2 mb-2">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (<div key={day} className="text-center text-[10px] font-bold text-slate-500 uppercase">{day}</div>))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: emptySlotsCount }).map((_, i) => (<div key={`empty-${i}`} className="h-10"></div>))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const dayStr = String(i+1).padStart(2,'0');
                const monthStr = String(currentMonth + 1).padStart(2,'0');
                const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
                const isBooked = existingSchedules.includes(dateStr);
                const isPast = dateStr < todayDateString;
                
                return (
                 <button 
                    key={i} 
                   onClick={() => !isBooked && !isPast && setSelectedDate(dateStr)} 
                   disabled={isBooked || isPast || !selectedDoctorName}
                   className={`h-10 rounded-lg text-xs font-bold transition-all ${
                     isPast 
                      ? 'bg-slate-950/20 text-slate-700 cursor-not-allowed border border-slate-900'
                      : isBooked 
                         ? 'bg-indigo-950/40 text-indigo-800 cursor-not-allowed border border-indigo-900/50'
                         : selectedDate === dateStr 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-slate-950 text-slate-400 hover:border-slate-600 border border-slate-800'
                    }`}
>
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
            <form onSubmit={handleSaveSchedule} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] text-slate-400 uppercase mb-2">Start</label><input type="time" value={formData.startTime} onChange={e=>setFormData({...formData, startTime: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white [color-scheme:dark]"/></div>
                <div><label className="block text-[10px] text-slate-400 uppercase mb-2">End</label><input type="time" value={formData.endTime} onChange={e=>setFormData({...formData, endTime: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white [color-scheme:dark]"/></div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-2">Max Patients</label>
                <input type="number" value={formData.maxPatients} onChange={e=>setFormData({...formData, maxPatients: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white" />
              </div>
              <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase"><Save size={16} className="inline mr-2"/> Generate Schedule</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}