// Word lists for generating friendly two-word project slugs like
// "swift-otter". Kept server-side so all creation paths (dashboard,
// build-new, API) produce the same compact slug format regardless of
// what `name` the caller provides.

const ADJECTIVES = [
  "swift", "brave", "calm", "eager", "fancy", "gentle", "happy", "jolly",
  "kind", "lively", "merry", "proud", "quiet", "rapid", "silent", "tidy",
  "vivid", "witty", "zesty", "sleek", "royal", "sunny", "bold", "bright",
  "clever", "cosmic", "crisp", "daring", "fierce", "golden", "grand",
  "lucky", "magic", "mighty", "noble", "plucky", "prime", "pure", "regal",
  "robust", "rustic", "savvy", "shiny", "smooth", "snappy", "soft", "solar",
  "sparkling", "stellar", "sturdy", "super", "sweet", "tender", "tranquil",
  "upbeat", "urban", "valiant", "velvet", "vibrant", "warm", "wild", "wise",
  "agile", "ample", "blissful", "bouncy", "breezy", "cheerful", "crystal",
  "dapper", "dashing", "dreamy", "lush", "mellow", "polished", "spirited",
];

const NOUNS = [
  "otter", "fox", "wolf", "lion", "panda", "tiger", "eagle", "owl",
  "hawk", "swan", "dove", "raven", "crane", "deer", "bear", "lynx",
  "hare", "falcon", "badger", "beaver", "river", "mountain", "forest",
  "valley", "ocean", "meadow", "canyon", "harbor", "lagoon", "island",
  "glacier", "summit", "willow", "oak", "maple", "cedar", "pine", "fern",
  "lotus", "lily", "rose", "tulip", "sage", "comet", "nebula", "galaxy",
  "planet", "ember", "spark", "flame", "breeze", "storm", "thunder",
  "dawn", "dusk", "twilight", "horizon", "voyager", "ranger", "scout",
  "nomad", "wanderer", "sky", "cloud", "prism", "opal", "jade", "amber",
  "coral", "pearl", "ivory", "onyx", "quartz", "topaz", "reef",
];

function pick(arr: readonly string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** Returns a slug like "swift-otter". Statistically unique across the
 *  ~5 800 combinations; the caller must still suffix-increment on
 *  collision (same as before). */
export function randomSlug(): string {
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}`;
}
