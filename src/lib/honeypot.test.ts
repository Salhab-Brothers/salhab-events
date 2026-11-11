import { describe, it, expect } from 'vitest';
import { honeypotTripped } from './honeypot';

const formWith = (value: string) => {
  const form = document.createElement('form');
  const input = document.createElement('input');
  input.name = 'website';
  input.value = value;
  form.appendChild(input);
  return form;
};

describe('honeypotTripped', () => {
  it('is false when the hidden field is empty', () => {
    expect(honeypotTripped(formWith(''))).toBe(false);
  });

  it('is true when a bot filled the hidden field', () => {
    expect(honeypotTripped(formWith('http://spam.example'))).toBe(true);
  });
});
