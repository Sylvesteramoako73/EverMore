// Downloads the stock photos used by the sample pages and marketing site, resizes them to WebP
// (1600px and 640px) into public/samples/photos, and writes src/lib/sample-photos.json with credits.
// Photos are from Unsplash (https://unsplash.com/license): free to use, attribution appreciated.
//
// Usage: node scripts/fetch-sample-photos.mjs   (re-run safe; skips files already present)

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OUT = path.join(process.cwd(), "public", "samples", "photos");
mkdirSync(OUT, { recursive: true });

/** name -> [unsplash photo id, photographer, description] */
const PHOTOS = {
  // Weddings & anniversaries
  "wed-hands": ["1529519195486-16945f0fb37f", "Alekon pictures", "Couple holding hands"],
  "wed-couple-suit": ["1608009232260-9b527a5bb9bd", "Steward Masweneng", "Groom in a black suit and bride in a white dress"],
  "wed-tree": ["1695281536457-01f9a07c575b", "Samwel francis", "Bride and groom embracing under a tree"],
  "wed-pose": ["1695281535578-ce371088bb3e", "Samwel francis", "Bride and groom posing for a wedding photo"],
  "wed-traditional": ["1661332517932-2d441bfb2994", "Tope. A Asokere", "Couple in traditional clothing"],
  "wed-group": ["1660675133902-acd1b057f75d", "Emmanuel Yeboah Okine", "Guests in traditional dress"],
  "wed-palm": ["1684253866485-b26f847ff97e", "Elizabeth Pappoe", "Bride and groom in front of a palm tree"],
  "wed-beach": ["1606495186270-395860907235", "Osarugue Igbinoba", "Couple holding hands on a beach"],
  "wed-ring": ["1507650029083-5092f9b2b2e6", "Andrew Itaga", "Placing a ring on a finger"],
  "wed-kiss": ["1665416557437-6dd757e90ce8", "Jeff Kweba", "Couple embracing"],
  "wed-kente-couple": ["1648328168368-3a25f2152802", "Patrick Amofah", "Couple in matching green traditional attire"],
  "wed-kente-embrace": ["1648329933601-01d1875f0b7e", "Patrick Amofah", "Couple in traditional attire embracing"],
  "wed-kente-pose": ["1648328414427-fc902f51808c", "Patrick Amofah", "Couple in traditional attire posing"],
  "wed-ankara-couple": ["1665258918932-9e358bcfba0f", "King Lamar Fotografia", "Couple in green traditional outfits on a staircase"],
  "wed-kente-beads": ["1634074967416-dd24d702c93c", "Emmanuel Offei", "Kente cloth and gold beads"],
  "wed-kente-dancer": ["1660675133223-c293889b9fb8", "Emmanuel Yeboah Okine", "Dancer in kente at a celebration"],
  "wed-kente-wrap": ["1667655966125-abae0f5823f7", "Ato Aikins", "Woman in a kente head wrap"],
  "wed-crown": ["1590670796065-5c2469672e18", "Ato Aikins", "Bride in a green head wrap and gold crown"],
  "wed-coral-bride": ["1618998584360-10a0c28eec0f", "Dennis Irorere", "Bride in coral beads and crown"],
  "wed-white-tux": ["1664646449735-69bc987a49da", "Christophe Dusabe", "Groom in a white tuxedo kneeling beside his bride"],
  "wed-garden": ["1664645833817-7581189209a2", "Christophe Dusabe", "Bride and groom in a garden"],
  "wed-veil": ["1664646198366-68e76f707f48", "Christophe Dusabe", "Bride in a veil with a bouquet"],
  "wed-arch": ["1718997534125-052b2ff48cd0", "Stacey Vandas", "Bride and groom in front of a floral arch"],
  "wed-wall-kiss": ["1719499683843-721331f2495f", "Stacey Vandas", "Bride and groom kissing by a white wall"],
  "wed-bouquet": ["1645827042168-4fb0cdd0bf7e", "Oyemike Princewill", "Smiling bride holding a bouquet"],
  "wed-bride-portrait": ["1501175635532-bdd01562edb2", "cindy baffour", "Bride in a veil"],
  "wed-lace": ["1739526169655-0378b9aae5ab", "Chidy Young", "Groom smiling at his bride in a lace gown"],
  "wed-blue-suit": ["1651851961498-bff60fecc10c", "Barnabas Lartey-Odoi Tetteh", "Groom in a blue suit with his bride"],
  "wed-vows": ["1730321885391-74a0c04ef211", "Andrew Itaga", "Bride and groom holding hands during the ceremony"],
  "wed-tux-detail": ["1766416143517-ee39c8db4f99", "Kevin Hernandez Reyes", "Groom in a white tuxedo"],
  "flowers-table": ["1617813437449-c4f8f233dcd6", "Antoine Demare", "White and pink flowers on a table"],
  "venue-tables": ["1510076857177-7470076d4098", "Abby Savage", "Reception tables with white cloths"],
  "venue-reception": ["1761114905078-163aa92141c8", "Lucas T Photography", "Reception dinner with guests"],
  "venue-church": ["1663321231228-2625873fbdcd", "CJ Dayrit", "Church with rows of chairs"],
  "venue-pavilion": ["1780728955330-73e2031d1bf6", "Troy Olson", "Outdoor pavilion overlooking fields"],
  // Birthdays & parties
  "bday-cake-group": ["1635800055994-64fdf108b873", "Walter Baluku", "People around a birthday cake"],
  "bday-friends": ["1737649507334-92c9fa4beb7c", "Eyo Archibong", "Friends standing together"],
  "bday-kids": ["1648556141401-eb1389a12571", "Ayrus Hill", "Children in party hats"],
  "bday-balloon": ["1615815102957-02a1bc1971ce", "Emmanuel Yeboah Okine", "Girl holding a yellow balloon"],
  "bday-cake": ["1610670444950-0b29430891b4", "Duncan Kidd", "Chocolate cake with lit candles"],
  "bday-candles": ["1545696563-af8f6ec2295a", "Aneta Pawlik", "Lighting candles on a birthday cake"],
  "bday-tables": ["1744891470331-c660191721b5", "Anubhav Event Productions", "Colourful tables set for an event"],
  "bday-women": ["1789589724989-700a09d0d08c", "ishakah rumbani", "Women in matching outfits at a celebration"],
  "man-suit": ["1688120320226-a73ed520c8b7", "Samson Balogun", "Man in a blue suit"],
  "man-smile": ["1522529599102-193c0d76b5b6", "Elizeu Dias", "Man smiling outdoors"],
  // Remembrance (no people)
  "mem-candles": ["1602693875034-52c6b2e79785", "Sixteen Miles Out", "White candles on a wooden table"],
  "mem-candle": ["1612052975847-270c7a668ce1", "stefzn", "Lit candle in a glass holder"],
  "mem-candle-flowers": ["1640863399547-b6549b473c9d", "Adarsh Kumar Singh", "White candle surrounded by flowers"],
  "mem-rose": ["1604350917589-8006cd10f4b5", "Nikola Johnny Mirkovic", "Pink rose in a glass bottle"],
  "mem-flowers": ["1780400357798-99f176a9e066", "DEAD GOOD LEGACIES", "Flower arrangements in glass jars"],
  "mem-stained-glass": ["1699830506478-af7b3f5e6cc9", "Jack Gardner", "Church with stained glass windows"],
  "mem-church-candle": ["1640544351861-930d12160bbb", "Peter Herrmann", "Candle lit in a church"],
  // Outings & trips
  "trip-sunset-group": ["1667792703678-da968ac1cc2b", "Frederick Shaw", "Friends photographing the sunset"],
  "trip-field": ["1623944439126-4bd1f3a7a4db", "Nicolas Lobos", "Group standing in a field"],
  "trip-sand": ["1627897495484-229b29feb0d5", "Inatimi Nathus", "Group on sand on a sunny day"],
  "trip-river": ["1684261422279-034c2d714154", "Provincial Archives of Alberta", "Friends sitting on rocks by a river"],
  "trip-boat": ["1572889464105-3d3f39ee2cf7", "Patrick Schiele", "Boat silhouetted on the water"],
  "trip-boat-sunset": ["1722547083154-a6a3038d43b3", "Zia Ur Rehman", "Boat crossing the water at sunset"],
  "trip-safari": ["1785094209983-5f4040c201bc", "Gilley Aguilar", "Game drive at sunset"],
  "trip-truck": ["1767819657087-fbbb63a28e1a", "Marina Zvada", "Friends riding in the back of a truck"],
  "trip-road": ["1694771169765-e8248b0e7d17", "Michael Ali", "Dirt road with mountains"],
  // Babies & family
  "baby-fabric": ["1781263409297-77997e64f2e0", "Aliburhan S", "Adult holding a smiling baby wrapped in colourful fabric"],
  "baby-cap": ["1604807788279-ea778c075cee", "Gabriel Tovar", "Baby in a white knit cap"],
  "baby-bed": ["1625646294209-34dbc389e7b1", "Zoe Graham", "Baby lying on a bed"],
  "baby-bump": ["1512094476718-4d8f19366c62", "Andre Adjahoe", "Parents-to-be"],
  "family-mother": ["1769451741731-999ed37e471c", "Folakemi Oke", "Woman in traditional attire with children"],
  "family-games": ["1577896849786-738ed6c78bd3", "National Cancer Institute", "Family playing board games"],
  "family-group": ["1515658323406-25d61c141a6e", "Ian Macharia", "Group gathered outdoors"],
  "family-dance": ["1515657834497-26509e295154", "Ian Macharia", "Woman dancing among friends"],
  "family-attire": ["1780847614316-c9e933e9a9e0", "Omotayo Tajudeen", "People in traditional attire"],
  "friends-three": ["1589483232748-515c025575bc", "Siviwe Kapteyn", "Three friends smiling"],
  // Graduation
  "grad-group": ["1633734973050-d6499a977c17", "Emmanuel Offei", "Graduates in gowns"],
  "grad-flowers": ["1770028919746-f68e3095073f", "Chidera Faustina Okeke", "Graduate holding a bouquet"],
  "grad-man": ["1594750852563-5ed8e0421d40", "Nqobile Vundla", "Graduate in an academic gown"],
  "grad-cap": ["1686213011642-b25f94b95b96", "Divaris Shirichena", "Graduate in cap and gown"],
  "grad-bubbles": ["1639741660848-a07ebe5e2ce0", "Bigger Smiles", "Graduate blowing bubbles"],
};

const credits = {};
let failed = 0;
for (const [name, [id, by, alt]] of Object.entries(PHOTOS)) {
  const full = path.join(OUT, `${name}.webp`);
  const small = path.join(OUT, `${name}-sm.webp`);
  credits[name] = { id, by, alt, src: `/samples/photos/${name}.webp`, thumb: `/samples/photos/${name}-sm.webp` };
  if (existsSync(full) && existsSync(small)) {
    const meta = await sharp(full).metadata();
    Object.assign(credits[name], { width: meta.width, height: meta.height });
    continue;
  }
  try {
    const res = await fetch(`https://images.unsplash.com/photo-${id}?w=1800&q=80&fm=jpg&fit=max`, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const input = Buffer.from(await res.arrayBuffer());
    const out = await sharp(input).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 74 }).toFile(full);
    await sharp(input).rotate().resize({ width: 640, height: 640, fit: "inside" }).webp({ quality: 68 }).toFile(small);
    Object.assign(credits[name], { width: out.width, height: out.height });
    console.log("ok  ", name);
  } catch (err) {
    failed++;
    delete credits[name];
    console.log("FAIL", name, String(err));
  }
}

writeFileSync(path.join(process.cwd(), "src", "lib", "sample-photos.json"), JSON.stringify(credits, null, 2) + "\n");
console.log(`\n${Object.keys(credits).length} photos ready, ${failed} failed.`);
