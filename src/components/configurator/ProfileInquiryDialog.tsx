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
import { supabase } from '@/integrations/supabase/client';
import {
  buildProfileInquiryPdf,
  buildProfileInquirySummary,
  getInquiryPdfFilename,
  type CartItemLike,
  type CustomerInfo,
} from '@/lib/profile-pdf';

// Ein aus dem NOVAMOTIS-Webshop übernommener Warenkorbeintrag (siehe
// ?fromShop=… Parameter, gesetzt vom Shop beim Verlinken hierher).
export interface ShopHandoffItem {
  title: string;
  sku: string | null;
  quantityLabel: string;
  lineTotal: string;
}

// Vorlaufzeit für die Fertigung/Lieferung — der Liefertermin ist erst ab
// diesem Datum wählbar.
const MIN_DELIVERY_LEAD_DAYS = 7;

function getMinDeliveryDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + MIN_DELIVERY_LEAD_DAYS);
  return d;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItemLike[];
  shopItems?: ShopHandoffItem[];
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

export function ProfileInquiryDialog({ open, onOpenChange, cart, shopItems = [], onSubmitted }: Props) {
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
  const minDeliveryDate = getMinDeliveryDate();
  const [sending, setSending] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const total = cart.reduce((s, i) => s + i.price.total, 0);
  const onRequestCount = cart.filter((i) => i.price.onRequest).length;
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
      const shopSummary = shopItems.length
        ? '\n\n--- Zusätzlich aus dem Webshop ---\n' +
          shopItems
            .map((i) => `- ${i.title}${i.sku ? ` (Art.-Nr. ${i.sku})` : ''}: ${i.quantityLabel} — ${i.lineTotal}`)
            .join('\n')
        : '';
      const summary = buildProfileInquirySummary(cart) + shopSummary;

      // Selbe Supabase Edge Function wie der Gurtförderer-Konfigurator
      // (siehe StepSummary.tsx) statt der alten Vercel-Route — ein
      // einheitlicher Versandweg für beide Tools.
      const { data, error } = await supabase.functions.invoke('send-inquiry', {
        body: {
          type: 'profile',
          lang: 'de',
          form: {
            name: cust.name,
            company: cust.company,
            email: cust.email,
            phone: cust.phone,
            message: cust.message,
            desiredDelivery: cust.desiredDelivery,
          },
          configuration: cart,
          summary,
          attachment: {
            filename: getInquiryPdfFilename(),
            contentType: 'application/pdf',
            contentBase64: pdfBase64,
          },
        },
      });

      if (error) {
        throw new Error(`Inquiry request failed: ${error.message}`);
      }
      if (data && (data as { error?: string }).error) {
        throw new Error((data as { error: string }).error);
      }

      toast({
        title: 'Anfrage gesendet',
        description: 'Vielen Dank! Sie erhalten eine Bestätigung per E-Mail. Eine Kopie geht an office@novamotis.com.',
      });
      setForm({ name: '', company: '', email: '', phone: '', message: '', privacy: false });
      setDesiredDelivery(undefined);
      setDeliveryFlexibility('on');
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
            {cart.length} Position{cart.length !== 1 ? 'en' : ''} ·{' '}
            {onRequestCount === cart.length ? (
              <span className="font-semibold text-primary">Preis auf Anfrage</span>
            ) : (
              <>
                Richtpreis netto&nbsp;
                <span className="font-semibold text-primary">{fmt.format(total)}</span>
                {onRequestCount > 0 && <> zzgl. Preis auf Anfrage für {onRequestCount} Position{onRequestCount !== 1 ? 'en' : ''}</>}
              </>
            )}
            . Sie erhalten eine
            Bestätigung mit PDF-Datenblatt; eine Kopie geht an <code className="text-[11px]">office@novamotis.com</code>.
            {shopItems.length > 0 && (
              <>
                {' '}
                Zusätzlich werden {shopItems.length} Artikel aus Ihrem Webshop-Warenkorb in diese Anfrage
                übernommen.
              </>
            )}
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
              placeholder="Besondere Anforderungen, Lieferanschrift …"
            />
          </div>

          {/* Wunschliefertermin */}
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 text-primary" />
              Wunschliefertermin
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Frühestens ab {format(minDeliveryDate, 'd. MMMM yyyy', { locale: de })} wählbar (Vorlaufzeit für Fertigung &amp; Versand).
            </p>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      'h-9 flex-1 justify-start text-left font-normal',
                      !desiredDelivery && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {desiredDelivery
                      ? format(desiredDelivery, 'EEEE, d. MMMM yyyy', { locale: de })
                      : 'Datum auswählen'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={desiredDelivery}
                    onSelect={setDesiredDelivery}
                    disabled={(d) => d < minDeliveryDate}
                    defaultMonth={minDeliveryDate}
                    initialFocus
                    locale={de}
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
              {desiredDelivery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2 text-xs text-muted-foreground"
                  onClick={() => setDesiredDelivery(undefined)}
                >
                  Zurücksetzen
                </Button>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {([
                { v: 'on', label: 'Genau an diesem Tag' },
                { v: 'around', label: 'Etwa zu diesem Termin' },
                { v: 'asap', label: 'So schnell wie möglich' },
              ] as const).map((opt) => (
                <button
                  type="button"
                  key={opt.v}
                  onClick={() => setDeliveryFlexibility(opt.v)}
                  className={cn(
                    'px-2.5 py-1 text-[11px] rounded-full border transition-colors',
                    deliveryFlexibility === opt.v
                      ? 'bg-primary/10 border-primary text-primary font-semibold'
                      : 'bg-white border-slate-200 text-muted-foreground hover:border-primary/40',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
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
