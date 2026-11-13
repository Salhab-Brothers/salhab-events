import { useState, type FormEvent } from 'react';
import { Lock, Phone, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Logo from './Logo';
import { signInAdmin } from '@/lib/adminSession';

export default function AdminAuth() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInAdmin(phone, password);
    } catch {
      setError('رقم الهاتف أو كلمة المرور غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[65dvh] flex items-center justify-center py-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="text-primary"><Logo size={56} /></div>
          </div>
          <h1 className="font-heading font-bold text-2xl text-foreground">مناسبات آل سلهب</h1>
          <p className="font-body text-muted-foreground text-sm mt-1">لوحة الإدارة</p>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Lock size={18} className="text-primary" />
            <h2 className="font-heading font-bold text-lg text-foreground">تسجيل الدخول</h2>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-phone" className="font-body text-sm font-medium">رقم الهاتف</Label>
              <div className="relative">
                <Phone size={15} aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="admin-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="username"
                  placeholder="05xxxxxxxx"
                  value={phone}
                  onChange={e => { setPhone(e.target.value); setError(''); }}
                  className="font-body pr-9"
                  dir="ltr"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-password" className="font-body text-sm font-medium">كلمة المرور</Label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  aria-pressed={showPw}
                  className="absolute left-0 top-0 flex h-full w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPw ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                </button>
                <Input
                  id="admin-password"
                  autoComplete="current-password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  className="font-body pl-11"
                  dir="ltr"
                  required
                />
              </div>
            </div>
            {error && <p className="text-sm font-body text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full font-body mt-2">دخول</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
