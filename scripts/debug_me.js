async function debugMe() {
  const email = 'ashutoshpratapsingh421@gmail.com';
  const sendRes = await fetch('https://droplync.vercel.app/api/auth/otp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, type: 'login' })
  });
  const sendData = await sendRes.json();
  const code = sendData.devCode;

  const verifyRes = await fetch('https://droplync.vercel.app/api/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code })
  });
  const setCookie = verifyRes.headers.get('set-cookie');
  const cookieVal = setCookie?.split(';')[0];
  console.log('Cookie:', cookieVal);

  const meRes = await fetch('https://droplync.vercel.app/api/auth/me', {
    headers: {
      'Cookie': cookieVal || ''
    }
  });
  console.log('/api/auth/me Status:', meRes.status);
  console.log('/api/auth/me Body:', await meRes.text());
}

debugMe();
