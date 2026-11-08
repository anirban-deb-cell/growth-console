/**
 * Domain types shared by every module. They mirror the tables planned for
 * the Laravel API, so swapping the dummy stores for HTTP calls later is a
 * data-source change, not a UI change.
 */

export type ModuleKey = 'overview' | 'campaigns' | 'seo' | 'blog' | 'reputation' | 'global';

export type ClientHealth = 'good' | 'watch' | 'risk';

export interface Client {
  id: string;
  name: string;
  initials: string;
  city: string;
  branches: string[];
  modules: ModuleKey[];
  enquiries: number;
  costPerEnquiry: number;
  enquiryToAppointment: number;
  rating: number;
  health: ClientHealth;
  website: string;
}

export type Platform = 'google' | 'meta';
export type CampaignType = 'Search' | 'Performance Max' | 'Lead form' | 'Click-to-WhatsApp' | 'Reels & Stories';
export type CampaignObjective = 'calls' | 'whatsapp' | 'forms' | 'visits';
export type CampaignStatus = 'active' | 'paused' | 'draft' | 'in_review' | 'ended';
export type ComplianceState = 'passed' | 'needs_fix' | 'check_images' | 'pending';

export interface Campaign {
  id: string;
  clientId: string;
  name: string;
  platform: Platform;
  type: CampaignType;
  objective: CampaignObjective;
  specialty: string;
  branch: string;
  status: CampaignStatus;
  compliance: ComplianceState;
  /** INR */
  dailyBudget: number;
  /** INR, last 30 days */
  spend: number;
  impressions: number;
  clicks: number;
  enquiries: number;
  appointments: number;
  startDate: string;
  endDate?: string;
  locations: string[];
  languages: string[];
  keywords: string[];
  headlines: string[];
  descriptions: string[];
  landingUrl: string;
  createdAt: string;
}

export type PostStatus = 'published' | 'scheduled' | 'in_review' | 'draft';

/** A headed sub topic inside a post. */
export interface BlogSection {
  id?: string;
  heading: string;
  paragraphs: string[];
  image?: string | null;
  youtubeId?: string | null;
}

export interface BlogPost {
  id: string;
  clientId: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  tags: string[];
  status: PostStatus;
  /** Publish date, or the planned one for drafts/scheduled posts (YYYY-MM-DD). */
  date: string;
  author: string;
  seoScore: number;
  wordCount: number;
  clicks30d: number;
  leads30d: number;
  hasSchema: boolean;
  hasConversion: boolean;
  hasVideo: boolean;
  conversionId?: string;
  youtubeId?: string;
  /** Full content — present when the post is opened in the editor. */
  intro?: string[];
  sections?: BlogSection[];
  /** Image URLs; the first is the cover. */
  images?: string[];
  readMins?: number;
  /** Public URL on the website. */
  url?: string;
}

/** What the editor sends when saving (the API's save.php body). */
export interface BlogSaveInput {
  id?: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  intro: string[];
  sections: BlogSection[];
  tags: string[];
  images: string[];
  youtubeId?: string;
  conversionId?: string;
  author?: string;
  status: PostStatus;
  publishedAt: string;
  readMins: number;
  wordCount: number;
  seoScore: number;
}
