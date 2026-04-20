// Astronomical catalog: brightest naked-eye stars, constellation lines,
// planet metadata and a few Messier deep-sky highlights.
// Coordinates are J2000.0 (Right Ascension in hours, Declination in degrees).

export type Star = {
  id: string;
  name: string;
  bayer?: string;
  constellation: string;
  ra: number; // hours
  dec: number; // degrees
  mag: number;
  bv: number; // B-V color index, used to derive a tint
  spectral?: string;
  distanceLy?: number;
  description?: string;
};

export const STARS: Star[] = [
  // Brightest stars (north & south), ordered roughly by apparent magnitude.
  { id: "sirius",       name: "Sirius",       bayer: "α CMa", constellation: "Canis Major",      ra: 6.7525,  dec: -16.7161, mag: -1.46, bv:  0.00, spectral: "A1V",  distanceLy: 8.6,    description: "The brightest star in the night sky. A binary system 8.6 light-years away." },
  { id: "canopus",      name: "Canopus",      bayer: "α Car", constellation: "Carina",           ra: 6.3992,  dec: -52.6957, mag: -0.74, bv:  0.15, spectral: "F0II", distanceLy: 310,    description: "Second-brightest star, a yellow-white supergiant. Major navigation star." },
  { id: "rigil",        name: "Rigil Kentaurus", bayer: "α Cen", constellation: "Centaurus",     ra: 14.6599, dec: -60.8354, mag: -0.27, bv:  0.71, spectral: "G2V",  distanceLy: 4.37,   description: "The closest star system to the Sun (Alpha Centauri AB)." },
  { id: "arcturus",     name: "Arcturus",     bayer: "α Boo", constellation: "Boötes",           ra: 14.2610, dec:  19.1825, mag: -0.05, bv:  1.23, spectral: "K1.5III", distanceLy: 36.7, description: "An orange giant, the brightest star in the northern celestial hemisphere." },
  { id: "vega",         name: "Vega",         bayer: "α Lyr", constellation: "Lyra",             ra: 18.6156, dec:  38.7837, mag:  0.03, bv:  0.00, spectral: "A0V",  distanceLy: 25.0,   description: "Once the northern pole star, vertex of the Summer Triangle." },
  { id: "capella",      name: "Capella",      bayer: "α Aur", constellation: "Auriga",           ra: 5.2782,  dec:  45.9981, mag:  0.08, bv:  0.80, spectral: "G3III", distanceLy: 42.9,  description: "Two pairs of binary stars; appears as a bright golden point." },
  { id: "rigel",        name: "Rigel",        bayer: "β Ori", constellation: "Orion",            ra: 5.2423,  dec:  -8.2016, mag:  0.13, bv: -0.03, spectral: "B8Ia", distanceLy: 860,    description: "A blue supergiant 120,000× more luminous than the Sun." },
  { id: "procyon",      name: "Procyon",      bayer: "α CMi", constellation: "Canis Minor",      ra: 7.6550,  dec:   5.2250, mag:  0.34, bv:  0.42, spectral: "F5IV-V", distanceLy: 11.5, description: "Eighth-brightest star; forms the Winter Triangle with Sirius and Betelgeuse." },
  { id: "achernar",     name: "Achernar",     bayer: "α Eri", constellation: "Eridanus",         ra: 1.6286,  dec: -57.2367, mag:  0.46, bv: -0.16, spectral: "B6Vep", distanceLy: 139,   description: "A rapidly rotating, oblate blue main-sequence star." },
  { id: "betelgeuse",   name: "Betelgeuse",   bayer: "α Ori", constellation: "Orion",            ra: 5.9195,  dec:   7.4071, mag:  0.50, bv:  1.85, spectral: "M1-2Ia", distanceLy: 548,  description: "A red supergiant nearing the end of its life; will one day go supernova." },
  { id: "hadar",        name: "Hadar",        bayer: "β Cen", constellation: "Centaurus",        ra: 14.0637, dec: -60.3730, mag:  0.61, bv: -0.23, spectral: "B1III", distanceLy: 390,   description: "A blue giant triple-star system in the southern sky." },
  { id: "altair",       name: "Altair",       bayer: "α Aql", constellation: "Aquila",           ra: 19.8463, dec:   8.8683, mag:  0.77, bv:  0.22, spectral: "A7V",  distanceLy: 16.7,   description: "Spins so fast it bulges at the equator. Vertex of the Summer Triangle." },
  { id: "acrux",        name: "Acrux",        bayer: "α Cru", constellation: "Crux",             ra: 12.4433, dec: -63.0991, mag:  0.77, bv: -0.24, spectral: "B0.5IV", distanceLy: 320,  description: "Foot of the Southern Cross; a multiple-star system." },
  { id: "aldebaran",    name: "Aldebaran",    bayer: "α Tau", constellation: "Taurus",           ra: 4.5987,  dec:  16.5093, mag:  0.85, bv:  1.54, spectral: "K5III", distanceLy: 65.3,  description: "The eye of the Bull, a giant orange star." },
  { id: "antares",      name: "Antares",      bayer: "α Sco", constellation: "Scorpius",         ra: 16.4901, dec: -26.4320, mag:  1.09, bv:  1.83, spectral: "M1.5Iab", distanceLy: 550, description: "A red supergiant; its name means 'rival of Mars'." },
  { id: "spica",        name: "Spica",        bayer: "α Vir", constellation: "Virgo",            ra: 13.4199, dec: -11.1614, mag:  1.04, bv: -0.23, spectral: "B1V",  distanceLy: 250,    description: "A close binary of two hot blue stars orbiting every 4 days." },
  { id: "pollux",       name: "Pollux",       bayer: "β Gem", constellation: "Gemini",           ra: 7.7553,  dec:  28.0262, mag:  1.14, bv:  1.00, spectral: "K0III", distanceLy: 33.8,  description: "An orange giant; nearest known giant star to the Sun." },
  { id: "fomalhaut",    name: "Fomalhaut",    bayer: "α PsA", constellation: "Piscis Austrinus", ra: 22.9608, dec: -29.6222, mag:  1.16, bv:  0.09, spectral: "A4V",  distanceLy: 25.1,   description: "Surrounded by a vast debris disk — a young solar system in formation." },
  { id: "deneb",        name: "Deneb",        bayer: "α Cyg", constellation: "Cygnus",           ra: 20.6906, dec:  45.2803, mag:  1.25, bv:  0.09, spectral: "A2Ia", distanceLy: 2615,   description: "A blue-white supergiant ~200,000× the Sun's luminosity." },
  { id: "mimosa",       name: "Mimosa",       bayer: "β Cru", constellation: "Crux",             ra: 12.7953, dec: -59.6888, mag:  1.25, bv: -0.23, spectral: "B0.5III", distanceLy: 280, description: "Second-brightest in the Southern Cross." },
  { id: "regulus",      name: "Regulus",      bayer: "α Leo", constellation: "Leo",              ra: 10.1395, dec:  11.9672, mag:  1.40, bv: -0.11, spectral: "B8IVn", distanceLy: 79.3,  description: "The 'little king' lies at the foot of Leo, very close to the ecliptic." },
  { id: "adhara",       name: "Adhara",       bayer: "ε CMa", constellation: "Canis Major",      ra: 6.9770,  dec: -28.9721, mag:  1.50, bv: -0.21, spectral: "B2II", distanceLy: 430,    description: "One of the brightest sources of UV light in the night sky." },
  { id: "castor",       name: "Castor",       bayer: "α Gem", constellation: "Gemini",           ra: 7.5766,  dec:  31.8883, mag:  1.58, bv:  0.03, spectral: "A1V",  distanceLy: 51,     description: "A six-star system bound by gravity." },
  { id: "shaula",       name: "Shaula",       bayer: "λ Sco", constellation: "Scorpius",         ra: 17.5601, dec: -37.1038, mag:  1.62, bv: -0.22, spectral: "B2IV", distanceLy: 700,    description: "The 'stinger' of the Scorpion." },
  { id: "gacrux",       name: "Gacrux",       bayer: "γ Cru", constellation: "Crux",             ra: 12.5194, dec: -57.1133, mag:  1.63, bv:  1.59, spectral: "M3.5III", distanceLy: 88, description: "A red giant at the top of the Southern Cross." },
  { id: "bellatrix",    name: "Bellatrix",    bayer: "γ Ori", constellation: "Orion",            ra: 5.4188,  dec:   6.3497, mag:  1.64, bv: -0.22, spectral: "B2III", distanceLy: 250,   description: "The 'amazon star' marks Orion's left shoulder." },
  { id: "elnath",       name: "Elnath",       bayer: "β Tau", constellation: "Taurus",           ra: 5.4382,  dec:  28.6075, mag:  1.65, bv: -0.13, spectral: "B7III", distanceLy: 134,   description: "The northern horn of the Bull." },
  { id: "alnilam",      name: "Alnilam",      bayer: "ε Ori", constellation: "Orion",            ra: 5.6036,  dec:  -1.2019, mag:  1.69, bv: -0.18, spectral: "B0Ia", distanceLy: 1340,   description: "Central star of Orion's Belt — a luminous blue supergiant." },
  { id: "alnitak",      name: "Alnitak",      bayer: "ζ Ori", constellation: "Orion",            ra: 5.6793,  dec:  -1.9426, mag:  1.74, bv: -0.21, spectral: "O9.5Iab", distanceLy: 800, description: "Eastern star of Orion's Belt." },
  { id: "mintaka",      name: "Mintaka",      bayer: "δ Ori", constellation: "Orion",            ra: 5.5334,  dec:  -0.2991, mag:  2.25, bv: -0.18, spectral: "O9.5II", distanceLy: 1200, description: "Western star of Orion's Belt." },
  { id: "saiph",        name: "Saiph",        bayer: "κ Ori", constellation: "Orion",            ra: 5.7959,  dec:  -9.6696, mag:  2.07, bv: -0.17, spectral: "B0.5Ia", distanceLy: 650,  description: "Marks Orion's right knee." },
  { id: "alioth",       name: "Alioth",       bayer: "ε UMa", constellation: "Ursa Major",       ra: 12.9005, dec:  55.9598, mag:  1.76, bv: -0.02, spectral: "A1III-IVp", distanceLy: 81, description: "Brightest star of the Big Dipper, in the handle." },
  { id: "dubhe",        name: "Dubhe",        bayer: "α UMa", constellation: "Ursa Major",       ra: 11.0621, dec:  61.7510, mag:  1.81, bv:  1.07, spectral: "K0III", distanceLy: 123,   description: "A pointer to Polaris from the Big Dipper." },
  { id: "merak",        name: "Merak",        bayer: "β UMa", constellation: "Ursa Major",       ra: 11.0307, dec:  56.3824, mag:  2.37, bv:  0.03, spectral: "A1IV", distanceLy: 79,     description: "The other Big-Dipper pointer toward Polaris." },
  { id: "phecda",       name: "Phecda",       bayer: "γ UMa", constellation: "Ursa Major",       ra: 11.8972, dec:  53.6948, mag:  2.44, bv:  0.00, spectral: "A0V",  distanceLy: 84,     description: "Bottom-inner star of the Big Dipper bowl." },
  { id: "megrez",       name: "Megrez",       bayer: "δ UMa", constellation: "Ursa Major",       ra: 12.2571, dec:  57.0326, mag:  3.31, bv:  0.08, spectral: "A3V",  distanceLy: 81,     description: "Faintest star of the Big Dipper." },
  { id: "mizar",        name: "Mizar",        bayer: "ζ UMa", constellation: "Ursa Major",       ra: 13.3987, dec:  54.9254, mag:  2.04, bv:  0.13, spectral: "A2V",  distanceLy: 82.9,   description: "A famous double-star with Alcor." },
  { id: "alkaid",       name: "Alkaid",       bayer: "η UMa", constellation: "Ursa Major",       ra: 13.7923, dec:  49.3133, mag:  1.85, bv: -0.10, spectral: "B3V",  distanceLy: 103.9,  description: "End of the Big Dipper's handle." },
  { id: "polaris",      name: "Polaris",      bayer: "α UMi", constellation: "Ursa Minor",       ra: 2.5301,  dec:  89.2641, mag:  1.97, bv:  0.64, spectral: "F7Ib", distanceLy: 433,    description: "The North Star, currently aligned with Earth's rotation axis." },
  { id: "schedar",      name: "Schedar",      bayer: "α Cas", constellation: "Cassiopeia",       ra: 0.6751,  dec:  56.5374, mag:  2.24, bv:  1.17, spectral: "K0IIIa", distanceLy: 228,  description: "Brightest star of the W-shaped queen Cassiopeia." },
  { id: "caph",         name: "Caph",         bayer: "β Cas", constellation: "Cassiopeia",       ra: 0.1530,  dec:  59.1498, mag:  2.27, bv:  0.34, spectral: "F2III-IV", distanceLy: 54.7, description: "Right-most point of the W of Cassiopeia." },
  { id: "gamma-cas",    name: "Navi",         bayer: "γ Cas", constellation: "Cassiopeia",       ra: 0.9451,  dec:  60.7167, mag:  2.47, bv: -0.15, spectral: "B0.5IVe", distanceLy: 550, description: "Centre of the W of Cassiopeia, an eruptive variable." },
  { id: "ruchbah",      name: "Ruchbah",      bayer: "δ Cas", constellation: "Cassiopeia",       ra: 1.4326,  dec:  60.2353, mag:  2.66, bv:  0.13, spectral: "A5III-IV", distanceLy: 99, description: "An eclipsing binary in Cassiopeia." },
  { id: "segin",        name: "Segin",        bayer: "ε Cas", constellation: "Cassiopeia",       ra: 1.9063,  dec:  63.6701, mag:  3.38, bv: -0.15, spectral: "B3III", distanceLy: 410,   description: "Outer-most star in the W of Cassiopeia." },
  { id: "denebola",     name: "Denebola",     bayer: "β Leo", constellation: "Leo",              ra: 11.8177, dec:  14.5720, mag:  2.11, bv:  0.09, spectral: "A3V",  distanceLy: 36,     description: "The lion's tail star." },
  { id: "algieba",      name: "Algieba",      bayer: "γ Leo", constellation: "Leo",              ra: 10.3329, dec:  19.8415, mag:  2.08, bv:  1.15, spectral: "K1-III", distanceLy: 130,  description: "A fine double star in Leo's mane." },
  { id: "sadr",         name: "Sadr",         bayer: "γ Cyg", constellation: "Cygnus",           ra: 20.3705, dec:  40.2567, mag:  2.23, bv:  0.67, spectral: "F8Iab", distanceLy: 1800,  description: "The heart of the Swan." },
  { id: "albireo",      name: "Albireo",      bayer: "β Cyg", constellation: "Cygnus",           ra: 19.5126, dec:  27.9597, mag:  3.05, bv:  1.13, spectral: "K2II + B8V", distanceLy: 430, description: "A famous double of contrasting gold and sapphire stars." },
  { id: "gienah",       name: "Gienah",       bayer: "ε Cyg", constellation: "Cygnus",           ra: 20.7702, dec:  33.9703, mag:  2.48, bv:  1.03, spectral: "K0III", distanceLy: 73,    description: "Wing star of the Swan." },
  { id: "delta-cyg",    name: "Fawaris",      bayer: "δ Cyg", constellation: "Cygnus",           ra: 19.7496, dec:  45.1307, mag:  2.86, bv: -0.03, spectral: "B9.5III", distanceLy: 165, description: "Other wing of the Swan." },
  { id: "dschubba",     name: "Dschubba",     bayer: "δ Sco", constellation: "Scorpius",         ra: 16.0056, dec: -22.6217, mag:  2.32, bv: -0.12, spectral: "B0.3IV", distanceLy: 444,  description: "Forehead of the Scorpion." },
  { id: "sargas",       name: "Sargas",       bayer: "θ Sco", constellation: "Scorpius",         ra: 17.6219, dec: -42.9978, mag:  1.86, bv:  0.40, spectral: "F1II", distanceLy: 270,    description: "Bright star in the tail of Scorpius." },
  { id: "kaus-aus",     name: "Kaus Australis", bayer: "ε Sgr", constellation: "Sagittarius",    ra: 18.4029, dec: -34.3846, mag:  1.85, bv: -0.03, spectral: "B9.5III", distanceLy: 143, description: "Bottom of the 'Teapot' asterism in Sagittarius." },
  { id: "nunki",        name: "Nunki",        bayer: "σ Sgr", constellation: "Sagittarius",      ra: 18.9211, dec: -26.2967, mag:  2.05, bv: -0.13, spectral: "B2.5V", distanceLy: 228,   description: "A bright blue star in the handle of the Teapot." },
];

const STAR_INDEX = new Map<string, number>(STARS.map((s, i) => [s.id, i]));

const lines = (...pairs: [string, string][]): [number, number][] =>
  pairs
    .map(([a, b]): [number, number] | null => {
      const ai = STAR_INDEX.get(a);
      const bi = STAR_INDEX.get(b);
      if (ai === undefined || bi === undefined) return null;
      return [ai, bi];
    })
    .filter((v): v is [number, number] => v !== null);

export type Constellation = {
  id: string;
  name: string;
  abbr: string;
  lines: [number, number][];
  description: string;
};

export const CONSTELLATIONS: Constellation[] = [
  {
    id: "orion",
    name: "Orion",
    abbr: "Ori",
    description:
      "The Hunter — one of the most recognisable constellations, dominant in the winter sky of the northern hemisphere.",
    lines: lines(
      ["betelgeuse", "bellatrix"],
      ["betelgeuse", "alnitak"],
      ["bellatrix", "mintaka"],
      ["mintaka", "alnilam"],
      ["alnilam", "alnitak"],
      ["alnitak", "saiph"],
      ["mintaka", "rigel"],
      ["rigel", "saiph"],
    ),
  },
  {
    id: "ursa-major",
    name: "Ursa Major",
    abbr: "UMa",
    description: "The Great Bear, containing the Big Dipper asterism — a celestial signpost.",
    lines: lines(
      ["dubhe", "merak"],
      ["merak", "phecda"],
      ["phecda", "megrez"],
      ["megrez", "dubhe"],
      ["megrez", "alioth"],
      ["alioth", "mizar"],
      ["mizar", "alkaid"],
    ),
  },
  {
    id: "ursa-minor",
    name: "Ursa Minor",
    abbr: "UMi",
    description: "The Little Bear, anchored by Polaris — the modern North Star.",
    lines: lines(["polaris", "polaris"]),
  },
  {
    id: "cassiopeia",
    name: "Cassiopeia",
    abbr: "Cas",
    description: "A vain queen tied to her throne, forming a striking W-shape across the Milky Way.",
    lines: lines(
      ["caph", "schedar"],
      ["schedar", "gamma-cas"],
      ["gamma-cas", "ruchbah"],
      ["ruchbah", "segin"],
    ),
  },
  {
    id: "leo",
    name: "Leo",
    abbr: "Leo",
    description: "The Lion, recognisable by the 'sickle' of stars forming its mane.",
    lines: lines(
      ["regulus", "algieba"],
      ["algieba", "denebola"],
      ["regulus", "denebola"],
    ),
  },
  {
    id: "cygnus",
    name: "Cygnus",
    abbr: "Cyg",
    description: "The Swan flying along the Milky Way, also called the Northern Cross.",
    lines: lines(
      ["deneb", "sadr"],
      ["sadr", "albireo"],
      ["sadr", "gienah"],
      ["sadr", "delta-cyg"],
    ),
  },
  {
    id: "taurus",
    name: "Taurus",
    abbr: "Tau",
    description: "The Bull, marked by the V-shaped Hyades and the bright Aldebaran.",
    lines: lines(
      ["aldebaran", "elnath"],
    ),
  },
  {
    id: "gemini",
    name: "Gemini",
    abbr: "Gem",
    description: "The Twins, with the bright pair Castor and Pollux marking their heads.",
    lines: lines(["castor", "pollux"]),
  },
  {
    id: "scorpius",
    name: "Scorpius",
    abbr: "Sco",
    description: "The Scorpion, low on the southern horizon for many observers, with red Antares as its heart.",
    lines: lines(
      ["dschubba", "antares"],
      ["antares", "sargas"],
      ["sargas", "shaula"],
    ),
  },
  {
    id: "sagittarius",
    name: "Sagittarius",
    abbr: "Sgr",
    description: "The Archer, whose 'Teapot' asterism marks the centre of the Milky Way.",
    lines: lines(["kaus-aus", "nunki"]),
  },
  {
    id: "crux",
    name: "Crux",
    abbr: "Cru",
    description: "The Southern Cross — a compact, brilliant constellation pointing toward the south celestial pole.",
    lines: lines(
      ["acrux", "gacrux"],
      ["mimosa", "acrux"],
    ),
  },
  {
    id: "canis-major",
    name: "Canis Major",
    abbr: "CMa",
    description: "The Greater Dog, home to Sirius — the brightest star in the sky.",
    lines: lines(["sirius", "adhara"]),
  },
];

// Major Solar System bodies handled by the engine.
export type PlanetMeta = {
  id: string;
  name: string;
  color: string;
  description: string;
};

export const PLANETS: PlanetMeta[] = [
  { id: "mercury", name: "Mercury", color: "#c7b89a", description: "The smallest, fastest planet — closest to the Sun, never far from it in our sky." },
  { id: "venus",   name: "Venus",   color: "#f3e6b5", description: "Our 'sister planet' — brightest natural object in the sky after the Sun and Moon." },
  { id: "mars",    name: "Mars",    color: "#ff7a55", description: "The Red Planet, named for Roman god of war. Hosts the largest volcano in the solar system." },
  { id: "jupiter", name: "Jupiter", color: "#f0c890", description: "The largest planet, a gas giant with hundreds of moons and the Great Red Spot." },
  { id: "saturn",  name: "Saturn",  color: "#e9d6a3", description: "The ringed jewel of the solar system, visible to the naked eye as a steady yellow point." },
  { id: "uranus",  name: "Uranus",  color: "#a8e8ff", description: "An ice giant tilted on its side; only just visible to the naked eye under dark skies." },
  { id: "neptune", name: "Neptune", color: "#7aa2ff", description: "The most distant of the major planets — a deep-blue ice giant invisible to the naked eye." },
];

// A handful of bright deep-sky / lunar / solar objects for the catalog.
export type DeepSkyObject = {
  id: string;
  name: string;
  type: string;
  ra: number; // hours
  dec: number; // degrees
  mag: number;
  description: string;
};

export const DEEP_SKY: DeepSkyObject[] = [
  { id: "m31",    name: "Andromeda Galaxy",  type: "Galaxy",         ra: 0.7123,  dec: 41.2692, mag: 3.4,  description: "M31 — the nearest large spiral galaxy, 2.5 million light-years away. Visible to the naked eye." },
  { id: "m42",    name: "Orion Nebula",       type: "Emission nebula", ra: 5.5881, dec: -5.3911, mag: 4.0,  description: "M42 — a stellar nursery in Orion's sword, visible to the naked eye as a fuzzy patch." },
  { id: "m45",    name: "Pleiades",           type: "Open cluster",    ra: 3.7919, dec: 24.1050, mag: 1.6,  description: "M45 — the 'Seven Sisters'. A young, blue, dazzling open cluster in Taurus." },
  { id: "m44",    name: "Beehive Cluster",    type: "Open cluster",    ra: 8.6700, dec: 19.9833, mag: 3.7,  description: "M44 — a naked-eye open cluster in Cancer." },
  { id: "m13",    name: "Great Hercules Cluster", type: "Globular cluster", ra: 16.6948, dec: 36.4613, mag: 5.8, description: "M13 — one of the finest globular clusters in the northern sky." },
  { id: "lmc",    name: "Large Magellanic Cloud", type: "Galaxy",     ra: 5.3923, dec: -69.7561, mag: 0.9,  description: "A satellite galaxy of the Milky Way, prominent in the southern sky." },
  { id: "smc",    name: "Small Magellanic Cloud", type: "Galaxy",     ra: 0.8769, dec: -72.8000, mag: 2.7,  description: "Companion galaxy to the LMC, in the southern constellation Tucana." },
];
