const nodemailer = require('nodemailer');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
});

async function test() {
  console.log('Testing SMTP with credentials:');
  console.log('SMTP_USER:', env.SMTP_USER);
  console.log('SMTP_FROM:', env.SMTP_FROM);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  });

  const fromAddress = `DropLync <${env.SMTP_USER}>`;
  console.log('Using From Address:', fromAddress);

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: 'ashutoshpratapsingh421@gmail.com',
      subject: 'DropLync Verification Code Test: 582914',
      text: 'Your DropLync verification code is 582914',
      html: `<h2>DropLync Verification Code: <strong>582914</strong></h2><p>This is a live test from DropLync.</p>`
    });
    console.log('Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('Accepted:', info.accepted);
    console.log('Rejected:', info.rejected);
  } catch (err) {
    console.error('Send mail error:', err);
  }
}

test();
