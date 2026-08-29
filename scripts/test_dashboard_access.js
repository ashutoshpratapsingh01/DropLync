async function testDashboard() {
  const email = 'ashutoshpratapsingh421@gmail.com';
  console.log('1. Sending OTP to:', email);
  const sendRes = await fetch('https://droplync.vercel.app/api/auth/otp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, type: 'login' })
  });
  const sendData = await sendRes.json();
  console.log('Send OTP result:', sendData);

  const code = sendData.devCode;
  if (!code) {
    console.log('No devCode');
    return;
  }

  console.log('2. Verifying OTP with code:', code);
  const verifyRes = await fetch('https://droplync.vercel.app/api/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code })
  });
  console.log('Verify Status:', verifyRes.status);
  const setCookie = verifyRes.headers.get('set-cookie');
  console.log('Set-Cookie:', setCookie);

  const cookieVal = setCookie?.split(';')[0];
  console.log('Extracted Cookie:', cookieVal);

  console.log('3. Accessing /dashboard with cookie...');
  const dashRes = await fetch('https://droplync.vercel.app/dashboard', {
    headers: {
      'Cookie': cookieVal || ''
    },
    redirect: 'manual'
  });
  console.log('Dashboard Status:', dashRes.status);
  console.log('Dashboard Headers:', Object.fromEntries(dashRes.headers.entries()));
  const bodyText = await dashRes.text();
  console.log('Dashboard Body (first 500 chars):', bodyText.slice(0, 500));
}

testDashboard();
