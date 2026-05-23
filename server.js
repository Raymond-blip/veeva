const express = require('express');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 5500;

// Serve static files from public, then fall back to root HTML pages
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname)));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// Handle nav links without .html extension e.g. /products → products.html
const pages = ['products', 'services', 'about', 'contact', 'events', 'resources', 'customers'];
pages.forEach(function(page) {
  app.get('/' + page, function(req, res) {
    res.sendFile(path.join(__dirname, page + '.html'));
  });
});

// Store uploaded resume in memory (no disk clutter)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, DOC, DOCX files are allowed'));
  }
});

// ── Gmail transporter ──────────────────────────────────────────────────────
// Uses Gmail SMTP. Requires an App Password (not your normal Gmail password).
// Steps to get one:
//   1. Go to myaccount.google.com → Security → 2-Step Verification (enable it)
//   2. Then go to myaccount.google.com/apppasswords
//   3. Create an app password for "Mail"
//   4. Paste it below as GMAIL_APP_PASSWORD
// ──────────────────────────────────────────────────────────────────────────
const GMAIL_USER = 'Marshalucy0639@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD
  }
});

// ── Contact form endpoint ──────────────────────────────────────────────────
app.post('/send', upload.single('resume'), async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: 'Name, email and message are required.' });
  }

  const mailOptions = {
    from: `"Veeva Contact Form" <${GMAIL_USER}>`,
    to: GMAIL_USER,
    replyTo: email,
    subject: `[Veeva Contact] ${subject || 'New Message'} — from ${name}`,
    html: `
      <h2 style="color:#004a99;">New message from the Veeva contact form</h2>
      <table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:15px;">
        <tr><td style="padding:8px;font-weight:bold;width:140px;">Name</td><td style="padding:8px;">${name}</td></tr>
        <tr style="background:#f5f8ff;"><td style="padding:8px;font-weight:bold;">Email</td><td style="padding:8px;"><a href="mailto:${email}">${email}</a></td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Phone</td><td style="padding:8px;">${phone || '—'}</td></tr>
        <tr style="background:#f5f8ff;"><td style="padding:8px;font-weight:bold;">Subject</td><td style="padding:8px;">${subject || '—'}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;vertical-align:top;">Message</td><td style="padding:8px;">${message.replace(/\n/g, '<br>')}</td></tr>
      </table>
    `,
    attachments: req.file ? [{
      filename: req.file.originalname,
      content: req.file.buffer,
      contentType: req.file.mimetype
    }] : []
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ ok: true });
  } catch (err) {
    console.error('Mail error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to send email. Check your App Password in server.js.' });
  }
});

app.listen(PORT, () => {
  console.log(`\n✅ Veeva site running at http://localhost:${PORT}`);
  console.log(`📧 Emails will be sent to: ${GMAIL_USER}`);
  console.log(`\n⚠️  If email isn't working, set your Gmail App Password in server.js\n`);
});
