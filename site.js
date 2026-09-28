const storageKey = 'mogid-event-brief';

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

document.querySelector('#download-brief')?.addEventListener('click', () => {
  const form = document.querySelector('#brief-form');
  const values = new FormData(form);
  const services = readBrief();
  const lines = [
    'MOGID PROJECTS (PTY) LTD',
    'EVENT BRIEF',
    'Registration No. 2022 / 321696 / 07',
    '',
    `Event name: ${values.get('eventName') || 'Not specified'}`,
    `Event type: ${values.get('eventType') || 'Not specified'}`,
    `Date: ${values.get('eventDate') || 'Not specified'}`,
    `Location: ${values.get('eventLocation') || 'Not specified'}`,
    '',
    'SERVICES TO DISCUSS',
    ...(services.length ? services.map((service) => `- ${service}`) : ['- Not selected']),
    '',
    'ADDITIONAL NOTES',
    values.get('eventNotes') || 'None provided',
    '',
    'This brief is a starting point for discussion. Services are subject to scoping and quotation.',
    'MOGID Projects (Pty) Ltd | Plot 15, Zaanrivierspoort, Molemole, Limpopo, 0700'
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const download = document.createElement('a');
  download.href = url;
  download.download = 'mogid-event-brief.txt';
  download.click();
  URL.revokeObjectURL(url);
  document.querySelector('#brief-status').textContent = 'Your event brief has been downloaded.';
});

document.querySelectorAll('.year').forEach((element) => { element.textContent = new Date().getFullYear(); });
renderBrief();
const selectedService = new URLSearchParams(location.search).get('add');
if (selectedService && document.querySelector('#brief')) {
  document.querySelector('#brief').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
