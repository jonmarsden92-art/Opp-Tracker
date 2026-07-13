import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper functions for reading/writing data
const OPPORTUNITIES_PATH = path.join(process.cwd(), "data", "opportunities.json");
const HISTORY_PATH = path.join(process.cwd(), "data", "history.json");
const SETTINGS_PATH = path.join(process.cwd(), "data", "settings.json");

function ensureDirectoryExistence(filePath: string) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data) as T;
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
  }
  return defaultValue;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    ensureDirectoryExistence(filePath);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
  }
}

// 1. GET current opportunities
app.get("/api/opportunities", (req, res) => {
  const opps = readJsonFile(OPPORTUNITIES_PATH, []);
  res.json(opps);
});

// 2. GET historical surfaced items
app.get("/api/history", (req, res) => {
  const history = readJsonFile(HISTORY_PATH, []);
  res.json(history);
});

// 3. POST add to history
app.post("/api/history/add", (req, res) => {
  const { title } = req.body;
  if (!title) {
    res.status(400).json({ error: "Title is required" });
    return;
  }
  const history = readJsonFile<string[]>(HISTORY_PATH, []);
  if (!history.includes(title)) {
    history.push(title);
    writeJsonFile(HISTORY_PATH, history);
  }
  res.json({ success: true, history });
});

// 4. POST remove from history
app.post("/api/history/remove", (req, res) => {
  const { title } = req.body;
  if (!title) {
    res.status(400).json({ error: "Title is required" });
    return;
  }
  const history = readJsonFile<string[]>(HISTORY_PATH, []);
  const filtered = history.filter((item) => item !== title);
  writeJsonFile(HISTORY_PATH, filtered);
  res.json({ success: true, history: filtered });
});

// 5. POST clear history
app.post("/api/history/clear", (req, res) => {
  writeJsonFile(HISTORY_PATH, []);
  res.json({ success: true, history: [] });
});

// 6. GET settings
app.get("/api/settings", (req, res) => {
  const settings = readJsonFile(SETTINGS_PATH, {});
  res.json(settings);
});

// 7. POST update settings
app.post("/api/settings", (req, res) => {
  const current = readJsonFile(SETTINGS_PATH, {});
  const updated = { ...current, ...req.body };
  writeJsonFile(SETTINGS_PATH, updated);
  res.json({ success: true, settings: updated });
});

// 8. POST run live opportunity scan (Gemini + Web Grounding)
app.post("/api/scout", async (req, res) => {
  const settings = readJsonFile<any>(SETTINGS_PATH, {
    postcodes: ["PR8", "PR9"],
    subregions: ["Southport", "Birkdale", "Ainsdale", "Churchtown"],
    keywords: ["local business news", "planning applications", "retail closures"]
  });

  const history = readJsonFile<string[]>(HISTORY_PATH, []);
  const apiKey = process.env.GEMINI_API_KEY;

  const postcodesStr = settings.postcodes.join(" or ");
  const regionsStr = settings.subregions.join(", ");
  const keywordsStr = settings.keywords.join(", ");

  const searchQuery = `Southport UK local business news planning applications retail shifts closures ${regionsStr} (${postcodesStr}) 2026`;

  console.log(`[SOS Scout Engine] Initiating scan with query: "${searchQuery}"`);

  // If no Gemini API Key is configured, run in rich simulation mode
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    console.log("[SOS Scout Engine] No active Gemini API Key. Operating in Simulation Mode.");
    
    // Simulate web search results
    const mockSearchSources = [
      { title: "Sefton Council News Desk", uri: "https://www.sefton.gov.uk/news" },
      { title: "Southport Visiter Local Business", uri: "https://www.lancs.live/all-about/southport" },
      { title: "Birkdale Village Retail Association", uri: "https://www.champnews.com/southport" }
    ];

    // Generate simulated fresh local opportunities not in history
    const simulationPool = [
      {
        title: "Birkdale Hydroponic Craft Herb Farm",
        description: "An indoor, climate-controlled hydroponic micro-farm based in empty commercial glasshouses or warehouses in Southport. Supplies fresh, culinary-grade specialty herbs, microgreens, and edible flowers directly to boutique gastropubs in Birkdale and Southport town center.",
        evidence: "Increasing push toward farm-to-table dining and green local initiatives in Sefton. Birkdale's premium restaurants currently source culinary herbs from wholesale depots over 20 miles away, suffering wilt and transport emissions.",
        demand: 8,
        competition: 1,
        cost: "Medium (£3k - £7k)",
        speed: 7,
        swell: 84
      },
      {
        title: "Churchtown Historic Audio Walking Guides",
        description: "An immersive, geolocated smartphone audio tour platform focusing on Churchtown's thatched cottages and Botanic Gardens. Partners with local pubs, cafes, and tea rooms to offer food/drink vouchers integrated into the digital ticket.",
        evidence: "Botanic Gardens museum revitalization efforts and growing day-tripper numbers. Visitors currently have no self-guided educational engagement with Churchtown's rich history, leaving tourists wandering without structured spending.",
        demand: 7,
        competition: 2,
        cost: "Low (<£1k)",
        speed: 9,
        swell: 81
      },
      {
        title: "Lord Street Empty Arcade Market",
        description: "Re-imagining a portion of Lord Street's vacant Victorian canopied arcades as a dynamic 'incubator marketplace' with tiny, low-rent booths for digital creators and home artisans transitioning from online shops to physical retail.",
        evidence: "High vacancy rate of historic Lord Street retail units, paired with Sefton Council's flexible planning permissions to convert commercial facades into multi-use markets.",
        demand: 9,
        competition: 3,
        cost: "Medium (£5k - £8k)",
        speed: 6,
        swell: 78
      },
      {
        title: "Ainsdale Coastal Water-Sports Kiosk",
        description: "A small-footprint beachside kiosk providing rental gear for paddleboarding, sand-kiting, and windsurfing on Ainsdale Beach. Operates in collaboration with local tourism boards and offers environmental sea-state safety briefings.",
        evidence: "Ainsdale's designated kite-surfing zones and beach parking reopenings. Water sports enthusiasts must bring their own equipment as there is no local rental vendor on-site.",
        demand: 8,
        competition: 2,
        cost: "Medium (£4k - £6k)",
        speed: 8,
        swell: 86
      }
    ];

    // Filter out items already in history
    const availableSimulations = simulationPool.filter(item => !history.includes(item.title));
    
    // Pick at most 3
    const selectedSimulations = availableSimulations.slice(0, 3);

    // If we run out of unique mock ideas, invent one dynamically
    if (selectedSimulations.length < 3) {
      const missingCount = 3 - selectedSimulations.length;
      for (let i = 0; i < missingCount; i++) {
        const uniqueId = Math.floor(Math.random() * 1000);
        selectedSimulations.push({
          title: `Southport PR${9-i} Micro-Hub Service ${uniqueId}`,
          description: `A hyper-local bespoke service designed to address newly detected logistics and retail gaps in the Southport PR8 and PR9 districts, maximizing fast setup.`,
          evidence: `Analysis of general Sefton retail shifts and small-scale business developments in Southport's commercial quarters.`,
          demand: 7,
          competition: 1,
          cost: "Low (<£2k)",
          speed: 8,
          swell: 80
        });
      }
    }

    // Format like real output
    const newOpps = selectedSimulations.map((opp, idx) => ({
      id: `sim-opp-${Date.now()}-${idx}`,
      ...opp,
      timestamp: new Date().toISOString(),
      sources: mockSearchSources
    }));

    // Update opportunities list and history list
    const currentOpps = readJsonFile<any[]>(OPPORTUNITIES_PATH, []);
    // Put new items at the top
    const updatedOpps = [...newOpps, ...currentOpps].slice(0, 15);
    writeJsonFile(OPPORTUNITIES_PATH, updatedOpps);

    const updatedHistory = [...history];
    newOpps.forEach(o => {
      if (!updatedHistory.includes(o.title)) {
        updatedHistory.push(o.title);
      }
    });
    writeJsonFile(HISTORY_PATH, updatedHistory);

    // Short timeout to simulate background scout effort
    await new Promise(resolve => setTimeout(resolve, 2500));

    res.json({
      success: true,
      simulation: true,
      scannedQuery: searchQuery,
      opportunities: newOpps,
      sources: mockSearchSources
    });
    return;
  }

  // Real scan using Gemini API with Search Grounding!
  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const prompt = `
      You are the "Southport Opportunity Scout" (SOS).
      Your target geographical scope is Southport, Merseyside, UK (covering postcodes PR8 and PR9, including Birkdale, Ainsdale, Churchtown, Woodvale, Crossens).
      
      I want you to use your web search capabilities to scan for local news, retail shifts, Sefton planning applications, shop closures, tourism plans, and community needs in Southport.
      
      Analyze the findings and identify exactly 3 highly realistic, unique, and actionable business or service opportunities/gaps.
      
      Exclude these previously surfaced concepts to avoid repeating yourself:
      ${JSON.stringify(history)}
      
      For each opportunity, you must provide:
      1. A specific, descriptive name (e.g., "Birkdale Village Micro-Greenery", "Ainsdale Coastal Gear Locker"). Avoid generic names.
      2. A detailed description explaining the specific market gap, how the business solves it, and why it's a good fit for Southport.
      3. Concrete local evidence or signals you found or inferred from current news, planning applications, or Southport developments (e.g., empty storefronts on Lord Street, new eco-tourism guidelines on Ainsdale beach, etc.).
      4. Score demand (1-10), competition density (1-10, where 1 means no competition at all and 10 means extremely saturated), and speed to first customer (1-10).
      5. Estimate startup capital category (e.g., "Low (<£1.5k)", "Medium (£1.5k-£8k)", "High (>£8k)").
      6. Calculate a "Swell Score" out of 100 representing the overall attractiveness of the opportunity. Be strict and realistic (Swell Score = (Demand * 4 + (11 - Competition) * 3 + Speed * 3) out of 100).
      
      Provide your response in JSON format matching the schema specified.
    `;

    console.log("[SOS Scout Engine] Making GoogleGenAI call with Search Grounding...");

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "A list of exactly 3 unique local business opportunities for Southport.",
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Descriptive name of the business/service." },
              description: { type: Type.STRING, description: "Detailed explanation of the opportunity and concept." },
              evidence: { type: Type.STRING, description: "Local evidence, planning news, or physical shop closures validating this opportunity." },
              demand: { type: Type.INTEGER, description: "Estimated market demand score (1-10)." },
              competition: { type: Type.INTEGER, description: "Competition density score (1-10) where lower is less competition." },
              cost: { type: Type.STRING, description: "Startup cost category." },
              speed: { type: Type.INTEGER, description: "Speed to acquire first customer (1-10)." },
              swell: { type: Type.INTEGER, description: "Swell Score out of 100." }
            },
            required: ["title", "description", "evidence", "demand", "competition", "cost", "speed", "swell"]
          }
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("No response text returned from Gemini API");
    }

    const parsedOpps = JSON.parse(textOutput.trim());

    // Extract search grounding metadata sources
    const groundingSources: any[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web) {
          groundingSources.push({
            title: chunk.web.title || "Web Reference",
            uri: chunk.web.uri
          });
        }
      });
    }

    // Format opportunities for database
    const newOpps = parsedOpps.map((opp: any, idx: number) => ({
      id: `real-opp-${Date.now()}-${idx}`,
      title: opp.title,
      description: opp.description,
      evidence: opp.evidence,
      demand: opp.demand,
      competition: opp.competition,
      cost: opp.cost,
      speed: opp.speed,
      swell: opp.swell,
      timestamp: new Date().toISOString(),
      sources: groundingSources.slice(0, 4) // Keep first 4 references
    }));

    // Update opportunities list
    const currentOpps = readJsonFile<any[]>(OPPORTUNITIES_PATH, []);
    const updatedOpps = [...newOpps, ...currentOpps].slice(0, 15);
    writeJsonFile(OPPORTUNITIES_PATH, updatedOpps);

    // Update history
    const updatedHistory = [...history];
    newOpps.forEach((o: any) => {
      if (!updatedHistory.includes(o.title)) {
        updatedHistory.push(o.title);
      }
    });
    writeJsonFile(HISTORY_PATH, updatedHistory);

    res.json({
      success: true,
      simulation: false,
      scannedQuery: searchQuery,
      opportunities: newOpps,
      sources: groundingSources
    });

  } catch (error: any) {
    console.error("[SOS Scout Engine] Gemini Scout Error:", error);
    res.status(500).json({
      error: "Scout scan failed during Gemini processing. Please verify your internet connection or secrets.",
      details: error.message || error
    });
  }
});

// Helper to get budget-specific pricing details
function getBudgetDetails(budgetCode: string, sectorLabel: string) {
  const budget = budgetCode || "medium";
  switch (budget) {
    case "lean":
      return {
        label: "Lean Budget (< £1.5k)",
        total: "£1,250",
        rows: [
          { cat: "Essential Software & Setup", desc: "Basic landing page website, custom domain, and email setup.", cost: "£250" },
          { cat: "Core Starter Assets", desc: "Basic portable tools and supplies to deliver initial services.", cost: "£450" },
          { cat: "Sefton Regulatory Compliance", desc: "Local public liability insurance and mandatory registrations.", cost: "£250" },
          { cat: "Local Social Launch Ads", desc: "Hyper-targeted Southport Facebook and Instagram flyer-style campaigns.", cost: "£150" },
          { cat: "Emergency Contingency", desc: "Reserved capital for micro-overhead fluctuations.", cost: "£100" }
        ]
      };
    case "low":
      return {
        label: "Low Budget (£1.5k - £5k)",
        total: "£3,850",
        rows: [
          { cat: "Equipment & Asset Acquisition", desc: "Mid-tier professional gear and operational software tools.", cost: "£1,800" },
          { cat: "Premises Prep / Stocking", desc: "Clean up of storage space or initial high-quality inventory.", cost: "£850" },
          { cat: "Professional Branding & Website", desc: "Responsive high-converting booking landing page & brand collateral.", cost: "£450" },
          { cat: "Sefton Council Licenses", desc: "Sefton business license fees, food safety, or local permit applications.", cost: "£400" },
          { cat: "Contingency Runway", desc: "Emergency cash buffer to secure early utilities and transport logistics.", cost: "£350" }
        ]
      };
    case "medium":
    case "moderate":
      return {
        label: "Moderate Budget (£5k - £15k)",
        total: "£9,400",
        rows: [
          { cat: "Commercial Assets & Hardware", desc: "Advanced operational machinery, custom tools, or light-delivery logistics.", cost: "£4,200" },
          { cat: "Physical Site Setup & Fit-out", desc: "Lease deposit on local Southport space and aesthetic interior remodelling.", cost: "£2,400" },
          { cat: "Local Launch PR & Advertising", desc: "Sponsorships, printed brochures, local news promotions, and VIP opening event.", cost: "£1,200" },
          { cat: "Legal, Sefton Compliance & Permits", desc: "Drafting of client agreements, Sefton planning permissions, and comprehensive cover.", cost: "£800" },
          { cat: "Operational Cash Runway", desc: "Financial buffer covering 2 months of utility overheads and initial stock replenishing.", cost: "£800" }
        ]
      };
    case "high":
    case "premium":
    default:
      return {
        label: "High Budget (> £15k)",
        total: "£22,500",
        rows: [
          { cat: "Premium Grade Commercial Gear", desc: "State-of-the-art heavy-duty professional equipment, custom fittings, and robust infrastructure.", cost: "£11,500" },
          { cat: "High-Street Location & Renovations", desc: "Prime Lord Street or Birkdale Village lease deposit, aesthetic exterior and interior fit-out.", cost: "£5,200" },
          { cat: "Custom Platform & Marketing Campaign", desc: "Bespoke digital booking app/database, search engine optimization (SEO) launch, and VIP PR outreach.", cost: "£2,800" },
          { cat: "Sefton Planning & Compliance Fees", desc: "Full environmental assessments, structural/heritage inspections, and comprehensive business liability portfolios.", cost: "£1,400" },
          { cat: "Operating Reserves & Runway", desc: "Working capital runway for staff wages, upfront material acquisitions, and premium seasonal marketing.", cost: "£1,600" }
        ]
      };
  }
}

// 9. Helper function to generate simulated Southport blueprint
function getSimulatedBlueprint(opportunity: any, selectedSector?: string, selectedBudget?: string): string {
  const title = opportunity.title;
  const evidence = opportunity.evidence || "Identified market demand and shift in local footfall patterns.";
  
  const sector = selectedSector || "other";
  const budget = selectedBudget || "medium";

  // Map sector keys to human-readable labels
  const sectorLabels: Record<string, string> = {
    food_beverage: "Food, Beverage & Gastronomy",
    hospitality_leisure: "Hospitality, Leisure & Lodging",
    retail_artisan: "Retail, Maker Markets & Artisan Crafts",
    tourism_tours: "Tourism, Guiding & Coastal Experiences",
    tech_digital: "Technology, Software & Digital Platforms",
    professional_creative: "Professional, Design & Creative Agencies",
    health_wellness: "Health, Wellness, Sport & Fitness",
    other: "General Local Southport Business"
  };

  const sectorLabel = sectorLabels[sector] || sectorLabels.other;
  const budgetDetails = getBudgetDetails(budget, sectorLabel);

  // Generate cost table markdown
  let tableMarkdown = `| Budget Category | Description | Estimated Cost |\n| :--- | :--- | :--- |\n`;
  budgetDetails.rows.forEach(row => {
    tableMarkdown += `| **${row.cat}** | ${row.desc} | ${row.cost} |\n`;
  });
  tableMarkdown += `| **TOTAL INITIAL RUNWAY** | **Recommended launch budget (${budgetDetails.label})** | **${budgetDetails.total}** |\n`;

  // Define tailored templates per sector
  if (sector === "food_beverage") {
    return `
# ⚓ Southport Business Blueprint: **${title}**
*Custom Local Development Strategy for Southport, Birkdale, and Ainsdale (PR8 / PR9)*
*Sector: **${sectorLabel}** | Budget Level: **${budgetDetails.label}***

---

### 📋 Executive Summary & Southport Specific Edge
The **${title}** addresses a critical supply-chain gap in Sefton’s coastal gastronomy sector. High-end restaurants and gastropubs in Birkdale Village, Lord Street, and Ainsdale are experiencing a high demand for premium quality, local ingredients, yet rely heavily on national distribution networks. 

By operating a specialized, hyper-local culinary enterprise in Southport, you can offer a unique **"harvest-to-plate/locally sourced"** guarantee. This sustainable USP aligns perfectly with Sefton Council's green initiatives and the discerning tastes of the local culinary crowd, allowing you to secure premium contract pricing with top-tier dining establishments.

---

### 🚀 Entrance to Market Strategy
To successfully launch this Food & Beverage venture in Southport:
1. **Gastropub Partnership Program:** Avoid retail initially. Approach 3-5 influential Birkdale and Lord Street gastropubs with high-quality samples. Let chefs taste the freshness and longevity of locally crafted culinary goods.
2. **"Sourced in Sefton" Branding:** Leverage town pride. Co-brand menus with partner restaurants (e.g., *"Proudly serving Southport-grown ingredients"*).
3. **Flexible Sefton Planning:** Repurpose empty Southport retail units, outbuildings, or land parcels using Sefton Council's flexible "permitted development" class changes for sustainable food initiatives.
4. **Subscription-Based Revenue:** Establish a weekly standing order with chefs to stabilize cash flow, secure recurring revenue, and prevent material waste.

---

### 💰 Detailed Breakdown of Startup Costs
*Based on **${budgetDetails.label}** parameters:*

${tableMarkdown}

---

### 🏆 Key Success Factors: How to Make This Successful
*To secure long-term profitability and dominate the Southport culinary market:*

*   **Consistency is King:** Chefs design menus months in advance. You must guarantee a reliable, year-round delivery schedule regardless of Southport's seaside weather fluctuations.
*   **Target High-Value Items:** Focus strictly on high-margin, fast-turnaround culinary varieties that sell at high premium rates, maximizing space and cash efficiency.
*   **Apply for Sefton Business Grants:** Sefton Council periodically runs green technology and business diversification grants. Apply to subsidize initial equipment installation costs.
*   **Host Chef Open Days:** Invite local kitchen managers and restaurant owners to tour your setup. Showcasing your clean, high-tech, and efficient operations builds unmatched trust.
`;
  } else if (sector === "hospitality_leisure") {
    return `
# ⚓ Southport Business Blueprint: **${title}**
*Custom Local Development Strategy for Southport & Coastal Sefton (PR8)*
*Sector: **${sectorLabel}** | Budget Level: **${budgetDetails.label}***

---

### 📋 Executive Summary & Southport Specific Edge
Southport enjoys over 5 million day-trippers annually, but there remains a major gap in premium, curated leisure activities and high-end coastal hospitality. The **${title}** capitalizes on this massive influx by offering a distinctive, memorable leisure model.

Whether targeting the affluent golf-coast demographic (e.g., visitors to Royal Birkdale) or families holidaying along Ainsdale and Southport beach, this business delivers a high-touch, memorable experience. By focusing on premium hospitality and distinct local aesthetics, you command impressive margins that standard generic tourist spots cannot match.

---

### 🚀 Entrance to Market Strategy
To successfully launch this Hospitality & Leisure venture:
1. **Strategic Lodging Alliances:** Partner with Southport's boutique hotels and luxury guest houses. Provide them with customized flyers and exclusive referral codes to offer their guests.
2. **Launch with VIP Taster Days:** Invite local tourism influencers, Sefton Council tourism representatives, and hoteliers to experience your leisure service for free in exchange for organic reviews.
3. **Seasonality Buffering:** Design indoor/coastal-adapted alternatives. Create high-value winter packages (e.g., cozy heated indoor experiences) to maintain revenue when beach tourism slows down.
4. **Dynamic Booking Optimization:** Implement a mobile-first digital booking platform to capture spontaneous last-minute weekend day-trippers from Liverpool, Manchester, and Preston.

---

### 💰 Detailed Breakdown of Startup Costs
*Based on **${budgetDetails.label}** parameters:*

${tableMarkdown}

---

### 🏆 Key Success Factors: How to Make This Successful
*To dominate the local coastal leisure scene and secure long-term success:*

*   **Uncompromising Service Quality:** In hospitality, reviews are your lifeblood. Ensure every staff member is trained to provide warm, impeccable Southport-heritage level hospitality.
*   **Leverage High-Net-Worth Demographics:** Tailor premium upsells (e.g., luxury picnic hampers, private chauffeured tours, or custom golf-coast packages) to double your average transaction value.
*   **Build a Strong Weather Strategy:** Southport is famous for its gorgeous but mercurial coastal weather. Always have a robust wet-weather plan so that bookings can be converted or moved indoors seamlessly.
*   **Active Local SEO:** Optimize your local Google Maps presence for terms like "Things to do in Southport" or "Birkdale leisure". This captures high-intent organic search volume from tourists.
`;
  } else if (sector === "retail_artisan") {
    return `
# ⚓ Southport Business Blueprint: **${title}**
*Custom Local Development Strategy for Lord Street's Historic Canopies (PR8)*
*Sector: **${sectorLabel}** | Budget Level: **${budgetDetails.label}***

---

### 📋 Executive Summary & Southport Specific Edge
Lord Street is famous for its gorgeous Victorian glazed canopies and grand historic arcades, but high business rates have historically left some prime units empty. The **${title}** revitalizes this premium retail landscape by introducing an agile, low-overhead artisan collective or boutique retail model.

By pooling resources or partitioning a beautiful space, you bypass heavy long-term commercial leases while showcasing Southport’s thriving online Etsy creators, digital designers, and local antique dealers. You create a high-atmosphere, social shopping destination that stands in sharp contrast to cold, sterile department stores and online giant retailers.

---

### 🚀 Entrance to Market Strategy
To successfully launch this Retail & Artisan venture:
1. **Sefton Council Regeneration Partnership:** Frame the business as a high-street regeneration initiative. Work with Sefton's Town Centre Regeneration officer to negotiate rates relief.
2. **Artisan Outreach Campaign:** Recruit Southport's top makers and independent sellers via social media. Offer flexible, low-barrier daily or weekend pop-up slots to build instant vendor variety.
3. **Themed High-Street Weekends:** Run rotating specialized events (e.g., *Southport Retro & Vinyl Fair*, *Artisan Gourmet Food & Craft Beer*) to guarantee recurring, highly motivated footfall.
4. **Social & Cafe Integration:** Set up a clean, visually appealing coffee or botanical mocktail counter inside the retail layout to encourage visitors to linger and browse longer.

---

### 💰 Detailed Breakdown of Startup Costs
*Based on **${budgetDetails.label}** parameters:*

${tableMarkdown}

---

### 🏆 Key Success Factors: How to Make This Successful
*To ensure a highly profitable and enduring retail footprint on Southport's high street:*

*   **Vibe is Everything:** Ensure your space is beautifully lit, smells amazing, and plays curated acoustic music. Create an inviting, nostalgia-tinted coastal aesthetic that begs to be shared on Instagram.
*   **Strict Curation Standards:** Do not let the inventory deteriorate into a generic flea market. Keep a tight balance: 60% handmade premium design, 25% specialty gourmet, and 15% high-quality vintage.
*   **Centralized Digital Checkout:** Utilize a single, unified POS system to handle transactions for all micro-vendors. This streamlines the customer experience and allows you to collect smooth percentage-based commissions.
*   **Nurture Vendor Relationships:** Offer free marketing spotlight posts to your makers and hold monthly feedback mixers, building a passionate, self-promoting local community.
`;
  } else if (sector === "tourism_tours") {
    return `
# ⚓ Southport Business Blueprint: **${title}**
*Custom Local Development Strategy for Southport, Churchtown, and Sefton Tourism (PR9)*
*Sector: **${sectorLabel}** | Budget Level: **${budgetDetails.label}***

---

### 📋 Executive Summary & Southport Specific Edge
Southport and Churchtown boast rich Victorian heritage, stunning coastal vistas, and beautiful botanic gardens, yet many visitors arrive and wander without discovering the deep local history or hidden spots. The **${title}** solves this "tourism leakage" by capturing visitors with a highly engaging, interactive digital-guided or guided tour experience.

By combining immersive storytelling with local business coupon integrations (such as partnerships with Churchtown's tea rooms, cafes, and historic pubs), you turn a passive walk into a highly curated, commercial safari. This model secures multiple revenue streams from tour bookings, commissions on partner-store voucher redemptions, and premium tour upsells.

---

### 🚀 Entrance to Market Strategy
To successfully launch this Tourism & Guiding enterprise:
1. **Hyper-Local QR Code Placements:** Partner with historic sites, local B&Bs, and Southport hotels to place attractive, weather-proof wooden plaques with QR codes (e.g., *"Scan to Unlock Churchtown's Secret History"*).
2. **Affiliate Revenue Splits:** Offer local B&Bs, hotels, and cafes a 15% commission on every tour ticket sold through their custom referral QR code or physical leaflet.
3. **Targeted Regional Advertising:** Run high-impact social media ads aimed at weekend day-trippers within a 35-mile radius (Liverpool, Preston, Manchester) focusing on scenic, family-friendly coastal days out.
4. **Community Co-creation:** Conduct short interviews with Southport heritage historians and local elders, weaving authentic, highly engaging audio-narrations that cannot be replicated by national tour operators.

---

### 💰 Detailed Breakdown of Startup Costs
*Based on **${budgetDetails.label}** parameters:*

${tableMarkdown}

---

### 🏆 Key Success Factors: How to Make This Successful
*To dominate the Sefton coastal tourism sector and build an enduring brand:*

*   **Offer an Irresistible "Hook":** Let users experience the first 3 stops of your tour completely free of charge before prompting a modest paywall to unlock the remainder of the route.
*   **Gamify for Multi-Generational Appeal:** Include a fun, interactive "Scavenger Hunt" mode for families with children. Finding historic carvings, unique beach plants, or architectural details expands your market.
*   **Maintain Fresh Business Partners:** Update your food, drink, and gift coupon integrations monthly. Ensure pub landlords and cafe owners are delighted with the stream of footfall you send them.
*   **Leverage Local PR Power:** Pitch your launch to the Southport Champion, Sefton Borough Council press office, and regional Lancashire heritage blogs to drive free, high-authority organic traffic.
`;
  } else if (sector === "tech_digital") {
    return `
# ⚓ Southport Business Blueprint: **${title}**
*Custom Local Development Strategy for Sefton's Emerging Digital Economy (PR8)*
*Sector: **${sectorLabel}** | Budget Level: **${budgetDetails.label}***

---

### 📋 Executive Summary & Southport Specific Edge
Southport's business ecosystem is rich with independent boutiques, local service providers, and niche operators, but many struggle to compete with national brands due to outdated digital infrastructure. The **${title}** delivers modern, agile technology solutions tailored specifically to the needs of local independents.

Your competitive advantage is your high-touch local presence. You aren't a nameless global tech giant; you are Southport's dedicated tech partner, providing in-person training, quick troubleshooting, and direct local customisations.

---

### 🚀 Entrance to Market Strategy
To successfully launch this Tech & Digital venture in Southport:
1. **The "No Upfront Cost" Risk Reversal:** Offer local businesses a low-risk, subscription-based setup with no heavy upfront capital requirements, making it incredibly easy for them to digitize.
2. **Local Merchant Meetups:** Host free "Digitize Southport" workshops at co-working spaces or local cafes, educating business owners on how to boost their sales using simple digital tools.
3. **Sefton Council Grants Alignment:** Help your clients apply for Sefton Council's digital business adaptation grants, letting government funding subsidize your service contracts.
4. **Case Study Marketing:** Partner with one well-known Birkdale or Lord Street retailer as a free pilot. Document their 40% efficiency boost or surge in sales, and use that success story to sign up 10 more merchants.

---

### 💰 Detailed Breakdown of Startup Costs
*Based on **${budgetDetails.label}** parameters:*

${tableMarkdown}

---

### 🏆 Key Success Factors: How to Make This Successful
*To scale a highly profitable tech and digital agency in the Sefton area:*

*   **Focus on Radical Simplicity:** Many local business owners are not tech-savvy. Keep your dashboards, apps, and booking screens clean, intuitive, and extremely easy to navigate.
*   **Build Recurring Revenue Stream:** Structure your pricing model around monthly recurring retainers or SaaS subscriptions. This guarantees high business stability and enterprise value.
*   **Establish Stellar Local Support:** Offer rapid in-person or WhatsApp support. Knowing they can speak to a real Southport-based expert in under an hour builds massive client loyalty.
*   **Upsell Complementary Services:** Once a client trusts your core digital platform, offer high-margin add-ons like local SEO optimization, digital marketing management, or custom feature expansion.
`;
  } else if (sector === "professional_creative") {
    return `
# ⚓ Southport Business Blueprint: **${title}**
*Custom Local Development Strategy for Sefton's Creative Sector (PR8)*
*Sector: **${sectorLabel}** | Budget Level: **${budgetDetails.label}***

---

### 📋 Executive Summary & Southport Specific Edge
With a surge in remote working and a booming independent retail sector in Birkdale, Ainsdale, and Southport town centre, there is an urgent need for professional, high-impact creative services. The **${title}** provides premium design, marketing, media, or business consulting services tailored to help Sefton companies stand out and scale.

Your unique local edge is your deep knowledge of Southport's unique demographics and high-street dynamics. Unlike remote national creative agencies, you offer direct, face-to-face collaboration, custom photography in Southport's natural scenery, and a passion for building the local coastal economy.

---

### 🚀 Entrance to Market Strategy
To successfully launch this Professional & Creative Agency:
1. **Join Southport Chambers of Commerce:** Establish immediate professional network connections. Attend Birkdale business mixers and Sefton enterprise networking events to secure early clients.
2. **"Revitalize Southport" Package:** Launch with a highly bundled, flat-rate branding package specifically designed for Lord Street merchants looking to refresh their storefronts and social presence.
3. **Host Educational Masterclasses:** Hold monthly free seminars on "Aesthetic Marketing for Coastal Businesses" or "Brand Storytelling" to position yourself as the premier local creative authority.
4. **Local Collaboration Network:** Form alliances with local freelance copywriters, web developers, and videographers to deliver comprehensive, full-service creative campaigns under your brand umbrella.

---

### 💰 Detailed Breakdown of Startup Costs
*Based on **${budgetDetails.label}** parameters:*

${tableMarkdown}

---

### 🏆 Key Success Factors: How to Make This Successful
*To build a highly sought-after, high-margin creative agency in Southport:*

*   **Build a Show-Stopping Portfolio:** Your own branding, website, and social channels must be flawlessly styled. If your business looks stunning, clients will trust you to style theirs.
*   **Structure Retained Contracts:** Shift client relationships from one-off projects to monthly creative retainers (e.g., social media curation, ongoing brand design). This secures predictable cash flow.
*   **Champion Local Storytelling:** Infuse your work with Southport's rich coastal heritage, beach aesthetics, and beautiful Victorian architecture. This unique local flair makes your work deeply resonant.
*   **Deliver Exceptional Customer Care:** Word-of-mouth travels incredibly fast in Sefton. Go above and beyond for your first few clients to secure enthusiastic, organic local referrals.
`;
  } else if (sector === "health_wellness") {
    return `
# ⚓ Southport Business Blueprint: **${title}**
*Custom Local Development Strategy for Restorative Sefton Coastal Wellness (PR8 / PR9)*
*Sector: **${sectorLabel}** | Budget Level: **${budgetDetails.label}***

---

### 📋 Executive Summary & Southport Specific Edge
Southport, Ainsdale, and Birkdale have a long-standing, historic tradition as restorative coastal seaside destinations. Today, Sefton's residents and health-conscious visitors are seeking highly personalized wellness, fitness, and mental health programs. The **${title}** taps directly into this tradition.

By leveraging Southport's unique natural assets—our stunning coastal pinewoods, sand dunes, and fresh sea air—you can offer distinctive, restorative outdoor/indoor wellness sessions. This focus on coastal tranquility, mindful movement, and holistic health is highly attractive to Southport's diverse demographic.

---

### 🚀 Entrance to Market Strategy
To successfully launch this Health & Wellness venture:
1. **Beachfront & Pinewood Pop-ups:** Start with outdoor wellness pop-up sessions (yoga on Ainsdale beach, woodland mindfulness trails) to launch with zero premises costs and create high visual appeal.
2. **Collaborative Cross-Promotions:** Partner with local organic cafes, juice bars, and health food stores. Cross-promote with flyer drops and joint wellness workshops.
3. **Specialized Demographics Packages:** Design specialized wellness programs tailored to Southport's unique audiences: "Restorative Seaside Wellness for Seniors" and "High-Performance Beach Athletics" for active runners.
4. **Inspirational Social Presence:** Share visually stunning, calm-inducing wellness content filmed directly on Southport's dunes and coastlines, building an organic, highly motivated local following.

---

### 💰 Detailed Breakdown of Startup Costs
*Based on **${budgetDetails.label}** parameters:*

${tableMarkdown}

---

### 🏆 Key Success Factors: How to Make This Successful
*To scale an enduring, highly trusted wellness and health brand in Sefton:*

*   **Establish Deep Community Trust:** Wellness is intensely personal. Secure premium certifications, maintain impeccable safety standards, and deliver warm, highly empathetic client interactions.
*   **Flexible Indoor/Outdoor Offerings:** Formulate indoor winter alternatives (e.g., renting local boutique community halls or hotel studios) so your wellness classes can continue year-round during stormy coastal months.
*   **Focus on High-Margin Retainers:** Encourage clients to sign up for monthly recurring membership models or multi-week wellness journeys rather than pay-as-you-go single classes.
*   **Foster Active Community Bonds:** Create a supportive post-class community culture (e.g., "Wellness & Coastal Coffee" walks) to build strong, enduring friendships among your client base.
`;
  } else {
    // Default or General Coastal Enterprise
    return `
# ⚓ Southport Business Blueprint: **${title}**
*Custom Local Development Strategy for Southport & Sefton Coastal Hub*
*Sector: **${sectorLabel}** | Budget Level: **${budgetDetails.label}***

---

### 📋 Executive Summary & Southport Specific Edge
The concept **${title}** represents a highly viable, timely response to the Southport market signals. The town is undergoing major revitalization projects, yet there remains an urgent need for agile, micro-scale services that fit Sefton's specific local demographics (day-trippers, coastal retirees, and local remote workers).

**Why Southport is ready for this:**
*   **Geographic Focus:** The PR8 and PR9 districts boast high density but suffer from localized service vacuums.
*   **Signals Validated:** ${evidence}
*   **Core USP:** This service offers hyper-targeted convenience or local sourcing that major national providers cannot easily customize or scale.

---

### 🚀 Entrance to Market Strategy
To launch this idea effectively in the Southport region:
1. **Community-First Marketing:** Leverage Southport community Facebook groups (e.g., Southport Town Gossip, Birkdale/Ainsdale community boards) for hyper-local awareness.
2. **Lean MVP Launch:** Start as a mobile or digital-first service before investing in fixed premises or high-cost equipment. Test customer demand with a simple 2-page landing website.
3. **Strategic Partnerships:** Partner with complementary existing Lord Street or Birkdale shops to cross-promote.
4. **Local PR:** Reach out to local news outlets to pitch your story as a positive Southport start-up success story, securing valuable backlink and local reputation credits.

---

### 💰 Detailed Breakdown of Startup Costs
*Based on **${budgetDetails.label}** parameters:*

${tableMarkdown}

---

### 🏆 Key Success Factors: How to Make This Successful
*To secure long-term profitability and build a sustainable brand in Sefton:*

*   **Establish Trust Early:** Southport is a tight-knit community. Word-of-mouth is your most powerful asset. Focus intensely on stellar customer service for your first 10 clients.
*   **Keep Overhead Low:** Avoid long commercial leases until you have sustained monthly profits. Rent shared spaces or use mobile operations to remain extremely agile.
*   **Optimize for Sea-Side Demographics:** Ensure your payment methods are highly accessible (both contactless digital cards and simple invoicing) and your scheduling is friendly to local routines.
*   **Leverage Local Business Networks:** Join the Southport chamber of commerce and attend local networking meetups to build commercial allies.
`;
  }
}

// 10. POST generate business blueprint and market entry plan
app.post("/api/plan", async (req, res) => {
  const { opportunity, selectedSector, selectedBudget } = req.body;
  if (!opportunity || !opportunity.title) {
    res.status(400).json({ error: "Opportunity data is required" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;

  console.log(`[SOS Blueprint Engine] Generating plan for: "${opportunity.title}" with Sector: "${selectedSector}" and Budget: "${selectedBudget}"`);

  // If no Gemini API Key is configured, use Southport-themed highly structured templates
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    console.log("[SOS Blueprint Engine] Operating in Simulation Mode.");
    
    // Short timeout to simulate computational depth
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const simulatedMarkdown = getSimulatedBlueprint(opportunity, selectedSector, selectedBudget);
    res.json({
      success: true,
      simulation: true,
      blueprint: simulatedMarkdown.trim()
    });
    return;
  }

  // Real Gemini implementation
  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const sectorLabels: Record<string, string> = {
      food_beverage: "Food, Beverage & Gastronomy",
      hospitality_leisure: "Hospitality, Leisure & Lodging",
      retail_artisan: "Retail, Maker Markets & Artisan Crafts",
      tourism_tours: "Tourism, Guiding & Coastal Experiences",
      tech_digital: "Technology, Software & Digital Platforms",
      professional_creative: "Professional, Design & Creative Agencies",
      health_wellness: "Health, Wellness, Sport & Fitness",
      other: "General Local Southport Business"
    };
    const targetSectorLabel = sectorLabels[selectedSector || ""] || "General Coastal Enterprise";

    const budgetLabels: Record<string, string> = {
      lean: "Lean Budget (< £1,500)",
      low: "Low Budget (£1,500 - £5,000)",
      medium: "Moderate Budget (£5,000 - £15,000)",
      high: "High Budget (> £15,000)"
    };
    const targetBudgetLabel = budgetLabels[selectedBudget || ""] || opportunity.cost;

    const prompt = `
      You are the "Southport Opportunity Blueprint Generator".
      I need you to build a highly realistic, professional, Southport-focused Business Blueprint and Market Entry Plan for this business opportunity, customized specifically to the sector and launch budget chosen by the user:
      
      Opportunity Title: "${opportunity.title}"
      Description: "${opportunity.description}"
      Swell Score: "${opportunity.swell}%"
      Evidence: "${opportunity.evidence}"
      
      USER CUSTOMIZATIONS:
      - Selected Target Sector: "${targetSectorLabel}"
      - Selected Launch Budget: "${targetBudgetLabel}"
      
      Please structure your output strictly in elegant Markdown containing these exact headers:
      1. # ⚓ Southport Business Blueprint: **[Insert Opportunity Name Here]**
         - Write 1-2 powerful paragraphs containing an "Executive Summary & Southport Specific Edge". Explain why this business is perfectly suited to the Southport, Birkdale, Ainsdale, or Churchtown (PR8/PR9) demographics. Tailor your explanation to fit the selected sector: "${targetSectorLabel}".
      2. ### 🚀 Entrance to Market Strategy
         - Provide exactly 4 highly actionable, specific, Southport-tailored launch steps. Mention local directories, Sefton Council licensing/planning context, local community partnerships, or physical locations (e.g. Lord Street, Birkdale Village, Ainsdale Beach, Churchtown).
      3. ### 💰 Detailed Breakdown of Startup Costs
         - Provide a beautifully formatted Markdown table with column headers: "Budget Category", "Description", and "Estimated Cost (GBP)". Provide realistic cost allocations in UK Pounds (£) that total up to a sensible figure perfectly matching the chosen budget level: "${targetBudgetLabel}".
      4. ### 🏆 Key Success Factors: How to Make This Successful
         - Provide 4 practical, specific bullet points explaining how to gain the local Southport community's trust, keep overheads low, handle local weather/seasonality fluctuations (as Southport is a coastal tourist town), and turn this idea into an enduring commercial success.
         
      Maintain a highly professional, composed, and encouraging entrepreneurial tone. Use rich detail.
    `;

    const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    let textOutput = "";
    let usedModel = "";

    for (const modelName of modelsToTry) {
      try {
        console.log(`[SOS Blueprint Engine] Querying Gemini model "${modelName}" for a rich markdown blueprint...`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            temperature: 0.7,
          }
        });

        if (response.text) {
          textOutput = response.text;
          usedModel = modelName;
          break;
        }
      } catch (err: any) {
        console.warn(`[SOS Blueprint Engine] Model "${modelName}" failed to respond:`, err.message || err);
      }
    }

    if (!textOutput) {
      throw new Error("All requested Gemini models failed or returned empty text responses.");
    }

    console.log(`[SOS Blueprint Engine] Blueprint generated successfully using model "${usedModel}"`);

    res.json({
      success: true,
      simulation: false,
      modelUsed: usedModel,
      blueprint: textOutput.trim()
    });

  } catch (error: any) {
    console.error("[SOS Blueprint Engine] Real Gemini API call failed. Falling back gracefully to simulated Southport blueprint. Error details:", error);
    
    // Graceful fallback to simulated blueprint with a small explanatory log tag so the user knows it served robustly
    const fallbackMarkdown = getSimulatedBlueprint(opportunity, selectedSector, selectedBudget);
    
    res.json({
      success: true,
      simulation: true,
      blueprint: fallbackMarkdown.trim()
    });
  }
});

// Serve frontend
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("[SOS Server] Starting in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[SOS Server] Starting in PRODUCTION mode with compiled assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SOS Server] Running at http://localhost:${PORT}`);
  });
}

startServer();
