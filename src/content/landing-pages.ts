/**
 * SEO landing pages, rendered by app/(marketing)/[landing]/page.tsx.
 *
 * Each entry must be genuinely useful on its own — a distinct audience, distinct
 * questions answered. Add a page here only when it has something specific to say;
 * do not mass-generate thin variants.
 *
 * Planned (not yet written): clickable-floor-plan, realtor-virtual-tour,
 * vacation-rental-virtual-tour, interactive-property-tour.
 */

export interface LandingPage {
  slug: string;
  /** <title> and OG title */
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  intro: string;
  heroImage: string;
  audience: string;
  points: { title: string; body: string }[];
  steps: string[];
  faq: { q: string; a: string }[];
}

export const LANDING_PAGES: LandingPage[] = [
  {
    slug: "interactive-floor-plan",
    title: "Interactive Floor Plan — Clickable Rooms With Photos",
    description:
      "Turn any floor plan image or PDF into an interactive floor plan. Visitors tap a room to see its photos, description and video. No 3D scan needed.",
    eyebrow: "Interactive floor plans",
    h1: "A floor plan people actually explore.",
    intro:
      "Upload the floor plan you already have — a PNG, JPG or PDF — and drop a clickable marker on every room. Each marker opens that room's photos, description and video, so visitors understand the layout and the space at the same time.",
    heroImage: "/landing/living-1600.webp",
    audience: "For agents, builders and hosts who already have a floor plan and want it to do more.",
    points: [
      {
        title: "Use the plan you have",
        body: "Builder plans, MLS floor plans, a phone photo of a hand sketch, or a PDF. No redrawing, no CAD tools.",
      },
      {
        title: "Rooms that open up",
        body: "Each room marker opens a gallery with its photos, a short description, notable features and optional video or 360° view.",
      },
      {
        title: "No floor plan? Sketch one",
        body: "Lay out labeled room rectangles in a couple of minutes. It's a navigation map, not an architectural drawing.",
      },
    ],
    steps: ["Upload your floor plan", "Add your photos — we sort them by room", "Place room markers", "Share the link"],
    faq: [
      {
        q: "Is this a 3D tour?",
        a: "No — and that's the point. It's a fast, clickable walkthrough built from a floor plan and normal photos, so there's no scanning appointment or special camera.",
      },
      {
        q: "Can I use a PDF floor plan?",
        a: "Yes. The first page of the PDF is converted to a high-resolution image right in your browser.",
      },
      {
        q: "Does it work on phones?",
        a: "Yes. Visitors can tap rooms on the plan or use the room list, and photos open full-screen with swipe.",
      },
    ],
  },
  {
    slug: "airbnb-virtual-tour",
    title: "Airbnb Virtual Tour — Show Guests Exactly What They're Booking",
    description:
      "Create a clickable walkthrough of your vacation rental from the photos you already have. Share it in your listing, messages and welcome book with a link or QR code.",
    eyebrow: "For Airbnb & vacation rental hosts",
    h1: "Let guests walk through before they book.",
    intro:
      "Guests want to know where the beds are, how the kitchen is laid out and what the patio really looks like. A HomeTour walkthrough answers those questions room by room — built from your existing listing photos in minutes.",
    heroImage: "/landing/patio-1600.webp",
    audience: "For hosts and co-hosts managing one place or many.",
    points: [
      {
        title: "Fewer pre-booking questions",
        body: "Show the layout and every room clearly so guests can answer their own questions about space and sleeping arrangements.",
      },
      {
        title: "A welcome book that works",
        body: "Print a QR code for the welcome book or the front door, so guests can find the washer, the extra towels or the hot tub controls.",
      },
      {
        title: "Built from your listing photos",
        body: "Drop in the photos you already use. AI groups them by room and drafts short, accurate captions you can edit.",
      },
    ],
    steps: ["Upload your listing photos", "Review the AI room grouping", "Add a simple layout or floor plan", "Share the link or QR code"],
    faq: [
      {
        q: "Can I put the tour on my Airbnb listing?",
        a: "Airbnb doesn't allow external links in listings, but you can share your tour link in guest messages, on your direct-booking site, and via a QR code in your welcome book.",
      },
      {
        q: "Do I need a floor plan?",
        a: "No. You can sketch a simple layout with labeled rooms, or skip the map and let guests browse the room list.",
      },
      {
        q: "Will the AI make things up about my place?",
        a: "Descriptions are limited to what's visible in your photos or what you tell us, and you can edit every word.",
      },
    ],
  },
  {
    slug: "real-estate-virtual-tour",
    title: "Real Estate Virtual Tour From Listing Photos — No 3D Scan Needed",
    description:
      "Give buyers an interactive walkthrough of every listing using your existing photos and floor plan. Share a link, embed it on your site, or print a QR code for open houses.",
    eyebrow: "For realtors & listing agents",
    h1: "A walkthrough for every listing — not just the big ones.",
    intro:
      "3D scans are great for some listings and overkill for most. HomeTour turns the photos and floor plan you already have into a polished, clickable walkthrough buyers can explore from their phone — ready in minutes, for any price point.",
    heroImage: "/landing/exterior-1600.webp",
    audience: "For agents, teams and brokerages.",
    points: [
      {
        title: "Same-day, every listing",
        body: "No scanning appointment and no special camera. Upload the photographer's images and floor plan and publish the same day.",
      },
      {
        title: "Open house & sign ready",
        body: "Download a QR code for flyers, sign riders and open houses. Scans are tracked separately so you know what's working.",
      },
      {
        title: "Know what buyers look at",
        body: "See views, time spent, and which rooms buyers open most — and add a 'Request a showing' button that goes straight to you.",
      },
    ],
    steps: ["Create the property", "Upload photos and floor plan", "Confirm rooms and place markers", "Publish and share"],
    faq: [
      {
        q: "How is this different from a 3D tour?",
        a: "It's built from regular listing photos instead of a scan, so it's cheaper and faster. You lose 'walking' between rooms; you gain a tour for every listing.",
      },
      {
        q: "Can I embed it on my website?",
        a: "Yes. Copy the embed code and paste it into your listing page — the tour opens without any editing controls.",
      },
      {
        q: "Can I use my own branding?",
        a: "Paid plans remove HomeTour branding and add your colors and contact details.",
      },
    ],
  },
  {
    slug: "property-walkthrough",
    title: "Property Walkthrough Maker — Room-by-Room Tours From Photos",
    description:
      "Make a room-by-room property walkthrough for rentals, hotels, venues and homes. Upload photos, let AI sort them by room, and share a beautiful link.",
    eyebrow: "Property walkthroughs",
    h1: "Room by room, the way people actually think about a space.",
    intro:
      "Whether it's an apartment, a boutique hotel or an event venue, people want to see each space in context. A HomeTour walkthrough connects every room's photos to where it is — with next/previous navigation so nobody gets lost.",
    heroImage: "/landing/dining-1600.webp",
    audience: "For property managers, hotels, venues, builders and designers.",
    points: [
      {
        title: "Guided, not confusing",
        body: "Visitors can follow the suggested room order from front door to backyard, or jump straight to the room they care about.",
      },
      {
        title: "Made for many properties",
        body: "Property managers can spin up a walkthrough per unit in minutes and keep them consistent.",
      },
      {
        title: "Photos are the star",
        body: "Large, fast-loading images sized for every screen, with video and 360° photos where you have them.",
      },
    ],
    steps: ["Upload photos", "AI groups them into rooms", "Arrange the order", "Publish"],
    faq: [
      {
        q: "What kinds of properties work?",
        a: "Houses, apartments, condos, vacation rentals, hotels, venues — anything with distinct rooms or areas worth showing.",
      },
      {
        q: "Can visitors see it without an account?",
        a: "Yes. Published tours are public links; visitors never need to sign up.",
      },
      {
        q: "How long does it take?",
        a: "Most tours take 10–15 minutes from upload to publish, most of which is reviewing photos.",
      },
    ],
  },
];

export function getLandingPage(slug: string): LandingPage | undefined {
  return LANDING_PAGES.find((p) => p.slug === slug);
}
