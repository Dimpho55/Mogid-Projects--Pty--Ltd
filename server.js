import 'dotenv/config';
import compression from 'compression';
import express from 'express';
import nodemailer from 'nodemailer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const contactEmail = process.env.CONTACT_EMAIL || 'mogidprojects@gmail.com';
const allowedFiles = new Set([
  'index.html',
  'company.html',
  'services.html',
  'shop.html',
  'styles.css',
  'site.js'
]);
const serviceOptions = new Set([
  'Event management & coordination',
  'Planning & project management',
  'Venue, site & logistics',
  'Supplier coordination',
  'Hospitality & catering',
  'Technical production',
  'Infrastructure & furniture',
  'Decor & guest experience',
  'Safety & compliance coordination',
  'Live operations & close-out'
]);
const submissionsByIp = new Map();
const rateWindowMs = 15 * 60 * 1000;
const maxSubmissionsPerWindow = 5;

app.disable('x-powered-by');
app.use(compression());
app.use((request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://images.unsplash.com data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  next();
});
app.use(express.json({ limit: '20kb', strict: true }));

function getWhatsAppNumber() {
  const rawNumber = (process.env.WHATSAPP_BUSINESS_NUMBER || '').replace(/\D/g, '');
  const digits = /^0\d{9}$/.test(rawNumber) ? `27${rawNumber.slice(1)}` : rawNumber;
  return /^\d{8,15}$/.test(digits) ? digits : '';
}

function textField(value, limit) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

function takeRateLimit(ip) {
  const now = Date.now();
  if (!submissionsByIp.has(ip) && submissionsByIp.size >= 10000) {
    for (const [knownIp, timestamps] of submissionsByIp) {
      if (!timestamps.some((time) => now - time < rateWindowMs)) {
        submissionsByIp.delete(knownIp);
      }
    }
    if (submissionsByIp.size >= 10000) return false;
  }
  const recent = (submissionsByIp.get(ip) || []).filter((time) => now - time < rateWindowMs);
  if (recent.length >= maxSubmissionsPerWindow) {
    submissionsByIp.set(ip, recent);
    return false;
  }
  recent.push(now);
  submissionsByIp.set(ip, recent);
  return true;
}

function smtpSettingsReady() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

app.get('/api/health', (request, response) => {
  response.json({ ok: true });
});

app.get('/api/config', (request, response) => {
  response.json({ email: contactEmail, whatsappNumber: getWhatsAppNumber() });
});

app.post('/api/brief', async (request, response) => {
  if (request.get('sec-fetch-site') === 'cross-site') {
    return response.status(403).json({ error: 'Cross-site brief submissions are not allowed.' });
  }
  if (!request.is('application/json')) {
    return response.status(415).json({ error: 'Brief submissions must use application/json.' });
  }

  const ip = request.socket.remoteAddress || 'unknown';
  if (!takeRateLimit(ip)) {
    return response.status(429).json({ error: 'Too many brief submissions. Please try again later.' });
  }

  if (!smtpSettingsReady()) {
    return response.status(503).json({ error: 'Email is not configured yet. Add the SMTP settings to the private .env file.' });
  }

  const body = request.body && typeof request.body === 'object' ? request.body : {};
  const eventName = textField(body.eventName, 160);
  const eventType = textField(body.eventType, 100);
  const eventDate = textField(body.eventDate, 40);
  const eventLocation = textField(body.eventLocation, 160);
  const eventNotes = textField(body.eventNotes, 3000);
  const services = Array.isArray(body.services) ? [...new Set(body.services)] : [];

  if (services.length > serviceOptions.size || services.some((service) => !serviceOptions.has(service))) {
    return response.status(400).json({ error: 'One or more selected services are invalid.' });
  }

  const lines = [
    'MOGID PROJECTS (PTY) LTD',
    'EVENT BRIEF',
    'Registration No. 2022 / 321696 / 07',
    '',
    `Event name: ${eventName || 'Not specified'}`,
    `Event type: ${eventType || 'Not specified'}`,
    `Date: ${eventDate || 'Not specified'}`,
    `Location: ${eventLocation || 'Not specified'}`,
    '',
    'SERVICES TO DISCUSS',
    ...(services.length ? services.map((service) => `- ${service}`) : ['- Not selected']),
    '',
    'ADDITIONAL NOTES',
    eventNotes || 'None provided',
    '',
    'This brief is a starting point for discussion. Services are subject to scoping and quotation.'
  ];
  const safeEventName = eventName.replace(/[\r\n]/g, ' ').slice(0, 100);
  const subject = safeEventName ? `Website event brief - ${safeEventName}` : 'Website event brief';
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: contactEmail,
      subject,
      text: lines.join('\n')
    });
    return response.status(201).json({ ok: true, message: `Your brief has been sent to ${contactEmail}.` });
  } catch (error) {
    console.error('Brief email delivery failed:', error.message);
    return response.status(502).json({ error: 'We could not send the brief right now. Please try again or email us directly.' });
  }
});

app.get(['/', ...[...allowedFiles].map((file) => `/${file}`)], (request, response) => {
  const file = request.path === '/' ? 'index.html' : path.basename(request.path);
  if (file === 'styles.css' || file === 'site.js') {
    response.setHeader('Cache-Control', 'public, max-age=3600');
  } else if (file.endsWith('.html')) {
    response.setHeader('Cache-Control', 'no-cache');
  }
  response.sendFile(path.join(root, file));
});

app.use((error, request, response, next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return response.status(400).json({ error: 'Request body must be valid JSON.' });
  }
  if (error.type === 'entity.too.large') {
    return response.status(413).json({ error: 'Brief is too large. Please shorten the event notes.' });
  }
  console.error('Request failed:', error.message);
  return response.status(500).json({ error: 'An unexpected server error occurred.' });
});

app.use((request, response) => {
  response.status(404).json({ error: 'Not found.' });
});

app.listen(port, () => {
  console.log(`MOGID Projects site running at http://localhost:${port}`);
});
