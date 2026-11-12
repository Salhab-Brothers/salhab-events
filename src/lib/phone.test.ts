import { describe, it, expect } from 'vitest';
import { isValidPhone, PHONE_ERROR } from './phone';

describe('isValidPhone', () => {
  it.each(['0501234567', '+972 54-259-0959', '(02) 123 4567', '  0501234567  ', '1234567', '123456789012345'])(
    'accepts %s', (v) => expect(isValidPhone(v)).toBe(true));

  it.each(['', '   ', '12345', '1234567890123456', 'abc1234567', '050-123-45x7', '٠٥٠١٢٣٤٥٦٧', '+-() '])(
    'rejects %j', (v) => expect(isValidPhone(v)).toBe(false));

  it('has a readable Arabic error', () => expect(PHONE_ERROR).toMatch(/7 إلى 15/));
});
