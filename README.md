# Campus Event Ticketing & QR Verification System

A full-stack Node.js & Express application for event registration, dynamic transactional ticket dispatch with cryptographically signed QR codes, and real-time organizer check-in verification.

## 🚀 Features
- **Participant Portal**: Live event browsing with capacity limits.
- **Transactional Email**: Sends dynamic HTML emails with embedded QR codes via Resend.
- **Cryptographic Security**: HMAC-SHA256 / JWT signed ticket payloads to prevent forgery.
- **Organizer Scan Portal**: Live webcam scanner with fallback token input.
- **Anti-Duplication Logic**: Flags repeat scans as `ALREADY USED` with exact timestamps.

---

## 🛠️ Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

```env
PORT=3000
JWT_SECRET=your_custom_secret_key
RESEND_API_KEY=re_your_resend_api_key
SENDER_EMAIL=onboarding@resend.dev
