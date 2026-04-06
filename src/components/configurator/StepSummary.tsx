import { Language, t } from '@/lib/i18n';
import { ConveyorConfig } from '@/lib/configurator-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { FileDown, Send, RotateCcw, Wrench } from 'lucide-react';
import { useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import briefpapier from '@/assets/Briefpapier.pdf';

interface Props {
  config: ConveyorConfig;
  lang: Language;
  onReset: () => void;
}

function getBeltLabel(type: ConveyorConfig['beltType'], lang: Language) {
  const map = { standard: 'beltStandard', grip: 'beltGrip', 'heavy-grip': 'beltHeavyGrip', 'food-safe': 'beltFoodSafe' } as const;
  return t(map[type], lang);
}

function getDriveLabel(type: ConveyorConfig['driveType'], lang: Language) {
  const map = { direct: 'driveDirect', indirect: 'driveIndirect', center: 'driveCenter' } as const;
  return t(map[type], lang);
}

export const StepSummary = ({ config, lang, onReset }: Props) => {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', message: '', privacy: false });
  const [sending, setSending] = useState(false);
  const briefpapierImageRef = useRef<string | null>(null);

  const summaryRows = [
    {
      section: t('dimensions', lang),
      items: [
        [t('frameWidth', lang), `${config.frameWidth} mm`],
        [t('beltLength', lang), `${config.beltLength} mm`],
        [t('sideGuideHeight', lang), `${config.sideGuideHeight} mm`],
        [t('inclineAngle', lang), `${config.inclineAngle}°`],
      ],
    },
    {
      section: t('beltAndSpeed', lang),
      items: [
        [t('beltType', lang), getBeltLabel(config.beltType, lang)],
        [t('speed', lang), `${config.speed} m/min`],
        [t('loadCapacity', lang), `${config.loadCapacity} kg`],
      ],
    },
    {
      section: t('drive', lang),
      items: [
        [t('driveType', lang), getDriveLabel(config.driveType, lang)],
        [t('motorPosition', lang), config.motorPosition === 'left' ? t('motorLeft', lang) : t('motorRight', lang)],
        [t('motorAngle', lang), `${config.motorAngle}°`],
      ],
    },
    {
      section: t('standAndAccessories', lang),
      items: [
        [t('withStand', lang), config.withStand ? t('yes', lang) : t('no', lang)],
        ...(config.withStand ? [
          [t('standHeight', lang), `${config.standHeight} mm`],
          [t('floorElement', lang), config.floorElement === 'feet' ? t('adjustableFeet', lang) : t('castorWheels', lang)],
          [t('heightAdjust', lang), config.heightAdjust ? t('yes', lang) : t('no', lang)],
          [t('floorBolts', lang), config.floorBolts ? t('yes', lang) : t('no', lang)],
        ] : []),
      ],
    },
  ];

  const generatePdfContent = () => {
    let text = `NOVAMOTIS - ${t('configuratorTitle', lang)}\n${'='.repeat(50)}\n\n`;
    summaryRows.forEach(({ section, items }) => {
      text += `${section}\n${'-'.repeat(30)}\n`;
      items.forEach(([label, value]) => {
        text += `${label}: ${value}\n`;
      });
      text += '\n';
    });
    return text;
  };

  const getPdfFilename = () => (
    lang === 'de'
      ? 'novamotis-gurtfoerderer-konfiguration.pdf'
      : 'novamotis-belt-conveyor-configuration.pdf'
  );

  const getBriefpapierImage = async () => {
    if (briefpapierImageRef.current) {
      return briefpapierImageRef.current;
    }

    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = getDocument({ url: briefpapier, disableWorker: true });
    const pdfDocument = await loadingTask.promise;
    const page = await pdfDocument.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Canvas context unavailable');
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;
    const dataUrl = canvas.toDataURL('image/png');
    briefpapierImageRef.current = dataUrl;
    return dataUrl;
  };

  const buildPdfBlob = async () => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    try {
      const backgroundImage = await getBriefpapierImage();
      pdf.addImage(backgroundImage, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
    } catch (error) {
      console.error('Briefpapier render error:', error);
    }

    const leftX = 24;
    const rightX = pageWidth - 24;
    let cursorY = 48;

    pdf.setTextColor(0, 51, 102);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text(`NOVAMOTIS - ${t('configuratorTitle', lang)}`, leftX, cursorY);
    cursorY += 10;

    summaryRows.forEach(({ section, items }) => {
      pdf.setDrawColor(210, 210, 210);
      pdf.setLineWidth(0.4);
      pdf.line(leftX, cursorY, rightX, cursorY);
      cursorY += 7;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(0, 51, 102);
      pdf.text(section, leftX, cursorY);
      cursorY += 6;

      items.forEach(([label, value]) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(90, 90, 90);
        pdf.text(String(label), leftX, cursorY);

        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(40, 40, 40);
        pdf.text(String(value), rightX, cursorY, { align: 'right' });
        cursorY += 5.5;
      });

      cursorY += 4;
    });

    pdf.setDrawColor(210, 210, 210);
    pdf.line(leftX, pageHeight - 24, rightX, pageHeight - 24);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(110, 110, 110);
    pdf.text(new Date().toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US'), leftX, pageHeight - 18);

    return pdf.output('blob');
  };

  const blobToBase64 = async (blob: Blob) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob'));
      reader.readAsDataURL(blob);
    });

    const [, base64 = ''] = dataUrl.split(',');
    return base64;
  };

  const handleDownloadPdf = async () => {
    try {
      const pdfBlob = await buildPdfBlob();
      triggerBlobDownload(pdfBlob, getPdfFilename());
      toast({ title: lang === 'de' ? 'PDF heruntergeladen' : 'PDF downloaded' });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: lang === 'de' ? 'Fehler beim Download' : 'Error downloading file',
        description: lang === 'de' ? 'Bitte versuchen Sie es später erneut' : 'Please try again later'
      });
    }
  };

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.privacy) return;
    setSending(true);
    try {
      const pdfBlob = await buildPdfBlob();
      const pdfBase64 = await blobToBase64(pdfBlob);

      const response = await fetch('/api/send-inquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lang,
          form: {
            name: form.name,
            company: form.company,
            email: form.email,
            phone: form.phone,
            message: form.message,
          },
          config,
          summary: generatePdfContent(),
          attachment: {
            filename: getPdfFilename(),
            contentType: 'application/pdf',
            contentBase64: pdfBase64,
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Inquiry request failed with status ${response.status}: ${errorBody}`);
      }

      setForm({ name: '', company: '', email: '', phone: '', message: '', privacy: false });
      toast({ title: t('submitSuccess', lang) });
    } catch (error) {
      console.error('Inquiry submit error:', error);
      toast({ title: t('submitError', lang) });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Summary */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-foreground">{t('summaryTitle', lang)}</h3>
        {summaryRows.map(({ section, items }) => (
          <Card key={section} className="border">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold text-primary">{section}</CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-4">
              <div className="space-y-1">
                {items.map(([label, value], i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex gap-3 pt-2">
          <Button onClick={handleDownloadPdf} variant="outline" className="flex-1">
            <FileDown className="w-4 h-4 mr-2" />
            {t('downloadPdf', lang)}
          </Button>
          <div className="flex-1 rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-amber-900">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wrench className="h-4 w-4" />
                <span>{t('downloadStep', lang)}</span>
              </div>
              <Badge variant="secondary" className="bg-amber-200 text-amber-900">
                {lang === 'de' ? 'In Arbeit' : 'Work in Progress'}
              </Badge>
            </div>
            <p className="mt-1 text-xs opacity-80">
              {lang === 'de'
                ? 'STEP-Export folgt mit Version 2.0.'
                : 'STEP export will return in version 2.0.'}
            </p>
          </div>
          <Button onClick={onReset} variant="ghost" className="flex-1">
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('newConfig', lang)}
          </Button>
        </div>
      </div>

      {/* Contact Form */}
      <Card className="border">
        <CardHeader>
          <CardTitle className="text-lg">{t('contactTitle', lang)}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('contactDesc', lang)}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">{t('name', lang)} *</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{t('company', lang)}</Label>
                <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">{t('email', lang)} *</Label>
                <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{t('phone', lang)}</Label>
                <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{t('message', lang)}</Label>
              <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="privacy"
                checked={form.privacy}
                onCheckedChange={(v) => setForm({ ...form, privacy: v === true })}
              />
              <Label htmlFor="privacy" className="text-sm cursor-pointer leading-relaxed">
                {t('privacyConsentPrefix', lang)}{' '}
                <a
                  href="https://www.novamotis.com/protection"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline underline-offset-2"
                  onClick={(event) => event.stopPropagation()}
                >
                  {t('privacyConsentLink', lang)}
                </a>
                {t('privacyConsentSuffix', lang) ? ` ${t('privacyConsentSuffix', lang)}` : ''} *
              </Label>
            </div>
            <Button type="submit" disabled={sending || !form.privacy} className="w-full">
              <Send className="w-4 h-4 mr-2" />
              {sending ? '...' : t('sendInquiry', lang)}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
