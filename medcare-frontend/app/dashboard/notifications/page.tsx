"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { 
  ShieldCheck, Home, Bell, LogOut, User, Activity, CreditCard, LockKeyhole,
  FlaskConical, CalendarCheck, CalendarX, Pill, Info, ArrowLeft 
} from "lucide-react";

export default function NotificationsPage() {
  const router = useRouter();
  const [patientName, setPatientName] = useState("Patient");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("medcare_token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchNotifications(token);
  }, [router]);

  // 🚀 1. Fetch Real Notifications from Backend
  const fetchNotifications = async (token: string) => {
    try {
      // Get User Name
      const profileRes = await axios.get("http://34.229.165.55:8000/patients/me/profile", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatientName(profileRes.data.first_name || "Patient");

      // Get Notifications List
      const notifRes = await axios.get("http://34.229.165.55:8000/patients/me/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotifications(notifRes.data);
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  };

  // 🚀 2. Mark Notification as Read on Click
  const handleMarkAsRead = async (notifId: number, isRead: boolean) => {
    if (isRead) return; // If already read, do nothing

    try {
      const token = localStorage.getItem("medcare_token");
      await axios.put(`http://34.229.165.55:8000/notifications/${notifId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update local state instantly without refetching from server
      setNotifications(prev => 
        prev.map(note => note.id === notifId ? { ...note, is_read: true } : note)
      );
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("medcare_token");
    router.push("/login");
  };

  // Dynamic Icon Selector based on Backend notification_type
  const getIcon = (type: string) => {
    switch (type) {
      case "LAB_REPORT": return <FlaskConical className="w-5 h-5 text-amber-400" />;
      case "PRESCRIPTION": return <Pill className="w-5 h-5 text-cyan-400" />;
      case "APPOINTMENT_CONFIRMED": return <CalendarCheck className="w-5 h-5 text-emerald-400" />;
      case "APPOINTMENT_CANCELLED": return <CalendarX className="w-5 h-5 text-red-400" />;
      default: return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', { 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans overflow-hidden">
      
      {/* 🟢 CONSISTENT SIDEBAR NAVIGATION */}
      <div className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col justify-between hidden md:flex z-10">
        <div>
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <ShieldCheck className="w-10 h-10 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]" />
            <div>
              <h1 className="text-sm font-bold tracking-widest uppercase text-white leading-tight">MedCare<br/><span className="text-cyan-400">Patient Portal</span></h1>
            </div>
          </div>
          
          <div className="p-4 space-y-2 mt-4">
            <Link href="/dashboard" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-800/50">
              <Home size={18} /> Home
            </Link>
            <Link href="/dashboard/health-vault" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-800/50">
              <Activity size={18} /> My Health Vault
            </Link>
            <Link href="/dashboard/billing" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-800/50">
              <CreditCard size={18} /> Billing
            </Link>
            <Link href="/dashboard/security" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-800/50">
              <LockKeyhole size={18} /> Security & Privacy
            </Link>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
              <User size={16} className="text-slate-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white tracking-widest uppercase">{patientName}</span>
              <span className="text-[9px] text-emerald-400 tracking-widest uppercase">Verified Access</span>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-red-950/40 border border-red-900 text-red-400 hover:bg-red-900/60 rounded-xl text-xs font-bold tracking-widest uppercase transition-colors">
            <LogOut size={16} /> Secure Logout
          </button>
        </div>
      </div>

      {/* 🟢 MAIN CONTENT AREA (NOTIFICATIONS) */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="p-8 md:p-12 max-w-4xl w-full mx-auto z-10">
          
          <div className="mb-10">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-cyan-400 transition-colors mb-6 font-bold uppercase tracking-widest text-[10px]">
              <ArrowLeft size={14} /> Back to Dashboard
            </Link>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-900/20 border border-amber-900/50 rounded-xl flex items-center justify-center">
                <Bell className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h2 className="text-3xl font-light tracking-widest uppercase text-white mb-1">
                  System <span className="font-bold text-amber-400">Notifications</span>
                </h2>
                <p className="text-xs text-slate-500 tracking-widest uppercase">Your recent alerts and medical updates</p>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          {loading ? (
             <div className="text-center py-20 text-slate-500">
               <Bell className="w-10 h-10 mx-auto animate-pulse mb-4 text-amber-500/50" />
               <p className="text-xs tracking-widest uppercase">Syncing your alerts...</p>
             </div>
          ) : notifications.length === 0 ? (
             <div className="text-center py-20 border border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
               <p className="text-sm text-slate-500 tracking-widest uppercase">You have no new notifications.</p>
             </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((note) => (
                <div 
                  key={note.id} 
                  onClick={() => handleMarkAsRead(note.id, note.is_read)}
                  className={`relative flex items-start gap-4 p-6 rounded-2xl border transition-all cursor-pointer hover:bg-slate-800/50 ${!note.is_read ? "bg-slate-900 border-slate-700 shadow-lg" : "bg-slate-900/50 border-slate-800 opacity-75"}`}
                >
                  {/* Unread Indicator */}
                  {!note.is_read && (
                    <div className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </div>
                  )}

                  {/* Dynamic Icon Box */}
                  <div className="w-12 h-12 shrink-0 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center shadow-inner mt-1">
                    {getIcon(note.notification_type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={`text-sm font-bold tracking-widest uppercase ${!note.is_read ? "text-white" : "text-slate-400"}`}>
                        {note.notification_type.replace(/_/g, ' ')}
                      </h3>
                      <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase ml-4 shrink-0">
                        {formatTime(note.created_at)}
                      </span>
                    </div>
                    <p className={`text-xs leading-relaxed tracking-wide ${!note.is_read ? "text-slate-300" : "text-slate-500"}`}>
                      {note.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}