// Occasion registry: everything that differs between a wedding, a birthday, a funeral, an outing…
// Pages, forms and emails read wording and behaviour from here instead of hard-coding weddings.

export const OCCASION_KINDS = [
  "wedding",
  "birthday",
  "funeral",
  "outing",
  "naming",
  "anniversary",
  "graduation",
  "reunion",
  "shower",
  "other",
] as const;
export type OccasionKind = (typeof OCCASION_KINDS)[number];

export type Honoree = { fullName: string; displayName: string };
export type ColourSwatch = { name: string; hex: string; note: string };
export type RsvpContact = { name: string; phone: string };

/** Occasion-specific facts, stored together. Every field is optional. */
export type OccasionDetails = {
  relationshipStartDate?: string | null;
  engagementDate?: string | null;
  dateOfBirth?: string | null;
  turningAge?: number | null;
  dateOfPassing?: string | null;
  nameMeaning?: string;
  parents?: string;
  meetingPoint?: string;
  packingList?: string[];
  costNote?: string;
  institution?: string;
};

export type Occasion = {
  kind: OccasionKind;
  label: string;
  /** Shown on the "What are you celebrating?" picker. */
  pitch: string;
  group: "love" | "milestones" | "remembrance" | "together";
  /** Who the page is about. min 0 = the title alone (e.g. an outing). */
  honorees: { min: number; max: number; labels: string[] };
  /** Default headline from the honorees, before the host edits it. */
  defaultTitle: (names: string[]) => string;
  /** Show a live countdown before the main event (not for remembrance). */
  countdown: boolean;
  /** After the main event: the marriage counter, a remembrance line, or nothing special. */
  after: "married" | "remembrance" | "memories";
  copy: {
    hostLine: string;
    invitation: string;
    today: string;
    afterLead: string;
    storyTitle: string;
    scheduleTitle: string;
    guestbookTitle: string;
    guestbookPrompt: string;
    thankYouTitle: string;
    keyDateLabel: string;
  };
  eventSuggestions: string[];
  recommendedThemes: string[];
};

const join2 = (names: string[]) => names.filter(Boolean).join(" & ");

export const OCCASIONS: Record<OccasionKind, Occasion> = {
  wedding: {
    kind: "wedding",
    label: "Wedding",
    pitch: "Traditional, white wedding, civil or all of them, with every ceremony in one place.",
    group: "love",
    honorees: { min: 2, max: 2, labels: ["Your full name", "Your partner's full name"] },
    defaultTitle: join2,
    countdown: true,
    after: "married",
    copy: {
      hostLine: "Together with their families",
      invitation: "joyfully invite you to celebrate their wedding",
      today: "Today we celebrate our forever",
      afterLead: "Happily married",
      storyTitle: "Our Story",
      scheduleTitle: "The Celebrations",
      guestbookTitle: "Guestbook",
      guestbookPrompt: "Share a wish, a memory or a little advice for the happy couple.",
      thankYouTitle: "Thank You",
      keyDateLabel: "Wedding date (anniversaries are counted from it)",
    },
    eventSuggestions: ["Traditional engagement", "Traditional wedding", "Church ceremony", "Civil ceremony", "Reception", "Thanksgiving service", "After-party"],
    recommendedThemes: ["earth-and-ivory", "timeless-elegance", "romantic-garden", "traditional-celebration", "contemporary-african-romance", "luxury-editorial"],
  },
  birthday: {
    kind: "birthday",
    label: "Birthday",
    pitch: "From a first birthday to a 70th: a page for the party, the wishes and the photos.",
    group: "milestones",
    honorees: { min: 1, max: 1, labels: ["Whose birthday is it? (full name)"] },
    defaultTitle: (n) => (n[0] ? `${n[0]}'s Birthday` : "Birthday Celebration"),
    countdown: true,
    after: "memories",
    copy: {
      hostLine: "You're invited to celebrate",
      invitation: "Come celebrate with good food, music and the people we love",
      today: "Today we celebrate!",
      afterLead: "Thank you for celebrating",
      storyTitle: "About the Birthday Star",
      scheduleTitle: "The Party",
      guestbookTitle: "Birthday Wishes",
      guestbookPrompt: "Leave a birthday wish, a favourite memory or a funny story.",
      thankYouTitle: "Thank You",
      keyDateLabel: "Date of birth (for age and yearly reminders)",
    },
    eventSuggestions: ["Birthday party", "Birthday dinner", "Thanksgiving service", "Brunch", "Surprise party"],
    recommendedThemes: ["confetti", "golden-hour", "luxury-editorial", "modern-minimalist", "earth-and-ivory"],
  },
  funeral: {
    kind: "funeral",
    label: "Funeral & memorial",
    pitch: "A dignified page for a celebration of life: order of service, tributes and details for family and friends.",
    group: "remembrance",
    honorees: { min: 1, max: 1, labels: ["Full name of your loved one"] },
    defaultTitle: (n) => (n[0] ? `Celebrating the Life of ${n[0]}` : "Celebration of Life"),
    countdown: false,
    after: "remembrance",
    copy: {
      hostLine: "In loving memory",
      invitation: "The family invites you to join them in celebrating a life well lived",
      today: "Today we celebrate a life well lived",
      afterLead: "Forever in our hearts",
      storyTitle: "Life Story",
      scheduleTitle: "Order of Events",
      guestbookTitle: "Tributes & Condolences",
      guestbookPrompt: "Share a tribute, a memory or words of comfort for the family.",
      thankYouTitle: "The Family Thanks You",
      keyDateLabel: "Date of passing (for remembrance reminders)",
    },
    eventSuggestions: ["Wake-keeping", "Burial service", "Funeral service", "Final funeral rites", "Thanksgiving service", "One-week observance", "Memorial service"],
    recommendedThemes: ["serene", "earth-and-ivory", "timeless-elegance", "modern-minimalist"],
  },
  outing: {
    kind: "outing",
    label: "Outing or trip",
    pitch: "Picnics, retreats and group trips: itinerary, meeting point, what to bring and who's coming.",
    group: "together",
    honorees: { min: 0, max: 0, labels: [] },
    defaultTitle: () => "Our Getaway",
    countdown: true,
    after: "memories",
    copy: {
      hostLine: "You're invited on",
      invitation: "Pack your bags: here's everything you need to know",
      today: "Today's the day: let's go!",
      afterLead: "What a trip",
      storyTitle: "About the Trip",
      scheduleTitle: "Itinerary",
      guestbookTitle: "Shout-outs",
      guestbookPrompt: "Leave a note for the group.",
      thankYouTitle: "Thanks for Coming",
      keyDateLabel: "Trip date",
    },
    eventSuggestions: ["Meet-up & departure", "Arrival & check-in", "Hike", "Boat cruise", "Lunch", "Games & activities", "Bonfire", "Departure home"],
    recommendedThemes: ["adventure", "golden-hour", "modern-minimalist", "contemporary-african-romance"],
  },
  naming: {
    kind: "naming",
    label: "Naming ceremony",
    pitch: "Outdooring, naming or dedication: welcome your little one with family and friends.",
    group: "milestones",
    honorees: { min: 1, max: 1, labels: ["Baby's full name"] },
    defaultTitle: (n) => (n[0] ? `Welcoming ${n[0]}` : "Naming Ceremony"),
    countdown: true,
    after: "memories",
    copy: {
      hostLine: "With joy and gratitude",
      invitation: "we invite you to the naming ceremony of our little one",
      today: "Today we welcome our little one",
      afterLead: "Welcome to the world",
      storyTitle: "The Name & Its Meaning",
      scheduleTitle: "The Ceremony",
      guestbookTitle: "Blessings",
      guestbookPrompt: "Leave a blessing or a wish for the baby and family.",
      thankYouTitle: "Thank You",
      keyDateLabel: "Baby's date of birth",
    },
    eventSuggestions: ["Outdooring", "Naming ceremony", "Dedication service", "Reception"],
    recommendedThemes: ["little-blessings", "golden-hour", "earth-and-ivory", "contemporary-african-romance"],
  },
  anniversary: {
    kind: "anniversary",
    label: "Anniversary or vow renewal",
    pitch: "Celebrate years together, or say 'I do' all over again.",
    group: "love",
    honorees: { min: 2, max: 2, labels: ["Your full name", "Your partner's full name"] },
    defaultTitle: join2,
    countdown: true,
    after: "married",
    copy: {
      hostLine: "Celebrating years of love",
      invitation: "invite you to celebrate their anniversary",
      today: "Today we celebrate our love",
      afterLead: "Still choosing each other",
      storyTitle: "Our Story",
      scheduleTitle: "The Celebration",
      guestbookTitle: "Wishes",
      guestbookPrompt: "Share your wishes and favourite memories of the couple.",
      thankYouTitle: "Thank You",
      keyDateLabel: "Original wedding date",
    },
    eventSuggestions: ["Vow renewal", "Anniversary dinner", "Thanksgiving service", "Party"],
    recommendedThemes: ["timeless-elegance", "golden-hour", "romantic-garden", "earth-and-ivory"],
  },
  graduation: {
    kind: "graduation",
    label: "Graduation",
    pitch: "Celebrate the graduate with family and friends.",
    group: "milestones",
    honorees: { min: 1, max: 1, labels: ["Graduate's full name"] },
    defaultTitle: (n) => (n[0] ? `${n[0]} Graduates!` : "Graduation Celebration"),
    countdown: true,
    after: "memories",
    copy: {
      hostLine: "Please join us to celebrate",
      invitation: "the graduation of",
      today: "Today we celebrate the graduate!",
      afterLead: "Congratulations, graduate",
      storyTitle: "The Journey",
      scheduleTitle: "The Celebration",
      guestbookTitle: "Congratulations",
      guestbookPrompt: "Leave a congratulations message for the graduate.",
      thankYouTitle: "Thank You",
      keyDateLabel: "Graduation date",
    },
    eventSuggestions: ["Graduation ceremony", "Thanksgiving service", "Graduation party", "Dinner"],
    recommendedThemes: ["modern-minimalist", "luxury-editorial", "golden-hour", "confetti"],
  },
  reunion: {
    kind: "reunion",
    label: "Reunion",
    pitch: "Family, class or alumni reunions: everyone in one place, before and after.",
    group: "together",
    honorees: { min: 0, max: 0, labels: [] },
    defaultTitle: () => "Reunion",
    countdown: true,
    after: "memories",
    copy: {
      hostLine: "Let's get together",
      invitation: "It's been too long. Join us as we reconnect and celebrate",
      today: "Welcome back, everyone!",
      afterLead: "Until next time",
      storyTitle: "About the Reunion",
      scheduleTitle: "Programme",
      guestbookTitle: "Messages",
      guestbookPrompt: "Say hello, share what you've been up to, or post a memory.",
      thankYouTitle: "Thank You",
      keyDateLabel: "Reunion date",
    },
    eventSuggestions: ["Welcome & registration", "Get-together", "Dinner", "Games", "Thanksgiving service", "Picnic"],
    recommendedThemes: ["golden-hour", "adventure", "modern-minimalist", "earth-and-ivory"],
  },
  shower: {
    kind: "shower",
    label: "Shower",
    pitch: "Baby showers and bridal showers, with wishes, games and gift ideas.",
    group: "milestones",
    honorees: { min: 1, max: 2, labels: ["Who is it for? (full name)", "And (optional)"] },
    defaultTitle: (n) => (n[0] ? `A Shower for ${join2(n)}` : "Shower"),
    countdown: true,
    after: "memories",
    copy: {
      hostLine: "Please join us for",
      invitation: "a shower in honour of",
      today: "Let the celebration begin!",
      afterLead: "Thank you for showering us with love",
      storyTitle: "About",
      scheduleTitle: "The Celebration",
      guestbookTitle: "Wishes",
      guestbookPrompt: "Leave a sweet wish or piece of advice.",
      thankYouTitle: "Thank You",
      keyDateLabel: "Date",
    },
    eventSuggestions: ["Baby shower", "Bridal shower", "Brunch", "Games"],
    recommendedThemes: ["little-blessings", "romantic-garden", "confetti", "golden-hour"],
  },
  other: {
    kind: "other",
    label: "Something else",
    pitch: "Housewarming, retirement, church or community event: any gathering worth remembering.",
    group: "together",
    honorees: { min: 0, max: 0, labels: [] },
    defaultTitle: () => "Our Celebration",
    countdown: true,
    after: "memories",
    copy: {
      hostLine: "You're invited",
      invitation: "Join us to celebrate",
      today: "Today we celebrate!",
      afterLead: "Thank you for celebrating with us",
      storyTitle: "About",
      scheduleTitle: "Programme",
      guestbookTitle: "Messages",
      guestbookPrompt: "Leave a message.",
      thankYouTitle: "Thank You",
      keyDateLabel: "Date",
    },
    eventSuggestions: ["Celebration", "Service", "Reception", "Dinner", "Party"],
    recommendedThemes: ["golden-hour", "modern-minimalist", "earth-and-ivory", "timeless-elegance"],
  },
};

export function getOccasion(kind: string | null | undefined): Occasion {
  return OCCASIONS[(kind as OccasionKind) in OCCASIONS ? (kind as OccasionKind) : "other"];
}

export const OCCASION_GROUPS: { id: Occasion["group"]; label: string }[] = [
  { id: "love", label: "Love" },
  { id: "milestones", label: "Milestones" },
  { id: "remembrance", label: "Remembrance" },
  { id: "together", label: "Together" },
];

/** Icons available for programme items (rendered by the site; keys stay stable). */
export const PROGRAMME_ICONS = [
  "rings", "church", "camera", "dinner", "music", "cake", "gift", "glass", "bus", "map", "sun", "flower", "dove", "candle", "star", "heart",
] as const;
export type ProgrammeIcon = (typeof PROGRAMME_ICONS)[number];
