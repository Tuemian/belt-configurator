import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import {
  PROFILE_SECTIONS,
  type ProfileConfig,
  calculateProfilePrice,
} from '@/lib/profile-configurator-types';

interface CartItem {
  id: string;
  config: ProfileConfig;
  price: ReturnType<typeof calculateProfilePrice>;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  cartTotal: number;
  onSuccess: () => void;
}

const fmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

function buildSummaryText(cart: CartItem[], cartTotal: number): string {
  const lines: string[] = [];
  lines.push('NOVAMOTIS – Profil-Konfigurator – Anfrage');
  lines.push('='.repeat(50));
  lines.push('');
  cart.forEach((item, idx) => {
    const s = PROFILE_SECTIONS.find((p) => p.id === item.config.sectionId)!;
    lines.push(`Position ${idx + 1}: ${s.label}`);
    lines.push(`  Länge: ${item.config.length} mm`);
    lines.push(`  Menge: ${item.config.quantity} Stk.`);
    if (item.config.angleStart !== 0) lines.push(`  Schrägschnitt Start: ${item.config.angleStart}°`);
    if (item.config.angleEnd !== 0) lines.push(`  Schrägschnitt Ende: ${item.config.angleEnd}°`);
    if (item.config.endStart.thread) lines.push('  Gewinde Start: M8');
    if (item.config.endEnd.thread) lines.push('  Gewinde Ende: M8');
    if (item.config.holes.length > 0) {
      lines.push(`  Bohrungen: ${item.config.holes.map((h) => `${h.label} @ ${h.zPosition}mm`).join(', ')}`);
    }
    if (item.config.connectors.length > 0) {
      lines.push(`  Verbinder: ${item.config.connectors.map((c) => `${c.label} @ ${c.zPosition}mm`).join(', ')}`);
    }
    lines.push(`  Positionspreis: ${fmt.format(item.price.total)}`);
    lines.push('');
  });
  lines.push('-'.repeat(50));
  lines.push(`Gesamtpreis (Richtwert, netto): ${fmt.format(cartTotal)}`);
  return lines.join('\n');
}

function buildPdfBlob(cart: CartItem[], cartTotal: number, customerName: string): Blob {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  let y = 18;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(0, 51, 102);
  pdf.text('NOVAMOTIS – Profil-Konfigurator', 15, y);
  y += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(80, 80, 80);
  pdf.text(`Anfrage von: ${customerName}`, 15, y);
  pdf.text(new Date().toLocaleDateString('de-DE'), pageWidth - 15, y, { align: 'right' });
  y += 8;

  pdf.setDrawColor(200, 200, 200);
  pdf.line(15, y, pageWidth - 15, y);
  y += 6;

  cart.forEach((item, idx) => {
    if (y > 260) {
      pdf.addPage();
      y = 18;
    }
    const s = PROFILE_SECTIONS.find((p) => p.id === item.config.sectionId)!;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(0, 51, 102);
    pdf.text(`Position ${idx + 1}: ${s.label}`, 15, y);
    y += 5;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(50, 50, 50);
    const details: string[] = [
      `Länge: ${item.config.length} mm   ·   Menge: ${item.config.quantity} Stk.`,
    ];
    if (item.config.angleStart !== 0) details.push(`Schrägschnitt Start: ${item.config.angleStart}°`);
    if (item.config.angleEnd !== 0) details.push(`Schrägschnitt Ende: ${item.config.angleEnd}°`);
    if (item.config.endStart.thread) details.push('Gewinde Start: M8');
    if (item.config.endEnd.thread) details.push('Gewinde Ende: M8');
    if (item.config.holes.length > 0) {
      details.push(`Bohrungen: ${item.config.holes.map((h) => `${h.label} @ ${h.zPosition}mm`).join(', ')}`);
    }
    if (item.config.connectors.length > 0) {
      details.push(`Verbinder: ${item.config.connectors.map((c) => `${c.label} @ ${c.zPosition}mm`).join(', ')}`);
    }
    details.forEach((d) => {
      pdf.text(d, 18, y);
      y += 4.4;
    });
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 51, 102);
    pdf.text(`Positionspreis: ${fmt.format(item.price.total)}`, 18, y);
    y += 7;
  });

  if (y > 250) {
    pdf.addPage();
    y = 18;
  }
  pdf.setDrawColor(200, 200, 200);
  pdf.line(15, y, pageWidth - 15, y);
  y += 6;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(0, 51, 102);
  pdf.text(`Gesamtpreis (Richtwert, netto): ${fmt.format(cartTotal)}`, 15, y);
  y += 6;

  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 120);
  pdf.text(
    'Unverbindlicher Richtpreis. Finaler Preis nach technischer Prüfung durch NOVAMOTIS.',
    15,
    y,
  );

  return pdf.output('blob');
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function ProfileInquiryDialog({
  open,
  onOpenChange,
  cart,
  cartTotal,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    message: '',
    privacy: false,
  });
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.privacy || !form.name.trim() || !form.email.trim()) return;

    setSending(true);
    try {
      const summary = buildSummaryText(cart, cartTotal);
      const pdfBlob = buildPdfBlob(cart, cartTotal, form.name);
      const pdfBase64 = await blobToBase64(pdfBlob);
      const filename = `novamotis-profil-anfrage-${new Date().toISOString().slice(0, 10)}.pdf`;

      const { data, error } = await supabase.functions.invoke('send-inquiry', {
        body: {
          type: 'profile',
          lang: 'de',
          form: {
            name: form.name,
            company: form.company,
            email: form.email,
            phone: form.phone,
            message: form.message,
          },
          configuration: {
            cart: cart.map((item) => ({
              id: item.id,
              config: item.config,
              price: item.price,
            })),
            cartTotal,
          },
          summary,
          attachment: {
            filename,
            contentType: 'application/pdf',
            contentBase64: pdfBase64,
          },
        },
      });

      if (error) throw new Error(error.message);
      if (data && (data as { error?: string }).error) {
        throw new Error((data as { error: string }).error);
      }

      toast({
        title: 'Anfrage gesendet',
        description: 'Vielen Dank! Wir melden uns in Kürze bei Ihnen.',
      });
      setForm({ name: '', company: '', email: '', phone: '', message: '', privacy: false });
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error('Profile inquiry error:', err);
      toast({
        title: 'Fehler beim Senden',
        description:
          err instanceof Error ? err.message : 'Bitte versuchen Sie es später erneut.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Anfrage senden</DialogTitle>
          <DialogDescription>
            {cart.length} Position{cart.length !== 1 ? 'en' : ''} · Richtwert{' '}
            <span className="font-semibold text-primary">{fmt.format(cartTotal)}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pi-name">Name *</Label>
              <Input
                id="pi-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="pi-company">Firma</Label>
              <Input
                id="pi-company"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pi-email">E-Mail *</Label>
              <Input
                id="pi-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="pi-phone">Telefon</Label>
              <Input
                id="pi-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="pi-message">Nachricht</Label>
            <Textarea
              id="pi-message"
              rows={3}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>

          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={form.privacy}
              onCheckedChange={(checked) =>
                setForm({ ...form, privacy: checked === true })
              }
            />
            <span>
              Ich akzeptiere, dass meine Angaben zur Bearbeitung der Anfrage gespeichert und
              verarbeitet werden.
            </span>
          </label>

          <DialogFooter>
            <Button
              type="submit"
              disabled={sending || !form.privacy || !form.name.trim() || !form.email.trim()}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {sending ? 'Wird gesendet...' : 'Anfrage senden'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
