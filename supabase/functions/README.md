# Required secure Edge Functions (not deployed by this ZIP)

Implement and deploy these Supabase Edge Functions before using this as a live exam:

1. `start-exam`
   - Accepts student name, roll number and exam code.
   - Hash/verify exam code server-side; check publication and schedule.
   - Creates attempt with server timestamp.
   - Returns only question IDs, text and options. Never return `correct_option` or explanation.

2. `submit-exam`
   - Accepts attempt ID and selected options.
   - Verify attempt exists, is still active, and server time is within duration.
   - Fetch answer keys on server, calculate +4 / -1 / 0 and chapter-wise scores.
   - Store result and certificate number atomically; reject duplicate/late submissions.

3. `admin-exams` / `admin-analytics`
   - Verify Supabase JWT and admin role on every request.
   - Create/edit exams, set pass percentage, manage questions and query analytics.
   - Never trust a role supplied in the request body.

4. `verify-certificate`
   - Return limited public validity fields for a certificate number.
   - Do not expose student data beyond what is required to verify authenticity.

5. `issue-certificate`
   - Only issue if the server-calculated result meets the current pass threshold.

Use environment secrets for privileged keys. Never embed `service_role` in client-side JavaScript. Keep RLS enabled and test policies with a non-admin user.
