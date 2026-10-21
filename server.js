const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'wedding-data.json');

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_TEMPLATES = {
  traditional: {
    id: 'traditional',
    name: 'Classic & Traditional',
    description: 'Full ceremony, cocktail hour, seated dinner reception, and full vendor suite.',
    enabledModules: ['venue', 'catering', 'photography', 'attire', 'music', 'florals', 'officiant', 'cake', 'stationery', 'transportation']
  },
  intimate: {
    id: 'intimate',
    name: 'Micro-Wedding / Intimate',
    description: 'Focused guest list (< 50), curated dining, and essential vendors only.',
    enabledModules: ['venue', 'catering', 'photography', 'attire', 'florals', 'officiant']
  },
  elopement: {
    id: 'elopement',
    name: 'Adventure Elopement',
    description: 'Just the two of you (or a handful of witnesses) in an unforgettable location.',
    enabledModules: ['venue', 'photography', 'attire', 'officiant', 'travel']
  },
  destination: {
    id: 'destination',
    name: 'Destination Weekend',
    description: 'Multi-day celebration away from home with travel logistics and welcome events.',
    enabledModules: ['venue', 'catering', 'photography', 'attire', 'music', 'florals', 'officiant', 'stationery', 'transportation', 'travel']
  },
  diy: {
    id: 'diy',
    name: 'Backyard / DIY Celebration',
    description: 'Relaxed, personalized celebration with custom food, playlists, and decor.',
    enabledModules: ['venue', 'catering', 'attire', 'florals', 'officiant', 'cake']
  }
};

function createDefaultState() {
  return {
    meta: {
      coupleNames: 'Alex & Jordan',
      weddingDate: '2027-06-19',
      weddingType: 'traditional',
      locationCity: 'Savannah, GA',
      estimatedBudget: 38000,
      targetGuestCount: 120,
      hideDisabledModules: false,
      lastUpdated: new Date().toISOString()
    },
    templates: DEFAULT_TEMPLATES,
    modules: [
      {
        id: 'venue',
        name: 'Venue & Ceremony Site',
        icon: '🏛️',
        category: 'Foundation',
        enabled: true,
        budgetAllocated: 12000,
        actualCost: 11500,
        depositPaid: true,
        contractSigned: true,
        fields: [
          { key: 'venueName', label: 'Venue Name', type: 'text', value: 'The Conservatory at Magnolia Hall', placeholder: 'e.g., Grand Botanical Gardens' },
          { key: 'contactPerson', label: 'Coordinator / Contact', type: 'text', value: 'Claire Vance', placeholder: 'Name & Role' },
          { key: 'phoneEmail', label: 'Phone / Email', type: 'text', value: 'claire@magnoliahall.example.com | (555) 234-8910', placeholder: 'Contact details' },
          { key: 'address', label: 'Full Address', type: 'text', value: '412 Forsyth Park Ln, Savannah, GA', placeholder: 'Street, City, State' },
          { key: 'capacity', label: 'Max Guest Capacity', type: 'number', value: 160, placeholder: '150' },
          { key: 'loadInTime', label: 'Load-In / Access Time', type: 'text', value: '10:00 AM', placeholder: 'e.g., 9:00 AM' },
          { key: 'curfewTime', label: 'Music Curfew / Load-Out', type: 'text', value: '11:00 PM (Out by Midnight)', placeholder: 'e.g., 11:00 PM' },
          { key: 'rainPlan', label: 'Weather Backup Plan', type: 'textarea', value: 'Glass atrium pavilion reserved automatically if rain chance > 40% by 8am.', placeholder: 'Describe indoor or tented backup plan' },
          { key: 'notes', label: 'Inclusions & Restrictions', type: 'textarea', value: 'Includes 150 Chiavari chairs, 18 round tables, bridal suite. No loose glitter or uncontained open flames.', placeholder: 'Tables, chairs, sparkler rules, insurance requirements...' }
        ],
        checklist: [
          { id: 'v-1', title: 'Research & shortlist top 5 venues', timeline: '12+ Months Out', completed: true, skipped: false, notes: 'Compared Magnolia Hall, Riverfront Loft, and Oak Estate.' },
          { id: 'v-2', title: 'Schedule in-person or virtual site tours', timeline: '12+ Months Out', completed: true, skipped: false, notes: 'Toured on Saturday afternoon to check natural lighting.' },
          { id: 'v-3', title: 'Review contract, cancellation policy & sign', timeline: '9–12 Months Out', completed: true, skipped: false, notes: 'Signed and paid 50% retainer.' },
          { id: 'v-4', title: 'Obtain event liability & cancellation insurance', timeline: '3–6 Months Out', completed: false, skipped: false, notes: 'Venue requires $1M general liability naming them as additional insured.' },
          { id: 'v-5', title: 'Finalize floor plan & seating layout diagram', timeline: '1 Month Out', completed: false, skipped: false, notes: 'Need final RSVP count first.' },
          { id: 'v-6', title: 'Conduct final walkthrough with coordinator', timeline: '2 Weeks Out', completed: false, skipped: false, notes: '' }
        ]
      },
      {
        id: 'catering',
        name: 'Catering & Bar Service',
        icon: '🍽️',
        category: 'Food & Drink',
        enabled: true,
        budgetAllocated: 9500,
        actualCost: 9200,
        depositPaid: true,
        contractSigned: true,
        fields: [
          { key: 'companyName', label: 'Caterer Name', type: 'text', value: 'Lowcountry Table & Provisions', placeholder: 'Company name' },
          { key: 'contactPerson', label: 'Catering Manager', type: 'text', value: 'Marcus Sterling (marcus@lowcountrytable.example.com)', placeholder: 'Name & Email' },
          { key: 'serviceStyle', label: 'Service Style', type: 'select', options: ['Plated Dinner', 'Buffet', 'Family Style', 'Cocktail Stations', 'Food Trucks'], value: 'Family Style' },
          { key: 'barPackage', label: 'Bar Package', type: 'select', options: ['Full Open Bar', 'Beer, Wine & Signature Cocktails', 'Consumption / Tab Bar', 'BYOB + Bartenders', 'Dry / Mocktail Bar'], value: 'Beer, Wine & Signature Cocktails' },
          { key: 'tastingDate', label: 'Menu Tasting Date', type: 'date', value: '2027-01-24', placeholder: '' },
          { key: 'headcountDeadline', label: 'Final Headcount Deadline', type: 'date', value: '2027-06-05', placeholder: '' },
          { key: 'signatureDrinks', label: 'Signature Cocktails / Mocktails', type: 'text', value: '1. Peach Bourbon Smash  2. Lavender Gin Fizz  3. Hibiscus Spritz (NA)', placeholder: 'List custom drinks' },
          { key: 'dietaryNotes', label: 'Allergies & Vendor Meals', type: 'textarea', value: 'Need 6 vendor hot meals (2 photo, 1 DJ, 2 coordinator, 1 officiant). Gluten-free and vegan options labeled.', placeholder: 'Dietary accommodations, vendor meal count...' }
        ],
        checklist: [
          { id: 'c-1', title: 'Collect catering proposals & sample menus', timeline: '9–12 Months Out', completed: true, skipped: false, notes: '' },
          { id: 'c-2', title: 'Attend menu & wine tasting session', timeline: '6–9 Months Out', completed: true, skipped: false, notes: 'Loved the braised short rib and herb gnocchi.' },
          { id: 'c-3', title: 'Select table linens, napkins & place settings', timeline: '3–6 Months Out', completed: false, skipped: false, notes: 'Deciding between sage linen or oatmeal.' },
          { id: 'c-4', title: 'Finalize bar menu & alcohol order quantities', timeline: '1–2 Months Out', completed: false, skipped: false, notes: '' },
          { id: 'c-5', title: 'Submit final guest count & dietary breakdown', timeline: '2 Weeks Out', completed: false, skipped: false, notes: 'Must include table-by-table allergy chart.' }
        ]
      },
      {
        id: 'photography',
        name: 'Photography & Videography',
        icon: '📸',
        category: 'Media',
        enabled: true,
        budgetAllocated: 5200,
        actualCost: 4800,
        depositPaid: true,
        contractSigned: true,
        fields: [
          { key: 'studioName', label: 'Photographer / Studio', type: 'text', value: 'Golden Hour Collective (Elena Rostova)', placeholder: 'Studio or lead photographer' },
          { key: 'contactInfo', label: 'Email & Phone', type: 'text', value: 'elena@goldenhour.example.com | (555) 876-5432', placeholder: 'Contact details' },
          { key: 'packageHours', label: 'Coverage Hours & Shooters', type: 'text', value: '9 Hours, 2 Photographers + Drone Add-on', placeholder: 'e.g., 8 hours, 2 shooters' },
          { key: 'engagementDate', label: 'Engagement Session Date', type: 'date', value: '2026-11-14', placeholder: '' },
          { key: 'turnaroundTime', label: 'Gallery Delivery Timeline', type: 'text', value: 'Sneak peeks in 48 hrs; full gallery in 6 weeks', placeholder: 'e.g., 6-8 weeks' },
          { key: 'shotList', label: 'Must-Have Family & Key Shots', type: 'textarea', value: '- First look under live oaks\n- Both grandmothers together\n- Golden hour rooftop portraits at 7:45 PM\n- Candid reception dance floor', placeholder: 'List family groupings and priority moments...' }
        ],
        checklist: [
          { id: 'p-1', title: 'Interview photographers & inspect full wedding galleries', timeline: '9–12 Months Out', completed: true, skipped: false, notes: '' },
          { id: 'p-2', title: 'Book photographer & pay retainer', timeline: '9–12 Months Out', completed: true, skipped: false, notes: '' },
          { id: 'p-3', title: 'Shoot engagement photos for Save-the-Dates', timeline: '6–9 Months Out', completed: false, skipped: false, notes: 'Scheduled for Nov 14.' },
          { id: 'p-4', title: 'Build family portrait grouping list & designate wrangler', timeline: '1 Month Out', completed: false, skipped: false, notes: 'Ask cousin Sam to help call names.' },
          { id: 'p-5', title: 'Lock in photo timeline with hair/makeup completion time', timeline: '2 Weeks Out', completed: false, skipped: false, notes: '' }
        ]
      },
      {
        id: 'music',
        name: 'Music, DJ & Entertainment',
        icon: '🎵',
        category: 'Atmosphere',
        enabled: true,
        budgetAllocated: 2400,
        actualCost: 2200,
        depositPaid: true,
        contractSigned: true,
        fields: [
          { key: 'performerName', label: 'DJ / Band Name', type: 'text', value: 'Soundwave Vinyl & Events (DJ Mateo)', placeholder: 'Performer or company' },
          { key: 'contactInfo', label: 'Contact Info', type: 'text', value: 'mateo@soundwave.example.com', placeholder: 'Phone / Email' },
          { key: 'ceremonyAudio', label: 'Ceremony Mic & Audio Setup', type: 'text', value: 'Wireless lapel mic for officiant + acoustic duo setup', placeholder: 'Lapel mics, ceremony speakers...' },
          { key: 'processionalSong', label: 'Processional & Bride/Partner Entrance Song', type: 'text', value: 'Strings cover of "La Vie En Rose"', placeholder: 'Song title & artist' },
          { key: 'firstDanceSong', label: 'First Dance Song', type: 'text', value: '"Beyond" by Leon Bridges', placeholder: 'Song title & artist' },
          { key: 'mustPlayList', label: 'Must-Play & Do-Not-Play Notes', type: 'textarea', value: 'MUST PLAY: Earth Wind & Fire, ABBA, Dua Lipa, 2000s Throwbacks.\nDO NOT PLAY: Chicken Dance, Cha-Cha Slide,YMCA.', placeholder: 'Vibe notes and banned songs...' }
        ],
        checklist: [
          { id: 'm-1', title: 'Decide between live band, DJ, or curated playlist', timeline: '9–12 Months Out', completed: true, skipped: false, notes: '' },
          { id: 'm-2', title: 'Book entertainment & confirm ceremony sound system', timeline: '6–9 Months Out', completed: true, skipped: false, notes: '' },
          { id: 'm-3', title: 'Choose processional, recessional & first dance songs', timeline: '2–3 Months Out', completed: false, skipped: false, notes: '' },
          { id: 'm-4', title: 'Submit phonetic pronunciation guide for wedding party entrances', timeline: '2 Weeks Out', completed: false, skipped: false, notes: '' }
        ]
      },
      {
        id: 'florals',
        name: 'Florals, Decor & Rentals',
        icon: '💐',
        category: 'Atmosphere',
        enabled: true,
        budgetAllocated: 3500,
        actualCost: 3100,
        depositPaid: false,
        contractSigned: false,
        fields: [
          { key: 'floristName', label: 'Florist / Decorator', type: 'text', value: 'Wildfern Botanical Studio', placeholder: 'Studio name' },
          { key: 'colorPalette', label: 'Color Palette & Vibe', type: 'text', value: 'Eucalyptus sage, terracotta, dusty rose, ivory, warm brass accents', placeholder: 'Colors and aesthetic' },
          { key: 'personalFlowers', label: 'Personal Flowers Count', type: 'text', value: '2 Bouquets, 4 Boutonnieres, 2 Corsages, 1 Flower Basket', placeholder: 'Bouquets, boutonnieres, corsages' },
          { key: 'ceremonyDecor', label: 'Ceremony Arch / Aisle Plan', type: 'textarea', value: 'Asymmetrical grounded floral meadow at altar; repurpose along head table after ceremony.', placeholder: 'Chuppah, arch, aisle markers...' },
          { key: 'centerpieces', label: 'Reception Table Centerpieces', type: 'textarea', value: '12 tables with bud vases + tapered pillar candles in glass hurricanes; 6 tables with compote bowls.', placeholder: 'Describe table arrangements' }
        ],
        checklist: [
          { id: 'f-1', title: 'Gather floral moodboard & seasonal bloom availability', timeline: '6–9 Months Out', completed: true, skipped: false, notes: '' },
          { id: 'f-2', title: 'Approve floral proposal & rental item quantities', timeline: '3–6 Months Out', completed: false, skipped: false, notes: 'Waiting on revised quote for candle rentals.' },
          { id: 'f-3', title: 'Confirm plan to repurpose ceremony florals at reception', timeline: '1 Month Out', completed: false, skipped: false, notes: '' },
          { id: 'f-4', title: 'Designate who takes bouquets/arrangements home at end of night', timeline: '1 Week Out', completed: false, skipped: false, notes: '' }
        ]
      },
      {
        id: 'attire',
        name: 'Attire, Hair & Makeup',
        icon: '👗',
        category: 'Personal',
        enabled: true,
        budgetAllocated: 3200,
        actualCost: 2950,
        depositPaid: true,
        contractSigned: true,
        fields: [
          { key: 'primaryOutfits', label: 'Couple Attire Details', type: 'text', value: 'Silk crepe A-line gown + Custom forest green linen-blend tux', placeholder: 'Gowns, suits, designers' },
          { key: 'tailorInfo', label: 'Tailor / Alterations Contact', type: 'text', value: 'Atelier Bespoke Fitting (2nd fitting May 2)', placeholder: 'Shop name & fitting dates' },
          { key: 'hmuaArtist', label: 'Hair & Makeup Artist (HMUA)', type: 'text', value: 'Glow Bridal Collective (4 services booked)', placeholder: 'Artist name & headcount' },
          { key: 'trialDate', label: 'Hair & Makeup Trial Date', type: 'date', value: '2027-04-10', placeholder: '' },
          { key: 'accessories', label: 'Rings, Shoes & Accessories', type: 'textarea', value: 'Wedding bands engraved; cathedral veil; block-heel sandals broken in; emergency steamer.', placeholder: 'Jewelry, veil, shoes, cufflinks...' }
        ],
        checklist: [
          { id: 'a-1', title: 'Shop for & order primary wedding attire', timeline: '9–12 Months Out', completed: true, skipped: false, notes: '' },
          { id: 'a-2', title: 'Book hair & makeup artists', timeline: '6–9 Months Out', completed: true, skipped: false, notes: '' },
          { id: 'a-3', title: 'Purchase wedding bands & verify sizing', timeline: '3–6 Months Out', completed: true, skipped: false, notes: '' },
          { id: 'a-4', title: 'Complete dress/suit alterations & shoe break-in', timeline: '1–2 Months Out', completed: false, skipped: false, notes: '' },
          { id: 'a-5', title: 'Pack day-of emergency kit (safety pins, chalk,stain remover, mints)', timeline: '1 Week Out', completed: false, skipped: false, notes: '' }
        ]
      },
      {
        id: 'officiant',
        name: 'Officiant, Vows & Legal',
        icon: '📜',
        category: 'Foundation',
        enabled: true,
        budgetAllocated: 600,
        actualCost: 500,
        depositPaid: true,
        contractSigned: true,
        fields: [
          { key: 'officiantName', label: 'Officiant Name & Contact', type: 'text', value: 'Rev. Julian Brooks', placeholder: 'Name & phone/email' },
          { key: 'licenseCounty', label: 'Marriage License County / Office', type: 'text', value: 'Chatham County Probate Court (Valid for 6 months)', placeholder: 'Where & when to apply' },
          { key: 'vowStyle', label: 'Vow Format', type: 'select', options: ['Personal Written Vows', 'Traditional Repeat-After-Me', 'Hybrid (Personal + Traditional)', 'Private Vows During First Look'], value: 'Hybrid (Personal + Traditional)' },
          { key: 'readings', label: 'Ceremony Readings / Unity Rituals', type: 'textarea', value: 'Reading by Sister Maya: "Union" by Robert Fulghum. No unity candle (windy outdoor space).', placeholder: 'Poems, readings, handfasting, ketubah, etc.' }
        ],
        checklist: [
          { id: 'o-1', title: 'Confirm officiant & check state ordination rules', timeline: '6–9 Months Out', completed: true, skipped: false, notes: '' },
          { id: 'o-2', title: 'Draft ceremony script & outline structure', timeline: '3–6 Months Out', completed: false, skipped: false, notes: '' },
          { id: 'o-3', title: 'Write personal vows in vow booklets', timeline: '1 Month Out', completed: false, skipped: false, notes: '' },
          { id: 'o-4', title: 'Pick up official marriage license in person', timeline: '2–4 Weeks Out', completed: false, skipped: false, notes: 'Bring passports and birth certificates.' }
        ]
      },
      {
        id: 'cake',
        name: 'Cake & Desserts',
        icon: '🎂',
        category: 'Food & Drink',
        enabled: true,
        budgetAllocated: 850,
        actualCost: 780,
        depositPaid: true,
        contractSigned: true,
        fields: [
          { key: 'bakeryName', label: 'Bakery / Pastry Chef', type: 'text', value: 'Sugar & Crumb Patisserie', placeholder: 'Bakery name' },
          { key: 'flavors', label: 'Cake Tiers & Flavors', type: 'text', value: '2-tier cutting cake (Lemon Elderflower & Almond Raspberry) + 2 sheet cakes', placeholder: 'Flavors and fillings' },
          { key: 'dessertBar', label: 'Additional Desserts', type: 'text', value: 'Assorted mini cannoli and espresso brownie bites', placeholder: 'Donut wall, gelato cart, cookies...' },
          { key: 'standAndKnife', label: 'Cake Stand & Cutting Set', type: 'text', value: 'Renting 14" brass stand from bakery ($35 refundable deposit)', placeholder: 'Who provides the stand and knife?' }
        ],
        checklist: [
          { id: 'ck-1', title: 'Order tasting box & select dessert style', timeline: '6 Months Out', completed: true, skipped: false, notes: '' },
          { id: 'ck-2', title: 'Confirm delivery window with venue refrigerator space', timeline: '1 Month Out', completed: false, skipped: false, notes: '' },
          { id: 'ck-3', title: 'Source cake topper, serving knife & to-go boxes', timeline: '2 Weeks Out', completed: false, skipped: false, notes: '' }
        ]
      },
      {
        id: 'stationery',
        name: 'Stationery, Invites & Signage',
        icon: '✉️',
        category: 'Guest Experience',
        enabled: true,
        budgetAllocated: 750,
        actualCost: 620,
        depositPaid: true,
        contractSigned: true,
        fields: [
          { key: 'printerName', label: 'Stationer / Print Platform', type: 'text', value: 'Minted + Local Calligrapher for Welcome Sign', placeholder: 'Designer or site' },
          { key: 'rsvpDeadline', label: 'RSVP Deadline Printed on Invites', type: 'date', value: '2027-05-15', placeholder: '' },
          { key: 'signageList', label: 'Day-Of Signage & Printables', type: 'textarea', value: '- Frosted acrylic welcome sign + easel\n- Seating chart board\n- Bar menu signs (x2)\n- Table numbers 1-15\n- Place cards with meal icons', placeholder: 'Welcome sign, seating chart, menus, programs...' }
        ],
        checklist: [
          { id: 's-1', title: 'Collect & verify mailing addresses for all households', timeline: '9 Months Out', completed: true, skipped: false, notes: '' },
          { id: 's-2', title: 'Mail Save-the-Dates', timeline: '6–8 Months Out', completed: true, skipped: false, notes: '' },
          { id: 's-3', title: 'Order & mail formal wedding invitations + postage', timeline: '3 Months Out', completed: false, skipped: false, notes: 'Weigh full envelope at post office before buying stamps!' },
          { id: 's-4', title: 'Print escort cards, table numbers & bar signs', timeline: '2 Weeks Out', completed: false, skipped: false, notes: '' }
        ]
      },
      {
        id: 'transportation',
        name: 'Transportation & Hotel Blocks',
        icon: '🚌',
        category: 'Guest Experience',
        enabled: false,
        budgetAllocated: 0,
        actualCost: 0,
        depositPaid: false,
        contractSigned: false,
        fields: [
          { key: 'shuttleCompany', label: 'Shuttle / Charter Company', type: 'text', value: 'Historic Savannah Trolley Tours', placeholder: 'Company name' },
          { key: 'hotelBlocks', label: 'Room Block Hotels & Booking Codes', type: 'textarea', value: '1. The DeSoto Savannah (Code: AJWED27 - $219/nt)\n2. Perry Lane Hotel (Code: ALEXJORDAN)', placeholder: 'Hotels, rates, cutoff dates' },
          { key: 'pickupSchedule', label: 'Shuttle Loop Schedule', type: 'textarea', value: 'Departs DeSoto at 4:00 PM & 4:25 PM. Return loops at 9:30 PM and 11:00 PM.', placeholder: 'Pickup times and locations' }
        ],
        checklist: [
          { id: 't-1', title: 'Reserve courtesy hotel room blocks for out-of-town guests', timeline: '9 Months Out', completed: false, skipped: false, notes: '' },
          { id: 't-2', title: 'Book guest shuttle & wedding party transport', timeline: '3–6 Months Out', completed: false, skipped: false, notes: '' },
          { id: 't-3', title: 'Arrange end-of-night getaway car for couple', timeline: '1 Month Out', completed: false, skipped: false, notes: '' }
        ]
      },
      {
        id: 'travel',
        name: 'Destination & Honeymoon Logistics',
        icon: '✈️',
        category: 'Personal',
        enabled: false,
        budgetAllocated: 0,
        actualCost: 0,
        depositPaid: false,
        contractSigned: false,
        fields: [
          { key: 'destination', label: 'Honeymoon / Destination Location', type: 'text', value: 'Amalfi Coast & Rome, Italy', placeholder: 'City / Country' },
          { key: 'travelDates', label: 'Travel Dates', type: 'text', value: 'June 21, 2027 – July 3, 2027', placeholder: 'Departure - Return' },
          { key: 'flightDetails', label: 'Flights & Confirmation Codes', type: 'textarea', value: 'Delta DL142 JFK -> FCO', placeholder: 'Flight numbers, hotel bookings...' },
          { key: 'passportStatus', label: 'Passports, Visas & Vaccines', type: 'text', value: 'Both passports valid through 2031; ETIAS registration reminder set.', placeholder: 'Check 6-month validity rule' }
        ],
        checklist: [
          { id: 'tr-1', title: 'Verify passport expiration dates (>6 months past return)', timeline: '6–9 Months Out', completed: false, skipped: false, notes: '' },
          { id: 'tr-2', title: 'Book flights, accommodations & travel insurance', timeline: '3–6 Months Out', completed: false, skipped: false, notes: '' },
          { id: 'tr-3', title: 'Arrange pet/house sitter while away', timeline: '1–2 Months Out', completed: false, skipped: false, notes: '' }
        ]
      }
    ],
    guests: [
      {
        id: 'g-1',
        name: 'Eleanor & Robert Vance',
        side: 'Partner A',
        group: 'Immediate Family',
        partySize: 2,
        plusOneAllowed: false,
        rsvpStatus: 'attending',
        mealChoice: 'Short Rib (x1), Herb Gnocchi (x1)',
        dietary: 'Robert: Low sodium',
        tableNumber: '1',
        email: 'eleanor.vance@example.com',
        address: '88 Maple Ave, Boston, MA',
        saveTheDateSent: true,
        inviteSent: true,
        thankYouSent: false,
        notes: 'Parents of Partner A'
      },
      {
        id: 'g-2',
        name: 'David & Priya Patel',
        side: 'Partner B',
        group: 'Immediate Family',
        partySize: 2,
        plusOneAllowed: false,
        rsvpStatus: 'attending',
        mealChoice: 'Herb Gnocchi (x2)',
        dietary: 'Vegetarian (No eggs)',
        tableNumber: '1',
        email: 'priya.patel@example.com',
        address: '1420 Oakmont Dr, Austin, TX',
        saveTheDateSent: true,
        inviteSent: true,
        thankYouSent: false,
        notes: 'Parents of Partner B'
      },
      {
        id: 'g-3',
        name: 'Maya Vance & Liam Chen',
        side: 'Partner A',
        group: 'Wedding Party',
        partySize: 2,
        plusOneAllowed: true,
        rsvpStatus: 'attending',
        mealChoice: 'Short Rib (x1), Local Catch Fish (x1)',
        dietary: 'None',
        tableNumber: 'Head Table',
        email: 'maya.v@example.com',
        address: '310 W 14th St Apt 4B, New York, NY',
        saveTheDateSent: true,
        inviteSent: true,
        thankYouSent: false,
        notes: 'Maid of Honor + Partner'
      },
      {
        id: 'g-4',
        name: 'Devon Brooks',
        side: 'Partner B',
        group: 'Wedding Party',
        partySize: 1,
        plusOneAllowed: true,
        rsvpStatus: 'attending',
        mealChoice: 'Short Rib (x1)',
        dietary: 'Gluten-Free',
        tableNumber: 'Head Table',
        email: 'devon.brooks@example.com',
        address: '72 Pine St, Chicago, IL',
        saveTheDateSent: true,
        inviteSent: true,
        thankYouSent: false,
        notes: 'Best Man - coming solo'
      },
      {
        id: 'g-5',
        name: 'Sophia & Lucas Martinez',
        side: 'Mutual',
        group: 'Friends',
        partySize: 2,
        plusOneAllowed: false,
        rsvpStatus: 'pending',
        mealChoice: 'TBD',
        dietary: '',
        tableNumber: '4',
        email: 'sophia.m@example.com',
        address: '509 Peachtree Rd, Atlanta, GA',
        saveTheDateSent: true,
        inviteSent: true,
        thankYouSent: false,
        notes: 'Booked at The DeSoto block'
      },
      {
        id: 'g-6',
        name: 'Uncle Arthur Pendelton',
        side: 'Partner A',
        group: 'Extended Family',
        partySize: 1,
        plusOneAllowed: false,
        rsvpStatus: 'declined',
        mealChoice: 'N/A',
        dietary: '',
        tableNumber: '-',
        email: 'arthur.p@example.com',
        address: '19 Harbor View, Portland, ME',
        saveTheDateSent: true,
        inviteSent: true,
        thankYouSent: true,
        notes: 'Sent a toaster from registry — thank you card mailed!'
      }
    ]
  };
}

function loadState() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const initial = createDefaultState();
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading state, falling back to default:', err);
    return createDefaultState();
  }
}

function saveState(state) {
  state.meta.lastUpdated = new Date().toISOString();
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf8');
  return state;
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '0.9.0-beta', timestamp: new Date().toISOString() });
});

app.get('/api/state', (req, res) => {
  res.json(loadState());
});

app.put('/api/state', (req, res) => {
  if (!req.body || !req.body.meta || !Array.isArray(req.body.modules)) {
    return res.status(400).json({ error: 'Invalid state payload' });
  }
  const updated = saveState(req.body);
  res.json(updated);
});

app.post('/api/preset/:presetId', (req, res) => {
  const state = loadState();
  const { presetId } = req.params;
  const preset = state.templates[presetId];
  if (!preset) {
    return res.status(404).json({ error: 'Preset not found' });
  }
  state.meta.weddingType = presetId;
  state.modules.forEach((mod) => {
    mod.enabled = preset.enabledModules.includes(mod.id);
  });
  res.json(saveState(state));
});

app.post('/api/reset', (req, res) => {
  const fresh = saveState(createDefaultState());
  res.json(fresh);
});

// SPA Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`💍 VowCraft Wedding Planner running at http://0.0.0.0:${PORT}`);
});
