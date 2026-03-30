import { Language, t } from '@/lib/i18n';
import { ConveyorConfig } from '@/lib/configurator-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { FileDown, Send, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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

  const handleDownloadPdf = async () => {
    try {
      // Create temporary container for content
      const container = document.createElement('div');
      container.style.width = '210mm';
      container.style.padding = '40mm';
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.backgroundColor = 'white';
      container.style.fontFamily = 'Arial, sans-serif';
      container.style.fontSize = '11px';
      container.style.color = '#333';

      let html = `<h2 style="color: #003366; font-size: 16px; margin-bottom: 20px;">NOVAMOTIS - ${t('configuratorTitle', lang)}</h2>`;

      summaryRows.forEach(({ section, items }) => {
        html += `<h3 style="color: #003366; font-size: 12px; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">${section}</h3>`;
        items.forEach(([label, value]) => {
          html += `<div style="margin: 5px 0; display: flex; justify-content: space-between;"><span>${label}:</span><span style="font-weight: bold;">${value}</span></div>`;
        });
      });

      html += `<div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc; font-size: 9px; color: #666;">${new Date().toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US')}</div>`;

      container.innerHTML = html;
      document.body.appendChild(container);

      // Convert to canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Create PDF with briefpapier background
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Add briefpapier background
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);

      // Download
      pdf.save('novamotis-gurtfoerderer-konfiguration.pdf');

      // Cleanup
      document.body.removeChild(container);
      toast({ title: lang === 'de' ? 'PDF heruntergeladen' : 'PDF downloaded' });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: lang === 'de' ? 'Fehler beim Download' : 'Error downloading file',
        description: lang === 'de' ? 'Bitte versuchen Sie es später erneut' : 'Please try again later'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.privacy) return;
    setSending(true);
    // Simulate sending — in production this would call a backend API
    await new Promise((r) => setTimeout(r, 1500));
    setSending(false);
    toast({ title: t('submitSuccess', lang) });
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
              <Label htmlFor="privacy" className="text-sm cursor-pointer">{t('privacyConsent', lang)} *</Label>
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
