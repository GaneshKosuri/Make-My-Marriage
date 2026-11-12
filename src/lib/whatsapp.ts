/**
 * WhatsApp sharing without any WhatsApp API integration (PRD §9.14): the
 * button opens WhatsApp with a pre-filled message; the user picks the chat.
 */

export function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export interface InvitationShareMessageInput {
  /** e.g. "Akshay & Princi" */
  coupleNames: string;
  guestName?: string;
  invitationUrl: string;
}

/**
 * The message a family sends with a guest's link: a greeting by name, the
 * couple, and where to see the invitation and reply.
 */
export function buildInvitationShareMessage({
  coupleNames,
  guestName,
  invitationUrl,
}: InvitationShareMessageInput): string {
  const greeting = guestName ? `Dear ${guestName},\n\n` : "";
  return `${greeting}${coupleNames} would love for you to celebrate their wedding with them.\n\nPlease see your invitation and let us know if you can come: ${invitationUrl}`;
}
