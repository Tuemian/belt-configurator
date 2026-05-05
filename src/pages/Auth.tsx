import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { t } from '@/lib/i18n';
import logo from '@/assets/logo.svg';

const AuthPage = () => {
  const [lang] = useLanguage();
  const { signIn, session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/profile-configurator';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate(redirectTo, { replace: true });
  }, [loading, session, redirectTo, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: err } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (err) setError(err);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.18),_transparent_35%),linear-gradient(180deg,_#f8fcff_0%,_#eef6fb_48%,_#ffffff_100%)] px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center gap-3 mb-6">
          <img src={logo} alt="NOVAMOTIS" className="h-14 w-auto" />
          <div className="flex items-center gap-2 text-primary">
            <Lock className="w-4 h-4" />
            <h1 className="text-lg font-semibold text-foreground">
              {lang === 'de' ? 'Login' : lang === 'it' ? 'Accesso' : 'Sign in'}
            </h1>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{lang === 'de' ? 'Passwort' : 'Password'}</Label>
            <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? '...' : lang === 'de' ? 'Anmelden' : lang === 'it' ? 'Accedi' : 'Sign in'}
          </Button>
          <Button asChild variant="ghost" type="button" className="w-full">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-1" />
              {t('toolOverviewBack', lang)}
            </Link>
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
