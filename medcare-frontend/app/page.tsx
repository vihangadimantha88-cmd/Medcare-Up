"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

// 🎬 CINEMATIC SCROLL REVEAL HOOK
function RevealText({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.3, rootMargin: "0px 0px -50px 0px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={ref} 
      className={`transition-all duration-2000 ease-[cubic-bezier(0.16,1,0.3,1)] ${isVisible ? "opacity-100 translate-y-0 scale-100 blur-none" : "opacity-0 translate-y-24 scale-95 blur-sm"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function MedCareCinematicPage() {
  const [scrollPos, setScrollPos] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => setScrollPos(window.scrollY);
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ 
        x: (e.clientX / window.innerWidth - 0.5) * 40, 
        y: (e.clientY / window.innerHeight - 0.5) * 40 
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("mousemove", handleMouse);
    
    document.documentElement.style.scrollBehavior = "smooth";
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouse);
      document.documentElement.style.scrollBehavior = "auto";
    };
  }, []);

  // 🟢 SAFE CALCULATION TO PREVENT NaN ERROR
  const docHeight = typeof window !== "undefined" ? Math.max(document.body.scrollHeight - window.innerHeight, 1) : 1;
  const scrollPercent = docHeight > 0 ? scrollPos / docHeight : 0;

  return (
    <div className="relative bg-[#020407] text-[#F4F7F8] font-sans selection:bg-[#4DE8E0]/20 min-h-screen">
      
      {/* 🌌 AMBIENT BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-center">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-screen"></div>
        
        <div 
          className="absolute rounded-full mix-blend-screen transition-all duration-1000 ease-out"
          style={{ 
            width: `${40 + (scrollPercent * 60)}vw`,
            height: `${40 + (scrollPercent * 60)}vw`,
            background: 'radial-gradient(circle, rgba(77,141,255,0.06) 0%, rgba(77,232,224,0.02) 40%, transparent 70%)',
            transform: `translate(${mousePos.x}px, ${mousePos.y}px)`,
            filter: `blur(${80 + (scrollPercent * 40)}px)`,
            opacity: Math.max(0, 1 - (scrollPercent * 0.5)) 
          }}
        ></div>
      </div>

      {/* 🧭 FIXED PREMIUM NAVBAR */}
      <nav className={`fixed top-0 w-full z-50 px-8 md:px-12 py-8 flex justify-between items-center transition-all duration-1000 ${scrollPos > 50 ? 'bg-[#020407]/90 backdrop-blur-xl py-5 border-b border-white/[0.03]' : 'bg-transparent'}`}>
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4DE8E0] opacity-50"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#4DE8E0]"></span>
          </div>
          <span className="text-xs font-semibold tracking-[0.2em] text-[#F4F7F8] uppercase">MedCare</span>
        </div>
        
        <div className="flex items-center gap-10 text-[10px] font-bold tracking-[0.2em] text-[#7E8A94] uppercase">
          <Link href="/login" className="hover:text-[#F4F7F8] transition-colors">Login</Link>
          <Link href="/register" className="text-[#4DE8E0] hover:text-[#F4F7F8] transition-colors relative group">
            Register
            <span className="absolute -bottom-2 left-0 w-0 h-[1px] bg-[#4DE8E0] transition-all duration-300 group-hover:w-full"></span>
          </Link>
        </div>
      </nav>

      <main className="relative z-10">
        
        {/* 🎬 SCENE 01: THE HOOK & THE HOLOGRAPHIC STETHOSCOPE STORY */}
        <section className="h-svh flex flex-col items-center justify-center text-center px-6 relative">
          
          <div className="relative z-30 pb-20 md:pb-32">
            <RevealText delay={200}>
              <h1 className="text-6xl md:text-8xl lg:text-[130px] font-medium tracking-tighter text-[#F4F7F8] leading-none mb-2">
                YOUR HEALTH.
              </h1>
            </RevealText>
            
            <RevealText delay={600}>
              <h1 className="text-6xl md:text-8xl lg:text-[130px] font-light tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#4DE8E0] to-[#4D8DFF] leading-none mb-12">
                IN MOTION.
              </h1>
            </RevealText>

            <RevealText delay={1000}>
              <p className="text-sm md:text-base text-[#7E8A94] font-light tracking-widest max-w-md mx-auto uppercase">
                A Living Digital Space For Your Care.
              </p>
            </RevealText>
          </div>

          {/* 🫀 THE HOLOGRAPHIC STETHOSCOPE ELEVATOR HOOK */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[160px] w-[140px] overflow-hidden z-20 flex flex-col items-center justify-end pointer-events-none">
            
            {/* Light Beam */}
            <div className="absolute bottom-0 w-20 h-full bg-gradient-to-t from-[#4DE8E0]/15 to-transparent opacity-0 animate-shaftBeam"></div>

            {/* The Stethoscope & Pulse Wave Group (Descends together) */}
            <div className="relative flex flex-col items-center z-10 w-full animate-elevatorDescend">
              
              <div className="animate-pulseFloating">
                <svg viewBox="0 0 80 80" className="w-[60px]  h-15 drop-shadow-[0_0_12px_rgba(77,232,224,0.6)]">
                  {/* Glowing Stethoscope Head & Tubing */}
                  <path d="M 25 20 C 25 50 55 50 55 20" fill="none" stroke="#4DE8E0" strokeWidth="3" strokeLinecap="round" />
                  <line x1="40" y1="42" x2="40" y2="60" stroke="#4D8DFF" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="40" cy="63" r="6" fill="#F4F7F8" stroke="#4DE8E0" strokeWidth="2" />
                  
                  {/* Center Pulse Sparkle */}
                  <circle cx="40" cy="35" r="3" fill="#4DE8E0" className="animate-ping" />
                </svg>
              </div>

              {/* Glowing Platform */}
              <div className="w-[90px] h-[2px] bg-[#4DE8E0] opacity-0 animate-platformGlow mt-2 rounded-full shadow-[0_0_15px_#4DE8E0]"></div>
            </div>

          </div>
        </section>

        {/* 🎬 SCENE 02: THE AWAKENING */}
        <section className="min-h-[120vh] flex flex-col items-center justify-center px-6 py-32 text-center relative">
          <div className="space-y-40 w-full max-w-5xl">
            <RevealText>
              <h2 className="text-4xl md:text-6xl lg:text-8xl font-medium tracking-tight text-[#F4F7F8]">
                BEYOND RECORDS.
              </h2>
            </RevealText>
            
            <RevealText>
              <h2 className="text-4xl md:text-6xl lg:text-8xl font-light italic tracking-tight text-[#7E8A94]">
                BEYOND APPOINTMENTS.
              </h2>
            </RevealText>

            <RevealText>
              <div className="w-full flex justify-center">
                <div className="w-[1px] h-32 bg-gradient-to-b from-transparent via-[#4DE8E0]/40 to-transparent"></div>
              </div>
            </RevealText>
          </div>
        </section>

        {/* 🎬 SCENE 03: THE ESSENCE */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 py-32 text-center">
          <div className="max-w-4xl mx-auto space-y-12">
            <RevealText delay={0}>
              <p className="text-[10px] font-mono tracking-[0.4em] text-[#4D8DFF]/60 uppercase mb-8">
                The Core Philosophy
              </p>
            </RevealText>

            <RevealText delay={200}>
              <h2 className="text-3xl md:text-5xl lg:text-7xl font-light tracking-tighter text-[#F4F7F8] leading-[1.2]">
                EVERYTHING
                <span className="block mt-2 font-medium text-transparent bg-clip-text bg-gradient-to-r from-[#F4F7F8] to-[#7E8A94]">CONNECTED.</span>
              </h2>
            </RevealText>

            <RevealText delay={400}>
              <p className="text-sm md:text-base text-[#7E8A94] font-light tracking-wide max-w-xl mx-auto leading-relaxed">
                Step into a unified ecosystem where your history, laboratory diagnostics, and clinical prescriptions flow seamlessly into one secure sanctuary.
              </p>
            </RevealText>
          </div>
        </section>

        {/* 🎬 SCENE 04: THE CLIMAX */}
        <section className="min-h-screen flex items-center justify-center px-6 py-32 relative overflow-hidden bg-black">
          
          <div 
            className="absolute inset-0 z-0 transition-opacity duration-1000 flex items-center justify-center"
            style={{ opacity: scrollPercent > 0.85 ? 1 : 0 }}
          >
            <div className="w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(77,232,224,0.15)_0%,rgba(77,141,255,0.05)_40%,transparent_70%)] rounded-full blur-[60px] animate-[pulse_4s_ease-in-out_infinite]"></div>
          </div>

          <div className="relative z-10 w-full max-w-3xl mx-auto text-center">
            
            <RevealText delay={0}>
              <p className="text-[12px] font-mono tracking-[0.5em] text-[#7E8A94] uppercase mb-12">
                Your Sanctuary Awaits
              </p>
            </RevealText>

            <RevealText delay={300}>
              <h2 className="text-6xl md:text-9xl font-medium tracking-tighter text-[#F4F7F8] leading-none mb-6">
                ENTER THE<br/>
                <span className="italic font-light text-[#4DE8E0]">NEW ERA.</span>
              </h2>
            </RevealText>
            
            <RevealText delay={600}>
              <div className="mt-20 group relative inline-block">
                <div className="absolute -inset-2 bg-gradient-to-r from-[#4DE8E0] to-[#4D8DFF] rounded-full blur-xl opacity-20 group-hover:opacity-60 transition-opacity duration-700 animate-pulse"></div>
                
                <Link 
                  href="/register" 
                  className="relative flex items-center gap-4 bg-[#F4F7F8] text-[#020407] px-12 py-5 rounded-full text-xs font-bold tracking-[0.3em] uppercase overflow-hidden transition-transform duration-500 hover:scale-105"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    Create Account <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform duration-500" />
                  </span>
                </Link>
              </div>
            </RevealText>

            <RevealText delay={900}>
              <div className="mt-16 flex justify-center items-center gap-6 text-[9px] font-mono tracking-[0.3em] text-[#7E8A94]/60 uppercase">
                <span>Secure</span>
                <span className="w-1 h-1 rounded-full bg-[#7E8A94]/30"></span>
                <span>Private</span>
                <span className="w-1 h-1 rounded-full bg-[#7E8A94]/30"></span>
                <span>Human</span>
              </div>
            </RevealText>

          </div>
        </section>

      </main>

      {/* 🟢 STYLING ANIMATIONS */}
      <style jsx global>{`
        @keyframes pulseFloating {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-8px) scale(1.03); }
        }
        .animate-pulseFloating { 
          animation: pulseFloating 3s ease-in-out infinite; 
        }

        @keyframes platformGlow {
          0%, 15% { opacity: 0; transform: scaleX(0); }
          20%, 95% { opacity: 1; transform: scaleX(1); box-shadow: 0 0 20px #4DE8E0; }
          100% { opacity: 0; }
        }
        .animate-platformGlow { 
          animation: platformGlow 12s ease-in-out infinite; 
        }

        @keyframes shaftBeam {
          0%, 20% { opacity: 0; }
          25%, 70% { opacity: 1; }
          75%, 100% { opacity: 0; }
        }
        .animate-shaftBeam { 
          animation: shaftBeam 12s ease-in-out infinite; 
        }

        @keyframes elevatorDescend {
          0%, 60% { transform: translateY(0); opacity: 1; }
          80% { transform: translateY(160px); opacity: 0; filter: blur(4px); }
          81%, 100% { transform: translateY(160px); opacity: 0; }
        }
        .animate-elevatorDescend { 
          animation: elevatorDescend 12s cubic-bezier(0.4, 0, 0.2, 1) infinite; 
        }
      `}</style>

    </div>
  );
}