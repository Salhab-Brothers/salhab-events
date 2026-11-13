import { describe, it, expect } from 'vitest';
import { whatsappDigits, replyText, replyLink } from './whatsapp';
import { makeRequest } from '@/test/factories';

describe('whatsappDigits', () => {
  it.each([
    ['0501234567', '972501234567'],
    ['050-123 4567', '972501234567'],
    ['+972 50 123 4567', '972501234567'],
    ['00972501234567', '972501234567'],
    ['(02) 123-4567', '97221234567'],
  ])('%s becomes %s', (input, out) => expect(whatsappDigits(input)).toBe(out));
});

describe('replies', () => {
  it('has nothing to say while a request is pending', () => {
    expect(replyText(makeRequest({ status: 'pending' }))).toBeNull();
    expect(replyLink(makeRequest({ status: 'pending' }))).toBeNull();
  });
  it('thanks the requester by first name when approved', () => {
    const text = replyText(makeRequest({ status: 'approved', first_name: 'خالد', event_name: 'غداء' }))!;
    expect(text).toContain('خالد');
    expect(text).toContain('تم قبول');
  });
  it('apologises when rejected', () => expect(replyText(makeRequest({ status: 'rejected' }))).toContain('نعتذر'));
  it('builds a wa.me link with the encoded text', () => {
    const link = replyLink(makeRequest({ status: 'approved', phone: '0501234567' }))!;
    expect(link.startsWith('https://wa.me/972501234567?text=')).toBe(true);
    expect(decodeURIComponent(link.split('text=')[1])).toBe(replyText(makeRequest({ status: 'approved', phone: '0501234567' })));
  });
});
