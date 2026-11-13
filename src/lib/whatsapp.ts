import { formatFullDateStr } from '@/lib/levantineMonths';
import { TIME_SLOT_LABELS } from '@/lib/data';
import type { BookingRequest } from '@/types';

/** Digits for wa.me: a number starting with one 0 is a local one and gets the 972 country code. */
export function whatsappDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) return digits.slice(2);
  return digits.startsWith('0') ? '972' + digits.slice(1) : digits;
}

/** The reply to a request, ready to send; null while the request has not been decided. */
export function replyText(req: BookingRequest): string | null {
  const when = `${formatFullDateStr(req.date)} (${TIME_SLOT_LABELS[req.time_slot]})`;
  if (req.status === 'approved') return `السلام عليكم ${req.first_name}، تم قبول طلبك لـ "${req.event_name}" يوم ${when}. نتشرف بكم.`;
  if (req.status === 'rejected') return `السلام عليكم ${req.first_name}، نعتذر، لم نتمكن من قبول طلبك لـ "${req.event_name}" يوم ${when}. تواصل معنا لاختيار موعد آخر.`;
  return null;
}

/** Link that opens WhatsApp with the reply already written (null when there is nothing to say yet). */
export function replyLink(req: BookingRequest): string | null {
  const text = replyText(req);
  return text && `https://wa.me/${whatsappDigits(req.phone)}?text=${encodeURIComponent(text)}`;
}
