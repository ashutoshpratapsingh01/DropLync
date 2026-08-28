async function testRegisterFlow() {
  const testEmail = `newuser_${Date.now()}@example.com`
  console.log('Sending OTP for:', testEmail)
  
  const sendRes = await fetch('http://localhost:3000/api/auth/otp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, type: 'register' })
  })
  const sendData = await sendRes.json()
  console.log('Send OTP Response:', sendData)

  const verifyRes = await fetch('http://localhost:3000/api/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      code: sendData.devCode,
      name: 'New Test User',
      password: 'MyPassword123!'
    })
  })
  const verifyData = await verifyRes.json()
  console.log('Verify Response:', verifyData)
}

testRegisterFlow()
