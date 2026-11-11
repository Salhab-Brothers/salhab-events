import { describe, it, expect } from 'vitest';
import {
  TIME_SLOT_LABELS, STATUS_LABELS, REQUEST_STATUS_LABELS, normalizeSlot, BOOKABLE_SLOTS,
} from './data';
import type { TimeSlot } from '@/types';

describe('data labels', () => {
  it('labels every current and legacy time slot', () => {
    const slots: TimeSlot[] = ['lunch', 'afternoon', 'wedding', 'full', 'morning', 'evening'];
    for (const k of slots) {
      expect(TIME_SLOT_LABELS[k]).toBeTruthy();
    }
    expect(TIME_SLOT_LABELS.morning).toBe(TIME_SLOT_LABELS.lunch);
    expect(TIME_SLOT_LABELS.evening).toBe(TIME_SLOT_LABELS.wedding);
  });

  it('labels every booking and request status', () => {
    expect(Object.keys(STATUS_LABELS)).toEqual(['confirmed', 'pending', 'cancelled']);
    expect(Object.keys(REQUEST_STATUS_LABELS)).toEqual(['pending', 'approved', 'rejected']);
  });
});

describe('normalizeSlot', () => {
  it('maps legacy slots and leaves current ones alone', () => {
    expect(normalizeSlot('morning')).toBe('lunch');
    expect(normalizeSlot('evening')).toBe('wedding');
    expect(normalizeSlot('afternoon')).toBe('afternoon');
    expect(normalizeSlot('full')).toBe('full');
    expect(normalizeSlot('lunch')).toBe('lunch');
    expect(normalizeSlot('wedding')).toBe('wedding');
  });
});

describe('BOOKABLE_SLOTS', () => {
  it('offers the four current slots with their labels', () => {
    expect(BOOKABLE_SLOTS.map((s) => s.value)).toEqual(['lunch', 'afternoon', 'wedding', 'full']);
    BOOKABLE_SLOTS.forEach((s) => expect(s.label).toBe(TIME_SLOT_LABELS[s.value]));
  });
});
