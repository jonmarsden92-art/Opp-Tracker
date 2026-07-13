import React, { useState } from "react";
import { 
  Settings2, 
  Compass, 
  RefreshCw, 
  Layers, 
  Search, 
  Save, 
  Check, 
  Info, 
  AlertTriangle,
  Waves,
  Ship
} from "lucide-react";
import { ScoutSettings } from "../types";

interface ScoutControlPanelProps {
  settings: ScoutSettings;
  onUpdateSettings: (updated: Partial<ScoutSettings>) => Promise<void>;
  onTriggerScout: () => Promise<any>;
}

export default function ScoutControlPanel({ 
  settings, 
  onUpdateSettings, 
  onTriggerScout 
}: ScoutControlPanelProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"trigger" | "settings">("trigger");

  // Local settings state
  const [postcodesInput, setPostcodesInput] = useState(settings.postcodes.join(", "));
  const [subregionsInput, setSubregionsInput] = useState(settings.subregions.join(", "));
  const [keywordsInput, setKeywordsInput] = useState(settings.keywords.join(", "));
  const [cronSchedule, setCronSchedule] = useState(settings.cronSchedule);

  // Loading phase messages representing Southport coastal theme
  const [scoutPhase, setScoutPhase] = useState("");
  const phases = [
    "⚓ Sailing past Birkdale beach trails...",
    "🔍 Casting search nets on Sefton Planning Registries...",
    "📻 Analyzing local news for retail gaps and shop vacancies...",
    "🌊 Re-calculating Southport Tide and Swell Levels...",
    "📦 Cross-referencing findings against history.json log...",
    "🎨 Compiling new seafront harbour board..."
  ];

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const postcodes = postcodesInput.split(",").map(p => p.trim()).filter(Boolean);
    const subregions = subregionsInput.split(",").map(s => s.trim()).filter(Boolean);
    const keywords = keywordsInput.split(",").map(k => k.trim()).filter(Boolean);

    await onUpdateSettings({
      postcodes,
      subregions,
      keywords,
      cronSchedule
    });

    setSaving(false);
    showSuccess("Harbour specifications secured");
  };

  const handleTrigger = async () => {
    setLoading(true);
    
    // Cycle through local nautical phases for a gorgeous user experience
    let phaseIdx = 0;
    setScoutPhase(phases[0]);
    
    const interval = setInterval(() => {
      phaseIdx = (phaseIdx + 1) % phases.length;
      setScoutPhase(phases[phaseIdx]);
    }, 2000);

    try {
      await onTriggerScout();
      clearInterval(interval);
      setLoading(false);
      showSuccess("Southport sector scanned; new gaps recorded");
    } catch (error) {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div id="scout-control-room" className="bg-white border-t-8 shadow-xl p-6 rounded-none flex flex-col h-full relative" style={{ borderColor: "#1a2a3a" }}>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-5 font-mono text-xs">
        <button
          onClick={() => setActiveTab("trigger")}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-t-2 font-bold transition-all ${
            activeTab === "trigger" 
              ? "border-t-[#1a2a3a] text-[#1a2a3a] bg-gray-50 border-x border-x-gray-200 -mb-[1px]" 
              : "border-t-transparent text-gray-400 hover:text-gray-950"
          }`}
        >
          <Compass className="w-4 h-4" />
          Scout Engine
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-t-2 font-bold transition-all ${
            activeTab === "settings" 
              ? "border-t-[#1a2a3a] text-[#1a2a3a] bg-gray-50 border-x border-x-gray-200 -mb-[1px]" 
              : "border-t-transparent text-gray-400 hover:text-gray-950"
          }`}
        >
          <Settings2 className="w-4 h-4" />
          Scope Configurations
        </button>
      </div>

      {/* Tab: Scout Trigger */}
      {activeTab === "trigger" && (
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h4 className="font-serif font-black text-[#1a2a3a] text-lg uppercase tracking-tight">Scout Control Room</h4>
              <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Initiate real-time Southport market surveillance</p>
            </div>

            {/* Visual sea state card */}
            <div className="bg-[#e0f2f1]/20 border border-teal-200/40 p-4 mb-4 font-sans text-xs text-gray-700 leading-relaxed flex flex-col gap-2 rounded-none">
              <div className="flex items-center gap-2 text-teal-900 font-bold font-mono uppercase text-[10px] tracking-wider">
                <Ship className="w-4 h-4 text-teal-700" /> Current Scouting Specifications
              </div>
              <ul className="list-disc pl-4 space-y-1 text-gray-600 font-mono text-[11px]">
                <li><strong className="text-[#1a2a3a]">Postcodes:</strong> {settings.postcodes.join(", ")}</li>
                <li><strong className="text-[#1a2a3a]">Coastal Sectors:</strong> {settings.subregions.slice(0, 4).join(", ")}...</li>
                <li><strong className="text-[#1a2a3a]">Keywords:</strong> {settings.keywords.slice(0, 3).join(", ")}...</li>
              </ul>
            </div>

            {/* Mode selection warnings */}
            <div className="bg-slate-50 border border-slate-200 p-3 mb-5 font-sans text-xs">
              <div className="flex items-center gap-1.5 text-slate-800 font-mono font-bold uppercase text-[9px] tracking-wider mb-1">
                <Info className="w-3.5 h-3.5 text-blue-600" /> Agent Intelligence Setup
              </div>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                Uses server-side <code className="bg-slate-200 text-slate-800 px-1 font-mono text-[10px]">gemini-3.5-flash</code> with Google Search Grounding to parse live web signals, matching Claude's logic. If the server lacks an API key, it seamlessly runs an offline local synthesis to allow testing.
              </p>
            </div>

            {/* Success message banner */}
            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 text-xs font-mono mb-4 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}
          </div>

          {/* Large trigger button / loading section */}
          <div>
            {loading ? (
              <div className="border-2 border-dashed border-[#1a2a3a] bg-amber-50/20 p-5 text-center flex flex-col items-center justify-center gap-3">
                <Waves className="w-8 h-8 text-[#b5a264] animate-bounce" />
                <div className="font-mono text-xs text-gray-800 font-bold">{scoutPhase}</div>
                <div className="w-full bg-gray-200 h-1.5 max-w-xs overflow-hidden relative">
                  <div className="absolute top-0 bottom-0 bg-[#1a2a3a] w-1/3 animate-loading-bar"></div>
                </div>
                <span className="font-mono text-[10px] text-gray-400 uppercase tracking-widest">Swell Scanning Active...</span>
              </div>
            ) : (
              <button
                onClick={handleTrigger}
                className="w-full bg-[#1a2a3a] hover:bg-[#b5a264] text-white hover:text-[#1a2a3a] border-2 border-[#1a2a3a] py-3.5 font-serif font-black text-lg uppercase tracking-wider flex items-center justify-center gap-2 shadow-[4px_4px_0px_#b5a264] hover:shadow-[2px_2px_0px_#1a2a3a] transition-all duration-150 cursor-pointer"
              >
                <Compass className="w-5 h-5" />
                Sail & Scout Southport Sectors
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab: Scope Configurations */}
      {activeTab === "settings" && (
        <form onSubmit={handleSaveSettings} className="flex-1 flex flex-col justify-between font-mono text-xs">
          <div className="space-y-4">
            <div className="mb-2">
              <h4 className="font-serif font-black text-[#1a2a3a] text-lg uppercase tracking-tight">Scope Settings</h4>
              <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Configure target coordinates and keywords</p>
            </div>

            {/* Postcodes Input */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Target Postcodes</label>
              <input
                type="text"
                value={postcodesInput}
                onChange={(e) => setPostcodesInput(e.target.value)}
                placeholder="PR8, PR9"
                className="border-2 border-[#1a2a3a] bg-white text-gray-800 px-3 py-2 outline-none focus:bg-[#f0f7f6]"
                required
              />
              <span className="text-[9px] text-gray-400">Comma-separated postcodes focusing Southport.</span>
            </div>

            {/* Subregions Input */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Subregions & Villages</label>
              <input
                type="text"
                value={subregionsInput}
                onChange={(e) => setSubregionsInput(e.target.value)}
                placeholder="Birkdale, Ainsdale, Churchtown"
                className="border-2 border-[#1a2a3a] bg-white text-gray-800 px-3 py-2 outline-none focus:bg-[#f0f7f6]"
                required
              />
              <span className="text-[9px] text-gray-400">Villages, dunes, or street coordinates of interest.</span>
            </div>

            {/* Keywords Input */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Market Signal Keywords</label>
              <input
                type="text"
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                placeholder="local business news, planning applications, closure"
                className="border-2 border-[#1a2a3a] bg-white text-gray-800 px-3 py-2 outline-none focus:bg-[#f0f7f6]"
                required
              />
              <span className="text-[9px] text-gray-400">Indicators Claude & Gemini use to spot supply/demand gaps.</span>
            </div>

            {/* Cron Schedule */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">GitHub Cron Schedule</label>
              <input
                type="text"
                value={cronSchedule}
                onChange={(e) => setCronSchedule(e.target.value)}
                placeholder="0 6 * * 1"
                className="border-2 border-[#1a2a3a] bg-white text-gray-800 px-3 py-2 outline-none focus:bg-[#f0f7f6]"
                required
              />
              <span className="text-[9px] text-gray-400">Cron layout for GitHub action schedule (weekly default: every Monday 6AM).</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-dashed border-gray-100 flex items-center justify-between gap-4">
            {successMsg && (
              <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 border border-emerald-200 px-2.5 py-1">
                {successMsg}
              </span>
            )}
            <button
              type="submit"
              disabled={saving}
              className="bg-[#1a2a3a] hover:bg-[#b5a264] text-white hover:text-[#1a2a3a] border-2 border-[#1a2a3a] px-4 py-2.5 font-bold transition-all shadow-[2px_2px_0px_#b5a264] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#1a2a3a] ml-auto flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              Secure Harbour Settings
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
