import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/hooks/use-language';
import { t } from '@/lib/i18n';
import {
  getToolPassword,
  isToolProtected,
  isToolUnlocked,
  unlockTool,
} from '@/lib/tool-access';

interface ProtectedRouteProps {
  slug: string;
  children: ReactNode;
}

const ProtectedRoute = ({ slug, children }: ProtectedRouteProps) => {
  const [lang] = useLanguage();
  const [unlocked, setUnlocked] = useState(() => isToolUnlocked(slug));
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState(false);

  if (!isToolProtected(slug) || unlocked) {
    return <>{children}</>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd === getToolPassword(slug)) {
      unlockTool(slug);
      setUnlocked(true);
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.18),_transparent_35%),linear-gradient(180deg,_#f8fcff_0%,_#eef6fb_48%,_#ffffff_100%)] px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-semibold">{t('hubPasswordTitle', lang)}</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">{t('hubPasswordLabel', lang)}</Label>
            <Input
              type="password"
              autoFocus
              value={pwd}
              onChange={(e) => {
                setPwd(e.target.value);
                setError(false);
              }}
            />
            {error && (
              <p className="text-xs text-red-500">{t('hubPasswordError', lang)}</p>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 pt-2">
            <Button asChild variant="ghost" type="button">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-1" />
                {t('toolOverviewBack', lang)}
              </Link>
            </Button>
            <Button type="submit">{t('hubOpenTool', lang)}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProtectedRoute;
