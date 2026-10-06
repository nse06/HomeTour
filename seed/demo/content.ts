/**
 * Demo tour content. Descriptions are hand-written and only describe what is visible
 * in the photos — the same standard the AI writer is held to.
 *
 * Photos: Unsplash (Unsplash License) — see seed/demo/CREDITS.md.
 * 360° panorama: Poly Haven "Modern Bathroom" (CC0).
 * Hotspot coordinates are in floorplan.svg units (1600 × 1240).
 */

export const DEMO_PROPERTY = {
  name: "Modern 3-Bedroom Chicago Home",
  tourTitle: "Modern 3-Bedroom Chicago Home",
  address: "Logan Square, Chicago, IL",
  propertyType: "house" as const,
  description:
    "Architect-designed and full of natural light, this three-bedroom home pairs black and timber cladding with an open-plan living, kitchen and dining wing that opens onto a deck beneath a mature tree.",
  bedrooms: 3,
  bathrooms: 2,
  squareFeet: 2150,
  yearBuilt: 2019,
  neighborhood: "Logan Square",
  amenities: [
    "Open-plan living",
    "Timber deck",
    "Fireplace",
    "Double vanity",
    "Laundry room",
    "Driveway parking",
    "Landscaped garden",
  ],
  contactName: "Jordan Avery",
  contactCompany: "HomeTour Demo Realty",
  contactEmail: "hello@example.com",
  contactPhone: "(312) 555-0142",
};

export const PLAN_SIZE = { width: 1600, height: 1240 };

export interface DemoRoom {
  name: string;
  category: string;
  icon: string;
  hotspot: [number, number] | null;
  description: string;
  features: string[];
  photos: string[];
  pano?: string;
}

export const DEMO_ROOMS: DemoRoom[] = [
  {
    name: "Exterior",
    category: "exterior",
    icon: "house",
    hotspot: [865, 1100],
    description:
      "A two-storey facade in black cladding and warm timber, framed by a mature tree. At dusk, tall vertical windows glow from within.",
    features: ["Black & timber cladding", "Mature tree", "Large glass openings", "Front lawn"],
    photos: ["exterior-front-dusk.jpg", "exterior-facade-evening.jpg", "exterior-rear-garden.jpg"],
  },
  {
    name: "Living Room",
    category: "living_room",
    icon: "sofa",
    hotspot: [390, 525],
    description:
      "An open, light-filled living space with a timber feature wall, a deep modular sofa and wide glass doors that slide open onto the deck.",
    features: ["Timber feature wall", "Sliding glass doors", "Built-in fireplace", "Light timber floors"],
    photos: ["living-room-timber-wall.jpg", "living-room-deck-view.jpg", "living-room-fireplace.jpg"],
  },
  {
    name: "Kitchen",
    category: "kitchen",
    icon: "chef",
    hotspot: [810, 606],
    description:
      "A crisp white kitchen with timber cabinetry, black pendant lights and a large island with seating for four at the breakfast bar.",
    features: ["Island with seating", "Pendant lighting", "Built-in oven", "Marble-look splashback"],
    photos: ["kitchen-island-pendants.jpg", "kitchen-breakfast-bar.jpg", "kitchen-marble-splashback.jpg"],
  },
  {
    name: "Dining",
    category: "dining_room",
    icon: "dining",
    hotspot: [1225, 474],
    description:
      "An open-tread black staircase and a concrete-look wall frame the dining area, which flows through wide glass doors to the garden.",
    features: ["Seats eight", "Garden access", "Open-tread staircase", "Statement pendants"],
    photos: ["dining-staircase.jpg", "dining-garden-doors.jpg"],
  },
  {
    name: "Primary Bedroom",
    category: "primary_bedroom",
    icon: "bed-double",
    hotspot: [336, 880],
    description:
      "A calm retreat with black-framed glass doors, an upholstered bed and a reading chair positioned to take in the leafy view.",
    features: ["Black-framed glass doors", "Reading corner", "Leafy outlook", "Upholstered bed"],
    photos: ["primary-bedroom-black-frames.jpg", "primary-bedroom-reading-chair.jpg", "primary-bedroom-detail.jpg"],
  },
  {
    name: "Bedroom 2",
    category: "bedroom",
    icon: "bed",
    hotspot: [1085, 900],
    description: "A bright second bedroom with warm timber floors, a pendant light and plenty of daylight through tall glazing.",
    features: ["Natural light", "Pendant lighting", "Timber floors"],
    photos: ["bedroom-sunlit.jpg", "bedroom-bright-window.jpg"],
  },
  {
    name: "Bathroom",
    category: "bathroom",
    icon: "bath",
    hotspot: [665, 812],
    description:
      "A spa-like bathroom with a freestanding tub, a floating timber vanity with twin basins, matte black tapware and floor-to-ceiling tiles.",
    features: ["Freestanding bath", "Twin basins", "Matte black fixtures", "360° view"],
    photos: ["bathroom-timber-vanity.jpg", "bathroom-freestanding-tub.jpg"],
    pano: "bathroom-360.jpg",
  },
  {
    name: "Patio",
    category: "patio",
    icon: "sun",
    hotspot: [560, 202],
    description:
      "A generous timber deck runs along the back of the home beside a level lawn and the shade of a mature tree, with room for outdoor dining.",
    features: ["Outdoor dining area", "Timber deck", "Level lawn", "Mature tree shade"],
    photos: ["patio-deck-garden.jpg", "patio-rear-deck.jpg"],
  },
];
