import userEvent from '@testing-library/user-event';

// user-event waits a macrotask between every keystroke and click by default (delay: 0),
// which dominates test time. delay: null runs the same events back to back.
const fresh = () => userEvent.setup({ delay: null });

export default {
  click: (el: Element) => fresh().click(el),
  type: (el: Element, text: string) => fresh().type(el, text),
  clear: (el: Element) => fresh().clear(el),
};
