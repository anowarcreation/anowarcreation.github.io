EMAIL OTP AUTH UPDATE

Upload/replace:
- auth/verify-email.html
- auth/register.html
- auth/auth.css
- js/auth.js

Supabase:
- Email provider ON
- Email OTP length 6
- Email OTP expiration 600 seconds
- Phone provider OFF

Email template:
Authentication -> Email Templates -> Confirm signup
Use {{ .Token }} in the email body so the user receives a 6-digit OTP.

The website calls supabase.auth.verifyOtp({ email, token, type: 'email' }) after the user enters the OTP.
