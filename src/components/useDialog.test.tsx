import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@/test/user';
import { useDialog } from './useDialog';

function Harness({ onResult }: { onResult: (v: unknown) => void }) {
  const { confirm, notify, dialog } = useDialog();
  return (
    <>
      <button onClick={async () => onResult(await confirm('متأكد؟'))}>ask</button>
      <button onClick={async () => onResult(await notify('تنبيه'))}>tell</button>
      {dialog}
    </>
  );
}

const setup = () => {
  const onResult = vi.fn();
  render(<Harness onResult={onResult} />);
  return onResult;
};

describe('useDialog', () => {
  it('renders nothing until asked', () => {
    setup();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('confirm resolves true on the confirm button, and the dialog is named by its message', async () => {
    const onResult = setup();
    await userEvent.click(screen.getByText('ask'));
    expect(screen.getByRole('dialog', { name: 'متأكد؟' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد' }));
    expect(onResult).toHaveBeenCalledWith(true);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('confirm resolves false on cancel', async () => {
    const onResult = setup();
    await userEvent.click(screen.getByText('ask'));
    await userEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    expect(onResult).toHaveBeenCalledWith(false);
  });

  it('confirm resolves false when Escape is pressed (the dialog cancel event)', async () => {
    const onResult = setup();
    await userEvent.click(screen.getByText('ask'));
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('notify shows a single button and resolves when it is pressed', async () => {
    const onResult = setup();
    await userEvent.click(screen.getByText('tell'));
    expect(screen.queryByRole('button', { name: 'إلغاء' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'حسناً' }));
    expect(onResult).toHaveBeenCalledWith(undefined);
  });
});
