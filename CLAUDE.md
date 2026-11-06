# Working on the Frontier Tech Summit site

Read this first. It is written for Dan Caruso and his Claude. Dan has full say over this site:
change any layout, color, size or copy, add or remove anything.

## What this is

- Live at https://www.endeavorcolorado.org/frontier-tech-summit (also https://endeavorfrontiertech.vercel.app).
- A static site with no build step. Every push to `main` deploys to the live site in about a minute (Vercel project `endeavorfrontiertech`).
- endeavorcolorado.org shows it through a rewrite set in the main Endeavor Colorado site, so the URL never changes.

## Where things are

- `frontier-tech-summit/index.html` is the whole public site, one file. Each nav page is a `<div class="page" id="page-…">`, switched by the URL hash (`#why-now`, `#attend`, `#frontiers`, `#program`, `#boulder`, `#partners`; `#home` is the default).
- The header is near the top of the body (`<header class="site-header v2">`). Its styles and scroll script sit at the very end of the file in `<style id="hdr-v2">` and `<script id="hdr-v2-js">`.
- Images live in `frontier-tech-summit/assets/`. Keep new images under about 400 KB (WebP or JPEG); git keeps every version forever.
- Fonts are Oswald (display) and Inter (body) from Google Fonts.

## Rules that keep the site working

1. **After changing `index.html`, run `python3 build-review.py`.** It regenerates `frontier-tech-summit/review/index.html` (Dan's review link) from the live page. Commit both.
2. **Never run `build-members.py`.** Its source file is not in this repo, so running it breaks the members area. Leave `frontier-tech-summit/members/` alone unless you mean to change the members area by hand.
3. **No new outside scripts, embeds or trackers.** The site runs under endeavorcolorado.org's security policy, which only allows Google Fonts from other domains. Anything else (a new script, iframe, analytics tag) is silently blocked until it is added to that policy in the main site.
4. **Keep data out of this repo.** It is public. Investor and founder lists, ratings and budgets live behind the members login, not in these files.
5. **Every link opens in a new tab** (`target="_blank" rel="noopener"`).
6. **Pull before you start** (`git pull`), since Bre may also be editing.
7. **Commit as Endeavor Colorado, or the push won't go live.** Vercel's plan only deploys commits saved under the account's own author. Run this once in the clone:
   `git config user.name "Endeavor Colorado"` and `git config user.email "colorado@endeavor.org"`.
   Put who made the change in the commit message (for example "Dan: one-row hero, removed 2027").

## Undo

- Git keeps every version: `git revert <commit>` and push.
- Vercel can also roll the live site back to any earlier deploy in one click.

## People

- Bre (breanna.real@endeavor.org) and Zeb run the Endeavor Colorado side.
- Registration goes to the Luma event at https://luma.com/vlq9qh1d.
