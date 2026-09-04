"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { 
  ShieldCheck, Home, LogOut, Activity, CreditCard, Lock, ArrowLeft, 
  Receipt, AlertCircle, Printer, Info, User
} from "lucide-react";

export default function CurrentBillPage() {
  const router = useRouter();
  const [billData, setBillData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [patientName, setPatientName] = useState("Patient");

  useEffect(() => {
    const token = localStorage.getItem("medcare_token");
    if (!token) { router.push("/login"); return; }
    fetchBillData(token);
    fetchProfile(token);
  }, [router]);

  const fetchProfile = async (token: string) => {
    try {
      const response = await axios.get("http://localhost:8000/patients/me/profile", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatientName(response.data.first_name || "Patient");
    } catch (err) {}
  };

  const fetchBillData = async (token: string) => {
    try {
      const response = await axios.get("http://localhost:8000/patients/me/billing/current", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      
      if (response.data.message) {
        setBillData(null);
      } else {
        setBillData(response.data);
      }
    } catch (err: any) {
      console.error("Failed to load current bill", err);
      setError("Unable to retrieve billing information.");
    } finally {
      setLoading(false);
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
            <Link href="/dashboard/billing" className="w-full flex items-center gap-3 px-4 py-3 bg-cyan-900/30 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all"><CreditCard size={18} /> Billing</Link>
            <Link href="/dashboard/security" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50"><Lock size={18} /> Security & Privacy</Link>
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
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none"></div>

        <Link href="/dashboard/billing" className="inline-flex items-center gap-2 text-slate-500 hover:text-cyan-400 mb-6 text-[10px] font-bold uppercase tracking-widest z-10 transition-colors">
          <ArrowLeft size={14} /> Back to Billing Hub
        </Link>

        <div className="mb-10 flex items-center gap-4 z-10">
          <div className="w-12 h-12 bg-cyan-900/20 border border-cyan-900/50 rounded-xl flex items-center justify-center">
            <Receipt className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-3xl font-light tracking-widest uppercase text-white mb-1">
              Current <span className="font-bold text-cyan-400">Bill</span>
            </h2>
            <p className="text-xs text-slate-500 tracking-widest uppercase">Review your active pending invoice</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 z-10">
            <Receipt size={40} className="animate-pulse mb-4 opacity-50 text-cyan-400/50" />
            <p className="text-xs uppercase tracking-widest">Retrieving billing data...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl border bg-slate-900 border-slate-800 text-red-400 flex items-start gap-3 z-10">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div className="text-xs leading-relaxed uppercase tracking-widest">{error}</div>
          </div>
        ) : !billData ? (
          <div className="z-10 text-center py-24 border border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
            <ShieldCheck size={48} className="mx-auto text-slate-700 mb-4 opacity-50" />
            <p className="text-sm text-slate-400 tracking-widest uppercase font-bold mb-2">No Pending Bills</p>
            <p className="text-xs text-slate-600 tracking-widest uppercase">You are all caught up! There are no active invoices to pay.</p>
          </div>
        ) : (
          <div className="z-10 animate-fadeIn">
            {/* 🧾 INVOICE CARD */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              
              {/* Invoice Header */}
              <div className="p-8 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50">
                <div>
                  <h3 className="text-2xl font-black text-white tracking-widest uppercase mb-1">INVOICE</h3>
                  <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                    REF: <span className="text-cyan-400">{billData.bill_id}</span>
                  </p>
                </div>
                <div className="flex flex-col items-start md:items-end">
                  <span className="px-3 py-1 bg-amber-950/40 border border-amber-900/50 text-amber-500 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> PENDING PAYMENT
                  </span>
                  <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                    DATE: {billData.date}
                  </p>
                </div>
              </div>

              {/* Invoice Items Table */}
              <div className="p-8">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-widest">
                      <th className="pb-4 font-bold">Description</th>
                      <th className="pb-4 font-bold text-right">Amount (LKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {billData.items && billData.items.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-5 text-sm font-medium text-slate-300">{item.description}</td>
                        <td className="py-5 text-sm text-white font-mono text-right">{parseFloat(item.amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Invoice Footer (Totals) */}
              <div className="p-8 bg-slate-950 border-t border-slate-800 flex flex-col items-end">
                <div className="w-full md:w-1/2 space-y-3">
                  <div className="flex justify-between items-center text-xs text-slate-400 uppercase tracking-widest font-bold">
                    <span>Subtotal:</span>
                    <span className="font-mono text-slate-300">{parseFloat(billData.total_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg text-white uppercase tracking-widest font-black pt-4 border-t border-slate-800">
                    <span>Total Due:</span>
                    <span className="text-cyan-400 font-mono flex items-center gap-2">
                      <span className="text-xs text-slate-500">LKR</span> {parseFloat(billData.total_amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 🛑 LOGICAL FIX: INSTRUCTION INSTEAD OF PAYMENT GATEWAY */}
            <div className="mt-8 bg-cyan-950/20 border border-cyan-900/50 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
              <div className="flex items-start gap-4">
                <Info size={24} className="text-cyan-400 shrink-0 mt-1" />
                <div>
                  <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-1">Payment Instructions</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Please visit the main hospital cashier desk to settle this invoice. Provide your Invoice Reference Number (<span className="text-white font-mono">{billData.bill_id}</span>) to the counter staff. Once paid, this bill will automatically move to your Payment History.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => window.print()}
                className="shrink-0 px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-xs font-bold tracking-widest uppercase transition-all flex items-center gap-2"
              >
                <Printer size={16} /> Print Invoice
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}