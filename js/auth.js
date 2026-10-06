const $ = (id) => document.getElementById(id);

function showMessage(message, type = 'info') {
  const box = $('message');
  if (!box) return;
  box.hidden = false;
  box.className = `message ${type}`;
  box.textContent = message;
}

function normalizePhone(value) {
  let phone = value.trim().replace(/[\s()-]/g, '');
  if (/^0\d{10}$/.test(phone)) phone = '+91' + phone.slice(1);
  if (/^\d{10}$/.test(phone)) phone = '+91' + phone;
  return phone;
}

async function saveProfile(user, name, email, phone, verified = false) {
  const { error } = await supabaseClient.from('profiles').upsert({
    auth_id: user.id,
    user_id: email.toLowerCase(),
    name,
    email: email.toLowerCase(),
    mobile_number: phone,
    phone_verified: verified,
    account_created: user.created_at
  }, { onConflict: 'auth_id' });
  if (error) throw error;
}

let pendingRegistration = null;

const registerForm = $('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('name').value.trim();
    const email = $('email').value.trim().toLowerCase();
    const phone = normalizePhone($('phone').value);
    const password = $('password').value;
    const confirm = $('confirmPassword').value;

    if (password !== confirm) return showMessage('Passwords do not match.', 'error');
    if (!/^\+\d{8,15}$/.test(phone)) return showMessage('Enter a valid mobile number with country code, e.g. +919876543210.', 'error');

    $('createBtn').disabled = true;
    showMessage('Creating your account...', 'info');

    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { data: { name } }
      });
      if (error) throw error;
      if (!data.user) throw new Error('Account could not be created.');

      pendingRegistration = { name, email, phone, userId: data.user.id };

      // Keep the same Auth user and verify its phone number with OTP.
      const { error: phoneError } = await supabaseClient.auth.updateUser({ phone });
      if (phoneError) throw phoneError;

      await saveProfile(data.user, name, email, phone, false);
      $('registerForm').hidden = true;
      $('otpBox').hidden = false;
      $('otpPhone').textContent = phone;
      showMessage('OTP sent to your mobile number.', 'success');
    } catch (err) {
      showMessage(err.message || 'Registration failed.', 'error');
      $('createBtn').disabled = false;
    }
  });
}

async function verifyRegistrationOtp() {
  if (!pendingRegistration) return showMessage('Registration session expired. Please start again.', 'error');
  const token = $('otp').value.trim();
  if (!/^\d{6}$/.test(token)) return showMessage('Enter the 6-digit OTP.', 'error');

  $('verifyBtn').disabled = true;
  try {
    const { data, error } = await supabaseClient.auth.verifyOtp({
      phone: pendingRegistration.phone,
      token,
      type: 'phone_change'
    });
    if (error) throw error;

    const user = data.user || (await supabaseClient.auth.getUser()).data.user;
    await saveProfile(user, pendingRegistration.name, pendingRegistration.email, pendingRegistration.phone, true);
    showMessage('Mobile verified successfully. Account created!', 'success');
    setTimeout(() => { window.location.href = '../pages/dashboard.html'; }, 900);
  } catch (err) {
    showMessage(err.message || 'Invalid OTP.', 'error');
    $('verifyBtn').disabled = false;
  }
}

$('verifyBtn')?.addEventListener('click', verifyRegistrationOtp);
$('resendBtn')?.addEventListener('click', async () => {
  if (!pendingRegistration) return;
  $('resendBtn').disabled = true;
  try {
    const { error } = await supabaseClient.auth.updateUser({ phone: pendingRegistration.phone });
    if (error) throw error;
    showMessage('A new OTP has been sent.', 'success');
  } catch (err) {
    showMessage(err.message || 'Could not resend OTP.', 'error');
  } finally {
    setTimeout(() => { $('resendBtn').disabled = false; }, 30000);
  }
});

const loginForm = $('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('email').value.trim().toLowerCase();
    const password = $('password').value;
    const button = $('loginBtn');
    button.disabled = true;
    try {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = '../pages/dashboard.html';
    } catch (err) {
      showMessage(err.message || 'Login failed.', 'error');
      button.disabled = false;
    }
  });
}

$('showPassword')?.addEventListener('click', () => {
  const input = $('password');
  if (input) input.type = input.type === 'password' ? 'text' : 'password';
});
