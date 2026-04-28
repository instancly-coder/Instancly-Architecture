// Server-side prompt enhancement — two-stage pipeline.
//
// Stage 1 (AI brief expansion): for first-build terse prompts, call Haiku
// synchronously before the main stream to generate a structured JSON design
// brief (colours, typography, sections, tone, inspiration). ~300ms / ~$0.001.
// Result is injected into the user message so the main model gets rich
// creative direction rather than three words.
//
// Stage 2 (static fallback): keyword-based vertical detection + hardcoded
// guidance blocks. Used when Stage 1 is unavailable (no Anthropic client,
// brief call timed out or returned garbage JSON) or the prompt isn't
// eligible (iteration on existing files, reference URLs, long structured
// prompt).
//
// Rules applying to both stages:
//   1. Never override explicit user intent. Long / structured prompts,
//      prompts with reference URLs or images, and iterative prompts on an
//      existing project are passed through verbatim.
//   2. The user's original brief is always quoted verbatim at the top of
//      the expansion so the model knows what the user actually asked for.

import type Anthropic from "@anthropic-ai/sdk";

export type Vertical =
  | "trade"
  | "restaurant"
  | "saas"
  | "portfolio"
  | "ecommerce"
  | "agency"
  | "fitness"
  | "real_estate"
  | "medical"
  | "education"
  | "event"
  | "nonprofit"
  | null;

// Order matters: more-specific verticals are checked first so they win over
// broader ones when keywords overlap. e.g. "dental practice site" must hit
// `medical` before `agency` would match on "practice"; "school lunch menu"
// must hit `education` before `restaurant` would match on "menu".
//
// Keyword tightening rules:
//  - Avoid bare ambiguous words (`builder`, `practice`, `menu`, `food`,
//    `platform`, `dashboard`, `app for`, `tool for`) — they collide with
//    unrelated tech / business / UI terms.
//  - Prefer compound or domain-specific phrases (`workflow automation`,
//    `coffee shop`, `personal trainer`, `online store`).
//  - When a category genuinely needs a broad single word (`gym`, `school`,
//    `portfolio`), put that vertical earlier in the list so it claims those
//    prompts before a more-general vertical can.
const VERTICAL_KEYWORDS: Array<{ vertical: Exclude<Vertical, null>; words: RegExp }> = [
  {
    vertical: "medical",
    words:
      /\b(clinic|dentist|dental|doctor|gp|orthodontist|chiro(?:practor)?|physio(?:therapist)?|therapist|veterinar(?:y|ian)|\bvet\b|medical\s*(?:practice|clinic|center|centre))\b/i,
  },
  {
    vertical: "real_estate",
    words:
      /\b(real\s*estate|realtor|estate\s*agent|property\s*(?:listing|search|portal)|properties\s*for\s*(?:sale|rent)|home\s*search|rental\s*(?:listing|portal))\b/i,
  },
  {
    vertical: "fitness",
    words:
      /\b(gym|crossfit|yoga|pilates|personal\s*trainer|fitness\s*(?:studio|coach|app|site)|wellness\s*spa)\b/i,
  },
  {
    vertical: "education",
    words:
      /\b(school|tutor|tutoring|bootcamp|academy|university|college|online\s*course|course\s*platform|class\s*signup)\b/i,
  },
  {
    vertical: "event",
    words:
      /\b(conference|wedding|festival|meetup|retreat|event\s*(?:site|page|landing|website))\b/i,
  },
  {
    vertical: "nonprofit",
    words:
      /\b(non[-\s]?profit|charity|ngo|fundrais\w*|donation\s*(?:page|platform|portal)|donate\s*page)\b/i,
  },
  {
    vertical: "trade",
    words:
      /\b(plumb(?:er|ing)?|electric(?:ian|al)?|handy(?:man|woman)?|lock\s*smith|mechanic|roofer|painter\s*decorator|gardener|landscaper|carpenter|hvac|boiler\s*(?:repair|service)|drain\s*(?:cleaning|unblock)|home\s*services)\b/i,
  },
  {
    vertical: "portfolio",
    words:
      /\b(portfolio|personal\s*site|cv\s*site|resume\s*site|about\s*me\s*page|freelance\s*(?:designer|developer|photographer|writer|illustrator))\b/i,
  },
  {
    vertical: "restaurant",
    words:
      /\b(restaurant|cafe|caf[ée]|bistro|diner|bakery|brewery|eatery|takeaway|takeout|pizzeria|coffee\s*shop|food\s*truck)\b/i,
  },
  {
    vertical: "ecommerce",
    words:
      /\b(ecommerce|e-?commerce|online\s*(?:shop|store)|product\s*catalog(?:ue)?|merch\s*store|boutique\s*store|brand\s*storefront)\b/i,
  },
  {
    vertical: "agency",
    words:
      /\b(agency|design\s*studio|consultancy|consulting\s*firm|creative\s*studio)\b/i,
  },
  {
    vertical: "saas",
    words:
      /\b(saas|software\s*as\s*a\s*service|crm|erp|developer\s*tool|api\s*platform|workflow\s*automation|productivity\s*app)\b/i,
  },
];

export function detectVertical(prompt: string): Vertical {
  for (const { vertical, words } of VERTICAL_KEYWORDS) {
    if (words.test(prompt)) return vertical;
  }
  return null;
}

// Per-vertical opinionated direction. Keep each block short — the model
// just needs a strong steer, not a spec.
function verticalGuidance(vertical: Exclude<Vertical, null>): string {
  switch (vertical) {
    case "trade":
      return `
VERTICAL: local trade / home services.
- Tone: confident, no-nonsense, reassuring. "Same-day callouts. No hidden fees."
- Required sections: hero with one big phone CTA + "request a quote" form, services grid (4–6 services with short descriptions), areas covered (list of nearby towns), trust band (years experience, jobs done, Google rating), customer testimonials with names and locations, FAQ, sticky phone-call bar on mobile.
- Palette: bold and trustworthy — deep navy or forest green primary with a high-contrast accent (safety orange, amber, or red). Avoid pastel.
- Type: chunky sans for headlines (Anton, Archivo Black, Bebop-style), readable humanist sans for body (Inter, Source Sans).
- Imagery: real-photo style — vans, tools, smiling tradesperson at a job. Use Unsplash keywords like "plumber", "tool belt", "tradesman van".`;
    case "restaurant":
      return `
VERTICAL: restaurant / café / food.
- Tone: warm, sensory, place-rooted. Mention dishes by name, not "delicious food".
- Required sections: hero with a hero photo + opening hours + "book a table" CTA, menu preview (3–6 highlight dishes with prices), the story / chef bio, gallery, reservations form or OpenTable-style link, location with map embed, footer with hours and address.
- Palette: warm and editorial — cream / off-white background, deep accent (burgundy, forest, charcoal), one warm secondary (terracotta, mustard).
- Type: serif display for headlines (Playfair, Cormorant, EB Garamond), clean sans for body.
- Imagery: food and interior photography. Unsplash keywords like "rustic pasta", "espresso bar", "candlelit restaurant".`;
    case "saas":
      return `
VERTICAL: SaaS / software product.
- Tone: clear, confident, benefit-led. Lead with the outcome, not the feature.
- Required sections: hero with a one-line value prop + sub-line + primary CTA + secondary CTA + product screenshot mock, social proof bar (logos), 3-up feature grid, an "how it works" step-by-step, deeper feature sections with side-by-side text + mock, pricing (3 tiers), FAQ, big closing CTA.
- Palette: clean — near-white background, one strong primary (electric blue, violet, or emerald), subtle gradient accents.
- Type: modern geometric sans throughout (Inter, Geist, Satoshi).
- Imagery: stylised product mocks — render fake dashboard cards, charts, code snippets in actual divs (don't use real screenshots). Subtle gradient backgrounds.`;
    case "portfolio":
      return `
VERTICAL: personal portfolio.
- Tone: confident first person. Specific work, not "creative thinker".
- Required sections: bold hero (name + one-line positioning), selected work grid (4–8 case studies, each with thumbnail and one-line outcome), an "about" section with a real bio, skills / tools, contact with email + socials.
- Palette: minimal — mostly black and white with one vivid accent. Generous whitespace.
- Type: oversized display sans or serif for the hero (Inter Display, Fraunces), small mono for labels.
- Imagery: project thumbnails using Unsplash with keywords matching the discipline.`;
    case "ecommerce":
      return `
VERTICAL: ecommerce / brand storefront.
- Tone: brand-led, aspirational but specific.
- Required sections: hero with lifestyle photo + collection CTA, featured products grid (6–8 products with price), category tiles, story / craft section, reviews with star ratings, newsletter signup, footer with shipping/returns links.
- Palette: brand-driven — pick one mood (luxe = cream + black + gold; streetwear = black + neon; outdoorsy = forest + cream).
- Type: distinctive headline pairing with clean body sans.
- Imagery: product shots and lifestyle. Unsplash keywords matching the product category.`;
    case "agency":
      return `
VERTICAL: agency / studio / consultancy.
- Tone: bold, specific, results-led. Name real clients (invent plausible ones), real outcomes.
- Required sections: opinionated hero (a manifesto-style line, not "we deliver excellence"), client logo wall, selected case studies (3–5 with cover image + one-line result), services list, team grid with real-looking names and roles, contact form.
- Palette: editorial — high contrast, one bold accent, lots of whitespace.
- Type: oversized display for headlines, neutral sans for body.
- Imagery: case study covers, team portraits.`;
    case "fitness":
      return `
VERTICAL: gym / fitness / wellness.
- Tone: motivating, energetic, but never cheesy.
- Required sections: hero with a powerful photo + class CTA, class schedule, trainer profiles, membership pricing tiers, testimonials, location.
- Palette: high contrast — black / charcoal base with one electric accent (lime, electric red, neon yellow).
- Type: condensed display sans for headlines, clean body sans.
- Imagery: action shots — Unsplash keywords like "gym workout", "yoga studio", "kettlebell".`;
    case "real_estate":
      return `
VERTICAL: real estate / property.
- Tone: aspirational, trustworthy, location-specific.
- Required sections: hero with search bar (location, beds, price), featured listings grid with photos / price / specs, neighbourhood guides, agent profiles, recent-sales social proof, contact / valuation request form.
- Palette: refined — cream or charcoal base, deep navy or forest accent, gold or copper highlight.
- Type: serif display for headlines (Cormorant, Lora), clean sans for body.
- Imagery: interior and exterior shots. Unsplash keywords like "modern home interior", "luxury kitchen".`;
    case "medical":
      return `
VERTICAL: clinic / medical practice.
- Tone: calm, clear, reassuring. No hype.
- Required sections: hero with "book appointment" CTA, services overview, practitioner profiles with credentials, what-to-expect section, insurance / pricing, location with hours, FAQ, contact.
- Palette: calm — soft blues, sage greens, off-white. Avoid harsh contrast.
- Type: friendly humanist sans throughout.
- Imagery: warm clinical photography. Unsplash keywords like "modern clinic", "friendly doctor".`;
    case "education":
      return `
VERTICAL: school / course / academy.
- Tone: clear outcomes, real curriculum, real instructors.
- Required sections: hero with course / programme CTA, outcomes / what you'll learn, curriculum breakdown, instructor profiles, student testimonials with photos and outcomes, pricing or application CTA, FAQ.
- Palette: confident — one strong primary (deep blue, plum) with a warm accent.
- Type: editorial serif headlines + clean sans body, or modern sans pair.
- Imagery: classroom / cohort / project shots.`;
    case "event":
      return `
VERTICAL: event / conference.
- Tone: urgent, specific, lineup-led.
- Required sections: hero with date + location + buy-tickets CTA, schedule / agenda, speakers or lineup grid, venue, ticket tiers, sponsors, FAQ.
- Palette: bold and dated — high contrast with one vivid accent that stamps the year.
- Type: distinctive display face for the event name.
- Imagery: event photography from past editions.`;
    case "nonprofit":
      return `
VERTICAL: nonprofit / charity.
- Tone: human, specific, impact-led. Real numbers, real stories.
- Required sections: hero with a single human story + donate CTA, the problem (one paragraph, one big stat), what we do, impact numbers, ways to help (donate / volunteer / fundraise), recent stories, transparency / financials link, footer with charity number.
- Palette: warm and human — earthy primary with a hopeful accent.
- Type: editorial serif headlines + readable sans body.
- Imagery: real human photography, not abstract concepts.`;
  }
}

const STRUCTURE_MARKERS =
  /(\n|[•·]\s|^\s*-\s|\d+\.\s|sections?:|pages?:|features?:|requirements?:|must\s+have|should\s+have)/im;

export function enhancePrompt(opts: {
  prompt: string;
  hasExistingFiles: boolean;
  hasReferenceUrls: boolean;
  hasImages: boolean;
}): { enhanced: string; wasEnhanced: boolean; vertical: Vertical } {
  const { prompt, hasExistingFiles, hasReferenceUrls, hasImages } = opts;
  const trimmed = prompt.trim();

  // Iterations on an existing project tend to be specific edits; injecting
  // creative direction would drown the user's intent.
  if (hasExistingFiles) return { enhanced: trimmed, wasEnhanced: false, vertical: null };

  // Reference URLs and images are themselves strong direction.
  if (hasReferenceUrls || hasImages) return { enhanced: trimmed, wasEnhanced: false, vertical: null };

  // Long or already-structured briefs already give Claude enough to work with.
  if (trimmed.length >= 280 || STRUCTURE_MARKERS.test(trimmed)) {
    return { enhanced: trimmed, wasEnhanced: false, vertical: null };
  }

  const vertical = detectVertical(trimmed);
  const verticalBlock = vertical ? verticalGuidance(vertical) : "";

  const enhanced = `User's brief (verbatim):
"${trimmed}"

This is the FIRST build of a brand-new project, so design and ship a COMPLETE, polished single-page web app — not a wireframe, not a "hello world" placeholder, not a generic AI-builder template. The user wrote a short brief; interpret it generously and make confident, opinionated decisions on their behalf.

Before writing any code, internally plan:

1. AUDIENCE & GOAL — who is this for, and what is the ONE primary action they should take on the page (book a job, request a quote, sign up, buy, contact, donate)?

2. INFORMATION ARCHITECTURE — what sections does a serious version of this page need? Every page should fill the viewport top-to-bottom with: a strong hero with a clear value prop and primary CTA, supporting sections that build trust (services / features / testimonials / FAQ / pricing / gallery / how-it-works — pick what's relevant), and a footer with contact and secondary nav. Aim for 5–8 substantial sections, not 2.

3. CONTENT — write real, specific, plausible copy. NEVER use lorem ipsum, "Your tagline here", "Coming soon", or empty platitudes like "We deliver excellence" or "Innovative solutions". Use specific names, prices, locations, hours, and testimonial quotes from invented but believable personas. If it's a local business, invent a believable city, neighbourhood, and phone number.

4. VISUAL DIRECTION — choose ONE coherent palette, ONE distinctive type pairing, and ONE imagery style appropriate to the audience. Avoid the default AI-builder look (indigo + slate + rounded-2xl + pill buttons + generic Lucide icons + gradient blobs). Instead, lean hard into the vertical. Vary the section backgrounds, alternate dark/light bands, use real visual hierarchy with mixed type sizes, and don't be afraid of bold colour or large display type.

5. IMAGERY — when a real photo is needed, use Unsplash featured URLs of the form \`https://source.unsplash.com/featured/?KEYWORD1,KEYWORD2\` with keywords matching the vertical. For decorative shapes, use inline SVG with the page's accent colour, not generic gradient blobs.
${verticalBlock}
Then ship a complete index.html (plus companion files as needed) that fills the viewport from header through footer with real content, real visual hierarchy, and real polish. Treat this short brief as the seed of an obviously-launched product, not a sketch.`;

  return { enhanced, wasEnhanced: true, vertical };
}

// ---------------------------------------------------------------------------
// Stage 1 — AI-powered design brief expansion
// ---------------------------------------------------------------------------

export type DesignBrief = {
  projectType: string;
  targetAudience: string;
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  typography: {
    heading: string;
    body: string;
  };
  sections: string[];
  tone: string;
  keyFeatures: string[];
  inspiration: string;
  uniqueSellingPoints: string[];
};

// Returns true when the prompt is a candidate for brief expansion: short,
// unstructured, first build. Mirrors the gate logic in enhancePrompt().
export function shouldExpandBrief(opts: {
  prompt: string;
  hasExistingFiles: boolean;
  hasReferenceUrls: boolean;
  hasImages: boolean;
}): boolean {
  const { prompt, hasExistingFiles, hasReferenceUrls, hasImages } = opts;
  if (hasExistingFiles || hasReferenceUrls || hasImages) return false;
  const trimmed = prompt.trim();
  if (trimmed.length >= 280 || STRUCTURE_MARKERS.test(trimmed)) return false;
  return true;
}

// Call Haiku to generate a structured design brief for the given short prompt.
// Resolves with the parsed brief, or throws on any error (caller handles
// fallback). Timeout is capped at 20s — Haiku is fast and we'd rather
// fallback than stall the streaming response.
export async function expandToBrief(
  prompt: string,
  anthropic: Anthropic,
): Promise<DesignBrief> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const resp = await anthropic.messages.create(
      {
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `You are a senior product designer and UX strategist.

A user wants to build: "${prompt.trim()}"

Generate a detailed design brief as a JSON object with exactly this shape:
{
  "projectType": "what kind of site/app this is (e.g. SaaS landing page, trade services site, portfolio)",
  "targetAudience": "concise description of who this is for",
  "colorScheme": {
    "primary": "#hexcode",
    "secondary": "#hexcode",
    "accent": "#hexcode",
    "background": "#hexcode",
    "text": "#hexcode"
  },
  "typography": {
    "heading": "Google Font name + style (e.g. Sora Bold, Bebas Neue, Fraunces Italic)",
    "body": "Google Font name + style (e.g. Inter Regular, Manrope, Source Sans 3)"
  },
  "sections": ["ordered list of page sections — 6 to 9 items"],
  "tone": "one or two words (e.g. bold & direct, warm & editorial, clean & minimal)",
  "keyFeatures": ["3 to 5 must-have design or content features"],
  "inspiration": "2–3 real well-known sites this should feel like (e.g. Linear, Vercel, Stripe)",
  "uniqueSellingPoints": ["2–3 things that will make this design stand out from generic AI output"]
}

Rules:
- Colours must be bold and opinionated — not generic blue/white/grey.
- Pick real Google Fonts that suit the vertical, not just Inter every time.
- Sections must be specific (e.g. "Client logo wall", "3-column services grid", "Dark testimonials band") not generic ("About", "Services").
- Return ONLY the JSON object, no markdown, no explanation.`,
          },
        ],
      },
      { signal: ctrl.signal },
    );

    const raw = resp.content[0].type === "text" ? resp.content[0].text.trim() : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object in Haiku response");
    return JSON.parse(jsonMatch[0]) as DesignBrief;
  } finally {
    clearTimeout(timer);
  }
}

// Format a DesignBrief into the rich prompt injected into the builder's user
// message. Combines the AI-generated brief with the static vertical block so
// both sets of guidance are present.
export function buildBriefPrompt(
  brief: DesignBrief,
  originalPrompt: string,
  verticalBlock: string,
): string {
  const sections = brief.sections.map((s) => `  - ${s}`).join("\n");
  const features = brief.keyFeatures.map((f) => `  - ${f}`).join("\n");
  const usps = brief.uniqueSellingPoints.map((u) => `  - ${u}`).join("\n");

  return `User's brief (verbatim):
"${originalPrompt.trim()}"

This is the FIRST build of a brand-new project. Build something that looks like a professional agency made it — not a generic AI template. Below is a tailored design brief generated specifically for this prompt. FOLLOW IT PRECISELY.

━━━ DESIGN BRIEF ━━━

Project type: ${brief.projectType}
Target audience: ${brief.targetAudience}
Tone: ${brief.tone}
Inspired by: ${brief.inspiration}

COLOUR SYSTEM (use these hex values exactly — do not substitute):
  Primary:    ${brief.colorScheme.primary}
  Secondary:  ${brief.colorScheme.secondary}
  Accent:     ${brief.colorScheme.accent}
  Background: ${brief.colorScheme.background}
  Body text:  ${brief.colorScheme.text}

TYPOGRAPHY (load from Google Fonts — exact names):
  Headings: ${brief.typography.heading}
  Body:     ${brief.typography.body}

REQUIRED SECTIONS (build ALL of these, in order):
${sections}

KEY DESIGN FEATURES (must be present):
${features}

WHAT WILL MAKE THIS STAND OUT:
${usps}

━━━ STRICT BUILD RULES ━━━

1. Use the exact colour hex values above — every section should feel like it belongs to ONE coherent brand.
2. Hero headline minimum 56px desktop / 40px mobile. Font-weight 700+. Tight line-height (1 or 1.05).
3. Every section must have at least 80px vertical padding.
4. Every CTA button must have a hover state (colour shift + subtle shadow or scale).
5. Navigation must be sticky. Use a backdrop blur on scroll.
6. Include social proof: at minimum an avatar stack + count, a logo strip, or a star-rated testimonial card.
7. NEVER use lorem ipsum, placeholder text, or generic copy. Write specific, real-sounding content.
8. Use the Google Fonts you specified — load them via <link rel="preconnect"> in <head>.
9. At least one section must use a dark/tinted background for contrast rhythm.
10. Mobile-first. Every section must be fully responsive with appropriate breakpoints.
11. **CRITICAL — no fetch() calls, no API routes, no server code.** This is a 100% static site. Every contact form must use a \`mailto:\` link. Do not call \`fetch()\`, \`axios\`, \`XMLHttpRequest\`, or any external API. Do not invent backend endpoints that don't exist. Any HTTP request to a non-existent URL will cause an UNHANDLED REJECTION error in the preview. Simulate data with hardcoded JavaScript arrays.
${verticalBlock}
Ship a polished, complete site from header to footer. This brief is your creative contract.`;
}
