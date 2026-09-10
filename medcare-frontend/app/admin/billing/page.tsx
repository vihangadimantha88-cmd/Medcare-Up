"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { ShieldCheck, LayoutDashboard, Receipt, CalendarClock, Users, Fingerprint, UserCog, LogOut, Activity, CreditCard, Clock, User } from "lucide-react";

export default function AutomatedBillingDesk() {
  const router = useRouter();
  const [pendingBills, setPendingBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("medcare_token");
    if (!token) { router.push("/login"); return; }
    fetchBills(token);
    const interval = setInterval(() => fetchBills(token), 15000);
    return () => clearInterval(interval);
  }, [router]);

  // 🚀 FIXED API: /admin/billing/live-desk
  const fetchBills = async (token: string) => {
    try {
      const response = await axios.get("http://34.229.165.55:8000/admin/billing/live-desk", { headers: { Authorization: `Bearer ${token}` } });
      setPendingBills(response.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  // 🚀 FIXED API: /bills/{id}/pay
  const handlePay = async (billId: number) => {
    setProcessingId(billId);
    try {
      await axios.post(`http://34.229.165.55:8000/bills/${billId}/pay`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem("medcare_token")}` }
      });
      setPendingBills(prev => prev.filter(b => b.bill_id !== billId));
    } catch (err) { alert("Payment failed."); } finally { setProcessingId(null); }
  };

  return (
    // ... (Keep your existing layout wrapper and sidebar) ...
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans overflow-hidden">
      
      {/* 🟢 ADMIN SIDEBAR (Same as Command Center Sidebar) */}
      <div className="w-72 bg-slate-950 border-r border-slate-800/60 flex flex-col justify-between hidden md:flex z-20">
        <div>
          <div className="p-6 border-b border-slate-800/60 flex items-center gap-3 bg-slate-900/20">
            <ShieldCheck className="w-10 h-10 text-indigo-500" />
            <h1 className="text-sm font-extrabold tracking-widest uppercase text-white">MedCare<br/><span className="text-indigo-400 text-[10px]">Admin Console</span></h1>
          </div>
          <div className="p-4 space-y-2 mt-4">
            <Link href="/admin" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-slate-300 hover:bg-slate-900/50"><LayoutDashboard size={18} /> Command Center</Link>
            <div className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-900/30 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-bold tracking-widest uppercase"><Receipt size={18} /> Automated Billing</div>
            <Link href="/admin/schedule" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-slate-300 hover:bg-slate-900/50"><CalendarClock size={18} /> Schedule & Ops</Link>
            <Link href="/admin/employees" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-slate-300 hover:bg-slate-900/50"><Users size={18} /> Employee Management</Link>
            <Link href="/admin/forensics" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-slate-300 hover:bg-slate-900/50"><Fingerprint size={18} /> Digital Forensics</Link>
            <Link href="/admin/security" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-slate-300 hover:bg-slate-900/50"><UserCog size={18} /> Profile & Security</Link>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto p-10">
        <h2 className="text-3xl font-light text-white mb-8 tracking-widest uppercase">Live <span className="font-bold text-indigo-500">Billing Desk</span></h2>
        
        {loading ? <Activity size={40} className="animate-spin text-indigo-500 mx-auto" /> : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pendingBills.map(bill => (
              <div key={bill.bill_id} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
                <div className="bg-slate-950 p-5 border-b border-slate-800 flex justify-between">
                  <p className="text-sm font-bold text-white font-mono">{bill.bill_number}</p>
                  <span className="text-amber-500 text-[9px] font-black uppercase"><Clock size={10} className="inline mr-1"/> Pending</span>
                </div>
                <div className="p-6 text-center">
                  <p className="text-[10px] text-slate-500 uppercase mb-1">Patient: {bill.patient_name}</p>
                  <p className="text-3xl font-black text-indigo-400 font-mono">Rs.{bill.total_amount}</p>
                </div>
                <button onClick={() => handlePay(bill.bill_id)} disabled={processingId === bill.bill_id} className="p-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase transition-all flex items-center justify-center gap-2">
                  {processingId === bill.bill_id ? <Activity size={16} className="animate-spin" /> : <><CreditCard size={16} /> Mark as Paid</>}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}