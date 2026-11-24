import type { OccasionKind } from "@/lib/occasions";

// Opening questions for each occasion. Shown straight away, before the host has written anything.

/** Also the fallback when the assistant is unavailable. */
export const DEFAULT_QUESTIONS: Record<OccasionKind, string[]> = {
  wedding: ["What date is the wedding?", "Where is the ceremony, and what time does it start?", "Where is the reception?", "Is there a dress code or colours you would like guests to wear?", "How did the two of you meet?"],
  birthday: ["Which birthday is it, and what is the date?", "Where is the party and what time does it start?", "Is there a dress code or theme?", "Is there anything guests should know, like parking or children?"],
  funeral: ["What is their full name, and when did they pass?", "Where and when is the service or burial?", "Where is the gathering or reception afterwards?", "Is there a dress code or colours for the family?", "Is there something about their life you would like shared?"],
  outing: ["Where are you going, and on what date?", "Where and when should everyone meet?", "What should people bring?", "What will it cost each person, and by when must they reply?"],
  naming: ["What is the baby's name, and what does it mean?", "What are the parents' names?", "What date, time and place is the ceremony?", "Is there a dress code or colours?"],
  anniversary: ["Which anniversary is it, and what is the date?", "Where is the celebration and what time?", "Is there a dress code or colours?", "How did your story begin?"],
  graduation: ["Which school and course are you graduating from?", "What date is the celebration?", "Where is it and what time does it start?", "Is there a dress code or colours?"],
  reunion: ["Which group or class is reuniting?", "What date, time and place?", "What should people bring or pay, if anything?", "By when should people reply?"],
  shower: ["Who is the shower for?", "What date, time and place?", "Is there a theme, dress code or registry?", "By when should guests reply?"],
  opening: ["What is opening, and what is it called?", "What date and time is the opening?", "Where is it?", "Is there a programme, like a ribbon cutting or refreshments?"],
  other: ["What is the occasion?", "What date, time and place?", "Is there a dress code?", "Is there anything guests should know?"],
};
