export type Language = 'de' | 'en';

const translations = {
  de: {
    // Header
    configuratorTitle: 'Gurtförderer-Konfigurator',
    configuratorSubtitle: 'Konfigurieren Sie Ihren individuellen Gurtförderer in wenigen Schritten',
    stepOf: 'Schritt {current} von {total}',
    langSwitch: 'EN',

    // Navigation
    next: 'Weiter',
    back: 'Zurück',
    startConfig: 'Konfiguration starten',
    sendInquiry: 'Anfrage senden',
    downloadPdf: 'PDF herunterladen',
    newConfig: 'Neue Konfiguration',

    // Step 1 - Dimensions
    step1Title: 'Grundmaße',
    step1Desc: 'Geben Sie die Grundmaße Ihres Gurtförderers ein',
    frameWidth: 'Rahmenbreite',
    frameWidthUnit: 'mm',
    frameWidthRange: '40 mm bis 1.250 mm',
    beltLength: 'Bandlänge',
    beltLengthRange: '500 mm bis 12.000 mm',
    sideGuideHeight: 'Höhe Seitenführung',
    sideGuideHeightRange: '0 mm bis 100 mm',
    inclineAngle: 'Steigungswinkel',
    inclineAngleRange: '-15° bis +15°',

    // Step 2 - Belt & Speed
    step2Title: 'Gurt & Geschwindigkeit',
    step2Desc: 'Wählen Sie Gurttyp, Geschwindigkeit und Zuladung',
    beltType: 'Gurtauswahl',
    beltStandard: 'Standard - für allgemeine Transportaufgaben',
    beltGrip: 'Grip - für leichte Steigtransporte',
    beltHeavyGrip: 'Heavy Grip - für stärkere Steigtransporte',
    beltFoodSafe: 'Lebensmitteltauglich - FDA-konform',
    speed: 'Bandgeschwindigkeit',
    speedRange: '3 m/min bis 65 m/min',
    loadCapacity: 'Max. Zuladung',
    loadCapacityUnit: 'kg',

    // Step 3 - Drive
    step3Title: 'Antrieb',
    step3Desc: 'Wählen Sie Antriebsart und Motorposition',
    driveType: 'Antriebsart',
    driveDirect: 'Direktantrieb',
    driveDirectDesc: 'Seitlich am Bandende',
    driveIndirect: 'Indirektantrieb',
    driveIndirectDesc: 'Unterhalb am Bandende',
    driveCenter: 'Mittenantrieb',
    driveCenterDesc: 'Unterhalb in Bandmitte',
    motorPosition: 'Motorposition',
    motorLeft: 'Links',
    motorRight: 'Rechts',
    motorAngle: 'Motorstellung',

    // Step 4 - Stand
    step4Title: 'Untergestell & Zubehör',
    step4Desc: 'Wählen Sie Untergestell und optionales Zubehör',
    withStand: 'Mit Untergestell',
    standHeight: 'Höhe Oberkante Band',
    standHeightRange: '400 mm bis 2.000 mm',
    floorElement: 'Bodenelement',
    adjustableFeet: 'Stellfüße',
    castorWheels: 'Lenkrollen mit Feststellbremsen',
    heightAdjust: 'Höhenverstellung (±100 mm)',
    floorBolts: 'Klemmlasche für Bodenverdübelung',

    // Step 5 - Summary
    step5Title: 'Ihre Konfiguration',
    summaryTitle: 'Zusammenfassung',
    dimensions: 'Grundmaße',
    beltAndSpeed: 'Gurt & Geschwindigkeit',
    drive: 'Antrieb',
    standAndAccessories: 'Untergestell & Zubehör',
    yes: 'Ja',
    no: 'Nein',

    // Contact form
    contactTitle: 'Anfrage senden',
    contactDesc: 'Füllen Sie das Formular aus und wir melden uns bei Ihnen',
    name: 'Name',
    company: 'Firma',
    email: 'E-Mail',
    phone: 'Telefon',
    message: 'Nachricht / Anmerkungen',
    privacyConsent: 'Ich stimme den Datenschutzbestimmungen zu',
    submitSuccess: 'Vielen Dank! Ihre Anfrage wurde gesendet.',
    submitError: 'Fehler beim Senden. Bitte versuchen Sie es erneut.',
    required: 'Pflichtfeld',
  },
  en: {
    configuratorTitle: 'Belt Conveyor Configurator',
    configuratorSubtitle: 'Configure your individual belt conveyor in just a few steps',
    stepOf: 'Step {current} of {total}',
    langSwitch: 'DE',

    next: 'Next',
    back: 'Back',
    startConfig: 'Start Configuration',
    sendInquiry: 'Send Inquiry',
    downloadPdf: 'Download PDF',
    newConfig: 'New Configuration',

    step1Title: 'Dimensions',
    step1Desc: 'Enter the basic dimensions of your belt conveyor',
    frameWidth: 'Frame Width',
    frameWidthUnit: 'mm',
    frameWidthRange: '40 mm to 1,250 mm',
    beltLength: 'Belt Length',
    beltLengthRange: '500 mm to 12,000 mm',
    sideGuideHeight: 'Side Guide Height',
    sideGuideHeightRange: '0 mm to 100 mm',
    inclineAngle: 'Incline Angle',
    inclineAngleRange: '-15° to +15°',

    step2Title: 'Belt & Speed',
    step2Desc: 'Select belt type, speed and load capacity',
    beltType: 'Belt Selection',
    beltStandard: 'Standard - for general transport tasks',
    beltGrip: 'Grip - for light incline transport',
    beltHeavyGrip: 'Heavy Grip - for steeper incline transport',
    beltFoodSafe: 'Food-Safe - FDA compliant',
    speed: 'Belt Speed',
    speedRange: '3 m/min to 65 m/min',
    loadCapacity: 'Max. Load Capacity',
    loadCapacityUnit: 'kg',

    step3Title: 'Drive',
    step3Desc: 'Select drive type and motor position',
    driveType: 'Drive Type',
    driveDirect: 'Direct Drive',
    driveDirectDesc: 'Side-mounted at belt end',
    driveIndirect: 'Indirect Drive',
    driveIndirectDesc: 'Underneath at belt end',
    driveCenter: 'Center Drive',
    driveCenterDesc: 'Underneath at belt center',
    motorPosition: 'Motor Position',
    motorLeft: 'Left',
    motorRight: 'Right',
    motorAngle: 'Motor Orientation',

    step4Title: 'Stand & Accessories',
    step4Desc: 'Select stand and optional accessories',
    withStand: 'With Stand',
    standHeight: 'Height to Belt Top',
    standHeightRange: '400 mm to 2,000 mm',
    floorElement: 'Floor Element',
    adjustableFeet: 'Adjustable Feet',
    castorWheels: 'Castor Wheels with Brakes',
    heightAdjust: 'Height Adjustment (±100 mm)',
    floorBolts: 'Floor Mounting Clamps',

    step5Title: 'Your Configuration',
    summaryTitle: 'Summary',
    dimensions: 'Dimensions',
    beltAndSpeed: 'Belt & Speed',
    drive: 'Drive',
    standAndAccessories: 'Stand & Accessories',
    yes: 'Yes',
    no: 'No',

    contactTitle: 'Send Inquiry',
    contactDesc: 'Fill out the form and we will get back to you',
    name: 'Name',
    company: 'Company',
    email: 'Email',
    phone: 'Phone',
    message: 'Message / Notes',
    privacyConsent: 'I agree to the privacy policy',
    submitSuccess: 'Thank you! Your inquiry has been sent.',
    submitError: 'Error sending. Please try again.',
    required: 'Required',
  },
} as const;

export type TranslationKey = keyof typeof translations.de;

export function t(key: TranslationKey, lang: Language, params?: Record<string, string | number>): string {
  let text: string = translations[lang][key] || translations.de[key] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
  }
  return text;
}
