/** GH₵ 1,250 or GH₵ 1,250.50 from pesewas. Safe on the client. */
export function formatMoney(minor: number, currency = "GHS") {
  const value = minor / 100;
  const symbol = currency === "GHS" ? "GH₵" : currency;
  const text = value.toLocaleString("en-GH", { minimumFractionDigits: value % 1 ? 2 : 0, maximumFractionDigits: 2 });
  return `${symbol} ${text}`;
}

export const MOMO_NETWORKS = ["MTN MoMo", "Telecel Cash", "AT Money"] as const;
