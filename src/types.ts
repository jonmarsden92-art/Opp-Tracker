export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  evidence: string;
  demand: number; // 1-10
  competition: number; // 1-10
  cost: string; // "Low (<£1.5k)" | "Medium..."
  speed: number; // 1-10
  swell: number; // 1-100%
  timestamp: string;
  sources: GroundingSource[];
}

export interface ScoutSettings {
  postcodes: string[];
  subregions: string[];
  keywords: string[];
  cronSchedule: string;
  githubRepo: string;
  branch: string;
  anthropicApiKeySet: boolean;
}
