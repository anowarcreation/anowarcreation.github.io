ANOWAR CREATION — LOGIN / CUSTOMER DASHBOARD VIEW FIX

This package is based on the latest website bundle that includes Notice Board image upload, customer notice popup, Messages chat/history, and Contact Email function.

Changes in this update:
- Public Home, Login/Register, Customer Dashboard and Admin Panel are now switched through mutually exclusive view state.
- The public Home is hidden immediately when an authenticated user is detected. Hidden layers are inert and cannot capture clicks.
- Customer sidebar navigation explicitly activates the chosen panel and hides the overview content on Services/Orders pages.
- Added final high-specificity portal-view CSS and cache-busting query versions for the paired public stylesheet/script.

Existing Notice/Chat/Contact files and SQL/function setup are retained. If not configured yet, follow SUPPORT-NOTICE-CONTACT-SETUP.txt and run supabase-support-notices-contact.sql in Supabase SQL Editor; deploy supabase/functions/send-contact-email/index.ts and configure the email provider secret to enable real email delivery.
