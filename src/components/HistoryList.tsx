import React, { useState } from "react";
import { 
  History, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Check, 
  AlertCircle 
} from "lucide-react";

interface HistoryListProps {
  history: string[];
  onAddHistory: (title: string) => Promise<void>;
  onRemoveHistory: (title: string) => Promise<void>;
  onClearHistory: () => Promise<void>;
  refreshHistory: () => Promise<void>;
}

export default function HistoryList({ 
  history, 
  onAddHistory, 
  onRemoveHistory, 
  onClearHistory, 
  refreshHistory 
}: HistoryListProps) {
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setLoading(true);
    await onAddHistory(newTitle.trim());
    setNewTitle("");
    setLoading(false);
    triggerSuccess("Idea added to ignore-list");
  };

  const handleRemove = async (title: string) => {
    setLoading(true);
    await onRemoveHistory(title);
    setLoading(false);
    triggerSuccess("Idea removed from ignore-list");
  };

  const handleClear = async () => {
    if (window.confirm("Are you sure you want to clear the deduplication history? This will allow previously surfaced ideas to appear again.")) {
      setLoading(true);
      await onClearHistory();
      setLoading(false);
      triggerSuccess("Deduplication history wiped");
    }
  };

  const triggerSuccess = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  return (
    <div id="history-registry-panel" className="bg-white border-t-8 shadow-xl p-6 rounded-none flex flex-col h-full relative" style={{ borderColor: "#1a2a3a" }}>

      {/* Panel Header */}
      <div className="border-b-2 border-dashed border-[#1a2a3a] pb-3 mb-4 flex justify-between items-start">
        <div>
          <h3 className="font-serif font-bold text-[#1a2a3a] text-lg tracking-tight uppercase flex items-center gap-2">
            <History className="w-5 h-5 text-[#b5a264]" />
            Deduplication Log
          </h3>
          <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mt-1">Prevents repetitive scans (data/history.json)</p>
        </div>
        <button
          onClick={refreshHistory}
          disabled={loading}
          className="p-1 hover:bg-gray-100 border border-gray-200 text-gray-500 hover:text-gray-950 transition-colors"
          title="Reload history data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Explanatory banner */}
      <div className="bg-[#e0f2f1]/40 border border-teal-200/50 p-3 mb-4 font-sans text-xs text-teal-900 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          The scout checks this log before compiling opportunities. Any business title matching these entries is **filtered out automatically** to ensure every weekly scan surfaces 100% fresh, non-overlapping market gaps.
        </p>
      </div>

      {/* Manual Insert Form */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-4 font-mono text-xs">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Type a mock business title to ignore..."
          disabled={loading}
          className="flex-1 border-2 border-[#1a2a3a] bg-white text-gray-800 px-3 py-2 outline-none focus:bg-[#f0f7f6] placeholder-gray-400"
        />
        <button
          type="submit"
          disabled={loading || !newTitle.trim()}
          className="bg-[#1a2a3a] hover:bg-[#b5a264] text-white hover:text-[#1a2a3a] px-3 border-2 border-[#1a2a3a] font-bold transition-all flex items-center gap-1 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Log
        </button>
      </form>

      {/* Status banner */}
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2 text-xs font-mono mb-3 flex items-center gap-1.5">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Gaps List container */}
      <div className="flex-1 overflow-y-auto max-h-[220px] border border-gray-200 p-2 bg-gray-50/50">
        {history.length === 0 ? (
          <div className="text-center py-8 font-sans text-xs text-gray-500 italic">
            "Ignore registry is empty. Ready to accept all findings."
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 font-mono text-xs">
            {history.map((title, i) => (
              <div 
                key={i} 
                className="bg-white border border-gray-200 p-2 flex justify-between items-center group hover:border-[#1a2a3a] transition-all"
              >
                <span className="text-gray-800 font-medium truncate max-w-[200px] sm:max-w-[400px]">
                  {title}
                </span>
                <button
                  onClick={() => handleRemove(title)}
                  disabled={loading}
                  className="text-gray-400 hover:text-red-600 p-1 group-hover:opacity-100 md:opacity-50 transition-all"
                  title="Remove from ignore-list"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer count & Clear button */}
      <div className="mt-4 pt-3 border-t border-dashed border-gray-200 flex justify-between items-center font-mono text-xs">
        <span className="text-gray-500 font-semibold uppercase">Surfaced Log Count: {history.length}</span>
        {history.length > 0 && (
          <button
            onClick={handleClear}
            disabled={loading}
            className="text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-950 px-2 py-1 flex items-center gap-1 transition-colors border border-red-200 font-semibold"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Wipe Log
          </button>
        )}
      </div>
    </div>
  );
}
