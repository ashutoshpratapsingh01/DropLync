async function testLiveOtp() {
  const url = 'https://droplync.vercel.app/api/auth/otp/send';
  console.log('Testing live OTP send at:', url);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ashutoshpratapsingh421@gmail.com',
        type: 'register'
      })
    });
    const status = res.status;
    const data = await res.json();
    console.log('Status:', status);
    console.log('Response:', data);
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

testLiveOtp();
