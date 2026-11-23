import type { OccasionKind } from "./occasions";

// The WhatsApp message a host sends with their page link. Written per occasion, in plain warm English,
// built only from what the host already entered (title, main event date and place) and the link.

const INTRO: Record<OccasionKind, string> = {
  wedding: "We are getting married and we would love for you to celebrate with us.",
  anniversary: "We are celebrating our anniversary and we would love you to join us.",
  birthday: "You are warmly invited to celebrate a birthday with us.",
  funeral: "With love and gratitude, the family shares the details for the celebration of life below.",
  naming: "We are welcoming our little one and we would love you to be part of the day.",
  graduation: "I am graduating and I would love you to celebrate with me.",
  reunion: "We are bringing everyone together again and we would love to see you there.",
  shower: "You are invited to a special shower, and we would love you to be there.",
  opening: "We are opening our doors and we would love you to join us for the launch.",
  outing: "We are planning a trip together and we would love you to come along.",
  other: "You are invited, and we would love for you to join us.",
};

const CALL: Record<OccasionKind, string> = {
  wedding: "The programme, directions and where to reply are all on one page. Please open it and let us know you are coming:",
  anniversary: "The programme, directions and where to reply are all on one page. Please open it and let us know you are coming:",
  birthday: "The programme, directions and where to reply are all on one page. Please open it and let us know you are coming:",
  funeral: "You will find the order of service, directions and a place to leave a tribute here:",
  naming: "The programme, directions and where to reply are all on one page. Please open it and let us know you are coming:",
  graduation: "The details, directions and where to reply are all on one page. Please open it and let me know you are coming:",
  reunion: "The details, directions and where to reply are all on one page. Please open it and let us know you are coming:",
  shower: "The details, directions and where to reply are all on one page. Please open it and let us know you are coming:",
  opening: "The programme and directions are on one page. Please open it and let us know you are coming:",
  outing: "The plan, meeting point and who is coming are all on one page. Please open it and confirm your place:",
  other: "The details, directions and where to reply are all on one page. Please open it and let us know you are coming:",
};

export function shareMessage(input: { kind: OccasionKind; title: string; when?: string | null; where?: string | null; url: string }) {
  const lines = [INTRO[input.kind] ?? INTRO.other, "", input.title];
  if (input.when) lines.push(input.when);
  if (input.where) lines.push(input.where);
  lines.push("", CALL[input.kind] ?? CALL.other, input.url);
  return lines.join("\n");
}

export const whatsappLink = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
