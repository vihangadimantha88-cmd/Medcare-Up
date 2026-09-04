"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { 
  ShieldCheck, Home, LogOut, ArrowLeft, CalendarClock, 
  User, Clock, Hash, CheckCircle2, XCircle, AlertTriangle, Activity, Stethoscope 
} from "lucide-react";

export default function UpcomingAppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    const token = localStorage.getItem("medcare_token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchUpcomingAppointments(token);
  }, [router]);

  
  const fetchUpcomingAppointments = async (token: string) => {
    try {
      const response = await axios.get("http://localhost:8000/appointments/me/upcoming", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAppointments(response.data.appointments || []);
    } catch (err: any) {
      console.error("Failed to load upcoming appointments", err);
      setError("Unable to retrieve your appointments from the server.");
    } finally {
      setLoading(false);
    }
  };

  
  const handleCancelAppointment = async (appointmentId: number, refNumber: string) => {
    if (!window.confirm(`Are you absolutely sure you want to cancel the appointment (${refNumber})? This action cannot be undone.`)) {
      return;
    }

    setCancellingId(appointmentId);
    setActionMessage({ text: "", type: "" });

    try {
      const token = localStorage.getItem("medcare_token");
      await axios.put(`http://localhost:8000/appointments/${appointmentId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setActionMessage({ text: `Appointment ${refNumber} has been successfully cancelled.`, type: "success" });
      
      
      setAppointments(prev => prev.filter(apt => apt.appointment_id !== appointmentId));
      
      setTimeout(() => setActionMessage({ text: "", type: "" }), 4000);
    } catch (err: any) {
      let errorText = "Failed to cancel the appointment.";
      if (err.response?.data?.detail) {
        errorText = typeof err.response.data.detail === "string" ? err.response.data.detail : JSON.stringify(err.response.data.detail);
      }
      setActionMessage({ text: errorText, type: "error" });
    } finally {
      setCancellingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("medcare_token");
    router.push("/login");
  };

  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans overflow-hidden">
      
      {/* 🟢 SIDEBAR NAVIGATION */}
      <div className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col justify-between hidden md:flex z-10 shadow-2xl">
        <div>
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <ShieldCheck className="w-10 h-10 text-purple-400" />
            <div><h1 className="text-sm font-bold tracking-widest uppercase text-white">MedCare<br/><span className="text-purple-400">Patient Portal</span></h1></div>
          </div>
          <div className="p-4 space-y-2 mt-4">
            <Link href="/dashboard" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors">
              <Home size={18} /> Home
            </Link>
          </div>
        </div>
        <div className="p-4 border-t border-slate-800">
          <button onClick={handleLogout} className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-red-950/40 border border-red-900 text-red-400 rounded-xl text-xs font-bold tracking-widest uppercase hover:bg-red-900/60 transition-colors">
            <LogOut size={16} /> Secure Logout
          </button>
        </div>
      </div>

      {/* 🟢 MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto p-8 md:p-12 max-w-5xl mx-auto relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none"></div>

        <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-purple-400 mb-6 text-[10px] font-bold uppercase tracking-widest z-10 transition-colors">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>

        <div className="mb-10 flex items-center gap-4 z-10">
          <div className="w-12 h-12 bg-purple-900/20 border border-purple-900/50 rounded-xl flex items-center justify-center">
            <CalendarClock className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-3xl font-light tracking-widest uppercase text-white mb-1">
              Upcoming <span className="font-bold text-purple-400">Visits</span>
            </h2>
            <p className="text-xs text-slate-500 tracking-widest uppercase">Manage and monitor your scheduled appointments</p>
          </div>
        </div>

        {/* Alerts & Notifications */}
        {actionMessage.text && (
          <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 z-10 animate-fadeIn ${actionMessage.type === "success" ? "bg-emerald-950/40 border-emerald-900/50 text-emerald-400" : "bg-red-950/40 border-red-900/50 text-red-400"}`}>
            {actionMessage.type === "success" ? <CheckCircle2 size={20} className="shrink-0 mt-0.5" /> : <AlertTriangle size={20} className="shrink-0 mt-0.5" />}
            <p className="text-sm font-medium leading-relaxed">{actionMessage.text}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl border bg-slate-900 border-slate-800 text-amber-500 flex items-start gap-3 z-10 shadow-lg">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div className="text-xs leading-relaxed uppercase tracking-widest font-bold">{error}</div>
          </div>
        )}

        {/* Appointments List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 z-10">
            <CalendarClock size={40} className="animate-pulse mb-4 opacity-50 text-purple-400/50" />
            <p className="text-xs uppercase tracking-widest">Retrieving your schedules...</p>
          </div>
        ) : (
          <div className="z-10 animate-fadeIn space-y-6">
            
            {appointments.length === 0 && !error ? (
              <div className="text-center py-24 border border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
                <Stethoscope size={48} className="mx-auto text-slate-700 mb-4 opacity-50" />
                <p className="text-sm text-slate-400 tracking-widest uppercase font-bold mb-2">No Upcoming Visits</p>
                <p className="text-xs text-slate-600 tracking-widest uppercase">You don't have any medical appointments scheduled at the moment.</p>
                <Link href="/dashboard/book" className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-800/50 text-purple-300 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors">
                  Book a New Appointment
                </Link>
              </div>
            ) : (
              appointments.map((apt) => {
                
                const isInProgress = apt.status === "In Progress";

                return (
                  <div key={apt.appointment_id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl hover:border-purple-900/50 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group">
                    
                    {/* Details Section */}
                    <div className="flex-1 w-full">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="px-3 py-1 bg-slate-950 border border-slate-800 text-slate-400 rounded-lg text-[10px] font-bold uppercase tracking-widest font-mono flex items-center gap-1.5">
                          <Hash size={12}/> {apt.reference_number}
                        </span>
                        <span className={`px-3 py-1 border rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${isInProgress ? "bg-amber-950/50 border-amber-900/50 text-amber-400" : "bg-emerald-950/50 border-emerald-900/50 text-emerald-400"}`}>
                          {isInProgress ? <Activity size={12} className="animate-pulse" /> : <CheckCircle2 size={12} />}
                          {apt.status}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                         Dr. {apt.doctor_name}
                      </h3>
                      
                      <div className="flex flex-col sm:flex-row gap-4 mt-4">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                          <CalendarClock size={14} className="text-purple-400" />
                          {formatDate(apt.date)}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                          <User size={14} className="text-purple-400" />
                          Queue Slot: <span className="text-white text-lg font-mono ml-1">{String(apt.slot_number).padStart(2, '0')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Section */}
                    <div className="w-full md:w-auto border-t md:border-t-0 border-slate-800 pt-6 md:pt-0 flex flex-col items-start md:items-end">
                      <button 
                        onClick={() => handleCancelAppointment(apt.appointment_id, apt.reference_number)}
                        disabled={cancellingId === apt.appointment_id || isInProgress}
                        className="w-full md:w-auto px-6 py-3 bg-red-950/30 hover:bg-red-900/50 border border-red-900/50 text-red-400 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all flex justify-center items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                        title={isInProgress ? "Cannot cancel an appointment that is already in progress." : "Cancel this appointment"}
                      >
                        {cancellingId === apt.appointment_id ? (
                          <><Activity size={14} className="animate-spin" /> Cancelling...</>
                        ) : (
                          <><XCircle size={14} /> Cancel Appointment</>
                        )}
                      </button>
                      {isInProgress && (
                        <p className="text-[9px] text-amber-500 uppercase tracking-widest font-bold mt-3 text-center md:text-right">
                          Currently in consultation.<br/>Cannot be cancelled.
                        </p>
                      )}
                    </div>

                  </div>
                );
              })
            )}

          </div>
        )}

      </div>
    </div>
  );
}