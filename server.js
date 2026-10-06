require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const { Resend } = require('resend');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const resend = new Resend(process.env.RESEND_API_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

const events = [
  { id: 'evt-1', title: 'Tech Innovation Summit 2026', capacity: 100, registeredCount: 0 },
  { id: 'evt-2', title: 'Campus Music Fest', capacity: 2, registeredCount: 0 }
];

const ticketDatabase = new Map();

app.get('/api/events', (req, res) => {
  res.json(events);
});

app.post('/api/register', async (req, res) => {
  const { eventId, name, email } = req.body;
  const event = events.find(e => e.id === eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  if (event.registeredCount >= event.capacity) {
    return res.status(400).json({ error: 'Event has reached maximum capacity.' });
  }

  event.registeredCount += 1;

  const ticketPayload = {
    ticketId: `TCK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    eventId,
    attendeeName: name,
    attendeeEmail: email,
    issuedAt: new Date().toISOString()
  };

  const token = jwt.sign(ticketPayload, JWT_SECRET);

  ticketDatabase.set(token, {
    ...ticketPayload,
    status: 'ISSUED',
    checkInTimestamp: null
  });

  try {
    const qrDataUrl = await QRCode.toDataURL(token);

    await resend.emails.send({
      from: process.env.SENDER_EMAIL || 'onboarding@resend.dev',
      to: email,
      subject: `Your Ticket for ${event.title}`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2>Event Confirmation</h2>
          <p>Hi <strong>${name}</strong>,</p>
          <p>You have successfully registered for <strong>${event.title}</strong>.</p>
          <p>Show this QR code at the entry portal:</p>
          <div style="text-align: center; margin: 20px 0;">
            <img src="${qrDataUrl}" alt="QR Ticket" style="width: 200px; height: 200px;"/>
          </div>
          <p style="font-size: 12px; color: #666; word-break: break-all;">Token: ${token}</p>
        </div>
      `
    });

    res.json({ success: true, message: 'Ticket generated and emailed successfully!', token });
  } catch (err) {
    console.error('Email error:', err);
    res.status(500).json({ error: 'Failed to send transactional email.' });
  }
});

app.post('/api/verify', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ status: 'INVALID TICKET', message: 'No ticket token provided.' });
  }

  try {
    jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(400).json({ status: 'INVALID TICKET', message: 'Tampered or malformed ticket token signature.' });
  }

  const ticket = ticketDatabase.get(token);
  if (!ticket) {
    return res.status(404).json({ status: 'INVALID TICKET', message: 'Ticket not found in database.' });
  }

  if (ticket.status === 'CHECKED-IN') {
    return res.status(409).json({
      status: 'ALREADY USED',
      message: `Ticket already scanned at ${new Date(ticket.checkInTimestamp).toLocaleString()}`,
      ticket
    });
  }

  ticket.status = 'CHECKED-IN';
  ticket.checkInTimestamp = new Date().toISOString();
  ticketDatabase.set(token, ticket);

  return res.json({
    status: 'CHECKED-IN',
    message: `Welcome, ${ticket.attendeeName}! Check-in successful.`,
    ticket
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
