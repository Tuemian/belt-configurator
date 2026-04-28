## Umstellung von SMTP (Office 365) auf Resend

### Ziel
Anfrageformular soll E-Mails über **Resend** versenden statt über Office 365 SMTP — das umgeht das "Security Defaults"-Problem komplett.

### Voraussetzungen (vom Nutzer)
1. Resend-Account auf [resend.com](https://resend.com) erstellen (kostenlos bis 3.000 Mails/Monat).
2. **Domain `novamotis.com` in Resend verifizieren** (DNS-Records SPF/DKIM/DMARC bei Domain-Provider eintragen). Erst danach kann von `simon.martin@novamotis.com` gesendet werden.
   - Alternativ für Tests: Versand über `onboarding@resend.dev` möglich (Empfänger ist dann nur die verifizierte Adresse — limitiert).
3. Resend-Verbindung über den Lovable-Connector verknüpfen (per Klick im UI, kein API-Key-Copy/Paste nötig).

### Umsetzungsschritte (durch mich)

1. **Resend-Connector verbinden**
   - Tool `standard_connectors--connect` mit `connector_id: resend` aufrufen.
   - Du wählst im Picker deinen Resend-Account; die Secrets `RESEND_API_KEY` + `LOVABLE_API_KEY` werden automatisch verknüpft.

2. **Edge Function `send-inquiry` umbauen**
   - SMTP-Logik (nodemailer/denomailer) komplett entfernen.
   - Stattdessen `POST` an `https://connector-gateway.lovable.dev/resend/emails` mit:
     - `from`: `"NOVAMOTIS Anfrage <simon.martin@novamotis.com>"` (oder Resend-Test-Adresse, falls Domain noch nicht verifiziert)
     - `to`: `INQUIRY_TO`-Secret (Empfänger der Anfrage)
     - `reply_to`: E-Mail aus Formular (damit "Antworten" direkt zum Interessenten geht)
     - `subject` + `html` wie bisher
   - Saubere Fehlermeldungen mit HTTP-Status + Resend-Response-Body bei Fehlschlag.

3. **Alte SMTP-Secrets**
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` werden nicht mehr gebraucht (lasse sie erstmal liegen, falls Rollback nötig).
   - `SMTP_FROM` und `INQUIRY_TO` bleiben relevant (als From/To-Adressen weiterverwendet).

4. **Test**
   - Nach Deployment Anfrage senden, Edge-Function-Logs prüfen.

### Wichtig zur Absender-Adresse
- **Solange `novamotis.com` nicht in Resend verifiziert ist**, muss `from` auf `onboarding@resend.dev` gesetzt werden — sonst lehnt Resend den Versand ab.
- Sobald die DNS-Records gesetzt und verifiziert sind, stelle ich `from` auf `simon.martin@novamotis.com` um.

### Frage an dich vor Umsetzung
Hast du die Domain `novamotis.com` schon bei Resend verifiziert, oder sollen wir vorerst mit der Resend-Test-Adresse starten und später umstellen?
