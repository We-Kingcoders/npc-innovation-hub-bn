// Every existing email-sending controller in this codebase (hire.controller.ts,
// admin/hire.controller.ts) interpolates user-supplied values (name, email,
// message, ...) directly into renderBrandedEmail's bodyHtml with no
// escaping - a real HTML/markup-injection risk in how the message renders
// in the recipient's email client (an admin viewing a submitted message
// with `<img src=x onerror=...>` in it, or a reply email rendering
// attacker-supplied markup). New email-sending code should escape any
// user-controlled value before interpolating it into bodyHtml.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
