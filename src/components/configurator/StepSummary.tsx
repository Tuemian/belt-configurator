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
import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import headerBackground from '@/assets/Hintergrund_Kopfzeile.png';
import footerBackground from '@/assets/Hintergrund_Fusszeile.png';
import { ConveyorViewer3D } from '@/components/configurator/ConveyorViewer3D';

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

const BRAND_BLUE: [number, number, number] = [0, 51, 102];
const BRAND_GRAY: [number, number, number] = [98, 108, 122];
const BORDER_GRAY: [number, number, number] = [210, 214, 220];
const PANEL_FILL: [number, number, number] = [255, 255, 255];

type CachedImageAsset = {
  dataUrl: string;
  width: number;
  height: number;
};

export const StepSummary = ({ config, lang, onReset }: Props) => {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', message: '', privacy: false });
  const [sending, setSending] = useState(false);
  const [snapshotRequest, setSnapshotRequest] = useState(0);
  const snapshotResolveRef = useRef<((value: string) => void) | null>(null);
  const modelSnapshotRef = useRef<string | null>(null);
  const headerImageRef = useRef<CachedImageAsset | null>(null);
  const footerImageRef = useRef<CachedImageAsset | null>(null);

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
      ? 'novamotis-gurtförderer-konfiguration.pdf'
      : 'novamotis-belt-conveyor-configuration.pdf'
  );

  const loadImageDataUrl = async (
    imageSrc: string,
    cacheRef: React.MutableRefObject<CachedImageAsset | null>,
    errorMessage: string,
  ) => {
    if (cacheRef.current) {
      return cacheRef.current;
    }

    const imageAsset = await new Promise<CachedImageAsset>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const width = image.naturalWidth || 1200;
        const height = image.naturalHeight || 260;
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');

        if (!context) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        context.drawImage(image, 0, 0, width, height);
        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          width,
          height,
        });
      };
      image.onerror = () => reject(new Error(errorMessage));
      image.src = imageSrc;
    });

    cacheRef.current = imageAsset;
    return imageAsset;
  };

  const getHeaderImage = async () => {
    return await loadImageDataUrl(headerBackground, headerImageRef, 'Header image unavailable');
  };

  const getFooterImage = async () => {
    return await loadImageDataUrl(footerBackground, footerImageRef, 'Footer image unavailable');
  };

  useEffect(() => {
    modelSnapshotRef.current = null;
  }, [config]);

  const captureModelSnapshot = async () => {
    if (modelSnapshotRef.current) {
      return modelSnapshotRef.current;
    }

    return await new Promise<string>((resolve) => {
      snapshotResolveRef.current = resolve;
      setSnapshotRequest((value) => value + 1);
    });
  };

  const handleSnapshotReady = (dataUrl: string) => {
    modelSnapshotRef.current = dataUrl || null;
    snapshotResolveRef.current?.(dataUrl);
    snapshotResolveRef.current = null;
  };

  const buildPdfBlob = async (modelImageDataUrl?: string) => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const leftX = 16;
    const rightX = pageWidth - 16;
    const contentWidth = rightX - leftX;
    const dateLabel = new Date().toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US');
    const headerAsset = await getHeaderImage();
    const footerAsset = await getFooterImage();
    const headerHeight = pageWidth * (headerAsset.height / headerAsset.width);
    const footerHeight = pageWidth * (footerAsset.height / footerAsset.width);
    const contentTopY = headerHeight + 18;
    const contentBottomY = pageHeight - footerHeight - 8;

    const rowInnerWidth = contentWidth - 10;
    const getStackedRowHeight = (label: string, value: string) => {
      const labelLines = pdf.splitTextToSize(String(label), rowInnerWidth);
      const valueLines = pdf.splitTextToSize(String(value), rowInnerWidth);
      return {
        labelLines,
        valueLines,
        rowHeight: labelLines.length * 4.2 + valueLines.length * 4.8 + 4,
      };
    };

    const drawFooter = () => {
      const footerY = pageHeight - footerHeight;
      try {
        const footerImage = footerAsset;
        if (footerImage) {
          pdf.addImage(footerImage.dataUrl, 'PNG', 0, footerY, pageWidth, footerHeight, undefined, 'FAST');
          return;
        }
      } catch (error) {
        console.error('Footer render error:', error);
      }

      pdf.setFillColor(0, 124, 184);
      pdf.rect(0, footerY, pageWidth, footerHeight, 'F');
    };

    const drawHeader = async (title: string, subtitle?: string) => {
      try {
        pdf.addImage(headerAsset.dataUrl, 'PNG', 0, 0, pageWidth, headerHeight, undefined, 'FAST');
      } catch (error) {
        console.error('Header render error:', error);
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, headerHeight, 'F');
      }

      pdf.setDrawColor(225, 229, 235);
      pdf.setLineWidth(0.4);
      pdf.line(0, headerHeight, pageWidth, headerHeight);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      pdf.setTextColor(...BRAND_BLUE);
      pdf.text(title, leftX, contentTopY);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10.5);
      pdf.setTextColor(...BRAND_GRAY);
      pdf.text(dateLabel, rightX, contentTopY, { align: 'right' });
      pdf.setDrawColor(...BORDER_GRAY);
      pdf.setLineWidth(0.45);
      pdf.line(leftX, contentTopY + 4, rightX, contentTopY + 4);
      if (subtitle) {
        pdf.setFontSize(10.5);
        const lines = pdf.splitTextToSize(subtitle, contentWidth);
        pdf.text(lines, leftX, contentTopY + 11);
      }
    };

    const drawSectionBlock = (section: string, items: Array<[string, string]>, startY: number) => {
      let y = startY;
      pdf.setFillColor(...PANEL_FILL);
      pdf.setDrawColor(...BORDER_GRAY);
      const stackedRows = items.map(([label, value]) => getStackedRowHeight(label, value));
      const blockHeight = 15 + stackedRows.reduce((sum, row) => sum + row.rowHeight, 0) + 7;
      pdf.roundedRect(leftX, y, contentWidth, blockHeight, 3, 3, 'FD');
      y += 8;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12.5);
      pdf.setTextColor(...BRAND_BLUE);
      pdf.text(section, leftX + 5, y);
      y += 7;

      items.forEach((_, index) => {
        const { labelLines, valueLines, rowHeight } = stackedRows[index];
        const rowTop = y;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(...BRAND_GRAY);
        pdf.text(labelLines, leftX + 5, rowTop + 1.5);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10.6);
        pdf.setTextColor(48, 63, 79);
        const valueStartY = rowTop + 1.5 + labelLines.length * 4.2 + 1;
        pdf.text(valueLines, leftX + 5, valueStartY);

        y = rowTop + rowHeight;
      });

      return blockHeight;
    };

    await drawHeader(`NOVAMOTIS - ${t('configuratorTitle', lang)}`, lang === 'de'
      ? 'Technische Übersicht mit 3D-Vorschau und Konfigurationsdaten'
      : 'Technical overview with 3D preview and configuration data');

    const imageY = contentTopY + 18;
    const imageHeight = 82;
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(...BORDER_GRAY);
    pdf.roundedRect(leftX, imageY, contentWidth, imageHeight, 4, 4, 'FD');

    if (modelImageDataUrl) {
      pdf.addImage(modelImageDataUrl, 'PNG', leftX + 4, imageY + 4, contentWidth - 8, imageHeight - 8, undefined, 'FAST');
    } else {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(...BRAND_GRAY);
      pdf.text(lang === 'de' ? '3D-Vorschau nicht verfügbar' : '3D preview unavailable', pageWidth / 2, imageY + imageHeight / 2, { align: 'center' });
    }

    const quickFacts = [
      [t('frameWidth', lang), `${config.frameWidth} mm`],
      [t('beltLength', lang), `${config.beltLength} mm`],
      [t('driveType', lang), getDriveLabel(config.driveType, lang)],
      [t('beltType', lang), getBeltLabel(config.beltType, lang)],
      [t('withStand', lang), config.withStand ? t('yes', lang) : t('no', lang)],
      [t('speed', lang), `${config.speed} m/min`],
    ] as Array<[string, string]>;

    const factsY = imageY + imageHeight + 8;
    const quickFactRows = quickFacts.map(([label, value]) => getStackedRowHeight(label, value));
    const quickFactsHeight = 14 + quickFactRows.reduce((sum, row) => sum + row.rowHeight, 0) + 6;

    pdf.setFillColor(...PANEL_FILL);
    pdf.setDrawColor(...BORDER_GRAY);
    pdf.roundedRect(leftX, factsY, contentWidth, quickFactsHeight, 3, 3, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12.5);
    pdf.setTextColor(...BRAND_BLUE);
    pdf.text(lang === 'de' ? 'Kompaktübersicht' : 'Quick overview', leftX + 5, factsY + 8);

    let quickFactsCursorY = factsY + 16;
    quickFactRows.forEach((item, index) => {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9.8);
      pdf.setTextColor(...BRAND_GRAY);
      pdf.text(item.labelLines, leftX + 5, quickFactsCursorY);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10.4);
      pdf.setTextColor(48, 63, 79);
      pdf.text(item.valueLines, leftX + 5, quickFactsCursorY + item.labelLines.length * 4.2 + 1);

      quickFactsCursorY += item.rowHeight;
    });

    const summaryTitle = lang === 'de' ? 'Zusammenfassung der Konfiguration' : 'Configuration summary';
    let sectionY = factsY + quickFactsHeight + 10;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(...BRAND_BLUE);
    pdf.text(summaryTitle, leftX, sectionY);
    sectionY += 7;

    sectionY += 6;

    for (const { section, items } of summaryRows) {
      const normalizedItems = items.map(([label, value]) => [String(label), String(value)] as [string, string]);
      const estimatedBlockHeight = 15
        + normalizedItems.reduce((sum, [label, value]) => sum + getStackedRowHeight(label, value).rowHeight, 0)
        + 7;

      if (sectionY + estimatedBlockHeight > contentBottomY) {
        drawFooter();
        pdf.addPage();
        await drawHeader(summaryTitle);
        sectionY = contentTopY + 10;
      }

      const blockHeight = drawSectionBlock(section, normalizedItems, sectionY);
      sectionY += blockHeight + 8;
    }

    drawFooter();

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
      const modelImageDataUrl = await captureModelSnapshot();
      const pdfBlob = await buildPdfBlob(modelImageDataUrl);
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
      const modelImageDataUrl = await captureModelSnapshot();
      const pdfBlob = await buildPdfBlob(modelImageDataUrl);
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
    <>
      <div className="pointer-events-none fixed -left-[200vw] top-0 h-[360px] w-[720px] overflow-hidden rounded-xl opacity-0">
        <ConveyorViewer3D
          config={config}
          snapshotRequest={snapshotRequest}
          onSnapshotReady={handleSnapshotReady}
        />
      </div>

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
    </>
  );
};
