# Endeavor Frontier Tech Summit — public site

Static site, no build step, no data collection. Public at **https://www.endeavorcolorado.org/frontier-tech-summit**.

- `frontier-tech-summit/index.html` — the whole site (Home, Who attends, Frontiers, Program, Boulder). Pages switch by `#hash`.
- `frontier-tech-summit/assets/` — images and the link-preview card (`share.jpg`).
- `vercel.json` — this project's own address (`/`) redirects to `/frontier-tech-summit`.

## How it reaches endeavorcolorado.org
This repo deploys to its own Vercel project (colorado@endeavor.org account). The main
endeavorcolorado.org site has a rewrite that shows this project at `/frontier-tech-summit`, so visitors
only ever see endeavorcolorado.org/frontier-tech-summit. Everything lives under `/frontier-tech-summit/` here so the
same paths work in both places.

To move to its own domain later: add the domain to this Vercel project, change the main
site's rewrite to a redirect, and update the `canonical` / `og:` URLs at the top of
`frontier-tech-summit/index.html`.

Short links on the main site (/frontier, /fts, /frontier-tech-summit-2027) redirect to
/frontier-tech-summit; those redirects live in the main site's config.

## Source of truth
This repo is the master copy of the site. The Claude design artifact
(claude.ai/artifact/8CCXewQn8oL7o8u55Dwpew) is a mirror with a "Draft copy" banner;
refresh it from this repo after changes, never the other way around.

## Registration
The three "Request an invitation" buttons on the Who attends page open the Luma event
(https://luma.com/vlq9qh1d) in a new tab. Plain links only: Luma embeds or widgets are
blocked by endeavorcolorado.org's security policy unless the main site's CSP allows them.

## Rules
- Content only. No attendee data, prices, budget or unconfirmed names in this public repo.
  Registration runs through Luma; contacts live in Salesforce.
- Every change saved to `main` goes live automatically. Bre approves before anything is merged.
- Footer "Team login" opens the internal plan in Claude; access is by named email invite only.
- Keep it static: plain HTML, no build step, no framework.
- endeavorcolorado.org's content security policy covers /frontier-tech-summit. Anything loaded from another
  domain (scripts, embeds, iframes, analytics, Luma/Typeform widgets) is blocked silently until the
  Website – Endeavor CO project allows it. Links out are fine. No forms that submit off-site.
- Don't rename `frontier-tech-summit/`, this Vercel project (endeavorfrontiertech) or its domain without telling
  the Website project; the main site's rewrite points at them.
- Commits are saved as colorado@endeavor.org so Vercel will deploy them.
