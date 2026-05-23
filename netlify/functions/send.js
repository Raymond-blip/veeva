const nodemailer = require('nodemailer');
const parser = require('lambda-multipart-parser');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
  }

  let result;
  try {
    result = await parser.parse(event);
  } catch (e) {
    console.error('Parse error:', e);
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Could not parse form data' }) };
  }

  const { name, email, phone, subject, message } = result;
  const files = result.files || [];
  const resume = files.find(f => f.fieldname === 'resume');

  if (!name || !email || !message) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Name, email and message are required.' }) };
  }

  const GMAIL_USER = 'Marshalucy0639@gmail.com';
  const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

  if (!GMAIL_APP_PASSWORD) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Email not configured. Set GMAIL_APP_PASSWORD in Netlify environment variables.' }) };
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD }
  });

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
    attachments: resume ? [{
      filename: resume.filename,
      content: resume.content,
      contentType: resume.contentType
    }] : []
  };

  try {
    await transporter.sendMail(mailOptions);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('Mail error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Failed to send email: ' + err.message }) };
  }
};
