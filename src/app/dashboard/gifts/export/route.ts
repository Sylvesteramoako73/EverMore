import { csvResponse, toCsv } from "@/lib/csv";
import { listFunds, listGifts } from "@/server/gifts";
import { loadDashboard } from "../../data";

/** All gifts, for thank-you notes and bookkeeping. */
export async function GET() {
  const { celebration: c } = await loadDashboard();
  const [gifts, funds] = await Promise.all([listGifts(c.id), listFunds(c.id)]);
  const fundName = new Map(funds.map((f) => [f.id, f.title]));
  const STATUS = { confirmed: "Received", pending: "Waiting", failed: "Not received" } as const;
  return csvResponse(
    `${c.slug}-gifts.csv`,
    toCsv([
      ["Name", "Amount (GH₵)", "Fund", "Method", "Status", "Phone", "Email", "Message", "Date"],
      ...gifts.map((g) => [
        g.name,
        (g.amountMinor / 100).toFixed(2),
        fundName.get(g.fundId ?? "") ?? "",
        g.method === "paystack" ? `Online ${g.channel}`.trim() : "Direct MoMo",
        STATUS[g.status],
        g.phone,
        g.email,
        g.message,
        new Date(g.createdAt).toISOString().slice(0, 16).replace("T", " "),
      ]),
    ]),
  );
}
