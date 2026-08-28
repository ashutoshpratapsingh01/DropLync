async function testVerify() {
  const sendRes = await fetch('https://droplync.vercel.app/api/auth/otp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test_verify_user@gmail.com', type: 'register' })
  });
  const sendData = await sendRes.json();
  console.log('Send Response:', sendData);

  const code = sendData.devCode;
  if (!code) {
    console.log('No devCode returned');
    return;
  }

  const verifyRes = await fetch('https://droplync.vercel.app/api/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test_verify_user@gmail.com',
      code: code,
      name: 'Test Verify'
    })
  });

  const verifyData = await verifyRes.json();
  console.log('Verify Status:', verifyRes.status);
  console.log('Verify Response:', verifyData);
  console.log('Set-Cookie Header:', verifyRes.headers.get('set-cookie'));
}

testVerify();
