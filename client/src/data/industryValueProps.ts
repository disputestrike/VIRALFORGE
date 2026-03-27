/**
 * Industry-specific value propositions, product descriptions, and promo ideas
 * Pre-fills the script generator form based on selected industry
 */

export interface IndustryData {
  productDescription: string;
  valueProps: string[];
  promoIdeas: string[];
  aiSuggestionPrompt: string;
}

export const INDUSTRY_DATA: Record<string, IndustryData> = {
  Solar: {
    productDescription: "We install residential and commercial solar panels with $0 upfront cost. Homeowners save on electricity from day one with no out-of-pocket expense.",
    valueProps: [
      "$0 down — no upfront cost to the homeowner",
      "Save 40–60% on monthly electric bills",
      "Federal tax credit up to 30% of system cost",
      "Free home solar assessment — no obligation",
      "25-year panel warranty and performance guarantee",
      "Increase home value by an average of $15,000",
      "Lock in your energy rate — protection from rising utility costs",
      "Clean energy — reduce your carbon footprint",
    ],
    promoIdeas: [
      "Free energy audit this month — limited slots available",
      "Spring special: waived installation fee for assessments booked this week",
      "$500 referral bonus for every homeowner you refer",
      "Limited-time: free battery backup upgrade with new system",
    ],
    aiSuggestionPrompt: "What are the most compelling value propositions for residential solar sales right now? Include current incentives, savings figures, and homeowner pain points.",
  },

  Roofing: {
    productDescription: "We provide residential and commercial roofing installation, repair, and replacement. Licensed, insured, and local — with fast turnaround and guaranteed workmanship.",
    valueProps: [
      "Free roof inspection — no obligation",
      "We work directly with your insurance company",
      "Storm damage? We handle the entire claims process",
      "Licensed and insured — fully certified contractors",
      "Lifetime workmanship warranty on all installations",
      "Local company — fast response, local crews",
      "Financing available — $0 down options",
      "Same-week estimates for urgent repairs",
    ],
    promoIdeas: [
      "Free gutter cleaning with every roof replacement this month",
      "Spring storm season — free inspection for all homeowners in your area",
      "Insurance claim? No out-of-pocket cost if we can't get it covered",
      "$200 referral credit for every homeowner you send our way",
    ],
    aiSuggestionPrompt: "What are the strongest value propositions for residential roofing contractors right now? Include insurance claims, seasonal angles, and homeowner concerns.",
  },

  HVAC: {
    productDescription: "We install, repair, and maintain heating and cooling systems for homes and businesses. Energy-efficient systems that lower utility bills and keep families comfortable year-round.",
    valueProps: [
      "Free system diagnostic — no service call fee",
      "Save up to 30% on heating and cooling costs with a new system",
      "Same-day emergency service available",
      "10-year parts and labor warranty",
      "Financing with 0% interest for 18 months",
      "Energy Star certified systems — utility rebates available",
      "Licensed, background-checked technicians",
      "Annual maintenance plans — priority scheduling included",
    ],
    promoIdeas: [
      "Spring AC tune-up special — $49 (reg. $129)",
      "Free smart thermostat with any new system installation",
      "No-interest financing through summer — 18 months",
      "Senior discount: 15% off all services",
    ],
    aiSuggestionPrompt: "What are the most effective value propositions for HVAC contractors selling new systems and service plans right now? Include energy savings, comfort, and financing angles.",
  },

  "Real Estate": {
    productDescription: "We help homeowners sell faster and for more money, and help buyers find their perfect home with expert local market knowledge and full-service support.",
    valueProps: [
      "Free home valuation — know what your home is worth today",
      "Homes we list sell 23% faster than market average",
      "Our sellers net an average of $14,000 more than list price",
      "Full marketing package — professional photos, virtual tour, social ads",
      "No upfront costs — we only get paid when you close",
      "Local market expert with 10+ years in this area",
      "Buyer rebate program — get cash back at closing",
      "Off-market listings — access homes before they hit Zillow",
    ],
    promoIdeas: [
      "Free home staging consultation with every listing",
      "Sell in 30 days or we cut our commission by 1%",
      "First-time buyer? We cover your closing costs up to $3,000",
      "Spring market special — reduced commission for listings this month",
    ],
    aiSuggestionPrompt: "What are the strongest value propositions for real estate agents right now for both buyers and sellers? Include current market conditions and competitive differentiators.",
  },

  Insurance: {
    productDescription: "We help families and businesses find the right insurance coverage at the best rates — life, auto, home, health, and commercial policies from top-rated carriers.",
    valueProps: [
      "Free coverage review — find gaps in your current policy",
      "Save an average of $600/year by switching carriers",
      "We shop 20+ carriers to find your best rate",
      "Local agent — real person, real answers, fast response",
      "Bundle home and auto — save up to 25%",
      "No-hassle claims support — we fight for you",
      "Life insurance from $15/month — protect your family today",
      "Commercial coverage specialists — protect your business assets",
    ],
    promoIdeas: [
      "Free policy review — most clients find $400–$800 in annual savings",
      "Switch this month and get your first month free",
      "Refer a friend and both of you save 10% on your next renewal",
      "Business owners: free commercial liability review this quarter",
    ],
    aiSuggestionPrompt: "What are the most effective value propositions for independent insurance agents right now? Include savings angles, service differentiators, and common pain points.",
  },

  "Financial Services": {
    productDescription: "We provide personalized financial planning, investment management, retirement planning, and debt reduction strategies to help clients build and protect their wealth.",
    valueProps: [
      "Free financial health check — 30-minute consultation",
      "Retirement planning — find out if you're on track, free",
      "Reduce debt by up to 40% with our consolidation strategies",
      "Fiduciary advisor — legally required to act in your interest",
      "Average client saves $1,200/year in fees by switching to us",
      "Tax-efficient investment strategies",
      "College savings plans — maximize your 529 benefits",
      "Estate planning included at no additional cost",
    ],
    promoIdeas: [
      "Free retirement income analysis — limited to 10 spots this month",
      "Q2 portfolio review — no charge for new clients",
      "Refer a colleague and both receive a free tax strategy session",
      "First-time investor? $0 management fee for your first year",
    ],
    aiSuggestionPrompt: "What are the most compelling value propositions for financial advisors and planners right now? Include retirement, wealth protection, and current economic concerns.",
  },

  "Home Improvement": {
    productDescription: "We handle kitchen remodels, bathroom renovations, basement finishing, and whole-home improvements. Licensed contractors, quality materials, on time and on budget.",
    valueProps: [
      "Free in-home design consultation and estimate",
      "100% satisfaction guarantee — we make it right or it's free",
      "Average kitchen remodel returns 80 cents on every dollar at resale",
      "Financing available — 0% for 24 months on projects over $5,000",
      "Licensed, insured, and background-checked crews",
      "3D design preview before any work begins",
      "Local company — no subcontractors, ever",
      "Dedicated project manager on every job",
    ],
    promoIdeas: [
      "Spring renovation special — 10% off kitchen and bath projects booked this month",
      "Free smart home upgrades with any full remodel",
      "Refer a neighbor and both receive $500 off your next project",
      "Limited slots: book now for summer start dates",
    ],
    aiSuggestionPrompt: "What are the strongest value propositions for home improvement and remodeling contractors right now? Include ROI, financing, and homeowner trust factors.",
  },

  "Pest Control": {
    productDescription: "We provide residential and commercial pest control, termite treatment, rodent removal, and ongoing prevention plans. Safe for kids and pets, guaranteed results.",
    valueProps: [
      "Free pest inspection — same-week availability",
      "100% satisfaction guarantee — free retreatment if pests return",
      "Eco-friendly treatments — safe for children and pets",
      "Termite damage warranty — up to $1M in structural coverage",
      "Monthly plans starting at $39/month — no long-term contract",
      "Licensed and certified technicians",
      "Emergency same-day service available",
      "Year-round protection — proactive prevention, not just reactive",
    ],
    promoIdeas: [
      "Spring special: free perimeter treatment with first service",
      "New customer offer: 50% off your first treatment",
      "Mosquito-free yard guarantee — unlimited retreatments all season",
      "Refer a neighbor and get one free quarterly service",
    ],
    aiSuggestionPrompt: "What are the most effective value propositions for pest control companies right now? Include seasonal angles, safety messaging, and guarantee-focused talking points.",
  },

  Landscaping: {
    productDescription: "We provide lawn care, landscaping design, tree services, irrigation, and seasonal cleanup for residential and commercial properties. Beautiful results, reliable service.",
    valueProps: [
      "Free property assessment and design consultation",
      "Increase curb appeal and home value by up to 12%",
      "Weekly, bi-weekly, or monthly maintenance plans",
      "Drought-resistant landscaping — cut water bill by 30%",
      "Licensed arborists for all tree care and removal",
      "Fully insured — property protection guaranteed",
      "Irrigation system installation, repair, and winterization",
      "Spring and fall seasonal cleanup packages",
    ],
    promoIdeas: [
      "Spring cleanup special — first service 25% off",
      "Sign a seasonal contract and get one free aeration",
      "New sod installation — free irrigation assessment included",
      "Refer a neighbor and both receive a free lawn treatment",
    ],
    aiSuggestionPrompt: "What are the most compelling value propositions for landscaping and lawn care companies right now? Include seasonal timing, home value, and service reliability angles.",
  },

  Other: {
    productDescription: "",
    valueProps: [],
    promoIdeas: [],
    aiSuggestionPrompt: "What are effective value propositions and sales talking points for a local service-based business? Include trust, results, and convenience factors.",
  },
};

export const ALL_INDUSTRIES = Object.keys(INDUSTRY_DATA);
