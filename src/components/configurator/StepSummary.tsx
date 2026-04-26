import { Language, t } from '@/lib/i18n';
import { ConveyorConfig } from '@/lib/configurator-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { FileDown, Send, RotateCcw } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import { toDataURL as toQrDataUrl } from 'qrcode';
import headerBackground from '@/assets/Hintergrund_Kopfzeile.png';
import footerBackground from '@/assets/Hintergrund_Fusszeile.png';
import { calculatePrice, type PriceCalculationResult, type PriceItem } from '@/lib/pricing';

const ConveyorViewer3D = lazy(() =>
  import('@/components/configurator/ConveyorViewer3D').then((m) => ({ default: m.ConveyorViewer3D }))
);

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
  const map = { direct: 'driveDirect', indirect: 'driveIndirect', center: 'driveCenter', drum: 'driveDrum' } as const;
  return t(map[type], lang);
}

function getProfileSeriesLabel(frameWidth: number, lang: Language) {
  return frameWidth > 500 ? t('profileMotis80', lang) : t('profileMotis40', lang);
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

type ConfigurationIdentity = {
  shortId: string;
  fullHash: string;
};

const FOOTER_TEXT_COLUMNS = [
  ['Erste Bank und Sparkasse', 'BIC/SWIFT: DOSPAT2DXXX', 'IBAN: AT10 2060 2000 0068 0215'],
  ['Gerichtsstand: Landesgericht Feldkirch', 'Firmenbuchnummer: FN 669496 d', 'UID-Nummer: ATU82899035'],
  ['Geschaeftsfuehrung:', 'Simon Martin, Slovyana Votchyna', 'M: office@novamotis.com', 'W: www.novamotis.com'],
] as const;

function normalizeForHash(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeForHash);
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nested]) => [key, normalizeForHash(nested)]);
    return Object.fromEntries(entries);
  }

  return value;
}

async function buildConfigurationIdentity(config: ConveyorConfig): Promise<ConfigurationIdentity> {
  const normalized = normalizeForHash(config);
  const payload = JSON.stringify(normalized);
  let fullHash: string;

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(payload);
    const digest = await crypto.subtle.digest('SHA-256', data);
    fullHash = Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  } else {
    let fallback = 0;
    for (let index = 0; index < payload.length; index += 1) {
      fallback = ((fallback << 5) - fallback + payload.charCodeAt(index)) | 0;
    }
    const seed = Math.abs(fallback).toString(16).padStart(8, '0');
    fullHash = seed.repeat(8).slice(0, 64);
  }

  return {
    shortId: fullHash.slice(0, 7).toUpperCase(),
    fullHash,
  };
}

function formatDateForFilename(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const StepSummary = ({ config, lang, onReset }: Props) => {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', message: '', privacy: false });
  const [sending, setSending] = useState(false);
  const [snapshotRequest, setSnapshotRequest] = useState(0);
  const [pricing, setPricing] = useState<PriceCalculationResult>({ status: 'unavailable', breakdown: [], missingKeys: [] });
  const [configIdentity, setConfigIdentity] = useState<ConfigurationIdentity | null>(null);
  const snapshotResolveRef = useRef<((value: string) => void) | null>(null);
  const modelSnapshotRef = useRef<string | null>(null);
  const headerImageRef = useRef<CachedImageAsset | null>(null);
  const footerImageRef = useRef<CachedImageAsset | null>(null);

  const summaryRows = [
    {
      section: t('dimensions', lang),
      items: [
        [t('frameWidth', lang), `${config.frameWidth} mm`],
        [t('profileSeries', lang), getProfileSeriesLabel(config.frameWidth, lang)],
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
        [
          config.driveType === 'drum' ? t('cableExit', lang) : t('motorPosition', lang),
          config.motorPosition === 'left'
            ? (config.driveType === 'drum' ? t('cableLeft', lang) : t('motorLeft', lang))
            : (config.driveType === 'drum' ? t('cableRight', lang) : t('motorRight', lang)),
        ],
        ...(config.driveType === 'drum' ? [] : [[t('motorAngle', lang), `${config.motorAngle}°`] as [string, string]]),
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

  const technicalDisclaimer = lang === 'de'
    ? 'Hinweis: Diese Konfiguration ist unverbindlich und dient als technischer Vorentwurf. Finale Auslegung, Preis und Lieferzeit erfolgen nach technischer Prüfung durch NOVAMOTIS.'
    : lang === 'it'
      ? 'Nota: Questa configurazione non e vincolante e funge da pre-progetto tecnico. L\'ingegnerizzazione finale, il prezzo e i tempi di consegna vengono forniti dopo la verifica tecnica da parte di NOVAMOTIS.'
      : 'Note: This configuration is non-binding and serves as a technical pre-design. Final engineering, pricing, and lead time are provided after technical review by NOVAMOTIS.';

  const generatePdfContent = (identity?: ConfigurationIdentity) => {
    let text = `NOVAMOTIS - ${t('configuratorTitle', lang)}\n${'='.repeat(50)}\n\n`;
    if (identity) {
      text += `Configuration ID: ${identity.shortId}\nSHA-256: ${identity.fullHash}\n\n`;
    }
    summaryRows.forEach(({ section, items }) => {
      text += `${section}\n${'-'.repeat(30)}\n`;
      items.forEach(([label, value]) => {
        text += `${label}: ${value}\n`;
      });
      text += '\n';
    });

    text += `${technicalDisclaimer}\n`;

    return text;
  };

  const getPdfFilename = (identity: ConfigurationIdentity) => {
    const baseName = lang === 'de'
      ? 'novamotis-gurtfoerderer-konfiguration'
      : 'novamotis-belt-conveyor-configuration';
    return `${baseName}-${identity.shortId}-${formatDateForFilename(new Date())}.pdf`;
  };

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

  useEffect(() => {
    let cancelled = false;

    void calculatePrice(config).then((result) => {
      if (!cancelled) {
        setPricing(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [config]);

  useEffect(() => {
    let cancelled = false;

    void buildConfigurationIdentity(config)
      .then((identity) => {
        if (!cancelled) {
          setConfigIdentity(identity);
        }
      })
      .catch((error) => {
        console.error('Configuration identity error:', error);
        if (!cancelled) {
          setConfigIdentity(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [config]);

  const currencyFormatter = new Intl.NumberFormat(
    lang === 'de' ? 'de-DE' : lang === 'it' ? 'it-IT' : 'en-US',
    {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );

  const numberFormatter = new Intl.NumberFormat(
    lang === 'de' ? 'de-DE' : lang === 'it' ? 'it-IT' : 'en-US',
    { minimumFractionDigits: 0, maximumFractionDigits: 2 },
  );

  const getUnitLabel = (unit: string) => {
    if (unit === 'per_meter') {
      return 'm';
    }
    if (unit === 'per_m2') {
      return 'm2';
    }
    if (unit === 'per_mm_width') {
      return 'mm';
    }
    return 'x';
  };

  const getPriceItemLabel = (item: PriceItem) => {
    if (lang === 'de') {
      return item.labelDe;
    }
    if (lang === 'it') {
      return item.labelIt;
    }
    return item.labelEn;
  };

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

  const buildPdfBlob = async (identity: ConfigurationIdentity, modelImageDataUrl?: string) => {
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
    const dateTimeLabel = new Date().toLocaleString(lang === 'de' ? 'de-DE' : 'en-US');
    const configurationUrl = typeof window !== 'undefined' ? window.location.href : 'https://www.novamotis.com/';
    let qrTargetUrl = configurationUrl;
    try {
      const parsedUrl = new URL(configurationUrl);
      parsedUrl.searchParams.set('configId', identity.shortId);
      parsedUrl.searchParams.set('configHash', identity.fullHash.slice(0, 16));
      qrTargetUrl = parsedUrl.toString();
    } catch {
      qrTargetUrl = configurationUrl;
    }
    const headerAsset = await getHeaderImage();
    let qrDataUrl: string | undefined;
    try {
      qrDataUrl = await toQrDataUrl(qrTargetUrl, {
        margin: 2,
        width: 480,
        errorCorrectionLevel: 'H',
      });
    } catch (error) {
      console.error('QR generation error:', error);
    }
    const headerHeight = pageWidth * (headerAsset.height / headerAsset.width);
    const footerHeight = 21;
    const contentTopY = headerHeight + 18;
    const contentBottomY = pageHeight - footerHeight - 14;

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
      pdf.setFillColor(247, 249, 252);
      pdf.rect(0, footerY, pageWidth, footerHeight, 'F');
      pdf.setDrawColor(220, 225, 232);
      pdf.setLineWidth(0.2);
      pdf.line(0, footerY, pageWidth, footerY);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.2);
      pdf.setTextColor(57, 63, 70);

      const footerLineHeight = 3.5;
      const columnGap = 6;
      const columnWidth = (contentWidth - columnGap * 2) / 3;
      const columnsX = [leftX, leftX + columnWidth + columnGap, leftX + columnWidth * 2 + columnGap * 2] as const;
      const columnsY = footerY + 6.8;
      FOOTER_TEXT_COLUMNS.forEach((lines, index) => {
        const wrappedLines = lines.flatMap((line) => pdf.splitTextToSize(line, columnWidth));
        pdf.text(wrappedLines, columnsX[index], columnsY, {
          lineHeightFactor: 1.12,
        });
      });
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

      const titleY = contentTopY + 2;
      const metaTopY = contentTopY - 2;
      const titleMaxWidth = contentWidth - 40;
      const titleLines = String(title)
        .split('\n')
        .flatMap((line) => pdf.splitTextToSize(line, titleMaxWidth));
      const titleLineHeight = 7.4;
      const titleBottomY = titleY + (Math.max(1, titleLines.length) - 1) * titleLineHeight;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      pdf.setTextColor(...BRAND_BLUE);
      pdf.text(titleLines, leftX, titleY);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9.4);
      pdf.setTextColor(...BRAND_GRAY);
      pdf.text(dateLabel, rightX, metaTopY, { align: 'right' });

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.4);
      pdf.text(`ID ${identity.shortId}`, rightX, metaTopY + 4.6, { align: 'right' });

      const headerDividerY = Math.max(titleBottomY + 4, metaTopY + 8);

      pdf.setDrawColor(...BORDER_GRAY);
      pdf.setLineWidth(0.45);
      pdf.line(leftX, headerDividerY, rightX, headerDividerY);

      let bodyStartY = headerDividerY + 6;

      if (subtitle) {
        pdf.setFontSize(10.2);
        const lines = pdf.splitTextToSize(subtitle, contentWidth);
        pdf.text(lines, leftX, headerDividerY + 6);
        bodyStartY = headerDividerY + 6 + (lines.length - 1) * 4.4 + 7;
      }

      return bodyStartY;
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

    // ── PAGE 1: header + 3D image + ID block ─────────────────────────────────
    const firstPageContentStartY = await drawHeader('NOVAMOTIS - Gurtförderer', lang === 'de'
      ? 'Technische Übersicht mit 3D-Vorschau und Konfigurationsdaten'
      : lang === 'it'
        ? 'Panoramica tecnica con anteprima 3D e dati di configurazione'
        : 'Technical overview with 3D preview and configuration data');

    const imageY = firstPageContentStartY + 2;
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
      pdf.text(lang === 'de' ? '3D-Vorschau nicht verfügbar' : lang === 'it' ? 'Anteprima 3D non disponibile' : '3D preview unavailable', pageWidth / 2, imageY + imageHeight / 2, { align: 'center' });
    }

    // ID block always on page 1, right below the 3D image
    const idBlockHeight = 34;
    const idBlockY = imageY + imageHeight + 10;

    pdf.setFillColor(...PANEL_FILL);
    pdf.setDrawColor(...BORDER_GRAY);
    pdf.roundedRect(leftX, idBlockY, contentWidth, idBlockHeight, 3, 3, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11.5);
    pdf.setTextColor(...BRAND_BLUE);
    pdf.text(lang === 'de' ? 'Identifizierbarkeit' : lang === 'it' ? 'Identificazione' : 'Configuration identification', leftX + 5, idBlockY + 7.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    pdf.setTextColor(...BRAND_GRAY);
    pdf.text(`ID: ${identity.shortId}`, leftX + 5, idBlockY + 13.5);
    pdf.text(`SHA-256: ${identity.fullHash}`, leftX + 5, idBlockY + 18.5);
    pdf.text(
      (lang === 'de' ? 'Erstellt: ' : lang === 'it' ? 'Creato: ' : 'Generated: ') + dateTimeLabel,
      leftX + 5,
      idBlockY + 23.5,
    );
    if (qrDataUrl) {
      const qrSize = 24;
      const qrX = rightX - qrSize - 4;
      const qrY = idBlockY + 5;
      pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize, undefined, 'FAST');
    }

    drawFooter();

    // ── PAGE 2+: Zusammenfassung with Kompaktübersicht + detail sections ──────
    const summaryTitle = lang === 'de' ? 'Zusammenfassung\nder Konfiguration' : lang === 'it' ? 'Riepilogo\ndella configurazione' : 'Configuration summary';
    pdf.addPage();
    let sectionY = await drawHeader(summaryTitle);

    // Kompaktübersicht (quick facts) at the top of page 2
    const quickFacts = [
      [t('frameWidth', lang), `${config.frameWidth} mm`],
      [t('beltLength', lang), `${config.beltLength} mm`],
      [t('driveType', lang), getDriveLabel(config.driveType, lang)],
      [t('beltType', lang), getBeltLabel(config.beltType, lang)],
      [t('withStand', lang), config.withStand ? t('yes', lang) : t('no', lang)],
      [t('speed', lang), `${config.speed} m/min`],
    ] as Array<[string, string]>;

    const quickFactRows = quickFacts.map(([label, value]) => getStackedRowHeight(label, value));
    const quickFactsHeight = 14 + quickFactRows.reduce((sum, row) => sum + row.rowHeight, 0) + 6;

    pdf.setFillColor(...PANEL_FILL);
    pdf.setDrawColor(...BORDER_GRAY);
    pdf.roundedRect(leftX, sectionY, contentWidth, quickFactsHeight, 3, 3, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12.5);
    pdf.setTextColor(...BRAND_BLUE);
    pdf.text(lang === 'de' ? 'Kompaktübersicht' : lang === 'it' ? 'Panoramica rapida' : 'Quick overview', leftX + 5, sectionY + 8);

    let quickFactsCursorY = sectionY + 16;
    quickFactRows.forEach((item) => {
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

    sectionY += quickFactsHeight + 8;

    for (const { section, items } of summaryRows) {
      const normalizedItems = items.map(([label, value]) => [String(label), String(value)] as [string, string]);
      const estimatedBlockHeight = 15
        + normalizedItems.reduce((sum, [label, value]) => sum + getStackedRowHeight(label, value).rowHeight, 0)
        + 7;

      if (sectionY + estimatedBlockHeight > contentBottomY) {
        drawFooter();
        pdf.addPage();
        const nextPageStartY = await drawHeader(summaryTitle);
        sectionY = nextPageStartY + 2;
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
      const identity = await buildConfigurationIdentity(config);
      const modelImageDataUrl = await captureModelSnapshot();
      const pdfBlob = await buildPdfBlob(identity, modelImageDataUrl);
      triggerBlobDownload(pdfBlob, getPdfFilename(identity));
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
      const identity = await buildConfigurationIdentity(config);
      const modelImageDataUrl = await captureModelSnapshot();
      const pdfBlob = await buildPdfBlob(identity, modelImageDataUrl);
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
          summary: generatePdfContent(identity),
          attachment: {
            filename: getPdfFilename(identity),
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
        <Suspense fallback={null}>
          <ConveyorViewer3D
            config={config}
            snapshotRequest={snapshotRequest}
            onSnapshotReady={handleSnapshotReady}
          />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Summary */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-foreground">{t('summaryTitle', lang)}</h3>
          <div className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-semibold tracking-wide text-primary">
            ID {configIdentity?.shortId ?? '...'}
          </div>
        </div>

        <Card className="border">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold text-primary">
              {lang === 'de' ? 'Identifizierbarkeit' : lang === 'it' ? 'Identificazione' : 'Configuration identification'}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4 space-y-2">
            <div className="text-sm text-muted-foreground">
              {lang === 'de' ? 'Konfigurations-ID' : lang === 'it' ? 'ID configurazione' : 'Configuration ID'}
            </div>
            <div className="text-xl font-bold tracking-wide text-foreground">
              {configIdentity?.shortId ?? '...'}
            </div>
            <div className="text-xs text-muted-foreground break-all">
              SHA-256: {configIdentity?.fullHash ?? '-'}
            </div>
          </CardContent>
        </Card>

        {summaryRows.map(({ section, items }) => (
          <Card key={section} className="border">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold text-primary">{section}</CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-4">
              <div className="space-y-1">
                {items.map(([label, value], i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground shrink-0 pr-3">{label}</span>
                    <span className="font-medium text-foreground text-right w-[55%] break-words">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        <Card className="border">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold text-primary">{t('priceIndicative', lang)}</CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4 space-y-3">
            {pricing.status === 'complete' && (
              <>
                <div className="text-2xl font-bold text-foreground">
                  {currencyFormatter.format(pricing.total ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground">{t('priceDisclaimer', lang)}</p>
              </>
            )}

            {pricing.status !== 'complete' && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <div className="font-semibold">{t('priceOnRequest', lang)}</div>
                <div className="text-xs mt-1">{t('priceOnRequestHint', lang)}</div>
              </div>
            )}

            {pricing.breakdown.length > 0 && (
              <details className="rounded-md border border-border/70 p-2">
                <summary className="cursor-pointer text-sm font-medium text-foreground">
                  {t('priceBreakdown', lang)}
                </summary>
                <div className="mt-2 space-y-1">
                  {pricing.breakdown.map((item) => (
                    <div key={item.key} className="flex justify-between gap-3 text-sm py-1 border-b border-border/40 last:border-0">
                      <span className="text-muted-foreground">
                        {getPriceItemLabel(item)} ({numberFormatter.format(item.quantity)} {getUnitLabel(item.unit)})
                      </span>
                      <span className="font-medium text-right text-foreground">
                        {item.available && item.total !== undefined
                          ? currencyFormatter.format(item.total)
                          : t('priceItemOnRequest', lang)}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </CardContent>
        </Card>

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
        <p className="text-xs leading-relaxed text-muted-foreground pt-1">
          {technicalDisclaimer}
        </p>
      </div>

      {/* Contact Form */}
      <div className="space-y-4">
        <div className="rounded-xl overflow-hidden border" style={{ height: '280px' }}>
          <Suspense
            fallback={
              <div className="flex h-full w-full items-center justify-center bg-muted/40 text-sm text-muted-foreground">
                3D-Vorschau wird geladen...
              </div>
            }
          >
            <ConveyorViewer3D config={config} />
          </Suspense>
        </div>

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
      </div>
    </>
  );
};
