/** True when a bot filled the hidden "website" field that real visitors never see. */
export const honeypotTripped = (form: HTMLFormElement): boolean =>
  Boolean((form.elements.namedItem('website') as HTMLInputElement).value);
