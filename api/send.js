import fs from 'fs';
import formidable from 'formidable';
import nodemailer from 'nodemailer';

export const config = {
  api: {
    bodyParser: false,
  },
};

const GMAIL_USER = process.env.GMAIL_USER || 'Marshalucy0639@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
});

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: false, maxFileSize: 5 * 1024 * 1024 });
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

function normalizeField(value) {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (value === undefined || value === null) {
    return '';
  }
  return String(value);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  if (!GMAIL_APP_PASSWORD) {
    res.status(500).json({ ok: false, error: 'Email not configured on Vercel. Set GMAIL_APP_PASSWORD.' });
    return;
  }

  try {
    const { fields, files } = await parseForm(req);
    const name = normalizeField(fields.name);
    const email = normalizeField(fields.email);
    const phone = normalizeField(fields.phone);
    const subject = normalizeField(fields.subject);
    const message = normalizeField(fields.message);

    if (!name || !email || !message) {
      res.status(400).json({ ok: false, error: 'Name, email and message are required.' });
      return;
    }

    const attachments = [];
    const resumeField = files.resume;
    const resume = Array.isArray(resumeField) ? resumeField[0] : resumeField;
    if (resume && resume.size > 0) {
      const fileContent = fs.readFileSync(resume.filepath || resume.file);
      attachments.push({
        filename: resume.originalFilename || resume.newFilename || 'resume',
        content: fileContent,
        contentType: resume.mimetype || resume.type,
      });
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
          <tr><td style="padding:8px;font-weight:bold;vertical-align:top;">Message</td><td style="padding:8px;">${(message || '').replace(/\n/g, '<br>')}</td></tr>
        </table>
      `,
      attachments,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Mail error:', err);
    res.status(500).json({ ok: false, error: 'Failed to send email. ' + (err.message || 'Unknown error') });
  }
}
