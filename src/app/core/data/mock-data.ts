import { BlogPost, Campaign, Client, Lead } from './models';

/**
 * SAMPLE DATA ONLY — fictional hospitals and figures used to present the
 * product. Every screen that reads this shows a "Sample data" badge.
 */

export const CLIENTS: Client[] = [
  { id: 'medgrowth', name: 'MedGrowth Digital', initials: 'MG', city: 'Hyderabad', branches: ['Hyderabad'], modules: ['overview', 'campaigns', 'enquiries', 'seo', 'blog', 'reputation', 'global'], enquiries: 136, costPerEnquiry: 0, enquiryToAppointment: 0, rating: 4.9, health: 'good', website: 'medgrowth.co.in', kind: 'agency', searchConsoleProperty: 'sc-domain:medgrowth.co.in' },
  { id: 'sunrise', name: 'Sunrise Multispeciality Hospital', initials: 'SM', city: 'Hyderabad', branches: ['Banjara Hills', 'Kondapur', 'LB Nagar'], modules: ['overview', 'campaigns', 'seo', 'blog', 'reputation', 'global'], enquiries: 1284, costPerEnquiry: 412, enquiryToAppointment: 37.9, rating: 4.6, health: 'good', website: 'sunrisehospital.in' },
  { id: 'aarogya', name: 'Aarogya Heart Institute', initials: 'AH', city: 'Bengaluru', branches: ['Jayanagar', 'Whitefield'], modules: ['overview', 'campaigns', 'reputation'], enquiries: 842, costPerEnquiry: 598, enquiryToAppointment: 29.4, rating: 4.4, health: 'risk', website: 'aarogyaheart.in' },
  { id: 'lotus', name: "Lotus Women's & IVF Centre", initials: 'LW', city: 'Hyderabad', branches: ['Madhapur'], modules: ['overview', 'campaigns', 'seo', 'blog', 'global'], enquiries: 611, costPerEnquiry: 702, enquiryToAppointment: 24.1, rating: 4.7, health: 'watch', website: 'lotusivf.in' },
  { id: 'nirmal', name: 'Nirmal Ortho & Spine', initials: 'NO', city: 'Pune', branches: ['Baner', 'Kothrud'], modules: ['overview', 'campaigns', 'seo', 'blog'], enquiries: 738, costPerEnquiry: 455, enquiryToAppointment: 36.2, rating: 4.5, health: 'watch', website: 'nirmalortho.in' },
  { id: 'kalyani', name: 'Kalyani Dental Studio', initials: 'KD', city: 'Chennai', branches: ['Adyar', 'Anna Nagar', 'T Nagar', 'Velachery'], modules: ['overview', 'campaigns', 'reputation'], enquiries: 926, costPerEnquiry: 288, enquiryToAppointment: 44.0, rating: 4.8, health: 'good', website: 'kalyanidental.in' },
  { id: 'vision', name: 'Vision Plus Eye Hospital', initials: 'VE', city: 'Kolkata', branches: ['Salt Lake'], modules: ['overview', 'seo', 'blog', 'reputation'], enquiries: 402, costPerEnquiry: 371, enquiryToAppointment: 39.5, rating: 4.3, health: 'good', website: 'visionpluseye.in' },
  { id: 'greenleaf', name: 'Greenleaf Children’s Clinic', initials: 'GC', city: 'Hyderabad', branches: ['Gachibowli', 'Kukatpally'], modules: ['overview', 'campaigns'], enquiries: 515, costPerEnquiry: 264, enquiryToAppointment: 46.8, rating: 4.6, health: 'good', website: 'greenleafkids.in' },
  { id: 'medisun', name: 'Medisun Skin & Hair', initials: 'MS', city: 'Mumbai', branches: ['Andheri', 'Bandra', 'Powai'], modules: ['overview', 'campaigns', 'reputation'], enquiries: 688, costPerEnquiry: 331, enquiryToAppointment: 33.7, rating: 4.2, health: 'watch', website: 'medisunskin.in' }
];

export const SPECIALTIES = ['Orthopedics', 'Cardiology', 'IVF & Fertility', 'Dermatology', 'Pediatrics', 'General medicine', 'International patients'];

const c = (p: Partial<Campaign> & Pick<Campaign, 'id' | 'name' | 'platform' | 'type' | 'specialty'>): Campaign => ({
  clientId: 'sunrise',
  objective: 'calls',
  branch: 'All branches',
  status: 'active',
  compliance: 'passed',
  dailyBudget: 2000,
  spend: 0,
  impressions: 0,
  clicks: 0,
  enquiries: 0,
  appointments: 0,
  startDate: '2026-09-01',
  locations: ['Hyderabad + 25 km'],
  languages: ['English', 'Telugu'],
  keywords: [],
  headlines: [],
  descriptions: [],
  landingUrl: 'https://sunrisehospital.in/',
  createdAt: '2026-09-01',
  ...p
});

export const CAMPAIGNS: Campaign[] = [
  c({ id: 'cmp-101', name: 'Knee replacement · Search', platform: 'google', type: 'Search', specialty: 'Orthopedics', branch: 'Kondapur', compliance: 'needs_fix', dailyBudget: 2400, spend: 68200, impressions: 162000, clicks: 4180, enquiries: 142, appointments: 61, keywords: ['knee replacement cost hyderabad', 'knee replacement surgeon', 'robotic knee replacement'], headlines: ['Knee Replacement Hyderabad', 'Pain-Free in 24 Hours', 'Robotic-Assisted Surgery'], descriptions: ['100% success rate. Expert surgeons, robotic precision. Book your consultation today.'], landingUrl: 'https://sunrisehospital.in/orthopedics/knee-replacement' }),
  c({ id: 'cmp-102', name: 'Heart check-up · Search', platform: 'google', type: 'Search', specialty: 'Cardiology', branch: 'Banjara Hills', dailyBudget: 3200, spend: 94500, impressions: 198000, clicks: 5020, enquiries: 161, appointments: 70, keywords: ['heart check up package', 'cardiologist banjara hills'], headlines: ['Heart Check-up Packages', 'Cardiologists in Banjara Hills'], descriptions: ['ECG, echo and consultation in one visit. Book online or call.'] }),
  c({ id: 'cmp-103', name: 'IVF cost Hyderabad · Search', platform: 'google', type: 'Search', specialty: 'IVF & Fertility', branch: 'Kondapur', dailyBudget: 3500, spend: 102800, impressions: 141000, clicks: 3610, enquiries: 139, appointments: 38, objective: 'forms', keywords: ['ivf cost hyderabad', 'ivf centre kondapur'], headlines: ['IVF Centre in Kondapur', 'Transparent IVF Pricing'], descriptions: ['Talk to a fertility specialist. EMI options available.'] }),
  c({ id: 'cmp-104', name: 'Child specialist near me', platform: 'google', type: 'Performance Max', specialty: 'Pediatrics', branch: 'All branches', dailyBudget: 1300, spend: 38900, impressions: 210000, clicks: 4470, enquiries: 70, appointments: 34, headlines: ['Pediatricians Open 7 Days'], descriptions: ['Walk-in pediatric OPD at 3 branches.'] }),
  c({ id: 'cmp-105', name: 'Knee pain · WhatsApp click-to-chat', platform: 'meta', type: 'Click-to-WhatsApp', objective: 'whatsapp', specialty: 'Orthopedics', branch: 'All branches', dailyBudget: 1700, spend: 49600, impressions: 386000, clicks: 6120, enquiries: 159, appointments: 52, languages: ['English', 'Telugu', 'Hindi'], headlines: ['Knee pain slowing you down?'], descriptions: ['Chat with our orthopedic team on WhatsApp.'] }),
  c({ id: 'cmp-106', name: 'Skin clinic · Instagram reels', platform: 'meta', type: 'Reels & Stories', objective: 'forms', specialty: 'Dermatology', branch: 'Banjara Hills', compliance: 'check_images', dailyBudget: 2400, spend: 71000, impressions: 512000, clicks: 7930, enquiries: 112, appointments: 37, headlines: ['Clear-skin treatments'], descriptions: ['Consult a dermatologist this week.'] }),
  c({ id: 'cmp-107', name: 'Fertility awareness · Facebook', platform: 'meta', type: 'Lead form', objective: 'forms', specialty: 'IVF & Fertility', branch: 'Kondapur', dailyBudget: 1100, spend: 33200, impressions: 224000, clicks: 2450, enquiries: 75, appointments: 21, headlines: ['Planning a family?'], descriptions: ['Free fertility consultation for first-time visitors.'] }),
  c({ id: 'cmp-108', name: 'International knee & hip packages', platform: 'google', type: 'Search', objective: 'whatsapp', specialty: 'International patients', branch: 'Kondapur', status: 'paused', dailyBudget: 2600, spend: 21400, impressions: 48000, clicks: 1290, enquiries: 38, appointments: 6, locations: ['Bangladesh', 'Oman', 'UAE', 'Kenya'], languages: ['English', 'Arabic', 'Bengali'], headlines: ['Knee Replacement in India'], descriptions: ['All-inclusive packages with airport pickup and interpreter.'] }),
  c({ id: 'cmp-109', name: 'Monsoon fever clinic', platform: 'meta', type: 'Lead form', objective: 'forms', specialty: 'General medicine', branch: 'LB Nagar', status: 'ended', dailyBudget: 900, spend: 0, impressions: 0, clicks: 0, enquiries: 0, appointments: 0, startDate: '2026-07-01', endDate: '2026-08-31', headlines: ['Fever that won’t go away?'], descriptions: ['Same-day consultations at LB Nagar.'] }),
  c({ id: 'cmp-201', clientId: 'aarogya', name: 'Cardiac bypass · Search', platform: 'google', type: 'Search', specialty: 'Cardiology', dailyBudget: 4200, spend: 126000, impressions: 152000, clicks: 3900, enquiries: 210, appointments: 58, locations: ['Bengaluru + 30 km'], languages: ['English', 'Kannada'] }),
  c({ id: 'cmp-301', clientId: 'lotus', name: 'IVF success rates · Search', platform: 'google', type: 'Search', specialty: 'IVF & Fertility', dailyBudget: 3800, spend: 114000, impressions: 132000, clicks: 3300, enquiries: 162, appointments: 39 })
];

const post = (p: Partial<BlogPost> & Pick<BlogPost, 'id' | 'slug' | 'title' | 'category' | 'status' | 'date'>): BlogPost => ({
  clientId: 'sunrise',
  excerpt: '',
  tags: [],
  author: 'MedGrowth editorial team',
  seoScore: 80,
  wordCount: 900,
  clicks30d: 0,
  leads30d: 0,
  hasSchema: true,
  hasConversion: true,
  hasVideo: false,
  ...p
});

export const POSTS: BlogPost[] = [
  post({ id: 'post-1', slug: 'knee-replacement-cost-hyderabad', title: 'Knee Replacement Cost in Hyderabad: What’s Included', category: 'Orthopedics', status: 'published', date: '2026-09-12', seoScore: 94, wordCount: 1620, clicks30d: 2140, leads30d: 31, hasVideo: true, tags: ['Knee replacement', 'Cost', 'Orthopedics'], excerpt: 'A plain-language breakdown of what a knee replacement costs in Hyderabad — surgery, implant, stay and physiotherapy — and what to ask before you decide.' }),
  post({ id: 'post-2', slug: 'ivf-success-rates-by-age', title: 'IVF Success Rates by Age: An Honest Guide', category: 'IVF & Fertility', status: 'draft', date: '2026-10-14', author: '[Doctor name]', seoScore: 88, wordCount: 1850, tags: ['IVF', 'Fertility', 'Success rates'], excerpt: 'What IVF success rates really mean at each age, how clinics report them, and the questions worth asking at your first consultation.' }),
  post({ id: 'post-3', slug: 'heart-attack-signs-women', title: '7 Warning Signs of a Heart Attack in Women', category: 'Cardiology', status: 'in_review', date: '2026-10-10', seoScore: 81, wordCount: 1240, tags: ['Heart attack', 'Women’s health', 'Cardiology'], excerpt: 'Heart attack symptoms in women are often different from the classic chest pain. These are the signs to know and when to go to the emergency room.' }),
  post({ id: 'post-4', slug: 'child-fever-when-to-worry', title: 'When Should a Child’s Fever Worry You?', category: 'Pediatrics', status: 'draft', date: '2026-10-20', seoScore: 58, wordCount: 640, hasConversion: false, tags: ['Fever', 'Children'], excerpt: 'Most fevers in children are harmless. Here is how to tell when it needs a doctor today.' }),
  post({ id: 'post-5', slug: 'laser-hair-removal-guide', title: 'Laser Hair Removal: Sessions, Cost and Aftercare', category: 'Dermatology', status: 'scheduled', date: '2026-10-14', seoScore: 90, wordCount: 1380, hasVideo: true, tags: ['Laser', 'Dermatology', 'Cost'], excerpt: 'How many sessions laser hair removal takes, what it costs and how to look after your skin afterwards.' }),
  post({ id: 'post-6', slug: 'best-cardiologist-banjara-hills', title: 'Choosing a Cardiologist: 6 Questions to Ask', category: 'Cardiology', status: 'published', date: '2026-08-28', seoScore: 91, wordCount: 1120, clicks30d: 1610, leads30d: 22, tags: ['Cardiology', 'Choosing a doctor'], excerpt: 'Credentials, experience, emergency cover and more — six questions that help you choose the right cardiologist.' }),
  post({ id: 'post-7', slug: 'pediatrician-open-sunday', title: 'Open on Sundays: Walk-in Pediatric OPD Explained', category: 'Pediatrics', status: 'published', date: '2026-08-14', seoScore: 86, wordCount: 780, clicks30d: 960, leads30d: 12, tags: ['Pediatrics', 'Weekend OPD'], excerpt: 'When our pediatric OPD is open, what to bring and how walk-in appointments work.' }),
  post({ id: 'post-8', slug: 'whatsapp-appointment-booking', title: 'Booking an Appointment on WhatsApp: Step by Step', category: 'Patient guide', status: 'published', date: '2026-07-30', seoScore: 84, wordCount: 690, clicks30d: 540, leads30d: 9, hasSchema: true, hasConversion: false, tags: ['WhatsApp', 'Appointments'], excerpt: 'How to book, reschedule or cancel an appointment with us on WhatsApp.' })
];

/** MedGrowth's own blog — the posts shown on the preprod admin. */
const mg = (p: Partial<BlogPost> & Pick<BlogPost, 'id' | 'slug' | 'title' | 'category' | 'status' | 'date'>): BlogPost =>
  post({ clientId: 'medgrowth', ...p });

POSTS.push(
  mg({ id: 'mg-1', slug: 'local-seo-wins-patients', title: 'How Local SEO Wins Patients Before They Ever Call', category: 'Local SEO', status: 'published', date: '2026-08-20', seoScore: 96, wordCount: 1310, clicks30d: 684, leads30d: 14, hasVideo: true, conversionId: 'AW-18387395398/blogLocalSeo', tags: ['Local SEO', 'Google Business Profile', 'Reviews', 'Near Me Search'], excerpt: 'A patient searching "cardiologist near me" decides who to call before your phone ever rings — almost entirely on what Google Business Profile and Maps show them.' }),
  mg({ id: 'mg-2', slug: 'enquiries-to-op-visits', title: "Why Your Enquiries Aren't Turning Into OP Visits", category: 'Patient Acquisition', status: 'published', date: '2026-08-15', seoScore: 91, wordCount: 1180, clicks30d: 512, leads30d: 11, hasVideo: true, conversionId: 'AW-18387395398/blogEnquiries', tags: ['Patient Acquisition', 'Lead Follow-up', 'OP Conversion', 'CRM'], excerpt: '20,000 site visitors and hundreds of enquiries a month — but where does that funnel actually leak? A look at the points hospitals lose patients between click and appointment.' }),
  mg({ id: 'mg-3', slug: 'nabh-safe-ad-claims', title: 'NABH-Safe Claims: What Hospitals Can Say in Ads', category: 'Compliance', status: 'published', date: '2026-08-02', seoScore: 88, wordCount: 1040, clicks30d: 301, leads30d: 6, tags: ['Compliance', 'Healthcare ads'], excerpt: 'Which claims healthcare ads can make, which ones get disapproved, and how to write copy that sells without promising outcomes.' }),
  mg({ id: 'mg-4', slug: 'ai-search-hospital-citations', title: 'Getting Cited by AI Search for “Best Hospital Near Me”', category: 'AI Search', status: 'published', date: '2026-07-24', seoScore: 84, wordCount: 960, clicks30d: 226, leads30d: 4, hasConversion: false, tags: ['AI search', 'llms.txt'], excerpt: 'How ChatGPT, Gemini and Perplexity pick which hospitals to mention — and what a hospital website can do about it.' }),
  mg({ id: 'mg-5', slug: 'doctor-profile-pages', title: 'Doctor Profile Pages That Actually Book Appointments', category: 'Website', status: 'scheduled', date: '2026-11-20', seoScore: 93, wordCount: 1120, hasVideo: true, tags: ['Website', 'Doctor profiles'], excerpt: 'What patients look for on a doctor’s profile page before they book, and the details most hospital sites leave out.' }),
  mg({ id: 'mg-6', slug: 'negative-review-responses', title: 'Responding to Negative Reviews Without Breaking Privacy', category: 'Reputation', status: 'draft', date: '2026-11-12', seoScore: 71, wordCount: 640, hasConversion: false, tags: ['Reviews', 'Privacy'], excerpt: 'How to answer an angry review without confirming someone was a patient.' }),
  mg({ id: 'mg-7', slug: 'whatsapp-follow-up-scripts', title: 'WhatsApp Follow-up Scripts for Front Desks', category: 'Patient Acquisition', status: 'draft', date: '2026-11-15', seoScore: 58, wordCount: 420, hasSchema: false, hasConversion: false, tags: ['WhatsApp'], excerpt: 'Ready-to-use WhatsApp replies for the first five minutes after an enquiry.' })
);

/** Sample enquiries for the agency's own campaigns (sample-data mode only). */
export const LEADS: Lead[] = [
  { id: 'lead-1', source: 'campaign', campaignId: null, campaignName: 'Free growth audit · Google Search', channel: 'form', name: 'Dr. Ramesh Rao', organisation: 'Rao Ortho Clinic', phone: '+91 98480 11223', email: 'ramesh@raoortho.in', city: 'Hyderabad', message: 'Need help with Google reviews and local SEO for 2 branches.', utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'free-growth-audit', pageUrl: 'https://medgrowth.co.in/campaigns/free-growth-audit', status: 'new', notes: '', createdAt: '2026-11-08 10:42:00', updatedAt: '2026-11-08 10:42:00' },
  { id: 'lead-2', source: 'campaign', campaignId: null, campaignName: 'Free growth audit · Google Search', channel: 'form', name: 'Priya Menon', organisation: 'Sunshine Dental Care', phone: '+91 99001 44556', email: null, city: 'Bengaluru', message: null, utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'free-growth-audit', pageUrl: 'https://medgrowth.co.in/campaigns/free-growth-audit', status: 'contacted', notes: 'Called 7 Nov — send proposal for Google Ads.', createdAt: '2026-11-07 16:05:00', updatedAt: '2026-11-07 18:30:00' },
  { id: 'lead-3', source: 'campaign', campaignId: null, campaignName: 'Hospital websites · Meta lead form', channel: 'whatsapp', name: null, organisation: null, phone: null, email: null, city: null, message: null, utmSource: 'meta', utmMedium: 'cpc', utmCampaign: 'hospital-websites', pageUrl: 'https://medgrowth.co.in/campaigns/hospital-websites', status: 'new', notes: '', createdAt: '2026-11-07 12:10:00', updatedAt: '2026-11-07 12:10:00' },
  { id: 'lead-4', source: 'campaign', campaignId: null, campaignName: 'Hospital websites · Meta lead form', channel: 'form', name: 'Anil Kumar', organisation: 'Kumar Multispeciality Hospital', phone: '+91 90000 77889', email: 'admin@kumarhospital.in', city: 'Warangal', message: 'Looking for a new website and Google Ads.', utmSource: 'meta', utmMedium: 'cpc', utmCampaign: 'hospital-websites', pageUrl: 'https://medgrowth.co.in/campaigns/hospital-websites', status: 'won', notes: 'Signed 6-month package.', createdAt: '2026-11-02 09:15:00', updatedAt: '2026-11-05 11:00:00' },
  { id: 'lead-5', source: 'contact', campaignId: null, campaignName: null, channel: 'form', name: 'Dr. Kavitha Reddy', organisation: 'Reddy Eye Care', role: 'Owner/Director', service: 'Local SEO & Google Profile Optimization', phone: '+91 98660 33445', email: 'kavitha@reddyeyecare.in', city: 'Hyderabad', message: 'We have 3 branches and few reviews.', utmSource: 'google', utmMedium: 'organic', utmCampaign: null, pageUrl: 'https://medgrowth.co.in/contact', status: 'new', notes: '', createdAt: '2026-11-08 18:20:00', updatedAt: '2026-11-08 18:20:00' }
];
