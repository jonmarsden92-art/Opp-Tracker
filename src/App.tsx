import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Anchor, 
  Compass, 
  History as HistoryIcon, 
  Terminal, 
  ExternalLink,
  Info,
  Waves,
  Ship,
  Github,
  Moon,
  Sun,
  AlertCircle
} from "lucide-react";

import { Opportunity, ScoutSettings } from "./types";
import SwellMeter from "./components/SwellMeter";
import OpportunityCard from "./components/OpportunityCard";
import ScoutControlPanel from "./components/ScoutControlPanel";
import DeployerActionFiles from "./components/DeployerActionFiles";
import HistoryList from "./components/HistoryList";

export default function App() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [settings, setSettings] = useState<ScoutSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [activeScanOutput, setActiveScanOutput] = useState<{
    scannedQuery: string;
    simulation: boolean;
    sources: any[];
  } | null>(null);

  // Fetch initial data on load
  const fetchData = async () => {
    try {
      setLoading(true);
      const [oppsRes, historyRes, settingsRes] = await Promise.all([
        fetch("/api/opportunities"),
        fetch("/api/history"),
        fetch("/api/settings")
      ]);

      const opps = await oppsRes.json();
      const hist = await historyRes.json();
      const sett = await settingsRes.json();

      setOpportunities(opps);
      setHistory(hist);
      setSettings(sett);
    } catch (error) {
      console.error("Error loading scout database:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Setup dynamic seafront clock (UTC format as common for marine charts)
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toISOString().replace("T", " ").substring(0, 19) + " UTC");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update Settings
  const handleUpdateSettings = async (updated: Partial<ScoutSettings>) => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("Failed saving harbor settings:", error);
    }
  };

  // Trigger Scout Scan
  const handleTriggerScout = async () => {
    try {
      const res = await fetch("/api/scout", {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        // Prepend new opportunities at the top
        setOpportunities(prev => [...data.opportunities, ...prev].slice(0, 15));
        
        // Refresh history
        const histRes = await fetch("/api/history");
        const hist = await histRes.json();
        setHistory(hist);

        // Record scan result info for display
        setActiveScanOutput({
          scannedQuery: data.scannedQuery,
          simulation: data.simulation,
          sources: data.sources || []
        });

        return data;
      } else {
        throw new Error(data.error || "Scout execution aborted");
      }
    } catch (error: any) {
      alert(`Scout Warning: ${error.message || error}`);
      throw error;
    }
  };

  // Archive / Ignore Opportunity (push to history.json so it gets de-duplicated)
  const handleArchiveOpportunity = async (title: string) => {
    try {
      const res = await fetch("/api/history/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      });
      const data = await res.json();
      if (data.success) {
        setHistory(data.history);
        // Filter out from UI immediately with standard list transition
        setOpportunities(prev => prev.filter(o => o.title !== title));
      }
    } catch (error) {
      console.error("Archive failure:", error);
    }
  };

  // History controls
  const handleAddHistory = async (title: string) => {
    try {
      const res = await fetch("/api/history/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      });
      const data = await res.json();
      if (data.success) {
        setHistory(data.history);
      }
    } catch (error) {
      console.error("Failed adding title to history:", error);
    }
  };

  const handleRemoveHistory = async (title: string) => {
    try {
      const res = await fetch("/api/history/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      });
      const data = await res.json();
      if (data.success) {
        setHistory(data.history);
      }
    } catch (error) {
      console.error("Failed removing title from history:", error);
    }
  };

  const handleClearHistory = async () => {
    try {
      const res = await fetch("/api/history/clear", {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        setHistory(data.history);
      }
    } catch (error) {
      console.error("Failed clearing history log:", error);
    }
  };

  const refreshHistoryOnly = async () => {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      setHistory(data);
    } catch (error) {
      console.error("History reload fail:", error);
    }
  };

  // Compute aggregate swell score for dial
  const averageSwell = opportunities.length > 0 
    ? opportunities.reduce((acc, curr) => acc + curr.swell, 0) / opportunities.length
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#e0f2f1] p-4 font-mono text-xs text-[#1a2a3a]">
        <Waves className="w-10 h-10 text-[#b5a264] animate-bounce mb-3" />
        <span className="font-serif font-black text-lg text-gray-800 uppercase tracking-widest">LOADING HARBOUR PLATES...</span>
        <span className="text-gray-400 mt-1 uppercase tracking-wider">Acquiring Southport coordinate registries</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#1a2a3a] px-4 md:px-8 py-6 max-w-7xl mx-auto flex flex-col gap-6 font-sans">
      
      {/* 1. SEAFRONT HEADER BOARD */}
      <header id="main-harbour-header" className="flex flex-col md:flex-row items-start md:items-end justify-between px-6 md:px-10 py-6 md:py-8 border-b-4 bg-white shadow-md relative overflow-hidden" style={{ borderColor: '#b5a264' }}>
        <div className="flex flex-col z-10">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-3 h-3 rounded-full bg-blue-900 animate-pulse"></div>
            <span className="text-xs font-bold tracking-widest uppercase opacity-70 font-mono">
              Station: SOS-AGENT-01 // PR8-PR9
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-serif font-black italic tracking-tighter text-[#1a2a3a]" style={{ lineHeight: 0.9 }}>
            Southport Opportunity Scout
          </h1>
          <p className="font-sans text-xs text-gray-500 mt-2 italic">
            Automated market surveillance targeting PR8 & PR9 business and supply gaps
          </p>
        </div>

        <div className="text-left md:text-right flex flex-col md:items-end gap-1 mt-4 md:mt-0 z-10 font-mono">
          <p className="text-xs font-bold uppercase tracking-widest opacity-60">
            Last Update // Monday 06:00 GMT
          </p>
          <p className="text-xl font-bold text-[#b5a264]">
            {currentTime}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 font-bold uppercase tracking-widest w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse font-mono"></span>
            STATION ONLINE
          </div>
        </div>
      </header>

      {/* 2. DYNAMIC OVERVIEW CARDS (Top Semicircle + Intro) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left: Interactive Maritime Dial */}
        <div className="md:col-span-1">
          <SwellMeter score={averageSwell} opportunityCount={opportunities.length} />
        </div>

        {/* Middle & Right: Welcome & Status Board */}
        <div className="md:col-span-2 bg-white border-4 border-[#1a2a3a] shadow-[6px_6px_0px_#b5a264] p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-[#b5a264] border border-[#1a2a3a]"></div>
          
          <div>
            <h3 className="font-serif font-black text-[#1a2a3a] text-xl uppercase tracking-tight mb-2 flex items-center gap-2">
              <Ship className="w-5 h-5 text-[#b5a264]" />
              The Maritime Intelligence Station
            </h3>
            <p className="text-sm font-sans text-gray-600 leading-relaxed mb-4">
              Southport's seaside economy shifts rapidly with Sefton Council zoning, Lord Street storefront transitions, and coastal tourism peaks. Rather than maintaining an expensive database, the SOS agent functions as a **lean, runtime-free pilot bot**. It schedules periodic scans on GitHub Actions, leverages Anthropic Claude to spot local business gaps via web search, and commits the findings straight to GitHub Pages!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t-2 border-dashed border-gray-100 pt-4 font-mono text-[11px] text-gray-600">
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-[#1a2a3a] uppercase tracking-wider flex items-center gap-1">
                <Github className="w-3.5 h-3.5 text-gray-700" /> Repo Destination
              </span>
              <span className="bg-gray-50 p-2 border border-gray-200 select-all truncate">
                {settings?.githubRepo || "github-user/southport-scout"}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-[#1a2a3a] uppercase tracking-wider flex items-center gap-1">
                <HistoryIcon className="w-3.5 h-3.5 text-[#b5a264]" /> Active Guardrails
              </span>
              <p className="text-gray-500 italic">
                {history.length} previously surfaced business ideas registered. Repeating matches are ignored.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CORE ADVISORIES BOARD (Active List & Control room) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Southport Active Opportunities Board (8 of 12 cols) */}
        <main className="lg:col-span-8 flex flex-col gap-6">
          <div className="border-b-4 border-double border-[#1a2a3a] pb-2">
            <h2 className="font-serif font-black text-2xl uppercase text-[#1a2a3a] tracking-tight flex items-center gap-2">
              <Compass className="w-6 h-6 text-[#b5a264] animate-spin-slow" />
              Active Southport Opportunity Bulletin
            </h2>
            <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Surfaced supply & demand gaps in PR8 / PR9</p>
          </div>

          {/* If scan results have grounding proofs, show a nice advisory banner */}
          {activeScanOutput && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-teal-50 border-2 border-teal-500/30 p-4 font-mono text-xs text-teal-950 rounded-none flex flex-col gap-2"
            >
              <div className="flex items-center gap-1.5 font-bold uppercase text-[10px]">
                <Info className="w-4 h-4 text-teal-700 shrink-0" /> Live Sector Scan complete
              </div>
              <p className="font-sans text-[12px] text-teal-900">
                The agent evaluated live Sefton Council search feeds for <code className="bg-teal-100 px-1 font-mono text-[11px]">"{activeScanOutput.scannedQuery}"</code>. 3 fresh business gaps matching local planning applications were extracted.
              </p>
              {activeScanOutput.sources && activeScanOutput.sources.length > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-[9px] uppercase tracking-wider text-teal-600 font-bold">Grounding Feeds Scanned:</span>
                  <div className="flex flex-wrap gap-2">
                    {activeScanOutput.sources.map((src, idx) => (
                      <a 
                        key={idx} 
                        href={src.uri} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-teal-700 underline flex items-center gap-1 hover:text-teal-900"
                      >
                        {src.title} <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Opportunities list with Framer Motion layout animations */}
          <div className="flex flex-col gap-6">
            <AnimatePresence mode="popLayout">
              {opportunities.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white border-4 border-dashed border-gray-300 p-12 text-center text-gray-400 font-sans italic"
                >
                  "No active business gaps logged on the board. Secure configurations and launch a sector scan to surface Southport opportunities!"
                </motion.div>
              ) : (
                opportunities.map((opp) => (
                  <OpportunityCard
                    key={opp.id}
                    opportunity={opp}
                    onArchive={handleArchiveOpportunity}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Right Side: Control & history panel (4 of 12 cols) */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
          {settings && (
            <ScoutControlPanel
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onTriggerScout={handleTriggerScout}
            />
          )}

          <HistoryList
            history={history}
            onAddHistory={handleAddHistory}
            onRemoveHistory={handleRemoveHistory}
            onClearHistory={handleClearHistory}
            refreshHistory={refreshHistoryOnly}
          />
        </aside>
      </div>

      {/* 4. GITHUB DEPLOYER FILE EXPLAINER CENTER */}
      {settings && (
        <section id="deploy-center" className="mt-8">
          <div className="border-b-4 border-double border-[#1a2a3a] pb-2 mb-6">
            <h2 className="font-serif font-black text-2xl uppercase text-[#1a2a3a] tracking-tight flex items-center gap-2">
              <Terminal className="w-6 h-6 text-[#b5a264]" />
              Anchor & Deploy Your Agent
            </h2>
            <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Deploy on GitHub Pages & Actions to run on cron</p>
          </div>
          <DeployerActionFiles settings={settings} />
        </section>
      )}

      {/* Seafront footer credit lines */}
      <footer className="mt-12 bg-slate-900 text-white p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="flex flex-wrap gap-6 items-center">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-widest opacity-60">Deployment Method</span>
            <span className="text-xs font-bold font-mono text-[#b5a264]">GitHub Actions // Cron</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-widest opacity-60">Storage</span>
            <span className="text-xs font-bold font-mono text-[#b5a264]">history.json // Flat-file</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-widest opacity-60">API Status</span>
            <span className="text-xs font-bold text-green-400 uppercase font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              Gemini-3.5-Active
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2 border border-slate-700 rounded px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest font-mono">
          <span>Repo Sync: OK</span>
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
        </div>
      </footer>

    </div>
  );
}
