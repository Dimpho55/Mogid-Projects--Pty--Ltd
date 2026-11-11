const storageKey = 'mogid-event-brief';
const contactEmail = 'mogidprojects@gmail.com';
const fallbackWhatsAppNumber = '27674082993';

function sanitizeWhatsAppNumber(number) {
  const digits = String(number || '').replace(/\D/g, '');
  if (!digits) return '';
  if (/^0\d{9}$/.test(digits)) return `27${digits.slice(1)}`;
  if (/^27\d{9,10}$/.test(digits)) return digits;
  if (/^\d{9,15}$/.test(digits)) return digits;
  return '';
}

function readBrief() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(stored) ? stored.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function saveBrief(items) {
  localStorage.setItem(storageKey, JSON.stringify(items));
}

function normalizeWhatsAppNumber(number) {
  return sanitizeWhatsAppNumber(number);
}

function renderBrief() {
  const items = readBrief();
  document.querySelectorAll('.quote-count').forEach((count) => { count.textContent = items.length; });
  const list = document.querySelector('#brief-list');
  const empty = document.querySelector('#brief-empty');
  if (list) {
    list.replaceChildren();
    items.forEach((name) => {
      const row = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = name;
      const remove = document.createElement('button');
      remove.className = 'remove-service';
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove ${name}`);
      remove.textContent = '×';
      remove.addEventListener('click', () => {
        saveBrief(readBrief().filter((item) => item !== name));
        renderBrief();
      });
      row.append(label, remove);
      list.append(row);
    });
  }
  if (empty) empty.hidden = items.length > 0;
  const clear = document.querySelector('#clear-brief');
  if (clear) clear.hidden = items.length === 0;
  document.querySelectorAll('.add-service').forEach((button) => {
    const added = items.includes(button.dataset.service);
    button.classList.toggle('is-added', added);
    button.querySelector('span:first-child').textContent = added ? 'Added to brief' : 'Add to brief';
    button.querySelector('span:last-child').textContent = added ? '✓' : '＋';
    button.setAttribute('aria-pressed', String(added));
  });
}

document.querySelector('.menu-toggle')?.addEventListener('click', (event) => {
  const button = event.currentTarget;
  const nav = document.querySelector('.main-nav');
  const expanded = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', String(!expanded));
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  nav.classList.toggle('is-open', !expanded);
});

document.querySelectorAll('.page-hero-image img').forEach((image) => {
  image.addEventListener('error', () => { image.hidden = true; });
});

document.querySelectorAll('.add-service').forEach((button) => {
  button.addEventListener('click', () => {
    const items = readBrief();
    const service = button.dataset.service;
    saveBrief(items.includes(service) ? items.filter((item) => item !== service) : [...items, service]);
    renderBrief();
  });
});

document.querySelector('#clear-brief')?.addEventListener('click', () => {
  saveBrief([]);
  renderBrief();
});

document.querySelectorAll('.mini-add').forEach((link) => {
  link.addEventListener('click', () => {
    const service = new URL(link.href).searchParams.get('add');
    const items = readBrief();
    if (service && !items.includes(service)) saveBrief([...items, service]);
  });
});

function getBriefLines() {
  const data = getBriefData();
  return [
    'MOGID PROJECTS (PTY) LTD',
    'EVENT BRIEF',
    'Registration No. 2022 / 321696 / 07',
    '',
    `Event name: ${data.eventName || 'Not specified'}`,
    `Event type: ${data.eventType || 'Not specified'}`,
    `Date: ${data.eventDate || 'Not specified'}`,
    `Location: ${data.eventLocation || 'Not specified'}`,
    '',
    'SERVICES AND ITEMS TO DISCUSS',
    ...(data.services.length ? data.services.map((service) => `- ${service}`) : ['- Not selected']),
    '',
    'ADDITIONAL NOTES',
    data.eventNotes || 'None provided',
    '',
    'This brief is a starting point for discussion. Services are subject to scoping and quotation.',
    'MOGID Projects (Pty) Ltd | Plot 15, Zaanrivierspoort, Molemole, Limpopo, 0700',
    `Email: ${contactEmail}`
  ];
}

function getBriefData() {
  const values = new FormData(document.querySelector('#brief-form'));
  return {
    eventName: values.get('eventName'),
    eventType: values.get('eventType'),
    eventDate: values.get('eventDate'),
    eventLocation: values.get('eventLocation'),
    eventNotes: values.get('eventNotes'),
    services: readBrief()
  };
}

document.querySelector('#download-brief')?.addEventListener('click', () => {
  const lines = getBriefLines();
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const download = document.createElement('a');
  download.href = url;
  download.download = 'mogid-event-brief.txt';
  download.click();
  URL.revokeObjectURL(url);
  document.querySelector('#brief-status').textContent = 'Your event brief has been downloaded.';
});

const downloadButton = document.querySelector('#download-brief');
if (downloadButton) {
  const emailButton = document.createElement('button');
  emailButton.className = 'button button-gold button-wide';
  emailButton.type = 'button';
  emailButton.textContent = 'Email event brief';
  downloadButton.insertAdjacentElement('afterend', emailButton);
  emailButton.addEventListener('click', async () => {
    emailButton.disabled = true;
    document.querySelector('#brief-status').textContent = 'Sending your event brief...';
    try {
      const response = await fetch('/api/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getBriefData())
      });
      if (response.status === 404) {
        const data = getBriefData();
        const subject = data.eventName ? `Website event brief - ${data.eventName}` : 'Website event brief';
        const body = getBriefLines().join('\n');
        window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        document.querySelector('#brief-status').textContent = 'Your email app will open with the event brief.';
        return;
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The brief could not be sent.');
      document.querySelector('#brief-status').textContent = result.message;
    } catch (error) {
      document.querySelector('#brief-status').textContent = error.message || 'The server could not be reached. Please try again.';
    } finally {
      emailButton.disabled = false;
    }
  });

}

function attachFloatingWhatsAppButton(number) {
  const internationalNumber = normalizeWhatsAppNumber(number);
  if (!/^\d{8,15}$/.test(internationalNumber)) return;

  const floatingLink = document.createElement('a');
  floatingLink.className = 'whatsapp-float';
  floatingLink.href = `https://wa.me/${internationalNumber}?text=${encodeURIComponent('Hello MOGID Projects, I would like a quote for an event.')}`;
  floatingLink.target = '_blank';
  floatingLink.rel = 'noopener noreferrer';
  floatingLink.setAttribute('aria-label', 'Chat with MOGID Projects on WhatsApp');
  floatingLink.title = 'Chat with MOGID Projects on WhatsApp';
  floatingLink.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.066 7.926c0 1.399.366 2.764 1.063 3.965L0 16l4.204-1.102a7.93 7.93 0 0 0 3.79.965h.004c4.367 0 7.926-3.558 7.928-7.926a7.9 7.9 0 0 0-2.325-5.611M7.998 14.53a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.25a6.6 6.6 0 0 1-1.007-3.51c.002-3.856 3.14-6.994 7-6.994a6.95 6.95 0 0 1 4.95 2.05 6.95 6.95 0 0 1 2.047 4.953c-.002 3.856-3.14 6.994-7 6.994"/><path fill="currentColor" d="M11.6 8.879c-.198-.099-1.17-.578-1.352-.644-.182-.066-.314-.099-.446.1-.132.198-.512.644-.628.776-.116.132-.231.149-.429.05-.198-.1-.836-.308-1.592-.982-.588-.524-.985-1.17-1.1-1.368-.116-.198-.013-.305.087-.404.09-.09.198-.231.297-.347.099-.116.132-.198.198-.33.066-.132.033-.248-.017-.347-.05-.1-.446-1.075-.611-1.472-.161-.387-.324-.334-.446-.34-.116-.006-.248-.007-.38-.007a.73.73 0 0 0-.528.248c-.182.198-.694.677-.694 1.652s.71 1.916.809 2.048c.099.132 1.398 2.134 3.388 2.991.473.204.842.326 1.13.418.475.151.907.13 1.249.079.381-.057 1.17-.479 1.335-.941.165-.462.165-.859.116-.941-.05-.083-.182-.132-.38-.231"/></svg>';
  document.body.append(floatingLink);

  const footerLinks = document.querySelector('.footer-links');
  if (!footerLinks) return;
  const link = document.createElement('a');
  link.href = `https://wa.me/${internationalNumber}`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'WhatsApp MOGID';
  footerLinks.append(link);
}

fetch('/api/config')
  .then((response) => response.ok ? response.json() : Promise.reject(new Error('Contact settings unavailable')))
  .then(({ whatsappNumber }) => attachFloatingWhatsAppButton(whatsappNumber || fallbackWhatsAppNumber))
  .catch(() => attachFloatingWhatsAppButton(fallbackWhatsAppNumber));

document.querySelectorAll('.year').forEach((element) => { element.textContent = new Date().getFullYear(); });
const briefStatus = document.querySelector('#brief-status');
if (briefStatus) briefStatus.className = 'brief-status';
renderBrief();
const selectedService = new URLSearchParams(location.search).get('add');
if (selectedService && document.querySelector('#brief')) {
  document.querySelector('#brief').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
