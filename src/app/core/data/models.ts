/**
 * Domain types shared by every module. They mirror the tables planned for
 * the Laravel API, so swapping the dummy stores for HTTP calls later is a
 * data-source change, not a UI change.
 */

export type ModuleKey = 'overview' | 'campaigns' | 'enquiries' | 'seo' | 'blog' | 'reputation' | 'global';

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
  /**
   * 'agency' = the agency's own website (campaigns win new business: Service
   * instead of Specialty, no branches). Default 'hospital' (campaigns bring patients).
   */
  kind?: ClientKind;
  /**
   * The site's Google Search Console property, exactly as added there:
   * "sc-domain:example.com" for a Domain property, or "https://example.com/"
   * for a URL-prefix property. Used for the "Request indexing" link.
   * Defaults to the Domain property of `website`.
   */
  searchConsoleProperty?: string;
}

export type ClientKind = 'agency' | 'hospital';

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
  /** Where the ad sends people (without tracking parameters). */
  landingUrl: string;
  createdAt: string;
  // ---- Saved by the campaign editor (optional on older sample campaigns) ----
  schedule?: CampaignSchedule;
  locationMode?: LocationMode;
  radiusKm?: number | null;
  ageMin?: number | null;
  ageMax?: number | null;
  trackingNumber?: boolean;
  whatsappRouting?: boolean;
  conversionId?: string | null;
  landingMode?: CampaignLandingMode;
  /** /campaigns/<slug> on the website when landingMode is 'page'. */
  slug?: string | null;
  /** The link to put in the ad: landingUrl + UTM tags. */
  adUrl?: string;
  landingPage?: CampaignLandingPage;
  /** Number the landing page's call button dials. */
  phone?: string | null;
  /** Number the landing page's WhatsApp button opens. */
  whatsapp?: string | null;
  updatedAt?: string;
  /** Enquiry-form submissions from the landing page (API mode). */
  leadCount?: number;
  /** Taps on the landing page's Call / WhatsApp buttons. */
  tapCount?: number;
  /** Form enquiries nobody has picked up yet. */
  newLeadCount?: number;
  /** Landing-page visits since launch (API mode). */
  visitCount?: number;
}

/** One campaign's conversion over a date range (api/campaigns/stats.php). */
export interface CampaignStats {
  from: string;
  to: string;
  totals: { visits: number; visitors: number; enquiries: number; taps: number; won: number; conversionRate: number | null };
  daily: { date: string; visits: number; enquiries: number; taps: number }[];
  /** Per utm_source / utm_medium / utm_campaign. */
  bySource: { source: string; medium: string; campaign: string; visits: number; enquiries: number; taps: number; conversionRate: number | null }[];
  devices: { device: string; visits: number }[];
  /** Top utm_term values (usually search keywords) by visits. */
  keywords: { term: string; visits: number }[];
}

export type CampaignSchedule = 'desk' | 'always';
export type LocationMode = 'radius' | 'cities' | 'countries';
/** 'page' = the campaign's own landing page on the website; 'url' = an existing page. */
export type CampaignLandingMode = 'page' | 'url';

/** A campaign's landing page — shown on the website at /campaigns/<slug>, reached only from the ads. */
export interface CampaignLandingPage {
  headline: string;
  subheadline?: string | null;
  offer?: string | null;
  body: string[];
  highlights: string[];
  /** First image is the hero. */
  images: string[];
  youtubeId?: string | null;
  ctaLabel?: string | null;
}

/** What api/campaigns/save.php expects. */
export interface CampaignSaveInput {
  id?: string;
  name: string;
  platform: Platform;
  type: CampaignType;
  objective: CampaignObjective;
  specialty: string;
  branch: string;
  status: CampaignStatus;
  compliance: 'pending' | 'passed' | 'needs_fix';
  dailyBudget: number;
  startDate: string;
  endDate?: string;
  schedule: CampaignSchedule;
  locationMode: LocationMode;
  radiusKm?: number;
  locations: string[];
  languages: string[];
  ageMin?: number;
  ageMax?: number;
  keywords: string[];
  headlines: string[];
  descriptions: string[];
  trackingNumber: boolean;
  whatsappRouting: boolean;
  conversionId?: string;
  landingMode: CampaignLandingMode;
  slug?: string;
  landingUrl?: string;
  landingPage: CampaignLandingPage;
  phone?: string;
  whatsapp?: string;
  /** The campaign's updatedAt when the editor opened it — the save is refused if it changed since. */
  expectedUpdatedAt?: string;
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
  /** Visits to the post on the website, all time (API mode). */
  visitCount?: number;
  /** Contact Us enquiries credited to the post (read just before enquiring). */
  leadCount?: number;
  newLeadCount?: number;
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

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost';
/** form = the landing page's enquiry form; call / whatsapp = a tap on that button (no contact details). */
export type LeadChannel = 'form' | 'call' | 'whatsapp';

/** An enquiry from a campaign landing page (campaign_leads table). */
export interface Lead {
  id: string;
  /** campaign = a campaign landing page; contact = the website's Contact Us form. */
  source: 'campaign' | 'contact';
  campaignId: string | null;
  campaignName: string | null;
  channel: LeadChannel;
  name: string | null;
  organisation: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  message: string | null;
  /** Contact form only: their role and the service they asked about. */
  role?: string | null;
  service?: string | null;
  /** Contact form: the blog post read before enquiring. */
  blogPostId?: string | null;
  blogTitle?: string | null;
  /** Google Ads conversion ID of the campaign or blog post it came from, when set. */
  conversionId?: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  pageUrl: string | null;
  status: LeadStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}
