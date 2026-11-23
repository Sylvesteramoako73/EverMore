// Content for the occasion landing pages at /celebrate/<slug>. One page per search topic, each with its own words.

export type Landing = {
  slug: string;
  kind: string;
  theme: string;
  photo: string;
  position: string;
  noun: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  includes: [string, string][];
  faq: [string, string][];
};

export const LANDINGS: Landing[] = [
  {
    slug: "weddings",
    kind: "wedding",
    theme: "earth-and-ivory",
    photo: "home-wedding-green-wide",
    position: "50% 25%",
    noun: "wedding",
    title: "Wedding page for Ghana weddings",
    description: "Create one page for your whole wedding: the story, programme, RSVPs, gifts by Mobile Money and guest photos. Share one link on WhatsApp. Build free, pay GHS 69 to publish.",
    h1: "One page for your whole wedding",
    intro: "Traditional wedding, white wedding and everything in between, on a single page your guests open from one WhatsApp link. No app to download.",
    includes: [
      ["Every ceremony in order", "Engagement, traditional and white wedding, each with its own time, venue and dress code."],
      ["RSVPs for each part of the day", "Guests reply through a personal link, so you know who is coming to what."],
      ["Colours of the day", "Show the colours guests can wear, with names and swatches."],
      ["Directions in one tap", "Venue photos, maps and a button that opens the route."],
      ["Gifts by Mobile Money", "Guests send a gift from the page, with no one chasing for numbers."],
      ["Photos from every guest", "Everyone uploads from their phone. You approve what shows."],
    ],
    faq: [
      ["Can I put the traditional and white wedding on one page?", "Yes. Each ceremony has its own time, venue, programme and RSVP, all on the same page and the same link."],
      ["Can guests send gifts?", "Yes. Guests can send by Mobile Money, and you can switch on online payment as well."],
    ],
  },
  {
    slug: "birthdays",
    kind: "birthday",
    theme: "confetti",
    photo: "home-birthday-wide",
    position: "50% 30%",
    noun: "birthday",
    title: "Birthday invitation page with RSVPs",
    description: "Make a birthday page with the date, venue, RSVPs, wishes and party photos in one link. Share on WhatsApp. Build free, pay GHS 69 to publish.",
    h1: "A birthday page everyone will open",
    intro: "Share the details once, see who is coming, and collect wishes and photos from the party, all from one link.",
    includes: [
      ["The details at a glance", "Date, venue, countdown and dress code in one place."],
      ["RSVPs you can count", "See who is coming and how many, without scrolling through WhatsApp."],
      ["Wishes from friends and family", "A guestbook where guests leave messages you can keep."],
      ["Photos from the party", "Guests upload from their phones into one shared gallery."],
      ["Gifts if you want them", "Guests can contribute by Mobile Money."],
      ["A keepsake afterwards", "The page stays as a memory of the day."],
    ],
    faq: [
      ["Do guests need an account?", "No. They open the link in any browser, reply and upload photos."],
      ["Can I make the page for a milestone birthday?", "Yes. Add the age, a short story and a photo timeline for a milestone."],
    ],
  },
  {
    slug: "celebrations-of-life",
    kind: "funeral",
    theme: "serene",
    photo: "mem-church-candle",
    position: "50% 45%",
    noun: "celebration of life",
    title: "Funeral programme page for Ghana",
    description: "Share the order of service, tributes, venue and directions for a funeral or celebration of life in one link, and receive contributions from family and friends.",
    h1: "A gentle home for a life well lived",
    intro: "Share the order of service, tributes and directions with family and friends in one link, and keep it as a lasting memorial.",
    includes: [
      ["The order of events", "Wake keeping, funeral service and burial, each with its time and place."],
      ["Tributes and a life story", "Photos, a biography and tributes from those who knew them."],
      ["Directions for everyone", "Venue details and one tap directions for guests coming from far."],
      ["Contributions from family and friends", "Donations by Mobile Money, shown with care."],
      ["A condolence book", "Messages from guests that the family can keep."],
      ["A page that stays", "It remains online as a memorial after the day."],
    ],
    faq: [
      ["Can we keep the page private?", "Yes. You can share it only with people who have the link, or limit it to invited guests."],
      ["Can people who cannot travel still take part?", "Yes. They can read the programme, leave a tribute and send a contribution from wherever they are."],
    ],
  },
  {
    slug: "naming-ceremonies",
    kind: "naming",
    theme: "little-blessings",
    photo: "home-naming-hd",
    position: "50% 35%",
    noun: "naming ceremony",
    title: "Naming ceremony invitation page",
    description: "Invite family to an outdooring or naming ceremony with a page for the programme, directions, RSVPs, blessings and photos. Build free, pay GHS 69 to publish.",
    h1: "Welcome your baby with one page",
    intro: "Invite family with the programme and directions, collect RSVPs, and keep the blessings and photos from the day.",
    includes: [
      ["The programme and venue", "Time, place and the order of the ceremony."],
      ["The meaning of the names", "Share the names and their meanings with your guests."],
      ["RSVPs from family", "See who is coming and how many to plan for."],
      ["Blessings and messages", "A guestbook for prayers and good wishes."],
      ["Gifts for the baby", "Guests can contribute by Mobile Money."],
      ["Photos from the day", "Everyone shares what they took, in one gallery."],
    ],
    faq: [
      ["Is this good for an outdooring?", "Yes. The page works for any naming ceremony or outdooring, with sections for the names and their meanings."],
      ["Can grandparents without apps use it?", "Yes. It is a link that opens in any phone browser."],
    ],
  },
  {
    slug: "graduations",
    kind: "graduation",
    theme: "modern-minimalist",
    photo: "home-graduation-hero",
    position: "50% 32%",
    noun: "graduation",
    title: "Graduation celebration page",
    description: "Celebrate a graduate with a page for the party details, RSVPs, photos and gifts. Share one link with family and friends. Build free, pay GHS 69 to publish.",
    h1: "Celebrate your graduate in one place",
    intro: "Invite family and friends, share the day's details, and gather photos and gifts for the big day.",
    includes: [
      ["The celebration details", "Date, venue and programme for the party or thanksgiving."],
      ["The graduate's story", "Share the course, the journey and thank the people who helped."],
      ["RSVPs", "See who is coming so you can plan food and seating."],
      ["Photos", "Guests add their photos to a shared gallery everyone can download."],
      ["Gifts and contributions", "Mobile Money gifts from family and friends."],
      ["A keepsake", "The page remains as a record of the achievement."],
    ],
    faq: [
      ["Can a family create it for the graduate?", "Yes. Any family member or friend can build the page and share the link."],
      ["Is it only for university graduations?", "No. It works for school, college, nursing and any other graduation."],
    ],
  },
];

export const getLanding = (slug: string) => LANDINGS.find((l) => l.slug === slug);
