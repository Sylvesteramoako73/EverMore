/** WhatsApp link to a phone number with a message (international or Ghanaian 0XX numbers). Safe on the client. */
export function whatsappTo(phone: string, text: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  const to = digits.startsWith("+") ? digits.slice(1) : digits.startsWith("0") && digits.length === 10 ? `233${digits.slice(1)}` : "";
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

export function canWhatsApp(phone: string) {
  return !whatsappTo(phone, "").startsWith("https://wa.me/?");
}
