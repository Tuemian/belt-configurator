import { useState, type ReactNode, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/hooks/use-language';
import { t } from '@/lib/i18n';
import logo from '@/assets/logo.svg';

const STORAGE_KEY = 'profile-configurator.unlocked';

/**
 * Einfaches Beta-Passwort-Gate (kein Account nötig) für /profile-configurator.
 * Bewusst nur clientseitig — dient als Zugangsbremse für die Beta, nicht als
 * echte Sicherheitsgrenze (das Passwort landet im JS-Bundle). Admin-Bereiche
 * bleiben über die echte Supabase-Anmeldung (`ProtectedRoute`/`AdminRoute`) abgesichert.
 */
export default function ProfilePasswordGate({ children }: { children: ReactNode }) {
  const [lang] = useLanguage();
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (unlocked) return <>{children}</>;

  const expected = import.meta.env.VITE_PROFILE_BETA_PASSWORD as string | undefined;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!expected) {
      setError('Kein Beta-Passwort konfiguriert (VITE_PROFILE_BETA_PASSWORD fehlt).');
      return;
    }
    if (password === expected) {
      localStorage.setItem(STORAGE_KEY, '1');
      setUnlocked(true);
    } else {
      setError(t('hubPasswordError', lang));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.18),_transparent_35%),linear-gradient(180deg,_#f8fcff_0%,_#eef6fb_48%,_#ffffff_100%)] px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center gap-3 mb-6">
          <img src={logo} alt="NOVAMOTIS Logo" className="h-14 w-auto" />
          <div className="flex items-center gap-2 text-primary">
            <Lock className="w-4 h-4" />
            <h1 className="text-lg font-semibold text-foreground">{t('hubPasswordTitle', lang)}</h1>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="beta-password">{t('hubPasswordLabel', lang)}</Label>
            <Input
              id="beta-password"
              type="password"
              autoComplete="off"
              autoFocus
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button type="submit" className="w-full">{t('hubOpenTool', lang)}</Button>
        </form>
      </div>
    </div>
  );
}
