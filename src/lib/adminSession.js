import { useEffect, useState } from 'react';
import { supabase } from '@/api/api';

// Admin accounts are created in the Supabase dashboard with this derived
// address (auto-confirmed); admins still type only their phone number.
// example.com is reserved, so no mail can ever reach a real inbox.
export const phoneToEmail = (phone) => {
  const digits = String(phone).replace(/\D/g, '');
  const intl = digits.startsWith('0') ? `972${digits.slice(1)}` : digits;
  return `${intl}@admin.example.com`;
};

export const signInAdmin = async (phone, password) => {
  const { error } = await supabase.auth.signInWithPassword({ email: phoneToEmail(phone), password });
  if (error) throw error;
};

export const signOutAdmin = () => supabase.auth.signOut();

// UI convenience only; the real gate is row-level security in the database.
export function useIsAdmin() {
  const [state, setState] = useState({ isAdmin: false, loading: true });

  useEffect(() => {
    const check = async (session) => {
      if (!session) return setState({ isAdmin: false, loading: false });
      const { data } = await supabase.rpc('is_admin');
      setState({ isAdmin: data === true, loading: false });
    };
    supabase.auth.getSession().then(({ data }) => check(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // defer: Supabase forbids awaiting other client calls inside this callback
      setTimeout(() => check(session), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return state;
}
