# Generates review/index.html from index.html. Re-run after any change to the site.
import re,io,subprocess
v=subprocess.run(['git','rev-parse','--short','HEAD'],capture_output=True,text=True).stdout.strip() or '0'
s=open('frontier-tech-summit/index.html',encoding='utf-8').read()
s=s.replace('<title>Endeavor Frontier Tech Summit</title>','<title>Site Review · Endeavor Frontier Tech Summit</title><meta name="robots" content="noindex,nofollow">',1)
s=s.replace('</head>','<link rel="stylesheet" href="/frontier-tech-summit/assets/review.css?v='+v+'"></head>',1)
s=s.replace('</body>','<script src="/frontier-tech-summit/assets/review.js?v='+v+'"></script>\n</body>',1)
# Review bar sits above the site header
s=s.replace('.site-header{position:fixed;left:0;right:0;top:0;','.site-header{position:fixed;left:0;right:0;top:48px;',1)
open('frontier-tech-summit/review/index.html','w',encoding='utf-8').write(s)
print('review/index.html written',len(s))
