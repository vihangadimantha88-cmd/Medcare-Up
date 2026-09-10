"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { ShieldCheck, Home, Activity, CreditCard, Lock, LogOut, ArrowLeft, Bot, Send, User, Loader2 } from "lucide-react";

export default function ArabellaChatPage() {
  const router = useRouter();
  
  // 🟢 FIXED: Professional English Greeting
  const [messages, setMessages] = useState([
    { sender: "arabella", text: "Hello! I am Arabella, your MedCare AI assistant. How can I help you with your health today, or would you like to schedule an appointment with one of our specialists?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { sender: "user", text: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      const token = localStorage.getItem("medcare_token");
      const res = await axios.post("http://34.229.165.55:8000/chat", 
        { message: userMessage }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessages(prev => [...prev, { sender: "arabella", text: res.data.response }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { sender: "arabella", text: "⚠️ I am currently experiencing a network interruption. Please try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("medcare_token");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans overflow-hidden selection:bg-cyan-500/30">
      
      {/* 🟢 SIDEBAR */}
      <div className="w-64 bg-slate-950 border-r border-slate-800/60 flex flex-col justify-between hidden md:flex z-20 shadow-[4px_0_24px_rgba(0,0,0,0.4)]">
        <div>
          <div className="p-6 border-b border-slate-800/60 flex items-center gap-3 bg-slate-900/20">
            <ShieldCheck className="w-8 h-8 text-cyan-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
            <div>
              <h1 className="text-sm font-extrabold tracking-widest uppercase text-white leading-tight">MedCare<br/><span className="text-cyan-400 text-[10px]">Patient Portal</span></h1>
            </div>
          </div>
          
          <div className="p-4 space-y-2 mt-4">
            <Link href="/dashboard" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <Home size={18} /> Home
            </Link>
            <Link href="/dashboard/health-vault" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <Activity size={18} /> My Health Vault
            </Link>
            <Link href="/dashboard/billing" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <CreditCard size={18} /> Billing
            </Link>
            <Link href="/dashboard/security" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-900/50">
              <Lock size={18} /> Security & Privacy
            </Link>
          </div>
        </div>
        <div className="p-4 border-t border-slate-800/60 bg-slate-900/20 flex flex-col gap-3">
          <button onClick={handleLogout} className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-900/50 text-slate-400 hover:text-red-400 rounded-xl text-xs font-bold tracking-widest uppercase transition-all">
            <LogOut size={16} /> Secure Logout
          </button>
        </div>
      </div>

      {/* 🟢 MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative bg-slate-950">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="flex-1 max-w-5xl w-full mx-auto z-10 flex flex-col p-6 md:p-10 h-full">
          
          <div className="flex justify-between items-center mb-6">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-cyan-400 transition-colors">
              <ArrowLeft size={12} /> Back to Dashboard
            </Link>
            <div className="flex items-center gap-2 px-3 py-1 bg-cyan-950/30 border border-cyan-900/50 rounded-full">
              <ShieldCheck size={12} className="text-cyan-400" />
              <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest">MedCare Triage</span>
            </div>
          </div>

          {/* 🟢 FIXED: REMOVED "ONLINE" TEXT */}
          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-t-3xl p-6 shadow-lg flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-950 border border-cyan-500/50 rounded-full flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Bot size={24} className="text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-widest uppercase text-white">ARABELLA <span className="text-cyan-500">AI</span></h2>
            </div>
          </div>

          {/* Chat Window */}
          <div className="flex-1 bg-slate-900/50 border-x border-slate-800 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 ${msg.sender === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.sender === "arabella" ? "bg-slate-950 border border-cyan-500/30" : "bg-cyan-900 border border-cyan-500/50"}`}>
                  {msg.sender === "arabella" ? <Bot size={16} className="text-cyan-400" /> : <User size={16} className="text-white" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${msg.sender === "arabella" ? "bg-slate-800 text-slate-200 rounded-tl-sm" : "bg-cyan-950/80 border border-cyan-900 text-cyan-50 rounded-tr-sm"}`}>
                  {/* Rendering AI text with basic markdown formatting */}
                  {msg.text.split('\n').map((line, i) => (
                    <p key={i} className={line.includes('✅') || line.includes('⚠️') ? 'mt-4 font-bold' : 'mb-2 last:mb-0'}>
                      {line.replace(/\*\*/g, '')}
                    </p>
                  ))}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-950 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-1">
                  <Bot size={16} className="text-cyan-400" />
                </div>
                <div className="bg-slate-800 rounded-2xl rounded-tl-sm p-4 flex items-center gap-2">
                  <Loader2 size={16} className="text-cyan-400 animate-spin" />
                  <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">Arabella is thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-b-3xl p-6">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your medical query or ask for an appointment..."
                disabled={loading}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl pl-6 pr-16 py-4 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
              />
              <button 
                type="submit" 
                disabled={!input.trim() || loading}
                className="absolute right-3 w-10 h-10 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50"
              >
                <Send size={18} className="ml-1" />
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}