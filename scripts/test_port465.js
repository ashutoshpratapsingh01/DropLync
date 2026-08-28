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

async function testPort465() {
  console.log('Testing Port 465 SSL to Gmail...');
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  });

  const otp = '903939';
  const info = await transporter.sendMail({
    from: `DropLync <${env.SMTP_USER}>`,
    to: 'ashutoshpratapsingh421@gmail.com',
    subject: `Your DropLync Verification Code: ${otp}`,
    text: `Your DropLync verification code is ${otp}. Valid for 10 minutes.`,
    html: `
      <div style="font-family:sans-serif;background:#0b0f1d;color:#ffffff;padding:30px;border-radius:16px;max-width:480px;margin:0 auto;">
        <h2 style="color:#38bdf8;margin-bottom:10px;">DropLync Verification</h2>
        <p style="color:#94a3b8;font-size:14px;">Your 6-digit verification code is:</p>
        <div style="font-size:32px;font-weight:900;letter-spacing:6px;color:#60a5fa;background:#1e293b;padding:16px;border-radius:10px;text-align:center;margin:20px 0;">
          ${otp}
        </div>
        <p style="color:#64748b;font-size:12px;">Valid for 10 minutes. If you did not request this, please ignore.</p>
      </div>
    `
  });
  console.log('Port 465 sent successfully!');
  console.log('Message ID:', info.messageId);
  console.log('Response:', info.response);
}

testPort465();
