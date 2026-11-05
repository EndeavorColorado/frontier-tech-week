# Builds frontier-tech-summit/members/index.html from the plan artifact source.
# Source (not in the repo): scratchpad/members/plan-source.html — the "Frontier Tech Week Plan"
# artifact HTML. All JSON data is stripped; the page loads data from /api/summit-members.
import re, sys, os, subprocess
SRC = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/-home-claude/2b4cca31-3def-5c1d-a662-31e6ac1653ae/scratchpad/members/plan-source.html'
s = open(SRC, encoding='utf-8').read()
v = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip() or '0'

# 1. unwrap the artifact host shell: keep from the inner doctype
i = s.index('<!doctype html><html lang="en">')
s = s[i:]
s = s.replace('<html lang="en">', '<html lang="en" data-theme="dark">', 1)
s = s.replace('<title>Frontier Tech Week Plan</title>', '<title>Members · Endeavor Frontier Tech Summit</title><meta name="robots" content="noindex,nofollow"><link rel="icon" href="/frontier-tech-summit/assets/favicon.svg">', 1)
# fonts: site fonts
s = re.sub(r'<link rel="stylesheet" href="https://fonts.googleapis.com/css2\?family=Playfair[^"]*">',
           '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap">', s)

# 2. strip embedded data
for tid in ('state', 'invdata', 'toursdata', 'fdrdata'):
    # anchored at line start: the app's buildDoc() contains the same tag text inside a string
    s = re.sub(r'^(<script id="%s" type="application/json">).*?(</script>)' % tid, r'\1\2', s, count=1, flags=re.S | re.M)
# the app runs later, after data arrives
s = s.replace('<script id="app">', '<script id="app" type="text/plain">', 1)

# 3. header + tabs
hdr_start = s.index('<header>'); hdr_end = s.index('</header>') + len('</header>')
header = '''<header class="mh">
  <a class="mh-brand" href="/frontier-tech-summit/#home"><svg class="ewm" viewBox="0 0 216 28" role="img" aria-label="Endeavor" focusable="false">__EWM__</svg><span class="mh-lock"><span>Frontier Tech Summit</span><span>Members</span></span></a>
  <div class="mh-right"><span class="mh-me" id="mhMe"></span><a class="mh-link" href="/frontier-tech-summit/review/" id="mhReview" hidden>Review the site</a><button class="mh-link" id="mhSettings" hidden>Settings</button><button class="mh-link" id="mhHelp" title="How this works">?</button><button class="mh-link" id="mhOut">Sign out</button></div>
</header>
<p class="stamp"><i></i>Members only · not public</p>'''
s = s[:hdr_start] + header + s[hdr_end:]
# the Endeavor wordmark paths from the public site
site = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontier-tech-summit', 'index.html'), encoding='utf-8').read()
m = re.search(r'<svg class="ewm ewm-head"[^>]*>(.*?)</svg>', site, re.S)
s = s.replace('__EWM__', m.group(1) if m else '')

# purpose card -> removed (Home carries a short version)
s = re.sub(r'<section class="card purpose">.*?</section>\n', '', s, flags=re.S)
# tabs in Breanna's order, Home first
s = re.sub(r'<div class="tabs" role="tablist">.*?</div>', '''<div class="tabs top" role="tablist">
  <button role="tab" id="t-home" aria-selected="true">Home</button>
  <button role="tab" id="t-inv" aria-selected="false">Investors</button>
  <button role="tab" id="t-fdr" aria-selected="false">Founders</button>
  <button role="tab" id="t-spk" aria-selected="false">Speakers</button>
  <button role="tab" id="t-tours" aria-selected="false">Tours</button>
  <button role="tab" id="t-budget" aria-selected="false">Budget</button>
</div>''', s, count=1, flags=re.S)
# agenda pane -> home pane
a0 = s.index('<div id="pane-agenda" role="tabpanel">'); a1 = s.index('<div id="pane-budget" role="tabpanel" hidden>')
s = s[:a0] + '<div id="pane-home" role="tabpanel"><div class="card" id="home-body"></div></div>\n\n' + s[a1:]
s = s.replace('<div id="pane-budget" role="tabpanel" hidden>', '<div id="pane-budget" role="tabpanel" hidden>', 1)
# settings pane + sign-in gate + help, before footer
s = s.replace('<footer>', '''<div id="pane-settings" role="tabpanel" hidden><div class="card" id="settings-body"></div></div>
<footer>''', 1)
s = s.replace('Draft, October 2026 &middot; Brackets are placeholders &middot; Nothing is contracted &middot; Invitation only',
              'Members area &middot; Nothing here is public &middot; Ratings and notes save on their own')
# 4. our CSS + JS
i = s.index('</head>'); s = s[:i] + '<link rel="stylesheet" href="/frontier-tech-summit/assets/members.css?v=%s">' % v + s[i:]
i = s.rindex('</body>')  # the app's buildDoc() string also contains '</body>'
s = s[:i] + '<script src="/frontier-tech-summit/assets/members.js?v=%s"></script>\n' % v + s[i:]
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontier-tech-summit', 'members', 'index.html')
open(out, 'w', encoding='utf-8').write(s)
assert 'invdata' in s and '"n":"Eclipse"' not in s, 'data leaked into the page'
print('members/index.html', len(s))
