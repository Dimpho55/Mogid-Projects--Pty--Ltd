# MOGID Projects website

## Run locally

1. Install Node.js 18 or newer.
2. Copy `.env.example` to `.env`.
3. Set `SMTP_USER` and `SMTP_PASS` in `.env`. For Gmail, create an App Password in the Google Account security settings and use that value; do not use or publish your normal Gmail password.
4. Set `WHATSAPP_BUSINESS_NUMBER` to the WhatsApp Business number in international digits, without `+`, spaces, or punctuation. For example, a South African number starts with `27`.
5. Run `npm install`, then `npm start`.
6. Open `http://localhost:3000`.

The Shop's **Email event brief** button posts the brief to the local backend, which emails `CONTACT_EMAIL`. **WhatsApp event brief** opens a prefilled WhatsApp chat to the configured business number. The WhatsApp number is public contact information; email credentials remain on the server in `.env`.

The **Gallery** page displays selected JPEG photos from `docs/photos`, grouped into categories. Add new image cards to `docs/gallery.html` and allow their item names in the backend's `serviceOptions` list in `server.js` so they can be added to a quote. Use browser-friendly formats such as JPG, PNG, or WebP; convert HEIC photos before adding them.

The backend exposes `GET /api/health`, `GET /api/config` (public contact details only), and `POST /api/brief`. Brief submissions are size-limited and rate-limited. Keep `.env` private and deploy behind HTTPS.
