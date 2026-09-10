"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { 
  ShieldCheck, Pill, Stethoscope, Calendar, CheckCircle2, AlertOctagon, 
  User, Building, Activity, FileText, Download 
} from "lucide-react";

export default function PublicPrescriptionVerification() {
  const params = useParams();
  const prescriptionId = params.id as string;
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (prescriptionId) {
      verifyPrescription(prescriptionId);
    }
  }, [prescriptionId]);

  const verifyPrescription = async (id: string) => {
    try {
      // 🚨 Public API Call (No Authorization Headers needed)
      const response = await axios.get(`http://localhost:8000/verify/prescription/${id}`);
      setData(response.data);
    } catch (err: any) {
      console.error("Verification Error:", err);
      setError(err.response?.data?.detail || "Invalid or Tampered Prescription. Verification Failed.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-cyan-500/50 font-sans">
        <Activity size={50} className="animate-pulse mb-4" />
        <p className="text-xs uppercase tracking-widest font-bold">Verifying Digital Signature...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-900 border-2 border-red-900/50 rounded-3xl p-10 text-center shadow-[0_0_50px_rgba(220,38,38,0.15)]">
          <AlertOctagon size={64} className="text-red-500 mx-auto mb-6 opacity-80" />
          <h1 className="text-xl font-black tracking-widest uppercase text-red-500 mb-2">Verification Failed</h1>
          <p className="text-sm text-slate-400 font-mono mb-8">{error}</p>
          <div className="text-[10px] text-slate-500 uppercase tracking-widest bg-slate-950 p-4 rounded-xl border border-slate-800">
            Ensure the QR code was scanned correctly from an authorized MedCare document.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30 py-12 px-4 md:px-0 print:bg-white print:text-black print:h-auto print:overflow-visible">      
      <div className="max-w-4xl mx-auto">
        {/* Header / Brand */}
        <div className="flex flex-col items-center justify-center mb-10">
          <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <ShieldCheck size={32} className="text-cyan-400" />
          </div>
          <h1 className="text-2xl font-black tracking-widest uppercase text-white">MedCare <span className="text-cyan-400">Verify</span></h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Global Prescription Verification System</p>
        </div>

        {/* The E-Prescription Document */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
          
          {/* Authentic Ribbon */}
          <div className="bg-emerald-950/40 border-b border-emerald-900/50 px-8 py-4 flex items-center justify-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-400" />
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400">{data.status}</span>
          </div>

          <div className="p-8 md:p-12">
            
            {/* Header Details */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-8 border-b border-slate-800 mb-8">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-3 mb-2">
                  <Stethoscope size={24} className="text-cyan-400" /> Dr. {data.doctor_details.name}
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                  <span className="flex items-center gap-1.5"><Building size={12} className="text-cyan-500/70" /> DEPT: {data.doctor_details.specialization || "General"}</span>
                  <span className="flex items-center gap-1.5"><FileText size={12} className="text-cyan-500/70" /> SLMC: {data.doctor_details.slmc_number}</span>
                </div>
              </div>

              <div className="text-left md:text-right w-full md:w-auto bg-slate-950 p-4 rounded-xl border border-slate-800">
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Prescription Ref</p>
                <p className="text-lg font-mono font-bold text-cyan-400">{data.prescription_id}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-1"><Calendar size={10} className="inline mr-1" /> {data.issue_date}</p>
              </div>
            </div>

            {/* Patient Details */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 mb-8 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-cyan-950/30 border border-cyan-900/50 flex items-center justify-center shrink-0">
                <User size={20} className="text-cyan-400" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full text-[11px] font-mono">
                <div><span className="text-slate-500 block uppercase tracking-widest text-[9px] mb-1">Patient Name</span><span className="text-slate-200 font-bold">{data.patient_details.name}</span></div>
                <div><span className="text-slate-500 block uppercase tracking-widest text-[9px] mb-1">Patient ID</span><span className="text-slate-200">{data.patient_details.pid}</span></div>
                <div><span className="text-slate-500 block uppercase tracking-widest text-[9px] mb-1">Age</span><span className="text-slate-200">{data.patient_details.age} Years</span></div>
                <div><span className="text-slate-500 block uppercase tracking-widest text-[9px] mb-1">Gender</span><span className="text-slate-200">{data.patient_details.gender}</span></div>
              </div>
            </div>

            {/* Medicines List */}
            <div className="mb-8">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Pill size={14} className="text-cyan-400" /> Prescribed Medications
              </h3>
              <div className="border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-[9px] text-slate-500 uppercase tracking-widest">
                      <th className="p-4 font-bold">Medicine</th>
                      <th className="p-4 font-bold">Dosage</th>
                      <th className="p-4 font-bold">Frequency</th>
                      <th className="p-4 font-bold">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {data.medicines.map((med: any, idx: number) => (
                      <tr key={idx} className="bg-slate-900/50 hover:bg-slate-800/50 transition-colors">
                        <td className="p-4 text-sm font-bold text-white">
                          {med.medicine_name}
                          {med.generic_name && <span className="block text-[9px] text-slate-500 font-normal mt-1">({med.generic_name})</span>}
                        </td>
                        <td className="p-4 text-xs text-slate-300 font-mono">{med.dose}</td>
                        <td className="p-4">
                          <span className="text-[9px] font-bold tracking-widest uppercase text-cyan-200 bg-cyan-950/40 border border-cyan-900/50 px-2 py-1 rounded block w-fit mb-1">
                            {med.frequency}
                          </span>
                          <span className="text-[9px] text-slate-500">{med.before_after_meals}</span>
                        </td>
                        <td className="p-4 text-xs text-slate-400 font-mono">{med.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Doctor Note */}
            {data.doctor_note && (
              <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Additional Clinical Notes</span>
                <p className="text-xs text-slate-300 leading-relaxed font-mono">{data.doctor_note}</p>
              </div>
            )}

          </div>

          <div className="bg-slate-950 px-8 py-6 border-t border-slate-800 flex justify-between items-center">
             <p className="text-[9px] text-slate-500 uppercase tracking-widest max-w-sm">This is a digitally verified medical document issued by Project MedCare. Do not dispense medicines if the verification status is failed.</p>
            <button onClick={() => window.print()} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 border border-slate-700 print:hidden">               <Download size={12} /> Print Record
             </button>
          </div>

        </div>
      </div>
    </div>
  );
}