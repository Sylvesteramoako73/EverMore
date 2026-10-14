import type { EmailMessage } from "./send";

// Minimal, client-safe HTML emails in the EverMore palette. All dynamic text is escaped.

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, paragraphs: string[], cta?: { label: string; url: string }) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px;line-height:1.6">${escapeHtml(p)}</p>`).join("");
  const button = cta
    ? `<p style="margin:28px 0"><a href="${escapeHtml(cta.url)}" style="background:#101C35;color:#FAF7F0;padding:14px 26px;border-radius:999px;text-decoration:none;display:inline-block">${escapeHtml(cta.label)}</a></p>
       <p style="margin:0;font-size:12px;color:#747783">Or paste this link into your browser:<br>${escapeHtml(cta.url)}</p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#FAF7F0;font-family:Helvetica,Arial,sans-serif;color:#101C35">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px">
    <p style="font-family:Georgia,serif;font-size:22px;letter-spacing:.04em;margin:0 0 32px">Ever<span style="color:#C69A4A">More</span></p>
    <h1 style="font-family:Georgia,serif;font-weight:normal;font-size:28px;margin:0 0 20px">${escapeHtml(title)}</h1>
    ${body}${button}
    <p style="margin:40px 0 0;font-size:12px;color:#747783">Your Story. Forever Connected.</p>
  </div></body></html>`;
}

function message(to: string, subject: string, title: string, paragraphs: string[], cta?: { label: string; url: string }): EmailMessage {
  const text = [title, "", ...paragraphs, ...(cta ? ["", `${cta.label}: ${cta.url}`] : [])].join("\n");
  return { to, subject, html: layout(title, paragraphs, cta), text };
}

export const emails = {
  verifyEmail: (to: string, name: string, url: string) =>
    message(to, "Confirm your email for EverMore", `Welcome, ${name}`, [
      "Please confirm your email address to finish creating your EverMore account.",
      "This link expires in 24 hours. If you didn't sign up, you can ignore this email.",
    ], { label: "Confirm my email", url }),

  resetPassword: (to: string, name: string, url: string) =>
    message(to, "Reset your EverMore password", "Reset your password", [
      `Hi ${name}, we received a request to reset your password.`,
      "This link expires in 1 hour. If you didn't ask for this, you can ignore this email and your password stays the same.",
    ], { label: "Choose a new password", url }),

  partnerInvite: (to: string, inviterName: string, couple: string, url: string) =>
    message(to, `${inviterName} invited you to your celebration website on EverMore`, `Join ${couple} on EverMore`, [
      `${inviterName} has invited you to help manage your celebration website.`,
      "Accept the invitation to edit details, see RSVPs and add memories together. This link expires in 7 days.",
    ], { label: "Accept invitation", url }),

  anniversaryReminder: (to: string, couple: string, years: number, daysBefore: number, url: string) =>
    message(
      to,
      daysBefore === 0 ? `Happy ${ordinal(years)} anniversary, ${couple}` : `Your ${ordinal(years)} anniversary is in ${daysBefore} days`,
      daysBefore === 0 ? `Happy anniversary` : `${daysBefore} days to go`,
      [
        daysBefore === 0
          ? `Today marks ${years} ${years === 1 ? "year" : "years"} of marriage. Congratulations!`
          : `Your ${ordinal(years)} celebration anniversary is coming up in ${daysBefore} days.`,
        "Why not add a memory from this year to your EverMore page?",
      ],
      { label: "Add a memory", url },
    ),
};

export function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
