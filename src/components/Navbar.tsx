import { useState } from 'react';
import { Moon, Sun, Menu, X, Calendar, List, FileText, Settings, Star, BarChart2, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from './Logo';
import type { PageId, Theme } from '@/types';

const NAV_ITEMS: { id: PageId; label: string; icon: LucideIcon }[] = [
  { id: 'calendar', label: 'التقويم', icon: Calendar },
  { id: 'events', label: 'المناسبات', icon: List },
  { id: 'request', label: 'طلب حجز', icon: FileText },
  { id: 'reviews', label: 'التقييمات', icon: Star },
  { id: 'stats', label: 'الإحصائيات', icon: BarChart2 },
  { id: 'admin', label: 'الإدارة', icon: Settings },
];

interface NavbarProps {
  activePage: PageId;
  setActivePage: (page: PageId) => void;
  theme: Theme;
  toggleTheme: () => void;
}

export default function Navbar({ activePage, setActivePage, theme, toggleTheme }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNav = (id: PageId) => {
    setActivePage(id);
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-card/90 backdrop-blur-md shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <button
            onClick={() => handleNav('calendar')}
            className="flex items-center gap-3 text-primary hover:opacity-80 transition-opacity"
          >
            <Logo size={36} />
            <div className="text-right hidden sm:block">
              <p className="font-heading font-bold text-base leading-tight text-primary">مناسبات</p>
              <p className="font-heading font-bold text-base leading-tight text-foreground">آل سلهب</p>
            </div>
            <div className="text-right sm:hidden">
              <p className="font-heading font-bold text-sm leading-tight text-primary">آل سلهب</p>
            </div>
          </button>

          {/* Desktop Nav */}
          <nav aria-label="التنقل الرئيسي" className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                aria-current={activePage === id ? 'page' : undefined}
                onClick={() => handleNav(id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-body font-medium transition-all duration-200
                  ${activePage === id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full text-muted-foreground hover:text-foreground"
              aria-label={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
              title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden rounded-full"
              onClick={() => setMenuOpen(v => !v)}
              aria-label="القائمة"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <nav id="mobile-menu" aria-label="قائمة الجوال" className="md:hidden border-t border-border/60 bg-card animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                aria-current={activePage === id ? 'page' : undefined}
                onClick={() => handleNav(id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-body font-medium transition-all
                  ${activePage === id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}