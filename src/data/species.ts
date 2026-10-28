/* ---------- FIELD GUIDE ----------
   A small, curated guide to common Colorado plants: the trees, shrubs and
   wildflowers you're most likely to meet on the trails in this atlas.

   Provenance, so the UI can say what kind of claim each line is:
     inat      iNaturalist taxon id, checked against the live API (taxon exists,
               is active, and has research-grade Colorado records). This is the
               stable external identifier; the photo and summary on a species
               page come from iNaturalist at runtime, credited to their authors.
     id/habitat/facts/similar
               Field-guide text written for this app from standard regional
               knowledge. Kept to well-established, general statements.
     elevFt, zones, look.months
               Approximate Colorado ranges, labelled as approximate in the UI.
               They vary with aspect, latitude and the year.
     traits    The answers each species gives in the Identify key.          */

export type Group = "conifer" | "broadleaf" | "flower";
export type Zone = "plains" | "foothills" | "montane" | "subalpine" | "alpine";
export type LeafShape =
  | "needle" | "scale" | "rounded" | "oval" | "lance" | "triangular" | "lobed"
  | "palmate" | "compound" | "wedge" | "narrow" | "heart" | "feathery";

export interface Species {
  id: string;
  common: string;
  sci: string;
  /** iNaturalist taxon id (verified) */
  inat: number;
  rank: "species" | "genus" | "complex";
  family: string;
  groups: Group[];
  habit: "tree" | "shrub" | "groundcover" | "wildflower" | "cactus";
  /** drives the drawn leaf glyph and the leaf-shape quest */
  leaf: LeafShape;
  zones: Zone[];
  elevFt: [number, number];
  /** what to look for, by month (1–12) */
  look: { what: string; months: number[] }[];
  /** Identify-key answers this species gives */
  traits: Record<string, string[]>;
  idMarks: string[];
  habitat: string;
  facts: string[];
  similar: { id: string; tell: string }[];
  caution?: string;
}

const ALL_ZONES: Zone[] = ["plains", "foothills", "montane", "subalpine", "alpine"];
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const YEAR = range(1, 12);

export const SPECIES: Species[] = [
  /* ================= CONIFERS ================= */
  {
    id: "ponderosa-pine", common: "Ponderosa pine", sci: "Pinus scopulorum", inat: 1592845, rank: "species",
    family: "Pinaceae", groups: ["conifer"], habit: "tree", leaf: "needle",
    zones: ["foothills", "montane"], elevFt: [6000, 9000],
    look: [{ what: "Needles year-round", months: YEAR }],
    traits: { needles: ["bundle3", "bundle2"], cone: ["pine-cone"] },
    idMarks: [
      "Long needles, about 4 to 8 inches, mostly in bundles of three (some twos)",
      "Older trees have thick orange-brown bark in puzzle-piece plates",
      "Prickly cones, 3 to 5 inches long",
    ],
    habitat: "Open, park-like stands on warm, dry slopes of the foothills and lower montane.",
    facts: [
      "Press your nose to a sun-warmed trunk: many people smell vanilla or butterscotch.",
      "Thick bark lets big trees survive the low, frequent ground fires these forests evolved with.",
      "iNaturalist now treats the Rocky Mountain form as its own species; you will also see it listed as Pinus ponderosa var. scopulorum.",
    ],
    similar: [
      { id: "lodgepole-pine", tell: "Lodgepole needles are short (1 to 3 inches) and always in twos." },
      { id: "pinyon-pine", tell: "Pinyon needles are short, stiff and in twos; the tree is small and rounded." },
    ],
  },
  {
    id: "lodgepole-pine", common: "Lodgepole pine", sci: "Pinus contorta", inat: 48934, rank: "species",
    family: "Pinaceae", groups: ["conifer"], habit: "tree", leaf: "needle",
    zones: ["montane", "subalpine"], elevFt: [8000, 11000],
    look: [{ what: "Needles year-round", months: YEAR }],
    traits: { needles: ["bundle2"], cone: ["pine-cone"] },
    idMarks: [
      "Short needles, 1 to 3 inches, in bundles of two, often slightly twisted",
      "Tall, straight, narrow trunks in dense even-aged stands",
      "Small egg-shaped cones that can stay on the branches for years",
    ],
    habitat: "Dense stands in the montane and subalpine, often where fire burned decades ago.",
    facts: [
      "Many cones are sealed with resin and open after the heat of a fire, reseeding the burn.",
      "The straight trunks were used for teepee and lodge poles, which gave the tree its name.",
    ],
    similar: [
      { id: "ponderosa-pine", tell: "Ponderosa needles are much longer and mostly in threes." },
      { id: "limber-pine", tell: "Limber pine needles come in fives." },
    ],
  },
  {
    id: "limber-pine", common: "Limber pine", sci: "Pinus flexilis", inat: 78585, rank: "species",
    family: "Pinaceae", groups: ["conifer"], habit: "tree", leaf: "needle",
    zones: ["montane", "subalpine"], elevFt: [7000, 11500],
    look: [{ what: "Needles year-round", months: YEAR }],
    traits: { needles: ["bundle5"], cone: ["pine-cone"] },
    idMarks: [
      "Needles in bundles of five, 2 to 3 inches, crowded toward the branch tips",
      "Young twigs are so flexible they can be bent nearly double without snapping",
      "Cones 3 to 6 inches without prickles on the scales",
    ],
    habitat: "Rocky ridges and windy, exposed slopes, often growing alone or in small groups.",
    facts: [
      "Flexible branches shed snow and bend in wind that would break stiffer trees.",
      "Its large seeds are cached by Clark's nutcrackers, which plant the next generation.",
    ],
    similar: [
      { id: "bristlecone-pine", tell: "Bristlecone needles are shorter, packed in dense bottlebrush tufts and flecked with white resin dots; cone scales end in a bristle." },
    ],
  },
  {
    id: "bristlecone-pine", common: "Rocky Mountain bristlecone pine", sci: "Pinus aristata", inat: 135774, rank: "species",
    family: "Pinaceae", groups: ["conifer"], habit: "tree", leaf: "needle",
    zones: ["subalpine"], elevFt: [9500, 12000],
    look: [{ what: "Needles year-round", months: YEAR }],
    traits: { needles: ["bundle5"], cone: ["pine-cone"] },
    idMarks: [
      "Short needles in fives, packed along the branch like a bottlebrush or foxtail",
      "Tiny white flecks of resin dotting the needles",
      "Each cone scale ends in a slender, curved bristle",
    ],
    habitat: "Dry, rocky, wind-blasted slopes near treeline, mostly in central and southern Colorado.",
    facts: [
      "Some Colorado trees are well over a thousand years old, often with much of the trunk dead and only a strip of living bark.",
      "Needles can stay on the tree for decades.",
    ],
    similar: [
      { id: "limber-pine", tell: "Limber pine needles are longer, lack resin dots, and the cones have no bristles." },
    ],
  },
  {
    id: "pinyon-pine", common: "Two-needle pinyon", sci: "Pinus edulis", inat: 57902, rank: "species",
    family: "Pinaceae", groups: ["conifer"], habit: "tree", leaf: "needle",
    zones: ["plains", "foothills"], elevFt: [5000, 8000],
    look: [{ what: "Needles year-round", months: YEAR }, { what: "Cones open, nuts drop", months: [9, 10] }],
    traits: { needles: ["bundle2"], cone: ["pine-cone"] },
    idMarks: [
      "Short, stiff, curved needles about an inch long, in twos",
      "Small, round-crowned tree rarely more than 30 feet tall",
      "Small, nearly round cones holding large wingless seeds",
    ],
    habitat: "Pinyon-juniper woodland on dry mesas and canyon slopes, mainly in southern and western Colorado.",
    facts: [
      "Its seeds are the pine nuts long gathered across the Southwest.",
      "Pinyon jays harvest and bury the seeds, planting new trees.",
    ],
    similar: [
      { id: "lodgepole-pine", tell: "Lodgepole is a tall, straight tree of the high mountains, not a low, round woodland tree." },
      { id: "rm-juniper", tell: "Juniper has tiny scale leaves and blue berry-like cones, no needles in bundles." },
    ],
  },
  {
    id: "douglas-fir", common: "Douglas-fir", sci: "Pseudotsuga menziesii", inat: 48256, rank: "species",
    family: "Pinaceae", groups: ["conifer"], habit: "tree", leaf: "needle",
    zones: ["foothills", "montane"], elevFt: [6000, 10500],
    look: [{ what: "Needles year-round", months: YEAR }],
    traits: { needles: ["single-flat"], cone: ["bracts"] },
    idMarks: [
      "Single soft, flat needles that grow all around the twig",
      "Hanging cones with three-pointed bracts poking out between the scales",
      "Pointed, reddish-brown buds at the twig tips",
    ],
    habitat: "Cooler north-facing slopes in the foothills and montane, often across the valley from ponderosa.",
    facts: [
      "Despite the name it is not a true fir; the hyphen in Douglas-fir is there to say so.",
      "The cone bracts are often compared to the back legs and tail of a mouse hiding in the cone.",
    ],
    similar: [
      { id: "subalpine-fir", tell: "True firs hold their cones upright, and those cones fall apart on the tree." },
      { id: "engelmann-spruce", tell: "Spruce needles are square and roll between your fingers; Douglas-fir needles are flat." },
    ],
  },
  {
    id: "engelmann-spruce", common: "Engelmann spruce", sci: "Picea engelmannii", inat: 78582, rank: "species",
    family: "Pinaceae", groups: ["conifer"], habit: "tree", leaf: "needle",
    zones: ["subalpine"], elevFt: [9000, 11800],
    look: [{ what: "Needles year-round", months: YEAR }],
    traits: { needles: ["single-square"], cone: ["hanging-papery"] },
    idMarks: [
      "Single four-sided needles that roll between your fingers; fairly flexible",
      "Hanging cones about 2 inches long with thin, papery scales",
      "Young twigs are finely hairy (use a hand lens)",
    ],
    habitat: "The dark, cool spruce-fir forest of the subalpine, up to treeline.",
    facts: [
      "With subalpine fir it forms the main high-elevation forest in Colorado.",
      "At treeline it grows as low, wind-shaped mats called krummholz.",
    ],
    similar: [
      { id: "blue-spruce", tell: "Blue spruce needles are stiffer and sharper, its cones are longer, and it grows lower, along streams." },
      { id: "subalpine-fir", tell: "Fir needles are flat and soft and won't roll; fir cones stand upright." },
    ],
  },
  {
    id: "blue-spruce", common: "Colorado blue spruce", sci: "Picea pungens", inat: 119092, rank: "species",
    family: "Pinaceae", groups: ["conifer"], habit: "tree", leaf: "needle",
    zones: ["foothills", "montane"], elevFt: [6500, 9500],
    look: [{ what: "Needles year-round", months: YEAR }],
    traits: { needles: ["single-square"], cone: ["hanging-papery"] },
    idMarks: [
      "Stiff, very sharp four-sided needles, often silvery blue but sometimes green",
      "Hanging cones 2 to 4 inches long with papery, ragged-edged scales",
      "Hairless twigs",
    ],
    habitat: "Along streams and in moist valley bottoms in the foothills and montane.",
    facts: [
      "It is Colorado's state tree.",
      "The blue color comes from a waxy coating on the needles; wild trees range from blue to plain green.",
    ],
    similar: [
      { id: "engelmann-spruce", tell: "Engelmann needles are softer and less sharp, and it grows higher, in the spruce-fir forest." },
    ],
  },
  {
    id: "subalpine-fir", common: "Subalpine fir", sci: "Abies lasiocarpa", inat: 75241, rank: "species",
    family: "Pinaceae", groups: ["conifer"], habit: "tree", leaf: "needle",
    zones: ["subalpine"], elevFt: [9000, 11800],
    look: [{ what: "Needles year-round", months: YEAR }],
    traits: { needles: ["single-flat"], cone: ["upright"] },
    idMarks: [
      "Soft, flat, blunt needles that curve upward along the twig",
      "Dark purple cones that stand upright near the top and fall apart on the tree",
      "Narrow, spire-shaped crown; smooth gray bark with resin blisters",
    ],
    habitat: "Subalpine forest with Engelmann spruce, up to treeline.",
    facts: [
      "You rarely find whole fir cones on the ground: they shed their scales on the branch and leave a bare spike.",
      "Press a resin blister on a young trunk and it pops with sticky, fragrant pitch.",
    ],
    similar: [
      { id: "engelmann-spruce", tell: "Spruce needles are square and sharp-tipped; spruce cones hang down." },
      { id: "white-fir", tell: "White fir needles are longer (2 to 3 inches) and silvery blue-green; it grows lower." },
    ],
  },
  {
    id: "white-fir", common: "White fir", sci: "Abies concolor", inat: 68087, rank: "species",
    family: "Pinaceae", groups: ["conifer"], habit: "tree", leaf: "needle",
    zones: ["foothills", "montane"], elevFt: [7000, 10000],
    look: [{ what: "Needles year-round", months: YEAR }],
    traits: { needles: ["single-flat"], cone: ["upright"] },
    idMarks: [
      "Long, flat, soft needles, 2 to 3 inches, silvery blue-green",
      "Upright cones that break apart on the tree",
      "Smooth gray bark on young trees",
    ],
    habitat: "Montane forests in southern and central Colorado, often mixed with Douglas-fir.",
    facts: ["Crushed needles have a citrus-like scent."],
    similar: [
      { id: "subalpine-fir", tell: "Subalpine fir needles are shorter and it grows higher, near treeline." },
      { id: "douglas-fir", tell: "Douglas-fir cones hang down and show three-pointed bracts." },
    ],
  },
  {
    id: "rm-juniper", common: "Rocky Mountain juniper", sci: "Juniperus scopulorum", inat: 135883, rank: "species",
    family: "Cupressaceae", groups: ["conifer"], habit: "tree", leaf: "scale",
    zones: ["plains", "foothills"], elevFt: [5000, 8500],
    look: [{ what: "Blue berry-like cones", months: range(8, 12) }],
    traits: { needles: ["scale"], cone: ["berry"] },
    idMarks: [
      "Tiny overlapping scale leaves that hug the twig like braided cord",
      "Small blue berry-like cones with a whitish bloom",
      "Shreddy, reddish-brown bark",
    ],
    habitat: "Dry, rocky foothills, canyon walls and mesas.",
    facts: ["The 'berries' are really cones with fleshy, fused scales; birds eat them and spread the seeds."],
    similar: [
      { id: "common-juniper", tell: "Common juniper is a low shrub with sharp, awl-like needles, not scale leaves." },
    ],
  },
  {
    id: "common-juniper", common: "Common juniper", sci: "Juniperus communis", inat: 58725, rank: "species",
    family: "Cupressaceae", groups: ["conifer"], habit: "shrub", leaf: "needle",
    zones: ["montane", "subalpine"], elevFt: [6500, 12000],
    look: [{ what: "Needles year-round", months: YEAR }],
    traits: { needles: ["awl"], cone: ["berry"] },
    idMarks: [
      "Low, spreading shrub rarely knee-high",
      "Sharp, stiff, awl-shaped needles in whorls of three, with a white stripe on top",
      "Hard blue berry-like cones",
    ],
    habitat: "Forest openings and rocky slopes from the montane to near treeline.",
    facts: ["It grows around the whole Northern Hemisphere, more widely than any other conifer."],
    similar: [
      { id: "rm-juniper", tell: "Rocky Mountain juniper is a tree with soft scale leaves." },
    ],
  },

  /* ================= BROADLEAF TREES + SHRUBS ================= */
  {
    id: "quaking-aspen", common: "Quaking aspen", sci: "Populus tremuloides", inat: 54840, rank: "species",
    family: "Salicaceae", groups: ["broadleaf"], habit: "tree", leaf: "rounded",
    zones: ["foothills", "montane", "subalpine"], elevFt: [6500, 11500],
    look: [{ what: "Leaves out", months: [6, 7, 8] }, { what: "Fall gold", months: [9, 10] }],
    traits: { arrangement: ["alternate"], leafType: ["simple"], shape: ["rounded"], margin: ["toothed"], habit: ["tree"], feature: ["white-bark", "flutter"] },
    idMarks: [
      "Nearly round leaves with a short point and fine teeth",
      "Flattened leaf stalks make the leaves tremble in the slightest breeze",
      "Smooth, chalky white to greenish bark with black scars",
    ],
    habitat: "Montane and subalpine slopes, often in big groves on moist ground or after fire.",
    facts: [
      "A grove is often one organism: the trunks sprout from a shared root system.",
      "The green layer under the white bark can photosynthesize.",
      "Its fall color is the reason most of the fall-color spots in this atlas exist.",
    ],
    similar: [
      { id: "narrowleaf-cottonwood", tell: "Narrowleaf cottonwood leaves are long and lance-shaped, and the tree grows along streams." },
      { id: "water-birch", tell: "Water birch is a shrubby streamside tree with shiny reddish bark." },
    ],
  },
  {
    id: "narrowleaf-cottonwood", common: "Narrowleaf cottonwood", sci: "Populus angustifolia", inat: 52130, rank: "species",
    family: "Salicaceae", groups: ["broadleaf"], habit: "tree", leaf: "lance",
    zones: ["foothills", "montane"], elevFt: [5000, 9000],
    look: [{ what: "Fall yellow", months: [9, 10] }],
    traits: { arrangement: ["alternate"], leafType: ["simple"], shape: ["lance"], margin: ["toothed"], habit: ["tree"], feature: ["none"] },
    idMarks: [
      "Narrow, lance-shaped leaves with fine teeth, looking a lot like a willow",
      "Grows as a real tree with furrowed bark on older trunks",
      "Sticky, fragrant buds in spring",
    ],
    habitat: "Stream banks and floodplains in foothill and mountain valleys.",
    facts: ["Its fine, willow-like leaves are what separate it from the broad-leaved plains cottonwood downstream."],
    similar: [
      { id: "willows", tell: "Willows are usually shrubs, and each bud is covered by a single cap-like scale." },
      { id: "plains-cottonwood", tell: "Plains cottonwood leaves are broad and triangular." },
    ],
  },
  {
    id: "plains-cottonwood", common: "Plains cottonwood", sci: "Populus deltoides", inat: 52119, rank: "species",
    family: "Salicaceae", groups: ["broadleaf"], habit: "tree", leaf: "triangular",
    zones: ["plains"], elevFt: [3400, 6500],
    look: [{ what: "Cottony seed fluff", months: [5, 6] }, { what: "Fall yellow", months: [10, 11] }],
    traits: { arrangement: ["alternate"], leafType: ["simple"], shape: ["triangular"], margin: ["toothed"], habit: ["tree"], feature: ["flutter"] },
    idMarks: [
      "Broad, triangular leaves with coarse, curved teeth",
      "Flattened leaf stalks, so the leaves flutter like aspen",
      "Massive trees with deeply furrowed gray bark",
    ],
    habitat: "Rivers and creeks on the eastern plains and the low edge of the foothills.",
    facts: ["The cotton that drifts in early summer is the fluff on its seeds."],
    similar: [
      { id: "narrowleaf-cottonwood", tell: "Narrowleaf cottonwood has slim, lance-shaped leaves and grows higher." },
      { id: "quaking-aspen", tell: "Aspen leaves are smaller and rounder, and aspen bark stays smooth and white." },
    ],
  },
  {
    id: "rm-maple", common: "Rocky Mountain maple", sci: "Acer glabrum", inat: 63078, rank: "species",
    family: "Sapindaceae", groups: ["broadleaf"], habit: "shrub", leaf: "palmate",
    zones: ["foothills", "montane"], elevFt: [6000, 10000],
    look: [{ what: "Winged seeds", months: [7, 8, 9] }, { what: "Fall red and yellow", months: [9, 10] }],
    traits: { arrangement: ["opposite"], leafType: ["simple", "three-leaflets"], shape: ["palmate", "lobed"], margin: ["toothed", "lobed"], habit: ["shrub", "tree"], feature: ["winged-seeds"] },
    idMarks: [
      "Leaves in opposite pairs, with three main lobes (sometimes split into three leaflets)",
      "Sharp, uneven teeth on the lobes",
      "Paired, winged seeds; reddish young twigs",
    ],
    habitat: "Shady canyons, rocky slopes and the edges of montane forests.",
    facts: ["Colorado's only common native mountain maple, usually a multi-stemmed shrub."],
    similar: [
      { id: "boxelder", tell: "Boxelder is a maple too, but its leaves are compound with three to five separate leaflets." },
      { id: "wax-currant", tell: "Wax currant leaves are small, alternate and fan-shaped." },
    ],
  },
  {
    id: "boxelder", common: "Boxelder", sci: "Acer negundo", inat: 47726, rank: "species",
    family: "Sapindaceae", groups: ["broadleaf"], habit: "tree", leaf: "compound",
    zones: ["plains", "foothills"], elevFt: [3500, 7500],
    look: [{ what: "Fall yellow", months: [10] }],
    traits: { arrangement: ["opposite"], leafType: ["three-leaflets", "many-leaflets"], shape: ["oval", "lobed"], margin: ["toothed", "lobed"], habit: ["tree"], feature: ["winged-seeds"] },
    idMarks: [
      "Opposite, compound leaves with three to five (sometimes seven) leaflets",
      "Green or purplish twigs, often with a whitish bloom",
      "Paired, winged seeds that hang in clusters",
    ],
    habitat: "Stream banks and moist ground on the plains and in the lower foothills.",
    facts: ["Though it looks nothing like a typical maple, its winged seeds give it away."],
    similar: [
      { id: "western-poison-ivy", tell: "Poison ivy has alternate leaves and is a low shrub; boxelder leaves are opposite on a tree." },
      { id: "rm-maple", tell: "Rocky Mountain maple usually has single three-lobed leaves." },
    ],
  },
  {
    id: "gambel-oak", common: "Gambel oak", sci: "Quercus gambelii", inat: 116377, rank: "species",
    family: "Fagaceae", groups: ["broadleaf"], habit: "shrub", leaf: "lobed",
    zones: ["foothills", "montane"], elevFt: [5500, 9000],
    look: [{ what: "Acorns", months: [8, 9] }, { what: "Fall orange and rust", months: [9, 10] }],
    traits: { arrangement: ["alternate"], leafType: ["simple"], shape: ["lobed"], margin: ["lobed"], habit: ["shrub", "tree"], feature: ["acorns"] },
    idMarks: [
      "Deeply lobed leaves with rounded lobes",
      "Acorns in scaly cups",
      "Grows in dense thickets, from waist-high scrub to small trees",
    ],
    habitat: "Dry foothill slopes, especially south of Denver and on the Western Slope.",
    facts: ["Thickets spread from underground stems, so a hillside of oak brush can be a few connected plants."],
    similar: [
      { id: "wax-currant", tell: "Wax currant leaves are small and fan-shaped with shallow scalloped lobes." },
    ],
  },
  {
    id: "chokecherry", common: "Chokecherry", sci: "Prunus virginiana", inat: 54835, rank: "species",
    family: "Rosaceae", groups: ["broadleaf"], habit: "shrub", leaf: "oval",
    zones: ["plains", "foothills", "montane"], elevFt: [4500, 9500],
    look: [{ what: "White flower spikes", months: [5, 6] }, { what: "Dark fruit", months: [8, 9] }],
    traits: { arrangement: ["alternate"], leafType: ["simple"], shape: ["oval"], margin: ["toothed"], habit: ["shrub", "tree"], feature: ["berries"] },
    idMarks: [
      "Oval leaves with fine, sharp teeth",
      "Cylinders of small white flowers in late spring",
      "Hanging clusters of red to nearly black cherries in late summer",
    ],
    habitat: "Stream banks, draws and forest edges from the plains into the montane.",
    facts: ["Named for the mouth-puckering taste of the raw fruit."],
    caution: "Leaves, bark and the pits contain compounds that are poisonous. Do not eat the pits or chew the leaves.",
    similar: [
      { id: "serviceberry", tell: "Serviceberry leaves are rounder and toothed only near the tip; its flowers have long, strap-like petals." },
    ],
  },
  {
    id: "thinleaf-alder", common: "Thinleaf alder", sci: "Alnus incana", inat: 75377, rank: "species",
    family: "Betulaceae", groups: ["broadleaf"], habit: "shrub", leaf: "oval",
    zones: ["foothills", "montane"], elevFt: [6000, 10000],
    look: [{ what: "Catkins", months: [3, 4, 5] }],
    traits: { arrangement: ["alternate"], leafType: ["simple"], shape: ["oval"], margin: ["toothed"], habit: ["shrub", "tree"], feature: ["woody-cones"] },
    idMarks: [
      "Oval leaves with double teeth (small teeth on the bigger teeth)",
      "Tiny woody cones, about half an inch, that stay on through winter",
      "Clumps of smooth gray stems along water",
    ],
    habitat: "Stream banks and wet ground in the foothills and montane. The Colorado plant is the subspecies tenuifolia.",
    facts: ["Its roots host bacteria that pull nitrogen from the air, enriching streamside soil."],
    similar: [
      { id: "water-birch", tell: "Water birch has shiny reddish-bronze bark and no little woody cones." },
    ],
  },
  {
    id: "water-birch", common: "Water birch", sci: "Betula occidentalis", inat: 75764, rank: "species",
    family: "Betulaceae", groups: ["broadleaf"], habit: "shrub", leaf: "oval",
    zones: ["foothills", "montane"], elevFt: [5500, 9500],
    look: [{ what: "Fall yellow", months: [9, 10] }],
    traits: { arrangement: ["alternate"], leafType: ["simple"], shape: ["oval", "rounded"], margin: ["toothed"], habit: ["shrub", "tree"], feature: ["shiny-bark"] },
    idMarks: [
      "Small, toothed, broadly oval leaves",
      "Shiny reddish-bronze to dark bark marked with horizontal lines",
      "Grows in dense clumps right at the water's edge",
    ],
    habitat: "Creek banks and springs in canyons and mountain valleys.",
    facts: ["Unlike paper birches, its bark doesn't peel in white sheets."],
    similar: [
      { id: "thinleaf-alder", tell: "Alder bark is gray, and alder carries small woody cones." },
    ],
  },
  {
    id: "serviceberry", common: "Serviceberry", sci: "Amelanchier alnifolia", inat: 75415, rank: "species",
    family: "Rosaceae", groups: ["broadleaf"], habit: "shrub", leaf: "rounded",
    zones: ["foothills", "montane"], elevFt: [5500, 10000],
    look: [{ what: "White flowers", months: [4, 5, 6] }, { what: "Purple berries", months: [7, 8] }],
    traits: { arrangement: ["alternate"], leafType: ["simple"], shape: ["rounded", "oval"], margin: ["toothed"], habit: ["shrub"], feature: ["berries"] },
    idMarks: [
      "Roundish leaves with teeth only on the upper half",
      "Early white flowers with five long, narrow petals",
      "Small, dark purple, berry-like fruit",
    ],
    habitat: "Foothill slopes, canyon sides and forest edges.",
    facts: ["The fruit is the saskatoon berry, eaten by people, bears and birds."],
    similar: [
      { id: "chokecherry", tell: "Chokecherry leaves are toothed all the way around, and its flowers come in dense cylinders." },
      { id: "mountain-mahogany", tell: "Mountain mahogany leaves are smaller and wedge-shaped, with feathery-tailed seeds." },
    ],
  },
  {
    id: "mountain-mahogany", common: "Mountain mahogany", sci: "Cercocarpus montanus", inat: 52378, rank: "species",
    family: "Rosaceae", groups: ["broadleaf"], habit: "shrub", leaf: "wedge",
    zones: ["foothills"], elevFt: [5000, 8500],
    look: [{ what: "Feathery seed tails", months: [7, 8, 9, 10] }],
    traits: { arrangement: ["alternate"], leafType: ["simple"], shape: ["oval", "wedge"], margin: ["toothed"], habit: ["shrub"], feature: ["feathery-seeds"] },
    idMarks: [
      "Small leaves, wider toward the toothed tip, with clearly impressed veins",
      "Seeds with long, silky, corkscrew tails that catch the light",
      "A stiff, upright shrub of dry slopes",
    ],
    habitat: "Dry, rocky foothill slopes all along the Front Range.",
    facts: ["The tailed seed twists as it dries and untwists when wet, which helps drill it into the soil."],
    similar: [
      { id: "serviceberry", tell: "Serviceberry leaves are rounder, and it has berries instead of tailed seeds." },
      { id: "big-sagebrush", tell: "Sagebrush leaves are silver-gray with three teeth at the tip and smell strongly of sage." },
    ],
  },
  {
    id: "skunkbush", common: "Skunkbush sumac", sci: "Rhus trilobata", inat: 867365, rank: "species",
    family: "Anacardiaceae", groups: ["broadleaf"], habit: "shrub", leaf: "compound",
    zones: ["plains", "foothills"], elevFt: [4000, 8000],
    look: [{ what: "Red fuzzy berries", months: [6, 7, 8] }, { what: "Fall red and orange", months: [9, 10] }],
    traits: { arrangement: ["alternate"], leafType: ["three-leaflets"], shape: ["lobed", "wedge"], margin: ["lobed", "toothed"], habit: ["shrub"], feature: ["berries", "smell"] },
    idMarks: [
      "Leaves of three small, lobed leaflets, the middle one largest",
      "Sticky, fuzzy red berries in clusters",
      "Crushed leaves have a strong, sharp smell",
    ],
    habitat: "Dry slopes, rock outcrops and canyon sides in the plains and foothills.",
    facts: ["The tart berries were used for a lemonade-like drink, which is why it is also called lemonade sumac."],
    similar: [
      { id: "western-poison-ivy", tell: "Poison ivy leaflets are larger and glossy, the middle one on a longer stalk, and its berries are whitish, not red." },
    ],
  },
  {
    id: "western-poison-ivy", common: "Western poison ivy", sci: "Toxicodendron rydbergii", inat: 58729, rank: "species",
    family: "Anacardiaceae", groups: ["broadleaf"], habit: "shrub", leaf: "compound",
    zones: ["plains", "foothills"], elevFt: [3500, 8000],
    look: [{ what: "Whitish berries", months: [8, 9, 10] }, { what: "Fall red", months: [9, 10] }],
    traits: { arrangement: ["alternate"], leafType: ["three-leaflets"], shape: ["oval"], margin: ["smooth", "toothed"], habit: ["shrub", "groundcover"], feature: ["berries"] },
    idMarks: [
      "Leaves of three glossy leaflets; the middle leaflet sits on a longer stalk",
      "Low, unbranched stems, often in patches",
      "Clusters of small whitish berries",
    ],
    habitat: "Stream banks, canyon bottoms and shady draws in the plains and foothills.",
    facts: ["Its oil can stay active on clothing, boots and dog fur."],
    caution: "Causes an itchy rash on contact. Don't touch it; wash skin and gear with soap if you do.",
    similar: [
      { id: "skunkbush", tell: "Skunkbush leaflets are small and lobed, and its berries are red and fuzzy." },
      { id: "boxelder", tell: "Boxelder is a tree with opposite leaves." },
    ],
  },
  {
    id: "kinnikinnick", common: "Kinnikinnick", sci: "Arctostaphylos uva-ursi", inat: 68049, rank: "species",
    family: "Ericaceae", groups: ["broadleaf"], habit: "groundcover", leaf: "oval",
    zones: ["foothills", "montane", "subalpine"], elevFt: [6000, 11000],
    look: [{ what: "Pink bell flowers", months: [5, 6] }, { what: "Red berries", months: range(8, 12) }],
    traits: { arrangement: ["alternate"], leafType: ["simple"], shape: ["tiny-evergreen"], margin: ["smooth"], habit: ["groundcover"], feature: ["berries"] },
    idMarks: [
      "A low evergreen mat with small, thick, glossy, paddle-shaped leaves",
      "Little pink-white bell flowers in spring",
      "Bright red berries that hang on into winter",
    ],
    habitat: "Sunny forest floors under ponderosa and lodgepole, and rocky openings.",
    facts: ["Also called bearberry: bears eat the mealy berries."],
    similar: [
      { id: "common-juniper", tell: "Common juniper also forms low mats, but it has sharp needles." },
    ],
  },
  {
    id: "big-sagebrush", common: "Big sagebrush", sci: "Artemisia tridentata", inat: 75598, rank: "species",
    family: "Asteraceae", groups: ["broadleaf"], habit: "shrub", leaf: "wedge",
    zones: ["plains", "foothills", "montane"], elevFt: [4500, 10000],
    look: [{ what: "Silver leaves year-round", months: YEAR }],
    traits: { arrangement: ["alternate"], leafType: ["simple"], shape: ["wedge"], margin: ["toothed", "lobed"], habit: ["shrub"], feature: ["smell"] },
    idMarks: [
      "Silver-gray, wedge-shaped leaves with three teeth at the tip",
      "A strong, clean sage smell when you brush past",
      "Twisted, shreddy-barked trunks",
    ],
    habitat: "Wide open basins and slopes: North Park, the Gunnison country and much of the Western Slope.",
    facts: [
      "Not a true sage (that's Salvia); it's in the sunflower family.",
      "Greater sage-grouse depend on it for food and cover.",
    ],
    similar: [
      { id: "rubber-rabbitbrush", tell: "Rabbitbrush has very narrow leaves, flexible green stems and yellow flowers in fall." },
    ],
  },
  {
    id: "rubber-rabbitbrush", common: "Rubber rabbitbrush", sci: "Ericameria nauseosa", inat: 57934, rank: "species",
    family: "Asteraceae", groups: ["broadleaf", "flower"], habit: "shrub", leaf: "narrow",
    zones: ["plains", "foothills", "montane"], elevFt: [4000, 9500],
    look: [{ what: "Yellow flowers", months: [8, 9, 10] }],
    traits: {
      arrangement: ["alternate"], leafType: ["simple"], shape: ["narrow"], margin: ["smooth"], habit: ["shrub"], feature: ["none"],
      color: ["yellow"], form: ["cluster"], zone: ["plains", "foothills", "montane"],
    },
    idMarks: [
      "Rounded shrub of flexible, felt-covered gray-green stems",
      "Very narrow, thread-like leaves",
      "Masses of small yellow flower heads in late summer and fall",
    ],
    habitat: "Roadsides, dry flats and disturbed ground from the plains into mountain parks.",
    facts: ["One of the last big blooms of the year, so it's busy with late-season pollinators."],
    similar: [
      { id: "big-sagebrush", tell: "Sagebrush leaves are wider, three-toothed and smell of sage." },
    ],
  },
  {
    id: "wax-currant", common: "Wax currant", sci: "Ribes cereum", inat: 78854, rank: "species",
    family: "Grossulariaceae", groups: ["broadleaf"], habit: "shrub", leaf: "palmate",
    zones: ["foothills", "montane", "subalpine"], elevFt: [5000, 11000],
    look: [{ what: "Pink tubular flowers", months: [4, 5, 6] }, { what: "Orange-red berries", months: [7, 8] }],
    traits: { arrangement: ["alternate"], leafType: ["simple"], shape: ["palmate", "rounded"], margin: ["lobed", "toothed"], habit: ["shrub"], feature: ["berries"] },
    idMarks: [
      "Small, rounded, fan-shaped leaves with shallow scalloped lobes",
      "Pale pink, tube-shaped flowers in spring",
      "Shiny orange-red berries in summer; no thorns",
    ],
    habitat: "Dry, rocky slopes and open woods from the foothills to the subalpine.",
    facts: ["Leaves are slightly sticky and have a faint spicy smell."],
    similar: [
      { id: "rm-maple", tell: "Maple leaves are larger, sharply toothed and in opposite pairs." },
      { id: "gambel-oak", tell: "Oak leaves are larger and deeply lobed." },
    ],
  },
  {
    id: "willows", common: "Willows", sci: "Salix", inat: 53453, rank: "genus",
    family: "Salicaceae", groups: ["broadleaf"], habit: "shrub", leaf: "lance",
    zones: ALL_ZONES, elevFt: [4000, 12000],
    look: [{ what: "Catkins", months: [4, 5, 6] }, { what: "Fall yellow", months: [9, 10] }],
    traits: { arrangement: ["alternate"], leafType: ["simple"], shape: ["lance", "narrow"], margin: ["toothed", "smooth"], habit: ["shrub", "tree"], feature: ["none"] },
    idMarks: [
      "Long, narrow leaves, alternate along flexible stems",
      "Each bud is covered by a single cap-like scale",
      "Fuzzy catkins (pussy willows) in spring",
    ],
    habitat: "Wet ground everywhere, from plains rivers to alpine bogs.",
    facts: [
      "Colorado has dozens of willow species. Telling them apart takes catkins and a hand lens, so this guide stops at the genus.",
      "Mountain willow thickets are prime moose habitat.",
    ],
    similar: [
      { id: "narrowleaf-cottonwood", tell: "Narrowleaf cottonwood is a single-trunked tree with several scales on each bud." },
    ],
  },
  {
    id: "woods-rose", common: "Woods' rose", sci: "Rosa woodsii", inat: 78887, rank: "species",
    family: "Rosaceae", groups: ["broadleaf", "flower"], habit: "shrub", leaf: "compound",
    zones: ["plains", "foothills", "montane"], elevFt: [4500, 9500],
    look: [{ what: "Pink flowers", months: [5, 6, 7] }, { what: "Red hips", months: [8, 9, 10, 11] }],
    traits: {
      arrangement: ["alternate"], leafType: ["many-leaflets"], shape: ["oval"], margin: ["toothed"], habit: ["shrub"], feature: ["thorns", "berries"],
      color: ["pink"], form: ["cup"], zone: ["plains", "foothills", "montane"],
    },
    idMarks: [
      "Compound leaves of five to nine toothed leaflets",
      "Five-petaled pink flowers with a yellow center",
      "Prickly stems and red hips that last into winter",
    ],
    habitat: "Stream banks, draws and forest edges.",
    facts: ["The hips are rich in vitamin C and feed birds through the winter."],
    similar: [
      { id: "sticky-geranium", tell: "Sticky geranium is a non-woody wildflower with deeply cut, hand-shaped leaves." },
    ],
  },

  /* ================= WILDFLOWERS ================= */
  {
    id: "blue-columbine", common: "Colorado blue columbine", sci: "Aquilegia coerulea", inat: 501742, rank: "species",
    family: "Ranunculaceae", groups: ["flower"], habit: "wildflower", leaf: "compound",
    zones: ["foothills", "montane", "subalpine", "alpine"], elevFt: [7000, 12500],
    look: [{ what: "Bloom", months: [6, 7, 8] }],
    traits: { color: ["blue", "white", "purple"], form: ["spurred"], zone: ["foothills", "montane", "subalpine", "alpine"] },
    idMarks: [
      "Large flowers with blue to lavender outer parts and a white cup",
      "Five long, straight spurs sweeping back from the flower",
      "Delicate leaves divided into rounded, lobed leaflets",
    ],
    habitat: "Aspen groves, montane meadows and rocky slopes up into the alpine.",
    facts: ["It is Colorado's state flower."],
    similar: [
      { id: "penstemon", tell: "Penstemon has many tube-shaped flowers on a spike and no spurs." },
    ],
  },
  {
    id: "paintbrush", common: "Indian paintbrushes", sci: "Castilleja", inat: 49340, rank: "genus",
    family: "Orobanchaceae", groups: ["flower"], habit: "wildflower", leaf: "lance",
    zones: ALL_ZONES, elevFt: [5000, 13000],
    look: [{ what: "Bloom", months: [5, 6, 7, 8, 9] }],
    traits: { color: ["red", "orange", "yellow", "pink"], form: ["spike"], zone: ALL_ZONES },
    idMarks: [
      "Brush-like spikes whose color comes mostly from leafy bracts, not the petals",
      "Colors from scarlet and orange to pink, rose and pale yellow",
      "Narrow, often hairy leaves",
    ],
    habitat: "Meadows, sagebrush and open slopes from the foothills to the tundra.",
    facts: [
      "Many paintbrushes tap into the roots of neighboring plants for part of their water and nutrients.",
      "Several species grow in Colorado and they hybridize, so this guide keeps to the genus.",
    ],
    similar: [
      { id: "elephants-head", tell: "Elephant's head spikes are pink-purple and each flower has a curled 'trunk'." },
    ],
  },
  {
    id: "heartleaf-arnica", common: "Heartleaf arnica", sci: "Arnica cordifolia", inat: 75569, rank: "species",
    family: "Asteraceae", groups: ["flower"], habit: "wildflower", leaf: "heart",
    zones: ["montane", "subalpine"], elevFt: [8000, 11000],
    look: [{ what: "Bloom", months: [5, 6, 7] }],
    traits: { color: ["yellow"], form: ["daisy"], zone: ["montane", "subalpine"] },
    idMarks: [
      "Bright yellow daisy-like flowers, usually one per stem",
      "Heart-shaped leaves in opposite pairs, the lowest on long stalks",
      "Carpets the floor of shady forests",
    ],
    habitat: "Lodgepole, spruce-fir and aspen forest floors.",
    facts: ["One of the few big yellow daisies that blooms in the shade."],
    similar: [
      { id: "blanketflower", tell: "Blanketflower petals are red at the base and it grows in sunny meadows." },
      { id: "alpine-sunflower", tell: "Alpine sunflower is a huge head on a short stem above treeline." },
    ],
  },
  {
    id: "fireweed", common: "Fireweed", sci: "Chamaenerion angustifolium", inat: 564969, rank: "species",
    family: "Onagraceae", groups: ["flower"], habit: "wildflower", leaf: "lance",
    zones: ["montane", "subalpine"], elevFt: [7000, 11500],
    look: [{ what: "Bloom", months: [7, 8, 9] }],
    traits: { color: ["pink", "purple"], form: ["spike"], zone: ["montane", "subalpine"] },
    idMarks: [
      "Tall spikes of four-petaled magenta flowers",
      "Blooms from the bottom of the spike upward",
      "Long, narrow, willow-like leaves",
    ],
    habitat: "Burns, avalanche paths, roadsides and forest clearings.",
    facts: ["Its fluffy seeds blow into fresh burns, so it is often the first color back after a fire."],
    similar: [
      { id: "elephants-head", tell: "Elephant's head flowers are small and trunk-shaped, in wet meadows." },
      { id: "penstemon", tell: "Penstemon flowers are blue-purple tubes." },
    ],
  },
  {
    id: "elephants-head", common: "Elephant's head", sci: "Pedicularis groenlandica", inat: 59780, rank: "species",
    family: "Orobanchaceae", groups: ["flower"], habit: "wildflower", leaf: "feathery",
    zones: ["montane", "subalpine", "alpine"], elevFt: [8500, 12500],
    look: [{ what: "Bloom", months: [6, 7, 8] }],
    traits: { color: ["pink", "purple"], form: ["spike"], zone: ["montane", "subalpine", "alpine"] },
    idMarks: [
      "Dense spikes of small pink-purple flowers",
      "Each flower looks like a tiny elephant's head: ears and an upturned trunk",
      "Fern-like, finely divided leaves",
    ],
    habitat: "Wet meadows, bogs and stream margins high in the mountains.",
    facts: ["Look closely: the 'trunk' is the curved upper lip of the flower."],
    similar: [
      { id: "fireweed", tell: "Fireweed is taller, with large four-petaled flowers, on dry disturbed ground." },
      { id: "paintbrush", tell: "Paintbrush color comes from bracts and lacks the trunk-shaped flowers." },
    ],
  },
  {
    id: "pasqueflower", common: "Pasqueflower", sci: "Pulsatilla nuttalliana", inat: 881504, rank: "species",
    family: "Ranunculaceae", groups: ["flower"], habit: "wildflower", leaf: "feathery",
    zones: ["plains", "foothills", "montane", "subalpine"], elevFt: [5500, 11000],
    look: [{ what: "Bloom", months: [3, 4, 5, 6] }, { what: "Feathery seed heads", months: [5, 6, 7] }],
    traits: { color: ["purple", "blue", "white"], form: ["cup"], zone: ["plains", "foothills", "montane", "subalpine"] },
    idMarks: [
      "Pale lavender cup-shaped flowers covered in silky hairs",
      "Blooms very early, often before its own leaves are full size",
      "Seed heads become shaggy silver plumes",
    ],
    habitat: "Open grassy slopes and ponderosa woodland, following the snowmelt upward.",
    facts: ["One of the first wildflowers of the year on the Front Range."],
    caution: "Like many buttercup relatives it is toxic if eaten.",
    similar: [
      { id: "sticky-geranium", tell: "Sticky geranium has five flat pink petals and blooms in summer." },
    ],
  },
  {
    id: "sticky-geranium", common: "Sticky geranium", sci: "Geranium viscosissimum", inat: 77264, rank: "species",
    family: "Geraniaceae", groups: ["flower"], habit: "wildflower", leaf: "palmate",
    zones: ["foothills", "montane"], elevFt: [6000, 9500],
    look: [{ what: "Bloom", months: [5, 6, 7, 8] }],
    traits: { color: ["pink", "purple"], form: ["cup"], zone: ["foothills", "montane"] },
    idMarks: [
      "Five broad pink to magenta petals with darker veins",
      "Deeply cut, hand-shaped leaves",
      "Glandular hairs make the stems and leaves sticky to the touch",
    ],
    habitat: "Meadows, aspen groves and open forest.",
    facts: ["The long, beak-like fruit gives the geranium family its nickname, cranesbill."],
    similar: [
      { id: "woods-rose", tell: "Wild rose is a prickly shrub with compound leaves." },
    ],
  },
  {
    id: "blanketflower", common: "Blanketflower", sci: "Gaillardia aristata", inat: 77183, rank: "species",
    family: "Asteraceae", groups: ["flower"], habit: "wildflower", leaf: "lance",
    zones: ["foothills", "montane"], elevFt: [5500, 9500],
    look: [{ what: "Bloom", months: [6, 7, 8, 9] }],
    traits: { color: ["yellow", "red", "orange"], form: ["daisy"], zone: ["foothills", "montane"] },
    idMarks: [
      "Daisy-like heads with yellow, three-toothed petals, often red toward the center",
      "A domed reddish-brown center",
      "Hairy, gray-green leaves",
    ],
    habitat: "Dry, sunny meadows and roadsides.",
    facts: ["Widely planted in gardens; the wild form is a native of the Rockies."],
    similar: [
      { id: "heartleaf-arnica", tell: "Arnica is plain yellow and grows in shady forest." },
    ],
  },
  {
    id: "penstemon", common: "Rocky Mountain penstemon", sci: "Penstemon strictus", inat: 166444, rank: "species",
    family: "Plantaginaceae", groups: ["flower"], habit: "wildflower", leaf: "lance",
    zones: ["foothills", "montane", "subalpine"], elevFt: [6500, 11000],
    look: [{ what: "Bloom", months: [6, 7, 8] }],
    traits: { color: ["blue", "purple"], form: ["tubular", "spike"], zone: ["foothills", "montane", "subalpine"] },
    idMarks: [
      "Spikes of deep blue to purple tube-shaped flowers, mostly along one side of the stem",
      "Smooth, narrow leaves in opposite pairs",
      "Often grows in showy clumps",
    ],
    habitat: "Sunny slopes, meadows and roadsides.",
    facts: ["Bumblebees push all the way into the tube to reach the nectar."],
    similar: [
      { id: "blue-columbine", tell: "Columbine has large single flowers with long spurs." },
    ],
  },
  {
    id: "alpine-sunflower", common: "Alpine sunflower", sci: "Hymenoxys grandiflora", inat: 336871, rank: "species",
    family: "Asteraceae", groups: ["flower"], habit: "wildflower", leaf: "feathery",
    zones: ["alpine"], elevFt: [11000, 14000],
    look: [{ what: "Bloom", months: [6, 7, 8] }],
    traits: { color: ["yellow"], form: ["daisy"], zone: ["alpine"] },
    idMarks: [
      "Huge yellow flower heads, up to about four inches, on stems only a few inches tall",
      "Woolly, finely divided leaves",
      "Grows on open tundra",
    ],
    habitat: "Alpine tundra above treeline.",
    facts: ["Also called old-man-of-the-mountain for its woolly white hairs."],
    similar: [
      { id: "heartleaf-arnica", tell: "Arnica is smaller and grows in forest below treeline." },
    ],
  },
  {
    id: "moss-campion", common: "Moss campion", sci: "Silene acaulis", inat: 68886, rank: "species",
    family: "Caryophyllaceae", groups: ["flower"], habit: "wildflower", leaf: "narrow",
    zones: ["alpine"], elevFt: [11000, 14000],
    look: [{ what: "Bloom", months: [6, 7, 8] }],
    traits: { color: ["pink"], form: ["cushion"], zone: ["alpine"] },
    idMarks: [
      "A tight green cushion that looks like moss",
      "Covered in small pink five-petaled flowers in early summer",
      "Hugs the ground on windy tundra",
    ],
    habitat: "Exposed alpine ridges and fellfields.",
    facts: ["Cushions grow very slowly; a big one may be decades old. Step around them."],
    similar: [
      { id: "alpine-forget-me-not", tell: "Forget-me-not cushions carry blue flowers." },
    ],
  },
  {
    id: "alpine-forget-me-not", common: "Alpine forget-me-not", sci: "Eritrichium argenteum", inat: 769772, rank: "species",
    family: "Boraginaceae", groups: ["flower"], habit: "wildflower", leaf: "oval",
    zones: ["alpine"], elevFt: [11000, 14000],
    look: [{ what: "Bloom", months: [6, 7, 8] }],
    traits: { color: ["blue"], form: ["cushion"], zone: ["alpine"] },
    idMarks: [
      "Low silvery-hairy cushions",
      "Tiny sky-blue flowers with a yellow eye",
      "On the windiest, rockiest tundra",
    ],
    habitat: "Rocky alpine ridges and fellfields.",
    facts: ["The silver hairs on the leaves help it hold warmth and moisture in a harsh place."],
    similar: [
      { id: "moss-campion", tell: "Moss campion cushions are green with pink flowers." },
    ],
  },
  {
    id: "yarrow", common: "Common yarrow", sci: "Achillea millefolium", inat: 1105043, rank: "complex",
    family: "Asteraceae", groups: ["flower"], habit: "wildflower", leaf: "feathery",
    zones: ALL_ZONES, elevFt: [4000, 13000],
    look: [{ what: "Bloom", months: [5, 6, 7, 8, 9] }],
    traits: { color: ["white", "pink"], form: ["cluster"], zone: ALL_ZONES },
    idMarks: [
      "Flat-topped clusters of many tiny white (sometimes pinkish) flower heads",
      "Soft, feathery leaves cut into many fine segments",
      "A strong, spicy smell when crushed",
    ],
    habitat: "Meadows, trail edges and disturbed ground at almost every elevation.",
    facts: ["iNaturalist treats yarrow as a species complex because the forms are hard to separate."],
    similar: [],
  },
  {
    id: "prickly-pear", common: "Plains prickly pear", sci: "Opuntia polyacantha", inat: 78269, rank: "species",
    family: "Cactaceae", groups: ["flower"], habit: "cactus", leaf: "oval",
    zones: ["plains", "foothills"], elevFt: [3500, 7500],
    look: [{ what: "Bloom", months: [5, 6] }],
    traits: { color: ["yellow", "pink"], form: ["cup"], zone: ["plains", "foothills"] },
    idMarks: [
      "Flat, jointed, spiny pads",
      "Large, waxy yellow cup-shaped flowers (sometimes pink or red)",
      "Low clumps in dry grassland",
    ],
    habitat: "Shortgrass prairie and dry, rocky foothill slopes.",
    facts: ["Besides the big spines, the pads carry tiny barbed bristles that are hard to remove from skin."],
    caution: "Watch your hands and dog paws: the fine bristles detach easily.",
    similar: [],
  },
  {
    id: "wallflower", common: "Western wallflower", sci: "Erysimum capitatum", inat: 50628, rank: "species",
    family: "Brassicaceae", groups: ["flower"], habit: "wildflower", leaf: "lance",
    zones: ALL_ZONES, elevFt: [4500, 13000],
    look: [{ what: "Bloom", months: [4, 5, 6, 7, 8] }],
    traits: { color: ["yellow", "orange"], form: ["cluster"], zone: ALL_ZONES },
    idMarks: [
      "Rounded clusters of four-petaled yellow to orange flowers at the stem top",
      "Long, slender seed pods below the flowers",
      "Narrow leaves",
    ],
    habitat: "Open slopes and rocky ground from the foothills to the tundra.",
    facts: ["Four petals in a cross mark it as a member of the mustard family."],
    similar: [
      { id: "blanketflower", tell: "Blanketflower is a daisy-like head, not a cluster of four-petaled flowers." },
    ],
  },
];

export const SPECIES_BY_ID = new Map(SPECIES.map((s) => [s.id, s]));
export const speciesById = (id: string | null | undefined) => (id ? SPECIES_BY_ID.get(id) : undefined);

export const GROUP_LABEL: Record<Group, string> = {
  conifer: "Conifers",
  broadleaf: "Trees & shrubs",
  flower: "Wildflowers",
};

export const ZONE_LABEL: Record<Zone, string> = {
  plains: "Plains",
  foothills: "Foothills",
  montane: "Montane",
  subalpine: "Subalpine",
  alpine: "Alpine",
};

export const LEAF_LABEL: Record<LeafShape, string> = {
  needle: "Needles", scale: "Scales", rounded: "Rounded", oval: "Oval", lance: "Lance",
  triangular: "Triangular", lobed: "Lobed", palmate: "Hand-shaped", compound: "Compound",
  wedge: "Wedge", narrow: "Narrow", heart: "Heart", feathery: "Feathery",
};
