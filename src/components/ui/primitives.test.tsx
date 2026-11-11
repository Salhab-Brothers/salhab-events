import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@/test/user';
import { Button, buttonVariants } from './button';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

describe('Button', () => {
  it('renders a button, forwards the ref and handles clicks', async () => {
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();
    render(<Button ref={ref} onClick={onClick}>حفظ</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('applies variant and size classes', () => {
    render(<Button variant="destructive" size="lg" className="extra">x</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-destructive');
    expect(btn.className).toContain('h-10');
    expect(btn.className).toContain('extra');
    expect(buttonVariants()).toContain('bg-primary');
  });

  it('can render its child element instead (asChild)', () => {
    render(<Button asChild><a href="/x">link</a></Button>);
    expect(screen.getByRole('link', { name: 'link' })).toHaveAttribute('href', '/x');
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('Input / Textarea / Label', () => {
  it('Input forwards props and ref', async () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} type="tel" placeholder="هاتف" className="c" />);
    const el = screen.getByPlaceholderText('هاتف');
    await userEvent.type(el, '05');
    expect(el).toHaveValue('05');
    expect(el).toHaveAttribute('type', 'tel');
    expect(ref.current).toBe(el);
    expect(el.className).toContain('c');
  });

  it('Textarea forwards props and ref', async () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} placeholder="ملاحظات" />);
    await userEvent.type(screen.getByPlaceholderText('ملاحظات'), 'نص');
    expect(ref.current).toHaveValue('نص');
  });

  it('Label renders its text and merges classes', () => {
    render(<Label htmlFor="x" className="mine">الاسم</Label>);
    const el = screen.getByText('الاسم');
    expect(el).toHaveAttribute('for', 'x');
    expect(el.className).toContain('mine');
  });
});

describe('Select', () => {
  it('shows a placeholder, opens, and reports the chosen value', async () => {
    const onValueChange = vi.fn();
    render(
      <Select onValueChange={onValueChange}>
        <SelectTrigger className="t"><SelectValue placeholder="الشهر" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="a" className="i">أ</SelectItem>
          <SelectItem value="b">ب</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByText('الشهر')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: 'ب' }));
    expect(onValueChange).toHaveBeenCalledWith('b');
  });

  it('supports non-popper positioning', async () => {
    render(
      <Select defaultOpen>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent position="item-aligned" className="c">
          <SelectItem value="a">أ</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(await screen.findByRole('option', { name: 'أ' })).toBeInTheDocument();
  });
});
