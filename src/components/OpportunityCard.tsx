import React from "react";
import { motion } from "motion/react";
import Markdown from "react-markdown";
import { Opportunity } from "../types";
import { 
  TrendingUp, 
  ShieldAlert, 
  Coins, 
  Zap, 
  MapPin, 
  ExternalLink, 
  FileCheck, 
  Archive,
  Calendar,
  Loader2,
  Compass,
  Printer,
  X,
  Sliders
} from "lucide-react";

interface OpportunityCardProps {
  key?: any;
  opportunity: Opportunity;
  onArchive: (title: string) => void | Promise<void>;
}

export default function OpportunityCard({ opportunity, onArchive }: OpportunityCardProps) {
  const [loadingPlan, setLoadingPlan] = React.useState(false);
  const [planText, setPlanText] = React.useState<string | null>(null);
  const [errorPlan, setErrorPlan] = React.useState<string | null>(null);
  const [isPlanOpen, setIsPlanOpen] = React.useState(false);

  // User selections for Sector & Budget
  const [selectedSector, setSelectedSector] = React.useState<string>("");
  const [selectedBudget, setSelectedBudget] = React.useState<string>("");

  // Track the sector and budget that was actually used to build the loaded plan
  const [renderedSector, setRenderedSector] = React.useState<string>("");
  const [renderedBudget, setRenderedBudget] = React.useState<string>("");

  // Detect and set smart default options on mount or based on opportunity
  React.useEffect(() => {
    const titleLower = opportunity.title.toLowerCase();
    let defaultSector = "other";
    if (
      titleLower.includes("food") || 
      titleLower.includes("kitchen") || 
      titleLower.includes("pantry") || 
      titleLower.includes("dine") || 
      titleLower.includes("gastropub") || 
      titleLower.includes("restaurant") || 
      titleLower.includes("culinary") || 
      titleLower.includes("herb") || 
      titleLower.includes("hydroponic") || 
      (titleLower.includes("artisan") && titleLower.includes("prep"))
    ) {
      defaultSector = "food_beverage";
    } else if (
      titleLower.includes("hotel") || 
      titleLower.includes("pier") || 
      titleLower.includes("golf") || 
      titleLower.includes("beach") || 
      titleLower.includes("pub") || 
      titleLower.includes("inn") || 
      titleLower.includes("lounge") ||
      titleLower.includes("leisure")
    ) {
      defaultSector = "hospitality_leisure";
    } else if (
      titleLower.includes("market") || 
      titleLower.includes("booth") || 
      titleLower.includes("retail") || 
      titleLower.includes("shop") || 
      titleLower.includes("artisan") || 
      titleLower.includes("antique") || 
      titleLower.includes("craft") || 
      titleLower.includes("boutique") || 
      titleLower.includes("cargo-bike") || 
      titleLower.includes("delivery")
    ) {
      defaultSector = "retail_artisan";
    } else if (
      titleLower.includes("tour") || 
      titleLower.includes("guide") || 
      titleLower.includes("adventure") || 
      titleLower.includes("walk") || 
      titleLower.includes("historic")
    ) {
      defaultSector = "tourism_tours";
    } else if (
      titleLower.includes("tech") || 
      titleLower.includes("digital") || 
      titleLower.includes("app") || 
      titleLower.includes("software") || 
      titleLower.includes("platform") || 
      titleLower.includes("website")
    ) {
      defaultSector = "tech_digital";
    } else if (
      titleLower.includes("creative") || 
      titleLower.includes("design") || 
      titleLower.includes("photo") || 
      titleLower.includes("marketing") || 
      titleLower.includes("consult")
    ) {
      defaultSector = "professional_creative";
    } else if (
      titleLower.includes("yoga") || 
      titleLower.includes("fitness") || 
      titleLower.includes("health") || 
      titleLower.includes("wellness") || 
      titleLower.includes("gym") || 
      titleLower.includes("sport")
    ) {
      defaultSector = "health_wellness";
    }
    setSelectedSector(defaultSector);

    // Budget default based on cost string
    const costLower = opportunity.cost.toLowerCase();
    let defaultBudget = "medium";
    if (costLower.includes("low") || costLower.includes("lean") || costLower.includes("<")) {
      defaultBudget = "low";
    } else if (costLower.includes("high") || costLower.includes(">")) {
      defaultBudget = "high";
    } else {
      defaultBudget = "medium";
    }
    setSelectedBudget(defaultBudget);
  }, [opportunity]);

  const handleBuildPlan = async (forceRegenerate = false) => {
    // If we already have a generated plan and we don't want to override it, toggle open/close
    if (planText && !forceRegenerate) {
      setIsPlanOpen(!isPlanOpen);
      return;
    }
    setLoadingPlan(true);
    setErrorPlan(null);
    setIsPlanOpen(true);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          opportunity,
          selectedSector,
          selectedBudget
        })
      });
      if (!res.ok) {
        let errMsg = "Failed to contact the SOS blueprint engine.";
        try {
          const errData = await res.json();
          if (errData && errData.error) {
            errMsg = `${errData.error}${errData.details ? " Details: " + errData.details : ""}`;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }
      const data = await res.json();
      if (data.success) {
        setPlanText(data.blueprint);
        setRenderedSector(selectedSector);
        setRenderedBudget(selectedBudget);
      } else {
        throw new Error(data.error || "Failed to generate business blueprint.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorPlan(err.message || "An unexpected error occurred during connection.");
    } finally {
      setLoadingPlan(false);
    }
  };

  // Format the date
  const formattedDate = new Date(opportunity.timestamp).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  // Calculate rating colors
  const getScoreColor = (val: number, reverse = false) => {
    if (reverse) {
      if (val <= 3) return "text-emerald-600 bg-emerald-50 border-emerald-200";
      if (val <= 6) return "text-amber-600 bg-amber-50 border-amber-200";
      return "text-red-600 bg-red-50 border-red-200";
    } else {
      if (val >= 8) return "text-emerald-600 bg-emerald-50 border-emerald-200";
      if (val >= 5) return "text-amber-600 bg-amber-50 border-amber-200";
      return "text-red-600 bg-red-50 border-red-200";
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      id={`opp-card-${opportunity.id}`}
      className="bg-white border-t-8 shadow-xl p-6 relative overflow-hidden transition-all flex flex-col"
      style={{ borderColor: "#1a2a3a" }}
    >
      {/* Hot ribbon rotated banner */}
      {opportunity.swell >= 80 && (
        <div className="absolute -top-1 -right-1 w-10 h-10 flex items-center justify-center transform rotate-12 bg-yellow-600 text-white text-[10px] font-bold tracking-tighter z-10">
          HOT
        </div>
      )}

      {/* Identifier & Date */}
      <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50 mb-2 font-mono">
        {opportunity.id.startsWith("sim-") ? "GAP_ANALYSIS_SIM" : "GAP_ANALYSIS_LIVE"} // {formattedDate}
      </span>

      {/* Title */}
      <h2 className="text-2xl font-serif italic font-bold leading-tight mb-4 text-blue-950">
        {opportunity.title}
      </h2>

      {/* Concept Description */}
      <p className="text-sm leading-relaxed mb-6 flex-grow text-gray-700 font-sans">
        {opportunity.description}
      </p>

      {/* Swell Probability Section */}
      <div className="mt-auto space-y-4">
        <div className="flex justify-between items-end mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">Swell Probability</span>
          <span className="text-lg font-bold text-[#1a2a3a]">{opportunity.swell}%</span>
        </div>
        <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200 p-0.5">
          <div className="h-full rounded-full" style={{ width: `${opportunity.swell}%`, background: "linear-gradient(90deg, #1a2a3a 0%, #b5a264 100%)" }}></div>
        </div>

        {/* Quadrant scoring table */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 font-mono pt-1">
          <div className="border border-gray-200 p-2 text-center bg-gray-50/50">
            DEMAND: {opportunity.demand}/10
          </div>
          <div className="border border-gray-200 p-2 text-center bg-gray-50/50">
            COMPETITION: {opportunity.competition}/10
          </div>
          <div className="border border-gray-200 p-2 text-center bg-gray-50/50">
            COST: {opportunity.cost}
          </div>
          <div className="border border-gray-200 p-2 text-center bg-gray-50/50">
            SPEED: {opportunity.speed}/10
          </div>
        </div>

        {/* Local Evidence and Grounding block */}
        <div className="border-l-4 border-[#b5a264] bg-amber-50/40 p-4 font-sans rounded-none mt-4">
          <h5 className="font-mono text-[10px] uppercase font-bold text-[#b5a264] tracking-widest mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> Southport Market Signals
          </h5>
          <p className="text-xs text-gray-600 leading-relaxed italic">
            "{opportunity.evidence}"
          </p>
        </div>

        {/* Sources block */}
        {opportunity.sources && opportunity.sources.length > 0 && (
          <div className="flex flex-col gap-1.5 pt-1 mt-4">
            <span className="font-mono text-[9px] uppercase font-bold text-gray-400 tracking-wider">Scanned Grounding Proofs</span>
            <div className="flex flex-wrap gap-2">
              {opportunity.sources.map((src, i) => (
                <a
                  key={i}
                  href={src.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 hover:text-teal-900 px-2 py-1 flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  {src.title.length > 25 ? `${src.title.slice(0, 25)}...` : src.title}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic Blueprint Configurator Panel */}
        <div className="border border-gray-200 bg-gray-50/50 p-4 rounded-none mt-4 flex flex-col gap-3">
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-[#1a2a3a] tracking-widest border-b pb-1.5 mb-1">
            <Sliders className="w-3.5 h-3.5 text-[#b5a264]" /> Blueprint Configurator
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[9px] uppercase font-bold text-gray-500 tracking-wider">Target Sector</label>
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-none text-xs font-sans px-2.5 py-1.5 text-gray-700 focus:outline-none focus:border-[#1a2a3a]"
              >
                <option value="food_beverage">🍔 Food & Beverage / Dining</option>
                <option value="hospitality_leisure">🏨 Hospitality & Leisure</option>
                <option value="retail_artisan">🛍️ Retail & Artisan Market</option>
                <option value="tourism_tours">🧭 Tourism & Guided Tours</option>
                <option value="tech_digital">💻 Technology & Digital Platform</option>
                <option value="professional_creative">🎨 Professional & Creative Services</option>
                <option value="health_wellness">🧘 Health, Wellness & Sport</option>
                <option value="other">⚓ General Coastal Enterprise</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[9px] uppercase font-bold text-gray-500 tracking-wider">Launch Budget</label>
              <select
                value={selectedBudget}
                onChange={(e) => setSelectedBudget(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-none text-xs font-sans px-2.5 py-1.5 text-gray-700 focus:outline-none focus:border-[#1a2a3a]"
              >
                <option value="lean">🌱 Lean Budget (&lt; £1,500)</option>
                <option value="low">📈 Low Budget (£1,500 - £5,000)</option>
                <option value="medium">🏢 Moderate Budget (£5,000 - £15,000)</option>
                <option value="high">🏛️ High Budget (&gt; £15,000)</option>
              </select>
            </div>
          </div>
          {planText && (selectedSector !== renderedSector || selectedBudget !== renderedBudget) && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-amber-50 border border-amber-200 px-3 py-2 mt-1">
              <span className="text-[10px] text-amber-800 font-sans">
                Selections modified! Regenerate to apply your custom sector or budget to the plan.
              </span>
              <button
                onClick={() => handleBuildPlan(true)}
                disabled={loadingPlan}
                className="font-mono text-[9px] font-bold uppercase bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 transition-all text-center self-end sm:self-center"
              >
                Regenerate Plan
              </button>
            </div>
          )}
        </div>

        {/* Card Footer Actions */}
        <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mt-4 font-mono text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-700 justify-center sm:justify-start">
            <FileCheck className="w-4 h-4" />
            <span>Active In PR8/PR9</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onArchive(opportunity.title)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1 bg-white border border-[#1a2a3a]/40 hover:bg-[#1a2a3a] hover:text-white text-[#1a2a3a] px-3 py-1.5 font-bold transition-all shadow-[2px_2px_0px_#1a2a3a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#1a2a3a]"
              title="Add to history so it won't be surfaced in future scans"
            >
              <Archive className="w-3.5 h-3.5" />
              Archive Idea
            </button>

            <button
              onClick={() => handleBuildPlan(false)}
              disabled={loadingPlan}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-[#1a2a3a] hover:bg-[#b5a264] text-white border border-[#1a2a3a] hover:border-[#b5a264] px-4 py-1.5 font-bold transition-all shadow-[2px_2px_0px_#1a2a3a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#1a2a3a] disabled:opacity-75"
              title="Generate a fully customized business plan, cost breakdown & success guide"
            >
              {loadingPlan ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Compass className="w-3.5 h-3.5" />
              )}
              {planText ? (isPlanOpen ? "Hide Plan" : "View Plan") : "Build Business Plan"}
            </button>
          </div>
        </div>

        {/* Business Blueprint Plan Tray */}
        {isPlanOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-6 border-t-2 border-dashed border-[#1a2a3a]/20 pt-5 flex flex-col gap-4 font-sans text-sm"
          >
            {loadingPlan ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 bg-[#f0f7f6] border border-[#1a2a3a]/10">
                <Loader2 className="w-8 h-8 text-[#b5a264] animate-spin mb-3" />
                <span className="font-serif font-black text-xs text-[#1a2a3a] uppercase tracking-widest animate-pulse">CHARTING BLUEPRINT SCHEMES...</span>
                <span className="text-[10px] text-gray-500 font-mono mt-1 uppercase">Sensing Southport local requirements & budget classes</span>
              </div>
            ) : errorPlan ? (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-none flex flex-col gap-2 font-mono text-xs">
                <span className="font-bold">⚓ BLUEPRINT RETRIEVAL FAULT:</span>
                <span>{errorPlan}</span>
                <button 
                  onClick={() => handleBuildPlan(false)}
                  className="mt-2 self-start bg-red-700 text-white px-3 py-1 font-bold hover:bg-red-800"
                >
                  Retry Signal
                </button>
              </div>
            ) : planText ? (
              <div className="bg-[#fcfdfd] border-2 border-[#1a2a3a] p-5 md:p-6 shadow-inner relative max-h-[500px] overflow-y-auto custom-scrollbar">
                {/* Decorative header */}
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <span className="font-mono text-[9px] uppercase font-bold text-gray-400 tracking-wider">OFFICIAL BLUEPRINT // SEFTON AREA PLAN</span>
                  <div className="flex gap-4 items-center">
                    <button 
                      onClick={() => {
                        const printWindow = window.open("", "_blank");
                        if (printWindow) {
                          printWindow.document.write(`
                            <html>
                              <head>
                                <title>${opportunity.title} - Business Blueprint</title>
                                <style>
                                  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1a2a3a; line-height: 1.6; }
                                  h1, h2, h3, h4 { color: #1a2a3a; border-bottom: 2px solid #b5a264; padding-bottom: 8px; font-family: Georgia, serif; }
                                  table { width: 100%; border-collapse: collapse; margin: 20px 0; font-family: monospace; font-size: 13px; }
                                  th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                                  th { background-color: #1a2a3a; color: white; }
                                  hr { border: none; border-top: 1px dashed #ccc; margin: 20px 0; }
                                  ul, ol { padding-left: 20px; }
                                  li { margin-bottom: 8px; }
                                </style>
                              </head>
                              <body>
                                ${planText.replace(/\n/g, "<br/>")}
                              </body>
                            </html>
                          `);
                          printWindow.document.close();
                          printWindow.print();
                        }
                      }}
                      className="text-[#1a2a3a] hover:text-[#b5a264] transition-colors flex items-center gap-1 font-mono text-[10px] font-bold"
                      title="Print Business Plan"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print Blueprint
                    </button>
                    <button 
                      onClick={() => setIsPlanOpen(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Close Plan"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Selections metadata row */}
                <div className="mb-4 bg-gray-50 border border-gray-200 p-2.5 flex flex-wrap gap-4 font-mono text-[10px] uppercase font-bold tracking-wider text-[#1a2a3a]">
                  <div>
                    <span className="text-gray-400 mr-1.5">Sector:</span>
                    <span>
                      {renderedSector === "food_beverage" && "Food & Beverage / Dining"}
                      {renderedSector === "hospitality_leisure" && "Hospitality & Leisure"}
                      {renderedSector === "retail_artisan" && "Retail & Artisan Market"}
                      {renderedSector === "tourism_tours" && "Tourism & Guided Tours"}
                      {renderedSector === "tech_digital" && "Technology & Digital Platform"}
                      {renderedSector === "professional_creative" && "Professional & Creative Services"}
                      {renderedSector === "health_wellness" && "Health, Wellness & Sport"}
                      {renderedSector === "other" && "General Coastal Enterprise"}
                      {!renderedSector && "General Coastal Enterprise"}
                    </span>
                  </div>
                  <div className="border-l border-gray-300 pl-4 hidden sm:block"></div>
                  <div>
                    <span className="text-gray-400 mr-1.5">Launch Tier:</span>
                    <span>
                      {renderedBudget === "lean" && "Lean Budget (< £1,500)"}
                      {renderedBudget === "low" && "Low Budget (£1,500 - £5,000)"}
                      {renderedBudget === "medium" && "Moderate Budget (£5,000 - £15,000)"}
                      {renderedBudget === "high" && "High Budget (> £15,000)"}
                      {!renderedBudget && "Standard Budget"}
                    </span>
                  </div>
                </div>
                
                {/* Render Markdown */}
                <div className="markdown-body">
                  <Markdown>{planText}</Markdown>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
