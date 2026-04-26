import { useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Mail, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  buildProfileInquiryPdf,
  buildProfileInquirySummary,
  getInquiryPdfFilename,
  type CartItemLike,
  type CustomerInfo,
} from '@/lib/profile-pdf';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItemLike[];
  onSubmitted: () => void;
}

const fmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // strip data:...;base64,
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function ProfileInquiryDialog({ open, onOpenChange, cart, onSubmitted }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    message: '',
    privacy: false,
  });
  const [desiredDelivery, setDesiredDelivery] = useState<Date | undefined>();
  const [deliveryFlexibility, setDeliveryFlexibility] = useState<'on' | 'asap' | 'around'>('on');
  const [sending, setSending] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const total = cart.reduce((s, i) => s + i.price.total, 0);
  const canSubmit = form.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && form.privacy && cart.length > 0;

  const formatDeliveryForPdf = (): string | undefined => {
    if (!desiredDelivery) return deliveryFlexibility === 'asap' ? 'schnellstmöglich' : undefined;
    const datePart = format(desiredDelivery, 'dd.MM.yyyy', { locale: de });
    if (deliveryFlexibility === 'around') return `ca. ${datePart} (±1 Woche)`;
    if (deliveryFlexibility === 'asap') return `schnellstmöglich, spätestens ${datePart}`;
    return datePart;
  };

  const customer = (): CustomerInfo => ({
    name: form.name.trim(),
    company: form.company.trim() || undefined,
    email: form.email.trim(),
    phone: form.phone.trim() || undefined,
    message: form.message.trim() || undefined,
    desiredDelivery: formatDeliveryForPdf(),
  });

  const handleDownload = async () => {
    setDownloadingPdf(true);
    try {
      const blob = await buildProfileInquiryPdf(cart, form.name ? customer() : null);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getInquiryPdfFilename();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: 'PDF heruntergeladen' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Fehler beim PDF-Export' });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSending(true);
    try {
      const cust = customer();
      const pdfBlob = await buildProfileInquiryPdf(cart, cust);
      const pdfBase64 = await blobToBase64(pdfBlob);
      const summary = buildProfileInquirySummary(cart);

      const response = await fetch('/api/send-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang: 'de',
          form: {
            name: cust.name,
            company: cust.company,
            email: cust.email,
            phone: cust.phone,
            message: cust.message,
            desiredDelivery: cust.desiredDelivery,
          },
          summary,
          attachment: {
            filename: getInquiryPdfFilename(),
            contentType: 'application/pdf',
            contentBase64: pdfBase64,
          },
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Inquiry failed (${response.status}): ${errBody}`);
      }

      toast({
        title: 'Anfrage gesendet',
        description: 'Vielen Dank! Sie erhalten eine Bestätigung per E-Mail. Eine Kopie geht an office@novamotis.com.',
      });
      setForm({ name: '', company: '', email: '', phone: '', message: '', privacy: false });
      onSubmitted();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast({
        title: 'Fehler beim Senden',
        description: 'Bitte versuchen Sie es erneut oder schreiben Sie an office@novamotis.com.',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Anfrage senden</DialogTitle>
          <DialogDescription>
            {cart.length} Position{cart.length !== 1 ? 'en' : ''} · Richtpreis netto&nbsp;
            <span className="font-semibold text-primary">{fmt.format(total)}</span>. Sie erhalten eine
            Bestätigung mit PDF-Datenblatt; eine Kopie geht an <code className="text-[11px]">office@novamotis.com</code>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 mt-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Firma</Label>
              <Input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="h-9"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">E-Mail *</Label>
              <Input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Telefon</Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="h-9"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Nachricht / Anmerkungen</Label>
            <Textarea
              rows={3}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="text-sm"
              placeholder="Liefertermin, besondere Anforderungen, Lieferanschrift …"
            />
          </div>

          <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer pt-1">
            <Checkbox
              checked={form.privacy}
              onCheckedChange={(v) => setForm({ ...form, privacy: !!v })}
              className="mt-0.5"
            />
            <span>
              Ich stimme der{' '}
              <a href="https://www.novamotis.com/datenschutz" target="_blank" rel="noreferrer" className="text-primary underline">
                Datenschutzerklärung
              </a>{' '}
              zu. *
            </span>
          </label>

          <DialogFooter className="!justify-between sm:!justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={downloadingPdf || cart.length === 0}
              className="gap-1.5"
            >
              {downloadingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              PDF herunterladen
            </Button>
            <Button type="submit" disabled={!canSubmit || sending} className="gap-2 font-semibold">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {sending ? 'Wird gesendet …' : 'Anfrage absenden'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
