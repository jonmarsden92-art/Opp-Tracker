import React, { useState } from "react";
import { 
  Folder, 
  FileCode, 
  Copy, 
  Check, 
  Terminal, 
  Github, 
  BookOpen, 
  Download,
  AlertCircle
} from "lucide-react";
import { ScoutSettings } from "../types";

interface DeployerActionFilesProps {
  settings: ScoutSettings;
}

export default function DeployerActionFiles({ settings }: DeployerActionFilesProps) {
  const [selectedFile, setSelectedFile] = useState<string>("scout.py");
  const [copied, setCopied] = useState<boolean>(false);

  const postcodesStr = settings.postcodes.join(", ");
  const subregionsStr = settings.subregions.join(", ");
  const keywordsStr = settings.keywords.map(k => `"${k}"`).join(", ");

  // File templates
  const fileTemplates: Record<string, { path: string; language: string; content: string }> = {
    "scout.py": {
      path: "scout.py",
      language: "python",
      content: `import os
import json
import datetime
from anthropic import Anthropic
from duckduckgo_search import DDGS
from jinja2 import Template

# Configured Southport Scope from settings
LOCATIONS = "Southport (${postcodesStr}) including ${subregionsStr}"
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY")

def get_southport_intel():
    print("🚢 [SOS Agent] Launching DuckDuckGo Sea-Search for Southport news...")
    search_queries = [
        "Southport UK local business planning PR8 PR9 2026",
        "Southport Lord Street retail shop closures vacancies 2026",
        "Southport Birkdale Ainsdale Churchtown business gaps 2026"
    ]
    
    intel_pool = []
    with DDGS() as ddgs:
        for query in search_queries:
            try:
                results = list(ddgs.text(query, max_results=4))
                for r in results:
                    intel_pool.append(f"Title: {r['title']}\\nSnippet: {r['body']}\\nLink: {r['href']}\\n")
            except Exception as e:
                print(f"⚠️ Search error for query '{query}': {e}")
                
    return "\\n---\\n".join(intel_pool)

def analyze_opportunities(intel, history):
    print("🧠 [SOS Agent] Initiating Claude analysis on Southport coastal news...")
    if not ANTHROPIC_KEY:
        print("❌ Error: ANTHROPIC_API_KEY is not defined. Using mock safety output.")
        return get_mock_opportunities()
        
    client = Anthropic(api_key=ANTHROPIC_KEY)
    
    prompt = f"""
    You are the 'Southport Opportunity Scout' (SOS).
    Scope: {LOCATIONS}
    
    Target Postcodes: ${postcodesStr}
    Keywords Interest: ${keywordsStr}

    Recent Local Intel Gathered:
    {intel}

    Previously Found Gaps (DEDUPLICATE - DO NOT REPEAT THESE TITLES):
    {json.dumps(history)}

    Task: Identify exactly 3 highly specific, creative, and viable local business or service gaps in Southport.
    Score them 1-10 on: Demand, Low Competition, Speed to First Customer.
    Estimate capital required: (e.g. 'Low (<£1.5k)', 'Medium (£2k - £6k)', 'High (>£10k)').
    Calculate a 'Swell Score' out of 100% representing attractiveness.
    Calculate Swell Score = (Demand * 4 + (11 - Competition) * 3 + Speed * 3).

    Format your output strictly as a valid, parsable JSON array of objects. Do not include markdown code block syntax or extra text outside JSON.
    Example Format:
    [
      {{
        "title": "Birkdale Cargo Delivery Collective",
        "description": "An eco-cargo delivery fleet supplying local merchants with local fulfillment...",
        "evidence": "Fewer couriers serving boutique shops in Birkdale village causing high shipping fees.",
        "demand": 8,
        "competition": 2,
        "cost": "Low (<£1.5k)",
        "speed": 9,
        "swell": 89,
        "sources": [{"title": "Lancs Live news reference", "uri": "https://..."}]
      }}
    ]
    """
    
    try:
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1500,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}]
        )
        
        # Clean text response in case markdown formatting was output
        raw_text = message.content[0].text.strip()
        if raw_text.startswith("\`\`\`json"):
            raw_text = raw_text.split("\`\`\`json")[1].split("\`\`\`")[0].strip()
        elif raw_text.startswith("\`\`\`"):
            raw_text = raw_text.split("\`\`\`")[1].split("\`\`\`")[0].strip()
            
        return json.loads(raw_text)
    except Exception as e:
        print(f"❌ Anthropic API invocation failure: {e}")
        return get_mock_opportunities()

def get_mock_opportunities():
    # Safe fallback with local coastal vibe
    return [
        {
            "title": "Lord Street Victorian Arcade Market",
            "description": "A co-retailing boutique space organizing small independent Southport sellers under a single shared lease to fill historic vacant units.",
            "evidence": "Observed high vacancy rates on Lord Street along with Sefton Council's flexible retail conversions.",
            "demand": 8,
            "competition": 2,
            "cost": "Medium (£2k - £5k)",
            "speed": 8,
            "swell": 86,
            "sources": [{"title": "Sefton Planning Portal", "uri": "https://www.sefton.gov.uk"}]
        }
    ]

def update_dashboard(opportunities):
    print("🎨 [SOS Agent] Rendering Southport seafront harbour-board UI...")
    if not os.path.exists("docs/template.html"):
        print("❌ docs/template.html not found.")
        return
        
    with open("docs/template.html", "r", encoding="utf-8") as f:
        template_html = f.read()
    
    t = Template(template_html)
    rendered = t.render(
        opportunities=opportunities, 
        last_updated=datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    )
    
    os.makedirs("docs", exist_ok=True)
    with open("docs/index.html", "w", encoding="utf-8") as f:
        f.write(rendered)
    print("✅ docs/index.html compiled successfully!")

def main():
    print("⚓ Southport Opportunity Scout Agent Initiating Weekly Run ⚓")
    
    # Load previously surfaced items to prevent repeats
    history_file = "data/history.json"
    os.makedirs("data", exist_ok=True)
    
    if os.path.exists(history_file):
        try:
            with open(history_file, "r", encoding="utf-8") as f:
                history = json.load(f)
        except:
            history = []
    else:
        history = []

    # Get search findings
    intel = get_southport_intel()
    
    # Analyze with Claude
    new_opps = analyze_opportunities(intel, history)
    
    # Dedup and record history
    for opp in new_opps:
        title = opp.get("title")
        if title and title not in history:
            history.append(title)
            
    # Save back to repository (keeps tracks of things automatically)
    with open(history_file, "w", encoding="utf-8") as f:
        json.dump(history[-80:], f, indent=2) # Keep last 80
        
    # Update HTML Harbour-board
    update_dashboard(new_opps)
    print("⚓ Weekly Southport Scout Run Complete! ⚓")

if __name__ == "__main__":
    main()`
    },
    "scout_cron.yml": {
      path: ".github/workflows/scout_cron.yml",
      language: "yaml",
      content: `name: Southport Opportunity Scout Cron
on:
  schedule:
    - cron: '${settings.cronSchedule}' # Automatically triggers weekly
  workflow_dispatch: # Allows manual trigger anytime in GitHub actions

permissions:
  contents: write # Allows the workflow to push the history & docs/index.html back to main

jobs:
  scout_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v3

      - name: Configure Python Environment
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'

      - name: Install Python Sea-Dependencies
        run: |
          pip install --upgrade pip
          pip install -r requirements.txt

      - name: Execute Southport Scout Agent
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
        run: python scout.py

      - name: Commit and Push Southport Board Updates
        run: |
          git config --global user.name "Southport Scout Bot"
          git config --global user.email "bot@southportscout.co.uk"
          git add data/history.json docs/index.html
          git commit -m "⚓ Seafront Update: New Southport Opportunities Scanned [\$(date +'%Y-%m-%d')]" || exit 0
          git push`
    },
    "template.html": {
      path: "docs/template.html",
      language: "html",
      content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Southport Opportunity Scout Board</title>
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,900&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --navy: #1a2a3a;
            --brass: #b5a264;
            --seafoam: #e0f2f1;
            --white: #ffffff;
        }
        body {
            background-color: #f0f7f6;
            background-image: 
                radial-gradient(var(--brass) 1px, transparent 1px), 
                radial-gradient(var(--navy) 1px, transparent 1px);
            background-size: 24px 24px;
            background-position: 0 0, 12px 12px;
            color: var(--navy);
            font-family: 'IBM Plex Mono', monospace;
            padding: 2rem;
            margin: 0;
            line-height: 1.6;
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
        }
        header {
            background: var(--white);
            border: 4px solid var(--navy);
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 6px 6px 0px var(--brass);
            position: relative;
        }
        header::after {
            content: '';
            position: absolute;
            top: 4px; left: 4px; right: 4px; bottom: 4px;
            border: 1px double var(--brass);
            pointer-events: none;
        }
        h1 {
            font-family: 'Fraunces', serif;
            font-size: 3rem;
            margin: 0 0 0.5rem 0;
            color: var(--navy);
            letter-spacing: -0.03em;
            line-height: 1.1;
        }
        .subtitle {
            font-size: 14px;
            color: var(--brass);
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.15em;
            margin: 0 0 1rem 0;
        }
        .meta-line {
            font-size: 12px;
            border-top: 1px dashed var(--navy);
            padding-top: 1rem;
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 10px;
        }
        .board-title {
            font-family: 'Fraunces', serif;
            font-size: 1.5rem;
            color: var(--navy);
            border-bottom: 3px double var(--brass);
            margin: 2rem 0 1.5rem 0;
            padding-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .card {
            background: var(--white);
            border: 4px solid var(--navy);
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 5px 5px 0px var(--brass);
            position: relative;
        }
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px dashed #ddd;
            padding-bottom: 1rem;
            margin-bottom: 1rem;
            gap: 15px;
        }
        .card-title {
            font-family: 'Fraunces', serif;
            font-size: 1.8rem;
            margin: 0;
            color: var(--navy);
            letter-spacing: -0.02em;
        }
        .swell-badge {
            border: 2px solid var(--navy);
            padding: 0.5rem;
            text-align: center;
            min-w: 70px;
            box-shadow: 2px 2px 0px var(--navy);
            background: var(--white);
        }
        .swell-badge-label {
            font-size: 9px;
            color: #888;
            text-transform: uppercase;
            font-weight: 700;
            display: block;
        }
        .swell-badge-val {
            font-size: 1.3rem;
            font-weight: 900;
            color: var(--navy);
        }
        .desc {
            font-size: 14px;
            margin: 0 0 1.5rem 0;
            color: #333;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
            margin-bottom: 1.5rem;
        }
        .grid-item {
            border: 1px solid #ddd;
            padding: 0.75rem;
            background: #fafafa;
        }
        .grid-label {
            font-size: 9px;
            text-transform: uppercase;
            color: #888;
            display: block;
            margin-bottom: 3px;
        }
        .grid-val {
            font-size: 12px;
            font-weight: 700;
            color: var(--navy);
        }
        .evidence {
            border-left: 4px solid var(--brass);
            background: #fdfaf3;
            padding: 1rem;
            font-size: 13px;
            font-style: italic;
            margin-bottom: 1.5rem;
        }
        .evidence-label {
            font-size: 9px;
            text-transform: uppercase;
            color: var(--brass);
            font-weight: 700;
            display: block;
            margin-bottom: 4px;
            font-style: normal;
        }
        .sources-list {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        .source-link {
            font-size: 11px;
            color: var(--navy);
            text-decoration: none;
            border-bottom: 1px solid var(--navy);
        }
        .source-link:hover {
            color: var(--brass);
            border-bottom-color: var(--brass);
        }
        footer {
            text-align: center;
            margin-top: 4rem;
            font-size: 11px;
            color: var(--navy);
            border-top: 1px dashed var(--brass);
            padding-top: 1.5rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Southport Opportunity Scout</h1>
            <div class="subtitle">Seaside Promenade Gaps & Demands Board</div>
            <div class="meta-line">
                <span>SECTOR: PR8/PR9 CODES</span>
                <span>HARBOUR ADVISORY: ACTIVE SCANNING</span>
                <span>COMPILED: {{ last_updated }} UTC</span>
            </div>
        </header>

        <div class="board-title">SURFACED COAstAL GAPS</div>

        {% if opportunities %}
            {% for opp in opportunities %}
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">{{ opp.title }}</h3>
                    <div class="swell-badge">
                        <span class="swell-badge-label">SWELL</span>
                        <span class="swell-badge-val">{{ opp.swell }}%</span>
                    </div>
                </div>
                <p class="desc">{{ opp.description }}</p>
                
                <div class="grid">
                    <div class="grid-item">
                        <span class="grid-label">DEMAND</span>
                        <span class="grid-val">{{ opp.demand }}/10</span>
                    </div>
                    <div class="grid-item">
                        <span class="grid-label">COMPETITION DENSITY</span>
                        <span class="grid-val">{{ opp.competition }}/10</span>
                    </div>
                    <div class="grid-item">
                        <span class="grid-label">SPEED TO FIRST SALES</span>
                        <span class="grid-val">{{ opp.speed }}/10</span>
                    </div>
                    <div class="grid-item">
                        <span class="grid-label">EST. CAPITAL</span>
                        <span class="grid-val">{{ opp.cost }}</span>
                    </div>
                </div>

                <div class="evidence">
                    <span class="evidence-label">COASTAL EVIDENCE & SIGNALS:</span>
                    "{{ opp.evidence }}"
                </div>

                {% if opp.sources %}
                <div class="sources-list">
                    <span style="font-size: 11px; color:#888;">Sources:</span>
                    {% for src in opp.sources %}
                    <a href="{{ src.uri }}" class="source-link" target="_blank">{{ src.title }}</a>
                    {% endfor %}
                </div>
                {% endif %}
            </div>
            {% endfor %}
        {% else %}
            <div class="card" style="text-align: center; padding: 3rem;">
                <p>No new seaweed opportunities surfaced. Run the scout agent manually or check data logs.</p>
            </div>
        {% endif %}

        <footer>
            ⚓ Southport Opportunity Scout — Generated autonomously with Claude & GitHub Actions ⚓
        </footer>
    </div>
</body>
</html>`
    },
    "requirements.txt": {
      path: "requirements.txt",
      language: "text",
      content: `anthropic>=0.18.0
duckduckgo_search>=5.0.0
jinja2>=3.1.2`
    },
    "README.md": {
      path: "README.md",
      language: "markdown",
      content: `# ⚓ Southport Opportunity Scout (SOS) Deployment

This is your fully self-contained, lightweight marketing intelligence bot designed for Southport (PR8/PR9). It operates as a **Weekly Cron Job on GitHub Actions** (free tier) and publishes its custom seaside dashboard directly on **GitHub Pages** (free hosting).

---

## 🚀 Setup Instructions in 3 Minutes

### 1. Create your GitHub Repository
1. Go to GitHub and click **New Repository**.
2. Name it (e.g., \`southport-scout\`) and keep it either **Private** or **Public**.
3. Create the following folder structure and paste the respective files provided in the dashboard:
   - \`scout.py\` (paste the full Python script)
   - \`requirements.txt\` (contains required dependencies)
   - \`data/history.json\` (create empty file with \`[]\` inside)
   - \`docs/template.html\` (contains the seafront template)
   - \`.github/workflows/scout_cron.yml\` (triggers the weekly run)

### 2. Add your Anthropic API Key
Your scout uses the fast **Claude 3.5 Sonnet** model to analyze search facts.
1. Sign up/log in to [Anthropic Console](https://console.anthropic.com/).
2. Generate an API Key (new accounts receive free startup credits!).
3. In your GitHub repository, go to **Settings > Secrets and variables > Actions**.
4. Click **New repository secret** and add:
   - Name: \`ANTHROPIC_API_KEY\`
   - Value: \`[Your actual Anthropic key here]\`

### 3. Enable GitHub Pages hosting
1. In your GitHub repository, go to **Settings > Pages**.
2. Under **Build and deployment**, set Source to **Deploy from a branch**.
3. Select **Branch: main** (or master) and folder **docs/**. Click **Save**.

### 4. Trigger your First Scan!
1. Go to the **Actions** tab in your GitHub repository.
2. Select **Southport Opportunity Scout Cron** on the left rail.
3. Click **Run workflow** -> **Run workflow** (from main).
4. Watch the bot search the web and push updates back to your repo! Within 30 seconds, your sea-state dashboard will be live at:
   \`https://[your-username].github.io/southport-scout/\``
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fileTemplates[selectedFile].content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="deployment-command-center" className="bg-[#1a2a3a] text-white border-t-8 shadow-xl p-6 rounded-none flex flex-col h-full relative" style={{ borderColor: "#b5a264" }}>
      <div className="flex items-center justify-between border-b border-white/20 pb-4 mb-4">
        <div>
          <h3 className="font-serif font-black text-[#b5a264] text-xl tracking-tight uppercase flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Deployment Center
          </h3>
          <p className="font-mono text-[10px] text-gray-300 uppercase tracking-widest mt-1">Deploy automated cron agent on GitHub Actions</p>
        </div>
        <div className="flex gap-2">
          <span className="font-mono text-xs text-[#b5a264] border border-[#b5a264] px-2 py-0.5 uppercase hidden sm:inline-block">
            LEAN & RUNTIME-FREE
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1">
        {/* Left Rail - File Browser */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-black/30 p-3 border border-white/10">
            <h4 className="font-mono text-[10px] uppercase font-bold text-[#b5a264] tracking-widest flex items-center gap-2 mb-3">
              <Folder className="w-4 h-4" /> Agent Repository File Tree
            </h4>
            <div className="flex flex-col gap-1 font-mono text-xs">
              <button
                onClick={() => setSelectedFile("scout.py")}
                className={`flex items-center gap-2 w-full text-left px-2.5 py-1.5 transition-colors ${
                  selectedFile === "scout.py" ? "bg-[#b5a264] text-[#1a2a3a] font-bold" : "hover:bg-white/10 text-gray-300"
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                scout.py
              </button>
              <button
                onClick={() => setSelectedFile("scout_cron.yml")}
                className={`flex items-center gap-2 w-full text-left px-2.5 py-1.5 transition-colors ${
                  selectedFile === "scout_cron.yml" ? "bg-[#b5a264] text-[#1a2a3a] font-bold" : "hover:bg-white/10 text-gray-300"
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                .github/workflows/scout_cron.yml
              </button>
              <button
                onClick={() => setSelectedFile("template.html")}
                className={`flex items-center gap-2 w-full text-left px-2.5 py-1.5 transition-colors ${
                  selectedFile === "template.html" ? "bg-[#b5a264] text-[#1a2a3a] font-bold" : "hover:bg-white/10 text-gray-300"
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                docs/template.html
              </button>
              <button
                onClick={() => setSelectedFile("requirements.txt")}
                className={`flex items-center gap-2 w-full text-left px-2.5 py-1.5 transition-colors ${
                  selectedFile === "requirements.txt" ? "bg-[#b5a264] text-[#1a2a3a] font-bold" : "hover:bg-white/10 text-gray-300"
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                requirements.txt
              </button>
              <button
                onClick={() => setSelectedFile("README.md")}
                className={`flex items-center gap-2 w-full text-left px-2.5 py-1.5 transition-colors ${
                  selectedFile === "README.md" ? "bg-[#b5a264] text-[#1a2a3a] font-bold" : "hover:bg-white/10 text-gray-300"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                README.md
              </button>
            </div>
          </div>

          {/* Quick connection guide summary */}
          <div className="bg-[#b5a264]/10 border border-[#b5a264]/30 p-4 font-sans flex flex-col gap-2.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#b5a264] flex items-center gap-1.5">
              <Github className="w-4 h-4" /> GitHub Actions & Pages Setup
            </span>
            <p className="text-xs text-gray-300 leading-relaxed">
              This set of scripts runs on GitHub's native schedule, calling Claude with Web Search for PR8/PR9, updating <code className="bg-black/40 text-white px-1 font-mono text-[11px]">history.json</code>, and compiling the sea-board HTML to GitHub Pages completely free.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-mono text-amber-300 bg-amber-950/40 p-2 border border-amber-900/30 rounded-none">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Requires <code className="bg-black/30 px-1 py-0.2">ANTHROPIC_API_KEY</code> set in GitHub secrets.</span>
            </div>
          </div>
        </div>

        {/* Right Side - File Code Viewer */}
        <div className="lg:col-span-8 flex flex-col bg-black/45 border border-white/10 relative">
          {/* Code Header bar */}
          <div className="flex items-center justify-between border-b border-white/10 bg-black/30 p-2.5 font-mono text-xs">
            <span className="text-gray-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#b5a264]"></span>
              {fileTemplates[selectedFile].path}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 bg-[#b5a264]/20 hover:bg-[#b5a264] text-[#b5a264] hover:text-[#1a2a3a] border border-[#b5a264]/40 px-2.5 py-1 font-bold transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Code
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Actual Code Display area */}
          <div className="p-4 overflow-auto max-h-[360px] font-mono text-xs leading-relaxed text-gray-200 select-all whitespace-pre">
            {fileTemplates[selectedFile].content}
          </div>
        </div>
      </div>
    </div>
  );
}
