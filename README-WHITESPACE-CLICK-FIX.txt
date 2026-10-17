Anowar Creation — Home page blank-area click fix

Issue fixed:
- The embedded auth/login layer had a CSS rule that forced it to display:flex!important.
- The old hide selector only matched "display: none" with a space, but the initial HTML uses style="display:none".
- This could leave a full-screen auth layer over the public homepage and intercept clicks in areas that look blank.

Fix:
- Hide the auth layer whenever aria-hidden="true", or inline display is none in either serialization format.
- Show it only when aria-hidden="false" or inline display is flex.
- The Admin login path now also marks the embedded auth layer aria-hidden="true" when hiding it.

Only the embedded auth-layer visibility logic in index.html was changed; other public pages, service logic, Admin Panel, Customer Panel, Supabase configuration, and theme assets were retained.

Deployment:
Upload all files from this ZIP to the root of the anowarcreation.github.io GitHub repository, replacing files with matching names. Commit changes, then hard refresh the live homepage (Ctrl+F5 on desktop; close and reopen the tab on mobile).
