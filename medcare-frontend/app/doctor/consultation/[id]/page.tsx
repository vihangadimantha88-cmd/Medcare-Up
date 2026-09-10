"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { 
  Stethoscope, LayoutDashboard, Users, UserCheck, PlayCircle, Clock, 
  AlertTriangle, CheckCircle2, FlaskConical, Pill, ArrowLeft, Send, 
  Save, AlertOctagon, Info, ShieldAlert, Plus, Trash2, Activity, ScrollText 
} from "lucide-react";

// Pre-approved Medicines (100% matched with PDF requirements)
const MEDICINE_LIST = [
  "Paracetamol", "Diclofenac", "Ibuprofen", "Drotaverine", "Tramadol", 
  "Ciprofloxacin", "Amoxicillin", "Nitrofurantoin", "Ceftriaxone", "Azithromycin", 
  "Potassium Citrate", "Tamsulosin", "Sildenafil", "Prednisolone", "Furosemide (Lasix)", 
  "Losartan", "Amlodipine", "Metformin", "Insulin", "Erythropoietin (EPO)", 
  "Calcium Carbonate", "Vitamin C", "Vitamin B-Complex", "Iron Tablets", "Folic Acid"
];

export default function ConsultationActionPage() {
  const router = useRouter();
  const params = useParams();
  const appointmentId = params.id as string;

  // States
  const [loading, setLoading] = useState(true);
  const [patientInfo, setPatientInfo] = useState<{slot_number: number, patient_name: string, status: string} | null>(null);
  
  // 🟢 Workflow States
  const [isArrived, setIsArrived] = useState(false);
  const [arriving, setArriving] = useState(false);
  const [completing, setCompleting] = useState(false);

  // 🧪 Lab Test States
  const [labCatalog, setLabCatalog] = useState<{test_name: string, price: number}[]>([]);
  const [selectedLabTest, setSelectedLabTest] = useState("");
  const [sendingLab, setSendingLab] = useState(false);

  // 💊 Prescription States
  const [doctorNote, setDoctorNote] = useState("");
  const [medicines, setMedicines] = useState<any[]>([]);
  const [sendingRx, setSendingRx] = useState(false);
  const [ddiWarning, setDdiWarning] = useState<any>(null); // To store AI Warning
  
  // System messages
  const [sysMessage, setSysMessage] = useState({ text: "", type: "" }); // type: "success" | "error"

  useEffect(() => {
    const token = localStorage.getItem("medcare_token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchConsultationData(token);
    fetchLabCatalog(token);
  }, [appointmentId, router]);

  // 1. Fetch Patient Info (From Dashboard Queue due to Clinical Blindness)
  const fetchConsultationData = async (token: string) => {
    try {
      const response = await axios.get("http://34.229.165.55:8000/doctors/me/dashboard", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const queue = response.data.todays_queue || [];
      const apt = queue.find((a: any) => a.appointment_id === Number(appointmentId));
      
      if (!apt) {
        setSysMessage({ text: "Appointment not found or already completed.", type: "error" });
        setTimeout(() => router.push("/doctor/queue"), 3000);
        return;
      }

      setPatientInfo(apt);
      // "In Progress" නම් දැනටමත් 'Arrived' ඔබලා තියෙන්නේ
      if (apt.status === "In Progress") {
        setIsArrived(true);
      }
    } catch (err) {
      setSysMessage({ text: "Failed to load patient data.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchLabCatalog = async (token: string) => {
    try {
      const response = await axios.get("http://34.229.165.55:8000/doctors/lab-test-catalog", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLabCatalog(response.data);
    } catch (err) {
      console.error("Failed to load lab catalog");
    }
  };

  const showToast = (text: string, type: "success" | "error") => {
    setSysMessage({ text, type });
    setTimeout(() => setSysMessage({ text: "", type: "" }), 5000);
  };

  // 🚀 ACTION 1: PATIENT ARRIVED (Financial Trigger)
  const handleArrive = async () => {
    setArriving(true);
    try {
      const token = localStorage.getItem("medcare_token");
      await axios.post(`http://34.229.165.55:8000/appointments/${appointmentId}/arrive`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsArrived(true);
      showToast("Patient marked as Arrived. Consultation Fee applied securely.", "success");
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to mark as arrived.", "error");
    } finally {
      setArriving(false);
    }
  };

  // 🚀 ACTION 2: ADD MEDICINE ROW
  const addMedicineRow = () => {
    setMedicines([...medicines, {
      medicine_name: "", generic_name: "", strength: "", route: "Oral", 
      quantity: 1, before_after_meals: "After Meal", dose: "", frequency: "", duration: "", instructions: ""
    }]);
  };

  const updateMedicine = (index: number, field: string, value: any) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  const removeMedicine = (index: number) => {
    const updated = medicines.filter((_, i) => i !== index);
    setMedicines(updated);
  };

  // 🚀 ACTION 3: SEND PRESCRIPTION & AI DDI CHECK
  const handleSendPrescription = async (override = false) => {
    if (medicines.length === 0 && !doctorNote) {
      showToast("Prescription cannot be empty.", "error");
      return;
    }

    // Validate that required fields are filled for added medicines
    for (let med of medicines) {
      if (!med.medicine_name || !med.dose || !med.frequency || !med.duration) {
        showToast("Please fill all required fields (Name, Dose, Freq, Duration) for selected medicines.", "error");
        return;
      }
    }

    setSendingRx(true);
    setDdiWarning(null);

    try {
      const token = localStorage.getItem("medcare_token");
      await axios.post(`http://34.229.165.55:8000/appointments/${appointmentId}/prescribe`, {
        medicines: medicines,
        doctor_note: doctorNote,
        override_warning: override
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showToast("E-Prescription generated and securely sent to HealthVault.", "success");
      setMedicines([]);
      setDoctorNote("");

    } catch (err: any) {
      // Catch AI DDI Warning (400 Error with JSON Payload)
      if (err.response?.status === 400 && err.response?.data?.detail?.error_type === "DDI_WARNING") {
        setDdiWarning(err.response.data.detail);
      } else {
        showToast(err.response?.data?.detail || "Failed to send prescription.", "error");
      }
    } finally {
      setSendingRx(false);
    }
  };

  // 🚀 ACTION 4: SEND LAB REQUEST (Dual Trigger)
  const handleSendLabRequest = async () => {
    if (!selectedLabTest) return;
    setSendingLab(true);

    try {
      const token = localStorage.getItem("medcare_token");
      await axios.post(`http://34.229.165.55:8000/appointments/${appointmentId}/send-to-lab`, {
        test_name: selectedLabTest
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      showToast(`${selectedLabTest} request sent securely. Billing triggered.`, "success");
      setSelectedLabTest("");
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to send lab request.", "error");
    } finally {
      setSendingLab(false);
    }
  };

  // 🚀 ACTION 5: MARK AS COMPLETED (Session Kill & Update Queue)
  const handleComplete = async () => {
    if (!isArrived) {
      showToast("You must mark the patient as arrived first.", "error");
      return;
    }
    
    setCompleting(true);
    try {
      const token = localStorage.getItem("medcare_token");
      await axios.put(`http://34.229.165.55:8000/appointments/${appointmentId}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Redirect back to queue
      router.push("/doctor/queue");
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to complete appointment.", "error");
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-sky-500/50">
        <Activity size={50} className="animate-pulse mb-4" />
        <p className="text-xs uppercase tracking-widest font-bold">Initializing Secure Medical Workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans overflow-hidden selection:bg-sky-500/30">
      
      {/* 🔴 AI DDI WARNING MODAL (The Trap) */}
      {ddiWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fadeIn">
          <div className="max-w-2xl w-full bg-slate-900 border-2 border-red-500 rounded-3xl p-8 shadow-[0_0_50px_rgba(220,38,38,0.3)]">
            <div className="flex items-center gap-4 border-b border-slate-800 pb-5 mb-5">
              <div className="w-16 h-16 bg-red-950/50 border border-red-900 rounded-full flex items-center justify-center shrink-0">
                <AlertOctagon size={32} className="text-red-500 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-widest uppercase text-red-500 mb-1">{ddiWarning.title}</h2>
                <p className="text-xs text-red-200/70 font-mono uppercase">Medcare AI Decision Support System</p>
              </div>
            </div>
            
            <div className="space-y-4 font-mono text-sm mb-8">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Rule Match</span>
                <span className="text-amber-400 font-bold">{ddiWarning.rule_match}</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Risk Level</span>
                <span className="text-red-500 font-black">{ddiWarning.risk_level}</span>
              </div>
              <div className="bg-red-950/20 p-4 rounded-xl border border-red-900/30">
                <span className="text-[10px] text-red-500/70 uppercase tracking-widest block mb-1">Clinical Details</span>
                <span className="text-red-200 leading-relaxed">{ddiWarning.details}</span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <button 
                onClick={() => setDdiWarning(null)} 
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold tracking-widest uppercase transition-colors"
              >
                Cancel & Edit Prescription
              </button>
              <button 
                onClick={() => handleSendPrescription(true)} 
                className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black tracking-widest uppercase transition-colors shadow-[0_0_20px_rgba(220,38,38,0.3)] flex items-center justify-center gap-2 group"
              >
                <ShieldAlert size={16} className="group-hover:animate-ping" /> Override Warning & Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {sysMessage.text && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full text-xs font-bold tracking-widest uppercase shadow-2xl flex items-center gap-2 animate-fadeIn border ${
          sysMessage.type === "success" ? "bg-emerald-950/80 text-emerald-400 border-emerald-900/50" : "bg-red-950/80 text-red-400 border-red-900/50"
        }`}>
          {sysMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {sysMessage.text}
        </div>
      )}

      <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-950">
        
        {/* Header Bar */}
        <div className="bg-slate-900 border-b border-slate-800 p-6 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-30 shadow-lg">
          <div className="flex items-center gap-5">
            <Link href="/doctor/queue" className="w-10 h-10 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-600 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <p className="text-[10px] text-sky-400 font-mono uppercase tracking-widest mb-1 flex items-center gap-2">
                <Users size={12} /> Consultation Session
              </p>
              <h1 className="text-xl font-black text-white">{patientInfo?.patient_name} <span className="text-slate-500 font-normal">| Slot {patientInfo?.slot_number}</span></h1>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            {/* The Arrive Button - The Ultimate Lock */}
            <button 
              onClick={handleArrive}
              disabled={isArrived || arriving}
              className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${
                isArrived 
                  ? "bg-emerald-950/30 border border-emerald-900/50 text-emerald-500 cursor-not-allowed" 
                  : "bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              }`}
            >
              {arriving ? <Activity size={16} className="animate-spin" /> : <PlayCircle size={16} />}
              {isArrived ? "Session Active" : "Patient Arrived"}
            </button>

            <button 
              onClick={handleComplete}
              disabled={!isArrived || completing}
              className="flex-1 md:flex-none px-6 py-3 bg-sky-600 hover:bg-sky-500 border border-sky-500 text-white rounded-xl text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(56,189,248,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {completing ? <Activity size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Mark as Completed
            </button>
          </div>
        </div>

        {/* Clinical Blindness Warning */}
        <div className="bg-amber-950/20 border-b border-amber-900/30 px-8 py-3 flex items-center justify-center gap-3 text-[10px] text-amber-500 font-mono tracking-widest uppercase">
          <Info size={14} />
          Privacy Lock: Please request the patient to present their latest Medical & Lab Reports via their MedCare Phone App.
        </div>

        {/* Main Content Workspace */}
        <div className={`p-8 md:p-10 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 transition-opacity duration-500 ${isArrived ? "opacity-100" : "opacity-30 pointer-events-none grayscale-[50%]"}`}>
          
          {/* LEFT COLUMN: Lab Tests & Notes */}
          <div className="lg:col-span-1 space-y-8">
            
            {/* Lab Test Request Module */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
                <FlaskConical size={14} className="text-purple-400" /> Request Lab Tests
              </h3>
              
              <div className="space-y-4">
                <select 
                  value={selectedLabTest}
                  onChange={(e) => setSelectedLabTest(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors appearance-none cursor-pointer"
                >
                  <option value="" disabled>Select Lab Test</option>
                  {labCatalog.map((lab, i) => (
                    <option key={i} value={lab.test_name}>{lab.test_name} (Rs.{lab.price})</option>
                  ))}
                </select>

                <button 
                  onClick={handleSendLabRequest}
                  disabled={!selectedLabTest || sendingLab}
                  className="w-full py-3 bg-purple-900/50 hover:bg-purple-800 border border-purple-700 text-purple-100 rounded-xl text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(168,85,247,0.2)] disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {sendingLab ? <Activity size={14} className="animate-spin" /> : <Send size={14} />} Send Request & Bill
                </button>
              </div>
            </div>

            {/* Doctor's Private Note */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
                <ScrollText size={14} className="text-amber-400" /> Consultation Notes
              </h3>
              <textarea 
                value={doctorNote}
                onChange={(e) => setDoctorNote(e.target.value)}
                placeholder="Type clinical observations, dietary advice, or next visit details here... This will be attached to the prescription."
                className="w-full h-40 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors resize-none placeholder:text-slate-600 font-mono"
              />
            </div>

          </div>

          {/* RIGHT COLUMN: E-Prescription Builder */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col h-[70vh]">
            
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <Pill size={16} className="text-sky-400" /> Digital Prescription Builder
              </h3>
              <button 
                onClick={addMedicineRow}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-colors flex items-center gap-1.5"
              >
                <Plus size={12} /> Add Medicine
              </button>
            </div>

            {/* Medicine Rows Area */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-6 custom-scrollbar">
              {medicines.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-2xl">
                  <Pill size={40} className="mb-3 opacity-20" />
                  <p className="text-[10px] uppercase tracking-widest font-mono">No medicines added yet</p>
                </div>
              ) : (
                medicines.map((med, index) => (
                  <div key={index} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 relative group">
                    <button 
                      onClick={() => removeMedicine(index)}
                      className="absolute top-4 right-4 text-slate-600 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 pr-6">
                      {/* Name Selection (Strict Logic) */}
                      <div className="md:col-span-2">
                        <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Approved Medicine Name *</label>
                        <select 
                          value={med.medicine_name}
                          onChange={(e) => updateMedicine(index, "medicine_name", e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 appearance-none"
                        >
                          <option value="">-- Select Medicine --</option>
                          {MEDICINE_LIST.map((name) => <option key={name} value={name}>{name}</option>)}
                        </select>
                      </div>
                      
                      {/* Strength */}
                      <div>
                        <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Strength (e.g. 500mg)</label>
                        <input 
                          type="text" value={med.strength} onChange={(e) => updateMedicine(index, "strength", e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Dose *</label>
                        <select value={med.dose} onChange={(e) => updateMedicine(index, "dose", e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-sky-500 appearance-none">
                          <option value="">Select</option>
                          <option value="1 Tablet">1 Tab</option><option value="2 Tablets">2 Tabs</option>
                          <option value="1 Capsule">1 Cap</option><option value="5ml">5ml</option><option value="10ml">10ml</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Frequency *</label>
                        <select value={med.frequency} onChange={(e) => updateMedicine(index, "frequency", e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-sky-500 appearance-none">
                          <option value="">Select</option>
                          <option value="Daily">Daily</option><option value="BID">BID (x2)</option>
                          <option value="TID">TID (x3)</option><option value="QID">QID (x4)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Duration *</label>
                        <select value={med.duration} onChange={(e) => updateMedicine(index, "duration", e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-sky-500 appearance-none">
                          <option value="">Select</option>
                          <option value="3 Days">3 Days</option><option value="5 Days">5 Days</option>
                          <option value="1 Week">1 Week</option><option value="2 Weeks">2 Weeks</option><option value="1 Month">1 Month</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Timing</label>
                        <select value={med.before_after_meals} onChange={(e) => updateMedicine(index, "before_after_meals", e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-sky-500 appearance-none">
                          <option value="After Meal">After Meal</option><option value="Before Meal">Before Meal</option><option value="With Food">With Food</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Qty</label>
                        <input type="number" min="1" value={med.quantity} onChange={(e) => updateMedicine(index, "quantity", Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-sky-500 text-center font-mono"/>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-800 pt-6 mt-auto">
              <button 
                onClick={() => handleSendPrescription(false)}
                disabled={sendingRx || medicines.length === 0}
                className="w-full py-4 bg-sky-600 hover:bg-sky-500 border border-sky-500 text-white rounded-xl text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(56,189,248,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sendingRx ? <Activity size={16} className="animate-spin" /> : <Save size={16} />}
                Run AI DDI Check & Issue Prescription
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}