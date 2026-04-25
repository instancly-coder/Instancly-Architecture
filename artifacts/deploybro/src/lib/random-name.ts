// Generates fresh, friendly two-word project names like "Swift Otter".
// The server slugifies the name into the URL slug (e.g. "swift-otter")
// and auto-suffixes if it collides with an existing slug for the same
// user — so this generator only needs to be statistically unique, not
// guaranteed unique.

const ADJECTIVES = [
  "Swift", "Brave", "Calm", "Eager", "Fancy", "Gentle", "Happy", "Jolly",
  "Kind", "Lively", "Merry", "Proud", "Quiet", "Rapid", "Silent", "Tidy",
  "Vivid", "Witty", "Zesty", "Sleek", "Royal", "Sunny", "Bold", "Bright",
  "Clever", "Cosmic", "Crisp", "Daring", "Electric", "Fierce", "Golden",
  "Grand", "Lucky", "Magic", "Mighty", "Noble", "Plucky", "Polished",
  "Prime", "Pure", "Regal", "Robust", "Rustic", "Savvy", "Shiny", "Smooth",
  "Snappy", "Soft", "Solar", "Sparkling", "Spirited", "Stellar", "Sturdy",
  "Super", "Sweet", "Tender", "Thriving", "Tranquil", "Upbeat", "Urban",
  "Valiant", "Velvet", "Vibrant", "Warm", "Wild", "Wise", "Young", "Zealous",
  "Agile", "Ample", "Blissful", "Bouncy", "Breezy", "Cheerful", "Crystal",
  "Dapper", "Dashing", "Dreamy", "Lush", "Mellow",
];

const NOUNS = [
  "Otter", "Fox", "Wolf", "Lion", "Panda", "Tiger", "Eagle", "Owl",
  "Hawk", "Swan", "Dove", "Raven", "Crane", "Deer", "Bear", "Lynx",
  "Hare", "Falcon", "Badger", "Beaver", "River", "Mountain", "Forest",
  "Valley", "Ocean", "Meadow", "Canyon", "Prairie", "Harbor", "Lagoon",
  "Island", "Glacier", "Summit", "Willow", "Oak", "Maple", "Cedar",
  "Pine", "Fern", "Lotus", "Lily", "Rose", "Tulip", "Sage", "Comet",
  "Nebula", "Galaxy", "Planet", "Ember", "Spark", "Flame", "Breeze",
  "Storm", "Thunder", "Dawn", "Dusk", "Twilight", "Horizon", "Voyager",
  "Ranger", "Scout", "Navigator", "Explorer", "Pioneer", "Sailor",
  "Mariner", "Nomad", "Wanderer", "Sky", "Cloud", "Prism", "Opal",
  "Jade", "Amber", "Coral", "Pearl", "Ivory", "Onyx", "Quartz", "Topaz",
  "Reef",
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

// Returns something like "Swift Otter". Falls back gracefully if the
// (statistically rare) duplicate would clash with an existing project
// — the API server slugifies + suffixes, so callers don't need to
// pre-check uniqueness.
export function randomProjectName(): string {
  return `${pick(ADJECTIVES)} ${pick(NOUNS)}`;
}
