<?php

declare(strict_types=1);

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed. Use POST.',
    ]);
    exit;
}

// Composer autoload path (adjust if your deployment layout differs)
$autoloadPath = __DIR__ . '/../vendor/autoload.php';
if (!file_exists($autoloadPath)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'PHPMailer autoload not found. Install dependencies with Composer.',
    ]);
    exit;
}

require_once $autoloadPath;

/**
 * Basic header-injection guard:
 * Reject CR/LF and classic mail header fragments in user-supplied fields.
 */
function containsHeaderInjection(string $value): bool
{
    if (preg_match('/[\r\n]/', $value)) {
        return true;
    }

    return (bool) preg_match('/(content-type:|mime-version:|bcc:|cc:|to:|from:)/i', $value);
}

function cleanText(mixed $value): string
{
    if (!is_string($value)) {
        return '';
    }

    return trim($value);
}

$rawInput = file_get_contents('php://input');
if ($rawInput === false || $rawInput === '') {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Empty request body.',
    ]);
    exit;
}

$data = json_decode($rawInput, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid JSON payload.',
    ]);
    exit;
}

$customer = is_array($data['customer'] ?? null) ? $data['customer'] : [];
$config = is_array($data['config'] ?? null) ? $data['config'] : [];
$pdfBase64 = cleanText($data['pdfBase64'] ?? '');

$name = cleanText($customer['name'] ?? '');
$email = cleanText($customer['email'] ?? '');

if ($name === '' || $email === '' || $pdfBase64 === '') {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'message' => 'Missing required fields: customer.name, customer.email, pdfBase64.',
    ]);
    exit;
}

if (containsHeaderInjection($name) || containsHeaderInjection($email)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid input detected.',
    ]);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid email address.',
    ]);
    exit;
}

// Accept both plain base64 and Data URL formats.
if (str_contains($pdfBase64, ',')) {
    $parts = explode(',', $pdfBase64, 2);
    $pdfBase64 = $parts[1] ?? '';
}

$pdfBinary = base64_decode($pdfBase64, true);
if ($pdfBinary === false || $pdfBinary === '') {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid base64 PDF content.',
    ]);
    exit;
}

$tempFile = tempnam(sys_get_temp_dir(), 'novamotis_pdf_');
if ($tempFile === false) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Could not create temporary file.',
    ]);
    exit;
}

$pdfPath = $tempFile . '.pdf';
rename($tempFile, $pdfPath);

if (file_put_contents($pdfPath, $pdfBinary) === false) {
    @unlink($pdfPath);
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Could not write PDF file.',
    ]);
    exit;
}

$beltLength = $config['beltLength'] ?? 'n/a';
$frameWidth = $config['frameWidth'] ?? 'n/a';
$motorPosition = $config['motorPosition'] ?? 'n/a';
$speed = $config['speed'] ?? 'n/a';
$withStand = $config['withStand'] ?? null;
$standText = is_bool($withStand) ? ($withStand ? 'yes' : 'no') : 'n/a';

$subject = 'Neue Anfrage aus NOVAMOTIS Konfigurator';
$body = "Neue Anfrage eingegangen.\n\n"
    . "Kunde:\n"
    . "Name: {$name}\n"
    . "E-Mail: {$email}\n\n"
    . "Konfiguration:\n"
    . "Laenge: {$beltLength} mm\n"
    . "Breite: {$frameWidth} mm\n"
    . "Motorposition: {$motorPosition}\n"
    . "Geschwindigkeit: {$speed} m/min\n"
    . "Untergestell: {$standText}\n";

try {
    $mail = new PHPMailer(true);

    // SMTP configuration placeholders for IT (uncomment and fill in production)
    // $mail->isSMTP();
    // $mail->Host = 'smtp.example.com';
    // $mail->SMTPAuth = true;
    // $mail->Username = 'smtp-user';
    // $mail->Password = 'smtp-password';
    // $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    // $mail->Port = 587;

    $mail->CharSet = 'UTF-8';
    $mail->setFrom('no-reply@deine-firma.de', 'NOVAMOTIS Konfigurator');
    $mail->addAddress('office@novamotis.com');
    $mail->addReplyTo($email, $name);

    $mail->Subject = $subject;
    $mail->Body = $body;
    $mail->addAttachment($pdfPath, 'anfrage_novamotis.pdf');

    $mail->send();

    @unlink($pdfPath);

    echo json_encode([
        'success' => true,
        'message' => 'Mail sent successfully.',
    ]);
} catch (Exception $e) {
    @unlink($pdfPath);
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Mail sending failed.',
        'error' => $mail->ErrorInfo ?? $e->getMessage(),
    ]);
}
