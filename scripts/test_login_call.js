async function testPasswordLogin() {
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'demo@droplync.com',
      password: 'Password123!'
    })
  })
  const data = await res.json()
  console.log('Login Test Status:', res.status)
  console.log('Login Test Response:', data)
}
testPasswordLogin()
