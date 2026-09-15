// Fall colour spots and weekend trips.
//
// These two are hardcoded ON PURPOSE. Neither exists as a Supabase category,
// so unlike every other tile on the home page their counts cannot be live and
// their rows cannot be filtered, mapped or shared. RAG chose to keep them as
// lists for now rather than build the categories.
//
// Lifted verbatim from the ITEMS block in public/fall.html, including the reel
// links, so the home page and the fall page agree. IF YOU EDIT ONE, EDIT THE
// OTHER. That duplication is the price of not having the categories, and it is
// the first thing that goes when they exist.
//
// A place with no `reel` renders as a plain row with no play button. That is
// deliberate: nothing looks broken for the ones not filmed yet.

export const FALL_COLOUR = {
  title: 'Fall colour spots',
  when: 'Nov',
  note: 'Tree-lined streets, parks and gardens where the colour actually turns.',
  places: [
    { name: 'Palo Alto', meta: 'Bowdoin St, Martin Ave and Pitman Ave', reel: 'https://www.instagram.com/p/DRkMPGUkSNJ/' },
    { name: 'Downtown Los Altos', meta: '', reel: 'https://www.instagram.com/p/DPWcQBPETzU/' },
    { name: 'Mountain View', meta: 'Sylvan Park and Gretel Lane', reel: 'https://www.instagram.com/p/DRkMPGUkSNJ/' },
    { name: 'Niles Community Park', meta: 'Fremont', reel: 'https://www.instagram.com/p/DRSIq-NkQb_/' },
    { name: 'Livermore', meta: '', reel: 'https://www.instagram.com/p/DQzPLDbEZTw/' },
    { name: 'Annabel Trail', meta: 'San Ramon', reel: 'https://www.instagram.com/p/DRUs7DlEfzX/' },
    { name: 'Filoli Gardens', meta: 'Woodside', reel: '' },
    { name: 'Napa', meta: '', reel: 'https://www.instagram.com/p/DQmWCMnEVk2/' },
  ],
}

export const WEEKEND_TRIPS = {
  title: 'Fall weekend trips',
  when: 'Oct',
  note: 'Worth packing a bag for. The Sierra turns earlier than the Bay Area does.',
  places: [
    { name: 'Yosemite in Fall', meta: '', reel: 'https://www.instagram.com/p/DQrhNmXCRHc/' },
    { name: 'Mammoth in Fall', meta: '', reel: 'https://www.instagram.com/p/DczjXz4P7Rr/' },
    { name: 'Lake Tahoe in Fall', meta: '', reel: '' },
  ],
}
