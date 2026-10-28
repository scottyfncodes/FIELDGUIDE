/* Dark-sky sites ported from LOOKUP (src/data/sites.ts), sources and checked dates intact. */
import type { Measure, Place, Source } from '../lib/astro/types';

/**
 * Dark-sky sites within reach of the Colorado Front Range.
 *
 * Coordinates are a representative point (a visitor centre, a town centre, a
 * trailhead), not a prescription for where to stand. `bortle` is a range and it
 * is an ESTIMATE: DarkSky International certifies places on measured sky
 * quality and lighting policy, but does not publish a Bortle class, and no
 * light-pollution map was read for this build. Where nothing defensible is
 * known the value is null and renders UNKNOWN. Every record carries its sources
 * and the date they were checked.
 */

export type Designation = 'Dark Sky Park' | 'Dark Sky Community' | 'Dark Sky Sanctuary' | 'Dark Sky Reserve' | 'none';

export interface Site extends Place {
  id: string;
  region: string;
  designation: Designation;
  /** Year certified by DarkSky International, when known. */
  certifiedYear: number | null;
  /** Bortle class estimate, 1 (pristine) – 9 (inner city). Range = honest uncertainty. */
  bortle: Measure;
  /** Practical notes: access, fees, hours, terrain. Never a safety claim. */
  notes: string[];
  sources: Source[];
  /** True when the record is a user-added site. */
  custom?: boolean;
}

const DARKSKY: Source = {
  label: 'DarkSky International, certified places list',
  url: 'https://darksky.org/what-we-do/international-dark-sky-places/all-places/',
  confidence: 'official',
  checked: '2026-09-26',
};

const ESTIMATE: Source = {
  label: 'LOOKUP estimate from designation class and surroundings; not a measured value',
  confidence: 'estimate',
};

const POPULAR: Source = {
  label: 'Widely used Front Range stargazing spot; no certification',
  confidence: 'estimate',
};

const park = (over: Partial<Site> & Pick<Site, 'id' | 'name' | 'lat' | 'lon' | 'region'>): Site => ({
  designation: 'Dark Sky Park',
  certifiedYear: null,
  bortle: { min: 1, max: 3 },
  notes: [],
  sources: [DARKSKY, ESTIMATE],
  timezone: 'America/Denver',
  ...over,
});

const community = (over: Partial<Site> & Pick<Site, 'id' | 'name' | 'lat' | 'lon' | 'region'>): Site => ({
  designation: 'Dark Sky Community',
  certifiedYear: null,
  bortle: { min: 2, max: 4 },
  notes: [],
  sources: [DARKSKY, ESTIMATE],
  timezone: 'America/Denver',
  ...over,
});

const popular = (over: Partial<Site> & Pick<Site, 'id' | 'name' | 'lat' | 'lon' | 'region'>): Site => ({
  designation: 'none',
  certifiedYear: null,
  bortle: null,
  notes: [],
  sources: [POPULAR],
  timezone: 'America/Denver',
  ...over,
});

export const SITES: Site[] = [
  // ---- Front Range, short drives ----
  popular({ id: 'pawnee', name: 'Pawnee Buttes', region: 'Pawnee National Grassland', lat: 40.8161, lon: -103.9868, elevationM: 1600,
    bortle: { min: 2, max: 4 }, sources: [POPULAR, ESTIMATE],
    notes: ['Open prairie: the widest horizon on the Front Range.', 'Gravel roads; slick after rain.', 'Seasonal raptor nesting closures on the buttes themselves (spring).'] }),
  park({ id: 'jackson-lake', name: 'Jackson Lake State Park', region: 'Morgan County', lat: 40.3776, lon: -104.0946, elevationM: 1340, certifiedYear: 2020,
    notes: ['Colorado state park pass or daily fee.', 'Reservable campsites; a night here beats a 2 AM drive home.'] }),
  popular({ id: 'brainard', name: 'Brainard Lake', region: 'Indian Peaks', lat: 40.0800, lon: -105.5760, elevationM: 3140,
    bortle: { min: 3, max: 4 }, sources: [POPULAR, ESTIMATE],
    notes: ['Timed-entry permits in summer; gate closes for the season around mid-October.', 'Continental Divide blocks the western horizon; the Front Range glow sits to the east.'] }),
  popular({ id: 'guanella', name: 'Guanella Pass', region: 'Georgetown', lat: 39.5967, lon: -105.7108, elevationM: 3560,
    bortle: { min: 3, max: 4 }, sources: [POPULAR, ESTIMATE],
    notes: ['Road closes for winter (typically late November to late May).', 'High, cold and exposed; wind is the usual spoiler.'] }),
  popular({ id: 'kenosha', name: 'Kenosha Pass', region: 'US-285', lat: 39.4128, lon: -105.7583, elevationM: 3050,
    bortle: { min: 3, max: 4 }, sources: [POPULAR, ESTIMATE],
    notes: ['Paved all the way; open year-round.', 'South Park opens up the southern sky where the Milky Way core lives.'] }),
  park({ id: 'florissant', name: 'Florissant Fossil Beds', region: 'Teller County', lat: 38.9135, lon: -105.2854, elevationM: 2560, certifiedYear: 2021,
    notes: ['National Monument; check night-sky programme dates, the grounds are normally closed after hours.'] }),
  park({ id: 'browns-canyon', name: 'Browns Canyon', region: 'Arkansas Valley', lat: 38.7400, lon: -106.0800, elevationM: 2300, certifiedYear: 2023,
    notes: ['National Monument between Buena Vista and Salida.', 'Ruby Mountain and Hecla Junction are the usual access points.'] }),
  // ---- Southern Colorado ----
  community({ id: 'westcliffe', name: 'Westcliffe & Silver Cliff', region: 'Wet Mountain Valley', lat: 38.1347, lon: -105.4658, elevationM: 2400, certifiedYear: 2015,
    notes: ['The first certified Dark Sky Community in Colorado.', 'Smokey Jack Observatory holds public star parties.'] }),
  park({ id: 'great-sand-dunes', name: 'Great Sand Dunes', region: 'San Luis Valley', lat: 37.7325, lon: -105.5120, elevationM: 2500, certifiedYear: 2019,
    notes: ['National Park entrance fee; open 24 hours.', 'Walk out onto the dunes: no horizon, no lights, sand still warm after a hot day.'] }),
  community({ id: 'crestone', name: 'Crestone', region: 'San Luis Valley', lat: 37.9958, lon: -105.6989, elevationM: 2400, certifiedYear: 2021 }),
  park({ id: 'chimney-rock', name: 'Chimney Rock', region: 'Pagosa Springs', lat: 37.1920, lon: -107.3080, elevationM: 2000, certifiedYear: 2023,
    notes: ['National Monument; access is by programme outside daytime hours.'] }),
  // ---- Western slope ----
  park({ id: 'black-canyon', name: 'Black Canyon of the Gunnison', region: 'Montrose', lat: 38.5554, lon: -107.6874, elevationM: 2500, certifiedYear: 2015,
    notes: ['South Rim road is open to Gunnison Point in winter, further in summer.', 'Astronomy Festival most Septembers.'] }),
  park({ id: 'curecanti', name: 'Curecanti', region: 'Blue Mesa Reservoir', lat: 38.4553, lon: -107.3283, elevationM: 2300, certifiedYear: 2022,
    notes: ['National Recreation Area along US-50; Elk Creek is the main hub.'] }),
  community({ id: 'ridgway', name: 'Ridgway', region: 'Uncompahgre Valley', lat: 38.1525, lon: -107.7617, elevationM: 2130, certifiedYear: 2020 }),
  park({ id: 'top-of-the-pines', name: 'Top of the Pines', region: 'Ridgway', lat: 38.1090, lon: -107.7900, elevationM: 2500, certifiedYear: 2020,
    notes: ['County recreation area above Ridgway; camping by reservation.'] }),
  community({ id: 'norwood', name: 'Norwood', region: 'Wright’s Mesa', lat: 38.1314, lon: -108.2921, elevationM: 2130, certifiedYear: 2019 }),
  community({ id: 'nucla-naturita', name: 'Nucla & Naturita', region: 'West End', lat: 38.2178, lon: -108.5679, elevationM: 1650, certifiedYear: 2021 }),
  park({ id: 'slumgullion', name: 'Slumgullion Center', region: 'Lake City', lat: 37.9899, lon: -107.1994, elevationM: 3400, certifiedYear: 2021,
    notes: ['At Slumgullion Pass on CO-149; one of the highest certified sites anywhere.', 'Very cold after dark at any time of year.'] }),
  // ---- Far corners ----
  park({ id: 'mesa-verde', name: 'Mesa Verde', region: 'Four Corners', lat: 37.2309, lon: -108.4618, elevationM: 2400, certifiedYear: 2021,
    notes: ['National Park entrance fee; Morefield campground is the practical base.'] }),
  park({ id: 'hovenweep', name: 'Hovenweep', region: 'Four Corners', lat: 37.3856, lon: -109.0730, elevationM: 1580, certifiedYear: 2014,
    notes: ['National Monument straddling the Utah line; small first-come campground.'] }),
  park({ id: 'dinosaur', name: 'Dinosaur National Monument', region: 'Northwest Colorado', lat: 40.2436, lon: -108.9710, elevationM: 1800, certifiedYear: 2019,
    notes: ['Colorado side (Canyon Visitor Center, Harpers Corner Road) has no fossils and almost no people.'] }),
];

export function findSite(id: string, extra: Site[] = []): Site | undefined {
  return SITES.find((s) => s.id === id) ?? extra.find((s) => s.id === id);
}
