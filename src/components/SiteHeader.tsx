import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.svg';

interface SiteHeaderProps {
  title?: string;
  children?: ReactNode;
}

const SiteHeader = ({ title, children }: SiteHeaderProps) => {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 md:h-28 flex items-center gap-3 md:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground" aria-label="Zurück zur Startseite">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <img src={logo} alt="NOVAMOTIS Logo" width={160} height={80} className="h-12 md:h-20 w-auto" />
        {title && (
          <>
            <span className="text-slate-300 text-xl font-light hidden md:block">|</span>
            <span className="text-sm font-semibold tracking-wide text-muted-foreground uppercase hidden md:block">{title}</span>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">{children}</div>
      </div>
    </header>
  );
};

export default SiteHeader;
