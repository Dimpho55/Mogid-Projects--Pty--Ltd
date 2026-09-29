const storageKey = 'mogid-event-brief';
const contactEmail = 'mogidprojects@gmail.com';

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
  const digits = String(number || '').replace(/\D/g, '');
  return /^0\d{9}$/.test(digits) ? `27${digits.slice(1)}` : digits;
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
    'SERVICES TO DISCUSS',
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

fetch('/api/config')
  .then((response) => response.ok ? response.json() : Promise.reject(new Error('Contact settings unavailable')))
  .then(({ whatsappNumber }) => {
    const internationalNumber = normalizeWhatsAppNumber(whatsappNumber);
    if (!/^\d{8,15}$/.test(internationalNumber)) return;
    const floatingLink = document.createElement('a');
    floatingLink.className = 'whatsapp-float';
    floatingLink.href = `https://wa.me/${internationalNumber}?text=${encodeURIComponent('Hello MOGID Projects, I need help with an event.')}`;
    floatingLink.target = '_blank';
    floatingLink.rel = 'noopener noreferrer';
    floatingLink.setAttribute('aria-label', 'Chat with MOGID Projects on WhatsApp');
    floatingLink.title = 'Chat with MOGID Projects on WhatsApp';
    floatingLink.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16 4.2A11.5 11.5 0 0 0 6.1 21.5l-1.5 5.4 5.6-1.5A11.5 11.5 0 1 0 16 4.2Z"/><path fill="#25D366" d="M11.4 9.7c-.3-.7-.6-.7-.9-.7h-.8c-.3 0-.7.1-1 .5-.4.4-1.3 1.3-1.3 3.1s1.3 3.5 1.5 3.8c.2.2 2.5 4 6.2 5.5 3.1 1.2 3.7 1 4.3.9.7-.1 2.2-.9 2.5-1.8.3-.9.3-1.6.2-1.8-.1-.2-.4-.3-.8-.5l-2.4-1.1c-.3-.1-.6-.2-.8.2-.3.4-.9 1.1-1.1 1.3-.2.3-.4.3-.8.1-.4-.2-1.6-.6-3.1-1.9-1.1-1-1.8-2.2-2-2.6-.2-.4 0-.6.2-.8.2-.2.4-.5.6-.7.2-.2.3-.4.4-.6.1-.3 0-.5 0-.7l-1.1-2.4Z"/></svg>';
    document.body.append(floatingLink);

    const footerLinks = document.querySelector('.footer-links');
    if (!footerLinks) return;
    const link = document.createElement('a');
    link.href = `https://wa.me/${internationalNumber}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'WhatsApp MOGID';
    footerLinks.append(link);
  })
  .catch(() => {});

document.querySelectorAll('.year').forEach((element) => { element.textContent = new Date().getFullYear(); });
const briefStatus = document.querySelector('#brief-status');
if (briefStatus) briefStatus.className = 'brief-status';
renderBrief();
const selectedService = new URLSearchParams(location.search).get('add');
if (selectedService && document.querySelector('#brief')) {
  document.querySelector('#brief').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
