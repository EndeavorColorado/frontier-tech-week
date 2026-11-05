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
s = s.replace('<html lang="en">', '<html lang="en" data-theme="light">', 1)
s = s.replace('<title>Frontier Tech Week Plan</title>', '<title>Members · Endeavor Frontier Tech Summit</title><meta name="robots" content="noindex,nofollow"><link rel="icon" href="/frontier-tech-summit/assets/favicon.svg">', 1)
# fonts: site fonts
s = re.sub(r'<link rel="stylesheet" href="https://fonts.googleapis.com/css2\?family=Playfair[^"]*">',
           '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap">', s)

# 2. strip embedded data
for tid in ('state', 'invdata', 'toursdata', 'fdrdata'):
    # anchored at line start: the app's buildDoc() contains the same tag text inside a string
    s = re.sub(r'^(<script id="%s" type="application/json">).*?(</script>)' % tid, r'\1\2', s, count=1, flags=re.S | re.M)
# the app runs later, after data arrives
# the app becomes a function the members script calls once data has arrived (CSP forbids eval)
a0 = s.index('<script id="app">') + len('<script id="app">'); a1 = s.index('</script>', a0)
app = s[a0:a1]
app = app.replace("var S=JSON.parse(document.getElementById('state').textContent);", "var S=JSON.parse(document.getElementById('state').textContent);window.__S=S;", 1)
app = re.sub(r"var showTop=group\(\[[\s\S]*?\],\s*\[[\s\S]*?\]\s*,\s*0\);",
  "var showTop=group([document.getElementById('t-home'),document.getElementById('t-inv'),document.getElementById('t-fdr'),document.getElementById('t-prog'),document.getElementById('t-budget')],[document.getElementById('pane-home'),document.getElementById('pane-inv'),document.getElementById('pane-fdr'),document.getElementById('pane-prog'),document.getElementById('pane-budget')],0);window.__showTop=showTop;", app, count=1)
app = re.sub(r"group\(\[document\.getElementById\('t-along'\)[\s\S]*?\],\s*\[[\s\S]*?\],0\);", "", app, count=1)
app = re.sub(r"if\(location\.hash==='#[a-z]+'\) showTop\(\d\);", "", app)
app = re.sub(r"function save\(ev,ids\)\{[\s\S]*?\n  \}\n",
  "function save(ev,ids){ids=ids||{s:'status',b:'save'};var s=document.getElementById(ids.s),btn=document.getElementById(ids.b);btn.disabled=true;s.textContent='Saving\u2026';s.className='status';window.__saveBudget(S).then(function(){s.textContent='Saved';s.className='status ok';dirty=false;btn.disabled=false}).catch(function(){s.textContent='Could not save';s.className='status err';btn.disabled=false})}\n", app, count=1)
app = re.sub(r"if\(window\.claude&&window\.claude\.use\)\{[\s\S]*?\}\s*else \{ canWrite=false; renderBudget\(\); \}", "canWrite=(window.__ME.role==='admin'); renderBudget();", app, count=1)
# investors: replace the plan page's table render with the members list render
i0 = app.index('  function row(r,i){\n    var cv=cov(r)'); i1 = app.index('  /* tours */')
app = app[:i0] + open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build', 'inv-render.js'), encoding='utf-8').read() + app[i1:]
# the three sub-tabs are gone
app = re.sub(r"  group\(\[document\.getElementById\('t-ishort'\)[^\n]*\n(  document\.getElementById\('t-i[a-z]+'\)[^\n]*\n){3}", "", app)
assert "t-ishort" not in app.split('function buildDoc')[0], 'sub-tab code still there'
# founders: plain list render
j0 = app.index('  function stars(r){'); j1 = app.index('  /* speakers */')
app = app[:j0] + open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build', 'fdr-render.js'), encoding='utf-8').read() + app[j1:]
for must in ("window.__showTop=showTop", "window.__saveBudget(S)", "window.__ME.role", "window.__S=S"):
    assert must in app, 'app patch failed: ' + must
assert "t-along" not in app.split('function buildDoc')[0]
s = s[:a0] + 'window.__runPlan=function(){' + app + '};' + s[a1:]

# 3. header + tabs
hdr_start = s.index('<header>'); hdr_end = s.index('</header>') + len('</header>')
header = '''<header class="mh" id="mh">
  <div class="mh-in">
    <a class="mh-brand" href="/frontier-tech-summit/#home" aria-label="Endeavor Frontier Tech Summit, home"><span class="mh-lockup"><svg class="ewm" viewBox="0 0 216 28" role="img" aria-label="Endeavor" focusable="false">__EWM__</svg></span><span class="mh-name">Frontier Tech Summit<br>Boulder &middot; 2027</span></a>
    <button class="mh-menu" id="mhMenu" aria-expanded="false" aria-controls="mhNav">Menu</button>
    <nav class="mh-nav" id="mhNav" aria-label="Site">
      <a href="/frontier-tech-summit/#attend">Who Attends</a><a href="/frontier-tech-summit/#frontiers">Frontiers</a><a href="/frontier-tech-summit/#program">Program</a><a href="/frontier-tech-summit/#boulder">Boulder</a><a href="/frontier-tech-summit/#partners">Partners</a>
      <a class="mh-pill" href="/frontier-tech-summit/members/" aria-current="page">Members</a>
    </nav>
  </div>
</header>
<div class="mbar" id="mbar" hidden><div class="mbar-in">
<div class="tabs top" role="tablist">
  <button role="tab" id="t-home" aria-selected="true">Home</button>
  <button role="tab" id="t-inv" aria-selected="false">Investors</button>
  <button role="tab" id="t-fdr" aria-selected="false">Founders</button>
  <button role="tab" id="t-prog" aria-selected="false">Program</button>
  <button role="tab" id="t-budget" aria-selected="false">Budget</button>
  <button role="tab" id="mhSettings" aria-selected="false" hidden>Settings</button>
  <a role="tab" id="mhReview" href="/frontier-tech-summit/review/" hidden style="display:none">Review the site</a>
</div>
<div class="mbar-r"><span class="prog" id="mbProg"></span><span class="who">Logged in as <b id="mhMe"></b></span><span class="role" id="mbRole"></span><button id="mhOut">Sign out</button><button class="helpb" id="mhHelp" title="How this works">?</button></div>
</div></div>'''
s = s[:hdr_start] + header + s[hdr_end:]
# the Endeavor wordmark paths from the public site
site = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontier-tech-summit', 'index.html'), encoding='utf-8').read()
m = re.search(r'<svg class="ewm ewm-head"[^>]*>(.*?)</svg>', site, re.S)
s = s.replace('__EWM__', m.group(1) if m else '')

# purpose card -> removed (Home carries a short version)
s = re.sub(r'<section class="card purpose">.*?</section>\n', '', s, flags=re.S)
# tabs in Breanna's order, Home first
s = re.sub(r'<div class="tabs" role="tablist">.*?</div>', '', s, count=1, flags=re.S)
s = re.sub(r'<div class="tabs sub2"[^>]*>\s*<button role="tab" id="t-ishort".*?</div>', '', s, count=1, flags=re.S)
# agenda pane -> home pane
a0 = s.index('<div id="pane-agenda" role="tabpanel">'); a1 = s.index('<div id="pane-budget" role="tabpanel" hidden>')
s = s[:a0] + '<div id="pane-home" role="tabpanel"><div class="card" id="home-body"></div></div>\n\n' + s[a1:]
s = s.replace('<div id="pane-budget" role="tabpanel" hidden>', '<div id="pane-budget" role="tabpanel" hidden>', 1)
# speakers + tours -> one Program pane
tours = re.search(r'<div id="pane-tours" role="tabpanel" hidden>\s*<div class="card" id="tours-body" role="tabpanel"></div>\s*</div>\s*', s).group(0)
spk = re.search(r'<div id="pane-spk" role="tabpanel" hidden>\s*<div class="card" id="spk-body" role="tabpanel"></div>\s*</div>\s*', s).group(0)
s = s.replace(tours, '').replace(spk, '''<div id="pane-prog" role="tabpanel" hidden>
  <div class="psec"><h2 class="ptitle">On Stage</h2><p class="plede">Who we would put on stage, and why they pull the room in.</p><div class="card" id="spk-body"></div></div>
  <div class="psec"><h2 class="ptitle">Thursday Tours</h2><p class="plede">The sites, the drive times and the working route. The tours-or-showcase question is on Home.</p><div class="card" id="tours-body"></div></div>
</div>
''')
# settings pane + sign-in gate + help, before footer
s = s.replace('<footer>', '''<div id="pane-settings" role="tabpanel" hidden><div class="card" id="settings-body"></div></div>
<footer>''', 1)
s = s.replace('Draft, October 2026 &middot; Brackets are placeholders &middot; Nothing is contracted &middot; Invitation only',
              'Members area &middot; Nothing here is public &middot; Ratings and notes save on their own')
# 4. our CSS + JS
# after the plan page's own <style> (which sits in <body>), so ours wins on equal specificity
i = s.index('</style>', s.index('<style id="css">')) + len('</style>'); s = s[:i] + '<link rel="stylesheet" href="/frontier-tech-summit/assets/members.css?v=%s">' % v + s[i:]
i = s.rindex('</body>')  # the app's buildDoc() string also contains '</body>'
s = s[:i] + '<script src="/frontier-tech-summit/assets/members.js?v=%s"></script>\n' % v + s[i:]
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontier-tech-summit', 'members', 'index.html')
open(out, 'w', encoding='utf-8').write(s)
assert 'invdata' in s and '"n":"Eclipse"' not in s, 'data leaked into the page'
print('members/index.html', len(s))
