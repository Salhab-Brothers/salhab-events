/** Same rule the submit function applies on the server: 7 to 15 digits, with spaces, +, - and brackets allowed. */
const ALLOWED = /^[\d\s+\-()]+$/;

export const PHONE_ERROR = 'رقم الهاتف غير صالح. أدخل من 7 إلى 15 رقماً.';

export function isValidPhone(value: string): boolean {
  const phone = value.trim();
  const digits = phone.replace(/\D/g, '').length;
  return ALLOWED.test(phone) && digits >= 7 && digits <= 15;
}
