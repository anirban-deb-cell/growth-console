import { CampaignObjective, Client } from './models';
import { SPECIALTIES } from './mock-data';

/** What the agency sells — the campaign "Service" options on its own website. */
export const SERVICES = ['Local SEO', 'Google Ads', 'Meta & Instagram ads', 'Social media', 'Website design', 'Complete growth package'];

/**
 * How campaigns are worded for a client. A hospital's campaigns bring
 * patients (specialty, branch, patient-facing copy); the agency's own
 * campaigns win new business (service, no branches, business-facing copy).
 */
export interface CampaignAudience {
  agency: boolean;
  /** "Service" or "Specialty" — the field and the list column. */
  offeringLabel: string;
  offeringPlural: string;
  offerings: string[];
  showBranch: boolean;
  /** Who the ads are for, in a sentence. */
  prospects: string;
  objectives: CampaignObjective[];
  /** Short line per channel id, worded for these prospects. */
  channelDetail: Record<string, string>;
  /** The landing page form's fields, as the website will show them. */
  formFields: string[];
  /** Sample cost-per-enquiry benchmarks (₹) for the estimate. */
  cplBenchmark: Record<string, number>;
  defaultCpl: number;
  keywordPlaceholder: string;
}

const HOSPITAL: CampaignAudience = {
  agency: false,
  offeringLabel: 'Specialty',
  offeringPlural: 'specialties',
  offerings: SPECIALTIES,
  showBranch: true,
  prospects: 'patients',
  objectives: ['calls', 'whatsapp', 'forms', 'visits'],
  channelDetail: {
    'g-search': 'Show up when patients search “knee replacement near me”.',
    'g-pmax': 'Search, Maps, YouTube and Display from one budget.',
    'm-wa': 'Facebook & Instagram ads that open a WhatsApp chat.',
    'm-lead': 'Patients leave their number without leaving Facebook.',
    'm-reels': 'Short video for awareness and doctor introductions.'
  },
  formFields: ['Name', 'Phone', 'City', 'Message'],
  cplBenchmark: { Orthopedics: 430, Cardiology: 560, 'IVF & Fertility': 690, Dermatology: 340, Pediatrics: 280, 'General medicine': 260, 'International patients': 1400 },
  defaultCpl: 450,
  keywordPlaceholder: 'knee replacement cost hyderabad\nknee replacement surgeon near me'
};

const AGENCY: CampaignAudience = {
  agency: true,
  offeringLabel: 'Service',
  offeringPlural: 'services',
  offerings: SERVICES,
  showBranch: false,
  prospects: 'hospital owners, doctors and clinic managers',
  objectives: ['calls', 'whatsapp', 'forms'],
  channelDetail: {
    'g-search': 'Show up when hospital owners search “hospital marketing agency”.',
    'g-pmax': 'Search, YouTube and Display from one budget.',
    'm-wa': 'Facebook & Instagram ads that open a WhatsApp chat with your team.',
    'm-lead': 'Prospects leave their details without leaving Facebook.',
    'm-reels': 'Short videos — results, case studies, client stories.'
  },
  formFields: ['Name', 'Hospital or clinic name', 'Phone', 'City', 'Message'],
  cplBenchmark: { 'Local SEO': 900, 'Google Ads': 1100, 'Meta & Instagram ads': 950, 'Social media': 800, 'Website design': 1200, 'Complete growth package': 1500 },
  defaultCpl: 1000,
  keywordPlaceholder: 'hospital marketing agency hyderabad\nhealthcare digital marketing'
};

export function campaignAudience(client: Client): CampaignAudience {
  return client.kind === 'agency' ? AGENCY : HOSPITAL;
}
