async function testBothAuthModes() {
  console.log('--- Testing OTP Flow ---');
  const sendRes = await fetch('https://droplync.vercel.app/api/auth/otp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ashutoshpratapsingh421@gmail.com', type: 'login' })
  });
  const sendData = await sendRes.json();
  console.log('Send OTP Response:', sendData);

  if (sendData.devCode) {
    const verifyRes = await fetch('https://droplync.vercel.app/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ashutoshpratapsingh421@gmail.com',
        code: sendData.devCode
      })
    });
    console.log('Verify Status:', verifyRes.status);
    console.log('Verify Response:', await verifyRes.json());
    console.log('Set-Cookie:', verifyRes.headers.get('set-cookie'));
  }
}

testBothAuthModes();
