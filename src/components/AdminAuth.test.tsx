import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@/test/user';

const { signInAdmin } = vi.hoisted(() => ({ signInAdmin: vi.fn() }));
vi.mock('@/lib/adminSession', () => ({ signInAdmin }));

import AdminAuth from './AdminAuth';

beforeEach(() => vi.clearAllMocks());

const fill = async (phone: string, password: string) => {
  await userEvent.type(screen.getByLabelText(/رقم الهاتف/), phone);
  await userEvent.type(screen.getByLabelText('كلمة المرور'), password);
};

describe('AdminAuth', () => {
  it('signs in with the typed phone and password', async () => {
    signInAdmin.mockResolvedValue(undefined);
    render(<AdminAuth />);
    await fill('0501234567', 'secret');
    await userEvent.click(screen.getByRole('button', { name: 'دخول' }));
    await waitFor(() => expect(signInAdmin).toHaveBeenCalledWith('0501234567', 'secret'));
    expect(screen.queryByText(/غير صحيحة/)).toBeNull();
  });

  it('shows an error and clears it when typing again', async () => {
    signInAdmin.mockRejectedValue(new Error('bad'));
    render(<AdminAuth />);
    await fill('0501234567', 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'دخول' }));
    expect(await screen.findByText('رقم الهاتف أو كلمة المرور غير صحيحة')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('كلمة المرور'), 'x');
    expect(screen.queryByText(/غير صحيحة/)).toBeNull();
    await userEvent.type(screen.getByLabelText(/رقم الهاتف/), '1');
    expect(screen.queryByText(/غير صحيحة/)).toBeNull();
  });

  it('disables the button while signing in', async () => {
    let resolve!: () => void;
    signInAdmin.mockReturnValue(new Promise<void>((r) => { resolve = r; }));
    render(<AdminAuth />);
    await fill('0501234567', 'secret');
    await userEvent.click(screen.getByRole('button', { name: 'دخول' }));
    expect(screen.getByRole('button', { name: 'دخول' })).toBeDisabled();
    resolve();
    await waitFor(() => expect(screen.getByRole('button', { name: 'دخول' })).toBeEnabled());
  });

  it('toggles password visibility', async () => {
    render(<AdminAuth />);
    const pw = screen.getByLabelText('كلمة المرور');
    expect(pw).toHaveAttribute('type', 'password');
    const toggle = pw.parentElement!.querySelector('button[type="button"]')!;
    await userEvent.click(toggle);
    expect(pw).toHaveAttribute('type', 'text');
    await userEvent.click(toggle);
    expect(pw).toHaveAttribute('type', 'password');
  });
});
