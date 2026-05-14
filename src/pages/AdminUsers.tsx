import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

type Row = { id: string; user_id: string; role: string; created_at: string };

export default function AdminUsers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [newId, setNewId] = useState('');
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('user_roles').select('*').eq('role', 'admin').order('created_at');
    if (error) toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const addAdmin = async () => {
    const uid = newId.trim();
    if (!uid) return;
    const { error } = await supabase.from('user_roles').insert({ user_id: uid, role: 'admin' });
    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'destructive' }); return; }
    setNewId('');
    void load();
  };

  const removeAdmin = async (id: string) => {
    if (!window.confirm('Admin-Rolle wirklich entfernen?')) return;
    const { error } = await supabase.from('user_roles').delete().eq('id', id);
    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'destructive' }); return; }
    void load();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Link to="/admin/pricing" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-xl font-semibold">Admin-Nutzer</h1>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Card>
          <CardHeader><CardTitle>Neuen Admin hinzufügen</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            <Input placeholder="User-ID (UUID aus Auth)" value={newId} onChange={(e) => setNewId(e.target.value)} />
            <Button onClick={addAdmin}><Plus className="w-4 h-4 mr-2" />Hinzufügen</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Bestehende Admins</CardTitle></CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-muted-foreground">Lädt…</p> : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine Admins. Bitte zuerst von Lovable die erste Admin-Rolle setzen lassen.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase">
                  <tr><th className="text-left py-2">User-ID</th><th className="text-left py-2">Seit</th><th></th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="py-2 font-mono text-xs">{r.user_id}</td>
                      <td className="py-2">{new Date(r.created_at).toLocaleDateString('de-DE')}</td>
                      <td className="py-2 text-right">
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeAdmin(r.id)}><Trash2 className="w-4 h-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
