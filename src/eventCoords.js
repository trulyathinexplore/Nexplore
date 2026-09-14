// Map coordinates for events whose Supabase row has no linked venue.
//
// Why this file exists: `venues` already carries latitude/longitude, but none
// of the pumpkin patch rows are linked to a venue, so there was nothing to put
// on a map. Rather than block the map on a data migration, mapEvent() reads a
// venue's coordinates when one exists and falls back to this table when it
// doesn't. Link a row to a proper venue and its entry here stops being used —
// the venue always wins. When every row has a venue, delete this file and the
// two references to it in supabase.js.
//
// `address` is used for the Directions button as well as the pin, which is why
// it's a full street address and not just a label.
//
// Addresses collected 2026-09-14 from each patch's own website, or from the
// venue's parks-and-rec page for the pool events. Coordinates geocoded from
// those addresses via OpenStreetMap Nominatim.
//
// Two entries are marked APPROX below: the geocoder could not resolve the
// street number and the point is the nearest matched feature, within roughly a
// mile. Worth eyeballing on the live map and nudging.

export const EVENT_COORDS = {
  // ---- South Bay ----
  // Exact: the OSM address point for 225 Laguna Avenue. Nominatim will not
  // return it (it has no search index entry), so it was read straight off
  // Overpass. Note OSM tags this point's city as San Jose while the farm
  // publishes Morgan Hill — the postal city is what customers are given, so the
  // address string below stays Morgan Hill. A second OSM feature named "Spina
  // Farms" sits ~0.9 km north at 800 Laguna Ave; that is not the published
  // address, so it is not used here.
  2269: { lat: 37.194403, lng: -121.729975, address: '225 Laguna Ave, Morgan Hill, CA 95037' },
  2270: { lat: 37.148668, lng: -121.974552, address: '22217 Old Santa Cruz Hwy, Los Gatos, CA 95033' },
  2271: { lat: 37.281554, lng: -122.002733, address: '12985 Saratoga Ave, Saratoga, CA 95070' },
  2273: { lat: 37.261763, lng: -121.918751, address: '1832 Hillsdale Ave, San Jose, CA 95124' },
  2300: { lat: 37.323606, lng: -122.042900, address: '21111 Stevens Creek Blvd, Cupertino, CA 95014' },

  // ---- Coast / Half Moon Bay ----
  2274: { lat: 37.493733, lng: -122.453551, address: '850 N Cabrillo Hwy, Half Moon Bay, CA 94019' },
  2276: { lat: 37.382819, lng: -122.401886, address: '185 Verde Rd, Half Moon Bay, CA 94019' },
  2277: { lat: 37.480096, lng: -122.406644, address: '12391 San Mateo Rd, Half Moon Bay, CA 94019' },
  2278: { lat: 37.464722, lng: -122.439697, address: '329 Kelly Ave, Half Moon Bay, CA 94019' },
  9999: { lat: 37.480259, lng: -122.407509, address: '12320 San Mateo Rd, Half Moon Bay, CA 94019' },

  // ---- Peninsula / San Francisco ----
  2279: { lat: 37.374097, lng: -122.204496, address: '2718 Alpine Rd, Portola Valley, CA 94028' },
  2280: { lat: 37.555651, lng: -122.293215, address: '1863 S Norfolk St, San Mateo, CA 94403' },
  2281: { lat: 37.758107, lng: -122.463648, address: '1620 7th Ave, San Francisco, CA 94122' },

  // ---- East Bay ----
  2282: { lat: 37.779990, lng: -122.309295, address: '2171 Monarch St, Alameda, CA 94501' },
  2283: { lat: 38.008063, lng: -121.856443, address: '4650 Delta Fair Blvd, Antioch, CA 94509' },
  2284: { lat: 37.974023, lng: -122.033744, address: '1765 Galindo St, Concord, CA 94520' },
  2285: { lat: 37.920679, lng: -121.696292, address: '550 Walnut Blvd, Brentwood, CA 94513' },
  2286: { lat: 37.959633, lng: -121.677568, address: '4350 Sellers Ave, Brentwood, CA 94513' },
  2287: { lat: 37.698548, lng: -121.799205, address: '487 E Airway Blvd, Livermore, CA 94551' },
  2288: { lat: 37.696838, lng: -121.844320, address: '2180 Cayetano Ct, Livermore, CA 94551' }, // APPROX
  2289: { lat: 37.693854, lng: -121.746303, address: '4351 Mines Rd, Livermore, CA 94550' },
  2290: { lat: 37.553365, lng: -122.054641, address: '34600 Ardenwood Blvd, Fremont, CA 94555' },
  2291: { lat: 37.547121, lng: -121.988103, address: '4020 Fremont Hub, Fremont, CA 94538' },

  // ---- North Bay ----
  2293: { lat: 38.272514, lng: -122.673814, address: '450 Stony Point Rd, Petaluma, CA 94952' },
  2295: { lat: 38.255729, lng: -122.584807, address: '3795 Adobe Rd, Petaluma, CA 94954' }, // APPROX
  2296: { lat: 38.426043, lng: -122.741257, address: '5157 Stony Point Rd, Santa Rosa, CA 95407' },
  2297: { lat: 38.380761, lng: -122.763552, address: '3800 Walker Ave, Santa Rosa, CA 95407' },
  2298: { lat: 38.115804, lng: -122.653518, address: '3666 Novato Blvd, Novato, CA 94947' },
  2299: { lat: 38.181359, lng: -122.255306, address: '4225 Broadway, American Canyon, CA 94503' },

  // ---- Floating pumpkin patches (municipal pools) ----
  2304: { lat: 37.963232, lng: -122.012771, address: '3501 Cowell Rd, Concord, CA 94518' },
  2305: { lat: 37.914922, lng: -122.302876, address: '7007 Moeser Ln, El Cerrito, CA 94530' },
  2306: { lat: 37.985366, lng: -122.277373, address: '2450 Simas Ave, Pinole, CA 94564' },
  2307: { lat: 37.948326, lng: -122.065622, address: '147 Gregory Ln, Pleasant Hill, CA 94523' },
  2308: { lat: 37.868663, lng: -122.288951, address: '2100 Browning St, Berkeley, CA 94702' },
  2309: { lat: 37.924146, lng: -122.384354, address: '1 E Richmond Ave, Richmond, CA 94801' },
  2310: { lat: 37.665851, lng: -122.077495, address: '24176 Mission Blvd, Hayward, CA 94544' },
  2311: { lat: 37.517563, lng: -122.010516, address: '6800 Mowry Ave, Newark, CA 94560' },
}
