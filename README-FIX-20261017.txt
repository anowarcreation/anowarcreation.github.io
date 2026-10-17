Anowar Creation — homepage rendering, mobile navigation, and loading fix

Upload all files and folders from this ZIP to the ROOT of the anowarcreation.github.io GitHub repository, replacing files with matching names. Do not upload the ZIP file itself.

What changed:
- Added css/public-site-fixed.css to force homepage hero text and portfolio card to render responsively.
- Added js/public-site-fixed.js with reliable mobile menu open/close behavior.
- Updated all six public pages to use the newly named CSS/JS files to avoid stale browser/GitHub Pages cache.
- The mobile navigation uses an inline fallback handler plus the JavaScript handler.
- The PDF library loads asynchronously so the initial page parser isn't held up by that external download.
- No Supabase SQL migration is required for these changes.

After publishing, open the site and perform a hard refresh (Ctrl+F5 on desktop); on mobile, close the old tab and reopen the site.
