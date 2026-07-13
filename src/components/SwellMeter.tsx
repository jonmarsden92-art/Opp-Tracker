import React from "react";
import { motion } from "motion/react";
import { Compass, Anchor, Wind } from "lucide-react";

interface SwellMeterProps {
  score: number; // 0 to 100
  opportunityCount: number;
}

export default function SwellMeter({ score, opportunityCount }: SwellMeterProps) {
  // Determine state description
  let stateLabel = "Calm Waters";
  let stateDesc = "Few market disruptions detected.";
  let stateColor = "text-teal-600";

  if (score >= 85) {
    stateLabel = "Heavy Swell";
    stateDesc = "Prime gaps uncovered; swift action recommended.";
    stateColor = "text-amber-600";
  } else if (score >= 70) {
    stateLabel = "Moderate Sea";
    stateDesc = "Steady local opportunities surfacing across Birkdale and Churchtown.";
    stateColor = "text-blue-700";
  } else if (score > 0) {
    stateLabel = "Light Chop";
    stateDesc = "A few localized niches, standard coastal activity.";
    stateColor = "text-emerald-700";
  } else {
    stateLabel = "Slack Tide";
    stateDesc = "No opportunities currently active.";
    stateColor = "text-gray-500";
  }

  // Calculate rotation angle for dial (-90deg to +90deg)
  const rotation = -90 + (score / 100) * 180;

  return (
    <div id="swell-meter-container" className="bg-white border-t-8 shadow-xl p-6 rounded-none flex flex-col items-center justify-between h-full relative overflow-hidden" style={{ borderColor: "#1a2a3a" }}>

      <div className="w-full text-center border-b-2 border-dashed border-[#1a2a3a] pb-3 mb-4">
        <h3 className="font-serif font-bold text-[#1a2a3a] text-lg tracking-tight uppercase flex items-center justify-center gap-2">
          <Anchor className="w-5 h-5 text-[#b5a264]" />
          Swell Indicator
        </h3>
        <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mt-1">Southport Local Marine State</p>
      </div>

      {/* Dial Graphic */}
      <div className="relative w-44 h-24 flex items-end justify-center mb-4 mt-2 overflow-hidden">
        {/* Background semicircle scale */}
        <div className="absolute w-40 h-40 rounded-full border-4 border-dashed border-[#1a2a3a]/30 -bottom-20 flex items-center justify-center">
          <div className="absolute w-32 h-32 rounded-full border border-double border-[#1a2a3a]/20"></div>
        </div>

        {/* Outer Ring */}
        <svg className="absolute w-40 h-20 -bottom-0" viewBox="0 0 100 50">
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="#1a2a3a"
            strokeWidth="3"
          />
          {/* Tic marks */}
          <line x1="50" y1="10" x2="50" y2="15" stroke="#1a2a3a" strokeWidth="1" />
          <line x1="20" y1="25" x2="24" y2="28" stroke="#1a2a3a" strokeWidth="1" />
          <line x1="80" y1="25" x2="76" y2="28" stroke="#1a2a3a" strokeWidth="1" />
        </svg>

        {/* Semicircle scale readings */}
        <div className="absolute left-3 bottom-0 font-mono text-[9px] text-[#1a2a3a]">0% (CALM)</div>
        <div className="absolute right-3 bottom-0 font-mono text-[9px] text-[#1a2a3a]">100% (GALE)</div>
        <div className="absolute top-1 left-1/2 -translate-x-1/2 font-mono text-[9px] text-[#b5a264] font-semibold">50% (MODERATE)</div>

        {/* Needle */}
        <motion.div
          className="absolute origin-bottom bottom-0 w-1.5 h-16 bg-gradient-to-t from-[#1a2a3a] to-[#b5a264] rounded-t-full"
          style={{ x: "-50%", left: "50%" }}
          animate={{ rotate: rotation }}
          transition={{ type: "spring", stiffness: 60, damping: 15 }}
        >
          {/* Center spindle */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#1a2a3a] border-2 border-[#b5a264]"></div>
        </motion.div>
      </div>

      {/* Dynamic readings and description */}
      <div className="w-full text-center flex flex-col items-center">
        <div className="font-serif text-3xl font-extrabold text-[#1a2a3a] tracking-tight flex items-baseline justify-center gap-1">
          {Math.round(score)}
          <span className="text-sm font-sans font-medium text-gray-500">%</span>
        </div>
        <div className={`font-mono text-xs font-semibold uppercase tracking-wider ${stateColor} mt-1 flex items-center gap-1`}>
          <Wind className="w-3.5 h-3.5" />
          {stateLabel}
        </div>
        <p className="font-sans text-xs text-gray-600 leading-relaxed max-w-[240px] mt-2 italic px-2">
          "{stateDesc}"
        </p>
      </div>

      {/* Stats Footnote */}
      <div className="w-full mt-4 pt-3 border-t border-dashed border-gray-200 flex justify-between items-center text-[10px] font-mono text-gray-500">
        <span>GAPS SPOTTED: {opportunityCount}</span>
        <span className="flex items-center gap-1">
          <Compass className="w-3 h-3 text-[#b5a264] animate-spin-slow" />
          PR8/PR9 SECTOR
        </span>
      </div>
    </div>
  );
}
