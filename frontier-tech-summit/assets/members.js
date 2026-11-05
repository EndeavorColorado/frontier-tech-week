/* Members area for the Frontier Tech Summit.
   Loads the plan data from /api/summit-members with a personal code, runs the plan page's
   own app, then layers on: Home, Fit ratings (Endeavor · Dan · Final), views, Settings. */
(function(){
  var API='/api/summit-members';
  var q=new URLSearchParams(location.search);
  var TOKEN=q.get('t')||localStorage.getItem('mb_t')||'';
  if(q.get('t')){ localStorage.setItem('mb_t',q.get('t')); history.replaceState(null,'',location.pathname+location.hash); }
  var SB='https://kfbetohoebwefimdvrzo.supabase.co';
  var HERE='https://www.endeavorcolorado.org/frontier-tech-summit/members/';
  var hp=new URLSearchParams((location.hash||'').replace(/^#/,''));
  if(hp.get('access_token')){
    history.replaceState(null,'',location.pathname);
    fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'google',access_token:hp.get('access_token')})}).then(function(r){return r.json()}).then(function(d){
      if(d.ok&&d.code){localStorage.setItem('mb_t',d.code);location.replace(location.pathname)}
      else{gate((d.email?'<b>'+esc(d.email)+'</b> is not on the members list.':'That Google account is not on the members list.')+' If it should be, email Breanna at breanna.real@endeavor.org.')}
    }).catch(function(){gate('Something went wrong signing in. Try again.')});
    return;
  }
  if(hp.get('error_description')){history.replaceState(null,'',location.pathname);gate('Google sign-in did not finish: '+esc(hp.get('error_description')));return}
  var D=null, ME=null, FIT={}, FINAL={}, BYID={}, VIEW={inv:'mine',fdr:'mine'};
  var STAGES=['Identified','Evaluating','Approved to invite','Invited','Interested, dates tentative','Confirmed','Do not invite','Declined'];
  var FITW={5:'Very High',4:'High',3:'Medium-High',2:'Medium',1:'Low',0:'Do not invite'};
  var DEFS=[[5,'Very High','We would change the agenda to get them'],[4,'High','Invite in the first wave'],[3,'Medium-High','Invite if there is room'],[2,'Medium','Only if they ask'],[1,'Low','No real fit'],[0,'Do not invite','A reason not to have them in the room']];

  function E(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function toast(m){var t=document.querySelector('.mtoast');if(!t){t=E('div','mtoast');document.body.appendChild(t)}t.textContent=m;t.classList.add('on');clearTimeout(t._h);t._h=setTimeout(function(){t.classList.remove('on')},1800)}
  function api(method,body){var o={method:method,headers:{'Content-Type':'application/json'}};var u=API+(method==='GET'?'?t='+encodeURIComponent(TOKEN):'');if(body){body.t=TOKEN;o.body=JSON.stringify(body)}return fetch(u,o).then(function(r){if(!r.ok)throw new Error('api '+r.status);return r.json()})}
  function when(s){var d=new Date(s);return d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}

  /* ---------- gate ---------- */
  function gate(msg){
    // the login lives on the public home page as a pop-up
    var plain=msg?String(msg).replace(/<[^>]+>/g,''):'';
    location.replace('/frontier-tech-summit/?login=1'+(plain?'&msg='+encodeURIComponent(plain):'')+'#home');
  }
  function menu(){var b=document.getElementById('mhMenu'),n=document.getElementById('mhNav');if(!b||b._on)return;b._on=1;b.onclick=function(){var o=n.classList.toggle('open');b.setAttribute('aria-expanded',o)}}
  if(!TOKEN){gate();return}

  /* ---------- boot ---------- */
  api('GET').then(function(d){D=d;ME=d.me;FIT=d.fit||{};FINAL=d.final||{};start()}).catch(function(){localStorage.removeItem('mb_t');gate('That link is not working. Enter your email and we will send a fresh one.')});

  function start(){
    document.documentElement.classList.add('mb-in');
    document.getElementById('mbar').hidden=false;
    document.getElementById('mhMe').textContent=ME.name;
    document.getElementById('mbRole').textContent=ME.role;
    if(ME.role==='admin'){document.getElementById('mhSettings').hidden=false}
    menu();
    document.getElementById('mhOut').onclick=function(){localStorage.removeItem('mb_t');location.href='/frontier-tech-summit/'};
    document.getElementById('mhHelp').onclick=help;
    (D.investors||[]).forEach(function(r){BYID[r.id]=r;BYID['n:'+r.n]=r});(D.founders||[]).forEach(function(r){BYID[r.id]=r;BYID['c:'+r.c]=r});
    // data into the plan page
    document.getElementById('invdata').textContent=JSON.stringify(D.investors||[]);
    document.getElementById('fdrdata').textContent=JSON.stringify(D.founders||[]);
    document.getElementById('toursdata').textContent=JSON.stringify(D.tours||[]);
    var base=(D.budget&&D.budget.base)||{headcount:150,cont:10,lines:[],rev:{},price:{}};var saved=D.budget&&D.budget.saved;
    document.getElementById('state').textContent=JSON.stringify(saved||base);
    runApp();
    observe();
    tidy();renderHome();renderSettings();barProg();
    route();window.addEventListener('hashchange',route);
    if(!localStorage.getItem('mb_help_'+ME.name))help();
    setInterval(refresh,45000);
    if(ME.role==='partner'){['t-inv','t-fdr','t-budget'].forEach(function(i){document.getElementById(i).hidden=true})}
    if(ME.role==='team'){document.getElementById('t-budget').hidden=true}
  }
  function refresh(){api('GET').then(function(d){FIT=d.fit||FIT;FINAL=d.final||FINAL;D.decisions=d.decisions||D.decisions;document.querySelectorAll('[data-fid]').forEach(function(el){fillFit(el)});renderHome()}).catch(function(){})}

  /* ---------- run the plan page's app with patches ---------- */
  function runApp(){
    window.__ME=ME;
    window.__saveBudget=function(S){return api('POST',{action:'budget',state:S})};
    try{window.__runPlan()}catch(e){console.error('plan app failed',e);toast('Part of the page failed to load')}
  }
  function route(){var h=location.hash||'#home';var map={'#home':0,'#investors':1,'#founders':2,'#speakers':3,'#tours':4,'#budget':5};if(h==='#settings'){showSettings();return}document.getElementById('pane-settings').hidden=true;if(window.__showTop&&map[h]!=null)window.__showTop(map[h]);window.scrollTo(0,0)}
  document.querySelectorAll('.tabs.top button').forEach(function(b){b.addEventListener('click',function(){var m={'t-home':'#home','t-inv':'#investors','t-fdr':'#founders','t-spk':'#speakers','t-tours':'#tours','t-budget':'#budget'};if(!m[b.id])return;history.replaceState(null,'',m[b.id]);document.getElementById('pane-settings').hidden=true;document.getElementById('mhSettings').setAttribute('aria-selected','false');window.scrollTo(0,0)})});

  /* ---------- Fit ---------- */
  function pid(el,kind){var nm=el.querySelector(kind==='inv'?'td.nm':'.co');if(!nm)return null;var t='';for(var i=0;i<nm.childNodes.length;i++){if(nm.childNodes[i].nodeType===3)t+=nm.childNodes[i].textContent}t=t.trim();var r=BYID[(kind==='inv'?'n:':'c:')+t];return r?r.id:null}
  function val(id,col){var f=FIT[id]&&FIT[id][col];return f&&f.v!=null?f.v:null}
  function finalOf(id){return FINAL[id]||{}}
  function pill(v,extra){if(v==null)return '<span class="pill none">not rated</span>';return '<span class="pill f'+v+(extra||'')+'">'+v+' · '+FITW[v]+'</span>'}
  function fitHTML(id){
    var mine=ME.column, canRate=ME.role==='admin';
    var e=val(id,'endeavor'), d=val(id,'dan'), f=finalOf(id);
    var agree=(e!=null&&e===d);
    function col(label,key,v){var h='<div class="fitcol"><div class="fk">'+label+'</div>';
      if(canRate&&mine===key){h+='<div class="chips5">';[5,4,3,2,1].forEach(function(n){h+='<button data-fit="'+n+'" class="'+(v===n?'on':'')+'" title="'+FITW[n]+'">'+n+'</button>'});h+='<button data-fit="0" class="no'+(v===0?' on':'')+'" title="Do not invite">No</button></div>'}
      else h+=pill(v,agree&&v!=null?' agree':'');
      return h+'</div>'}
    var h='<div class="fitbar" data-fid="'+id+'">';
    h+=col('Endeavor','endeavor',e);
    h+=col('Dan','dan',d);
    // Final
    h+='<div class="fitcol"><div class="fk">Final'+(f.by?' <b>'+esc(f.by)+' · '+when(f.at)+'</b>':'')+'</div>';
    if(f.fit!=null||f.stage||f.owner){h+='<div class="finalctl">'+pill(f.fit)+(f.stage?'<span class="pill">'+esc(f.stage)+'</span>':'')+(f.owner?'<span class="pill">→ '+esc(f.owner)+'</span>':'')+(canRate?'<button class="edit" data-final="1">Edit</button>':'')+'</div>'+(f.note?'<div class="fnote">'+esc(f.note)+'</div>':'')}
    else if(canRate){h+='<div class="finalctl">'+(agree?'<span class="pill f'+e+'">Both say '+e+' · '+FITW[e]+'</span>':'<span class="pill none">not set</span>')+'<button class="edit" data-final="1">'+(agree?'Confirm':'Set')+'</button></div>'}
    else h+=pill(null);
    return h+'</div></div>';
  }
  function fillFit(el){var id=el.getAttribute('data-fid');el.outerHTML=fitHTML(id)}
  function augment(root,kind){
    if(!D.investors)return;
    if(kind==='inv'){root.querySelectorAll('table.inv tbody tr:not(.fitrow)').forEach(function(tr){if(tr.nextElementSibling&&tr.nextElementSibling.classList.contains('fitrow'))return;var id=pid(tr,'inv');if(!id)return;tr.setAttribute('data-pid',id);var fr=E('tr','fitrow','<td colspan="4">'+fitHTML(id)+'</td>');tr.parentNode.insertBefore(fr,tr.nextSibling)})}
    else{root.querySelectorAll('.frow').forEach(function(row){if(row.querySelector('.fitbar'))return;var id=pid(row,'fdr');if(!id)return;row.setAttribute('data-pid',id);var fb=E('div','fitwrap',fitHTML(id));fb.style.gridColumn='1 / -1';row.appendChild(fb)})}
    viewbar(root,kind);applyView(root,kind);
  }
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-fit]');if(b){var bar=b.closest('.fitbar'),id=bar.getAttribute('data-fid');var v=+b.getAttribute('data-fit');var cur=val(id,ME.column);var nv=(cur===v)?null:v;
      FIT[id]=FIT[id]||{};FIT[id][ME.column]={v:nv,by:ME.name,at:new Date().toISOString()};fillFit(bar);
      api('POST',{action:'rate',id:id,fit:nv}).then(function(){toast(nv==null?'Cleared':'Saved: '+FITW[nv]);updateProg()}).catch(function(){toast('Did not save. Tap again.');FIT[id][ME.column]={v:cur,by:ME.name,at:''};var el=document.querySelector('[data-fid="'+id+'"]');if(el)fillFit(el)});return}
    var fb=e.target.closest('[data-final]');if(fb){editFinal(fb.closest('.fitbar'));return}
  });
  function editFinal(bar){var id=bar.getAttribute('data-fid'),f=finalOf(id),e=val(id,'endeavor'),d=val(id,'dan');var def=f.fit!=null?f.fit:(e!=null&&e===d?e:(e!=null?e:d));
    var h='<div class="fitcol" style="grid-column:1/-1"><div class="fk">Final</div><div class="finalctl"><div class="chips5">';[5,4,3,2,1].forEach(function(n){h+='<button data-ff="'+n+'" class="'+(def===n?'on':'')+'">'+n+'</button>'});h+='<button data-ff="0" class="no'+(def===0?' on':'')+'">No</button></div>';
    h+='<select data-fs>'+['<option value="">Stage…</option>'].concat(STAGES.map(function(s){return '<option'+(f.stage===s?' selected':'')+'>'+s+'</option>'})).join('')+'</select><input data-fo placeholder="Owner (who reaches out)" value="'+esc(f.owner||'')+'"><input data-fn placeholder="Note" value="'+esc(f.note||'')+'" style="max-width:260px"><button class="edit" data-fsave>Save</button><button class="edit" data-fcancel>Cancel</button>'+(f.fit!=null||f.stage?'<button class="edit" data-fclear>Clear</button>':'')+'</div></div>';
    bar.innerHTML=h;var sel=def;bar.querySelectorAll('[data-ff]').forEach(function(b){b.onclick=function(){sel=+b.getAttribute('data-ff');bar.querySelectorAll('[data-ff]').forEach(function(x){x.classList.toggle('on',x===b)})}});
    bar.querySelector('[data-fcancel]').onclick=function(){fillFit(bar)};
    var cl=bar.querySelector('[data-fclear]');if(cl)cl.onclick=function(){delete FINAL[id];fillFit(bar);api('POST',{action:'final',id:id,fit:'',stage:'',owner:'',note:''}).then(function(){toast('Final cleared');renderHome()}).catch(function(){toast('Did not save. Try again.')})};
    bar.querySelector('[data-fsave]').onclick=function(){var data={fit:sel,stage:bar.querySelector('[data-fs]').value,owner:bar.querySelector('[data-fo]').value.trim(),note:bar.querySelector('[data-fn]').value.trim()};FINAL[id]=Object.assign({},data,{by:ME.name,at:new Date().toISOString()});fillFit(bar);api('POST',Object.assign({action:'final',id:id},data)).then(function(){toast('Final saved');renderHome()}).catch(function(){toast('Did not save. Try again.')})};
  }
  /* views */
  function viewbar(root,kind){if(root.querySelector('.viewbar'))return;var first=root.querySelector('.chips, .tb-head, h3.sec');var vb=E('div','viewbar','<div class="vb"><button data-v="mine">My ratings</button><button data-v="cmp">Compare</button><button data-v="final">Final</button></div><div class="prog"></div>');
    var defs=E('div','fitdefs',DEFS.map(function(d){return '<span><b>'+d[0]+' '+d[1]+'</b>'+d[2]+'</span>'}).join(''));
    var intro=E('p','m-intro',kind==='inv'?'<b>Investors.</b> Who we are inviting from the capital side, and how strongly. Tap a number in your column; it saves on its own.':'<b>Founders.</b> Who we are flying in. Stars are the research draw; the numbers are our call.');
    root.insertBefore(intro,root.firstChild);root.insertBefore(vb,intro.nextSibling);root.insertBefore(defs,vb.nextSibling);
    vb.querySelectorAll('[data-v]').forEach(function(b){b.onclick=function(){VIEW[kind]=b.getAttribute('data-v');applyView(root,kind)}});
    if(ME.role!=='admin'){VIEW[kind]='final'}
  }
  function rowsOf(root,kind){return [].slice.call(root.querySelectorAll(kind==='inv'?'tr[data-pid]':'.frow[data-pid]'))}
  function barProg(){var p=document.getElementById('mbProg');if(!p||!D||!D.investors||ME.role!=='admin')return;var ni=D.investors.filter(function(r){return val(r.id,ME.column)!=null}).length,nf=D.founders.filter(function(r){return val(r.id,ME.column)!=null}).length;p.innerHTML='Investors <b>'+ni+'</b>/'+D.investors.length+' &middot; Founders <b>'+nf+'</b>/'+D.founders.length}
  function updateProg(){barProg();['inv','fdr'].forEach(function(kind){var root=document.getElementById(kind==='inv'?'inv-body':'fdr-body');var p=root&&root.querySelector('.viewbar .prog');if(!p)return;var list=kind==='inv'?D.investors:D.founders;var n=list.filter(function(r){return val(r.id,ME.column)!=null}).length;var agree=list.filter(function(r){var e=val(r.id,'endeavor'),d=val(r.id,'dan');return e!=null&&e===d}).length;var fin=list.filter(function(r){return finalOf(r.id).fit!=null}).length;p.innerHTML=(ME.role==='admin'?'<b>'+ME.name+':</b> '+n+' of '+list.length+' rated · ':'')+'Agree on '+agree+' · Final set on '+fin})}
  function applyView(root,kind){var v=VIEW[kind];root.querySelectorAll('.viewbar [data-v]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-v')===v)});updateProg();
    var rows=rowsOf(root,kind);var mine=ME.column;
    rows.forEach(function(r){var id=r.getAttribute('data-pid');var e=val(id,'endeavor'),d=val(id,'dan');var gap=(e!=null&&d!=null&&e!==d);r.classList.toggle('gap',gap&&v==='cmp');var hide=false;if(v==='cmp')hide=!(e!=null&&d!=null);r.classList.toggle('vh',hide);var fr=r.nextElementSibling;if(kind==='inv'&&fr&&fr.classList.contains('fitrow'))fr.classList.toggle('vh',hide)});
    if(v==='final'){rows.forEach(function(r){var id=r.getAttribute('data-pid');r.classList.toggle('hasfinal',finalOf(id).fit!=null)})}else rows.forEach(function(r){r.classList.remove('hasfinal')});
  }
  function tidy(){document.querySelectorAll('h3.sec,h2,h4').forEach(function(h){var t=h.textContent;var n=t.replace(/\s*\.$/,'');if(n!==t)h.textContent=n})}
  function observe(){['inv-body','fdr-body'].forEach(function(id){var root=document.getElementById(id);var kind=id==='inv-body'?'inv':'fdr';var busy=false;new MutationObserver(function(){if(busy)return;busy=true;try{augment(root,kind);tidy()}finally{busy=false}}).observe(root,{childList:true});augment(root,kind)})}

  /* ---------- Home ---------- */
  var DECS=[{id:'thursday',k:'Agenda',t:'Thursday: tours, or showcase at Pearl West?',p:'Six coaches, 10 to 50 minutes each way, against five or six private rooms at Pearl West (and Google a mile away) where companies set up and people stay together.',b:['Tours: Lunar Outpost 35 min, NLR 20, JILA 10, Electra 10, AMP 15, Flatiron Park 10 (bench on the Tours tab)','Showcase: no drive time, more collisions, companies bring hardware to Pearl West','Hybrid: close-in sites only (10–15 min), showcase for the rest']},
    {id:'global',k:'Branding',t:'How Endeavor Global appears on the site',p:'Dan wants it clear Global is in this to win it, not only "hosted by Endeavor Colorado and Caruso Ventures."',b:['"An Endeavor Global summit, hosted by Endeavor Colorado and Caruso Ventures"','"Hosted by Endeavor Colorado and Caruso Ventures, with Endeavor Global"','Endeavor wordmark alone as the host, Caruso Ventures as presenting partner']},
    {id:'lens',k:'Audience',t:'Built for investors first',p:'The site should read for high-end deep-tech investors (West Coast, then Northeast) as the primary audience; founders second.',b:['Hero line addressed to investors','Who Attends with Investors first','A short "why this room" line on the home page']}];
  function stageCount(list,pred){return list.filter(function(r){return pred(finalOf(r.id))}).length}
  function renderHome(){var root=document.getElementById('home-body');if(!root)return;var h='';
    var isDan=ME.column==='dan';
    h+='<div class="home-top"><p class="m-intro"><b>'+esc(ME.name)+', here is where we are.</b> The numbers are the funnel, "Needs you" is your list, and the open questions are for Dan.</p>'+(ME.role==='admin'?'<a class="btn-start" href="#investors">Start rating &rarr;</a>':'')+'</div>';
    if(D.investors){h+='<div class="home-grid">';[['Investors & buyers',D.investors,D.targets.investors],['Founders',D.founders,D.targets.founders]].forEach(function(x){var list=x[1];var rated=list.filter(function(r){return val(r.id,'endeavor')!=null||val(r.id,'dan')!=null}).length;var appr=stageCount(list,function(f){return f.fit>=4||/Approved|Invited|Interested|Confirmed/.test(f.stage||'')});var inv=stageCount(list,function(f){return /Invited|Interested|Confirmed/.test(f.stage||'')});var conf=stageCount(list,function(f){return f.stage==='Confirmed'});
      h+='<div class="hnum"><p class="hk">'+x[0]+' · target '+x[2]+'</p><div class="hrow"><div><div class="hv">'+rated+'</div><div class="hl">rated</div></div><div><div class="hv">'+appr+'</div><div class="hl">approved</div></div><div><div class="hv">'+inv+'</div><div class="hl">invited</div></div><div><div class="hv">'+conf+'</div><div class="hl">confirmed</div></div></div><div class="ht">'+list.length+' on the list</div></div>'});h+='</div>';
      if(ME.role==='admin'){h+='<h3 class="sec">Needs you</h3><div class="needs">';var ui=D.investors.filter(function(r){return val(r.id,ME.column)==null}).length,uf=D.founders.filter(function(r){return val(r.id,ME.column)==null}).length;var dis=D.investors.concat(D.founders).filter(function(r){var e=val(r.id,'endeavor'),d=val(r.id,'dan');return e!=null&&d!=null&&e!==d&&finalOf(r.id).fit==null}).length;var nof=D.investors.concat(D.founders).filter(function(r){var f=finalOf(r.id);return f.fit>=4&&!f.owner}).length;
        h+='<a href="#investors">Investors you have not rated yet<b>'+ui+'</b></a><a href="#founders">Founders you have not rated yet<b>'+uf+'</b></a>'+(isDan?'':'<a href="#investors">Where Endeavor and Dan disagree, no Final yet<b>'+dis+'</b></a><a href="#investors">Final 4 or 5 with no one reaching out<b>'+nof+'</b></a>')+'</div>'}}
    else{h+='<p class="m-intro">The public program is on the main site; your partnership page and Thursday\'s tours are here.</p>'}
    h+='<h3 class="sec">Open questions for Dan</h3><div class="decs">';DECS.forEach(function(d){var cur=(D.decisions||{})[d.id];h+='<div class="dec"><p class="dk">'+d.k+'</p><h4>'+esc(d.t)+'</h4><p>'+esc(d.p)+'</p><ul>'+d.b.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul>'+(ME.role==='admin'?'<textarea data-dec="'+d.id+'" placeholder="Dan\'s call, or anyone\'s view">'+esc(cur?cur.body:'')+'</textarea><div class="dmeta">'+(cur?esc(cur.by)+' · '+when(cur.at)+' · ':'')+'saves when you click away</div>':(cur?'<p class="fnote">'+esc(cur.body)+'</p>':''))+'</div>'});h+='</div>';
    var seen=localStorage.getItem('mb_seen_'+ME.name);var ch=[];Object.keys(FIT).forEach(function(id){Object.keys(FIT[id]).forEach(function(c){var f=FIT[id][c];if(f.by!==ME.name&&(!seen||f.at>seen)){var r=BYID[id];if(r)ch.push('<li><b>'+esc(f.by)+'</b> rated '+esc(r.n||r.c)+' '+(f.v!=null?f.v+' · '+FITW[f.v]:'cleared')+'</li>')}})});
    h+='<h3 class="sec">Changed since you last looked</h3><ul class="changes">'+(ch.length?ch.slice(-30).reverse().join(''):'<li>Nothing new.</li>')+'</ul>';
    root.innerHTML=h;localStorage.setItem('mb_seen_'+ME.name,new Date().toISOString());
    root.querySelectorAll('[data-dec]').forEach(function(ta){ta.addEventListener('change',function(){api('POST',{action:'decision',id:ta.getAttribute('data-dec'),body:ta.value}).then(function(){toast('Saved')}).catch(function(){toast('Did not save')})})});
  }

  /* ---------- Settings ---------- */
  function showSettings(){document.querySelectorAll('[role="tabpanel"]').forEach(function(p){if(p.id&&/^pane-/.test(p.id))p.hidden=p.id!=='pane-settings'});document.querySelectorAll('.tabs.top button').forEach(function(b){b.setAttribute('aria-selected',b.id==='mhSettings'?'true':'false')});renderSettings();window.scrollTo(0,0)}
  document.getElementById('mhSettings').onclick=function(){location.hash='#settings'};
  function renderSettings(){var root=document.getElementById('settings-body');if(!root||ME.role!=='admin'||!D.members)return;var h='<p class="m-intro"><b>Settings.</b> Who can log in with Google, and the targets the Home numbers measure against. Changes save when you click away.</p><h3 class="sec">People with access</h3>';
    D.members.forEach(function(m){h+='<div class="mem"><b>'+esc(m.name)+'</b><input data-em="'+m.id+'" value="'+esc(m.email||'')+'" placeholder="Google email"><select data-role="'+m.id+'"'+(m.name===ME.name?' disabled':'')+'><option value="admin"'+(m.role==='admin'?' selected':'')+'>Admin</option><option value="team"'+(m.role==='team'?' selected':'')+'>Team</option><option value="partner"'+(m.role==='partner'?' selected':'')+'>Partner</option></select><button data-copy="'+esc(m.link)+'">Copy link</button>'+(m.name!==ME.name?'<button data-rm="'+m.id+'">Remove</button>':'<span></span>')+'</div>'});
    h+='<div class="memadd"><input id="maName" placeholder="Name"><input id="maEmail" placeholder="Google email"><select id="maRole"><option value="team">Team (read)</option><option value="admin">Admin (rate, budget)</option><option value="partner">Partner</option></select><button id="maGo">Add</button></div>';
    h+='<h3 class="sec">Targets</h3><div class="tgt"><label>Investors & buyers <input type="number" data-tgt="investors" value="'+D.targets.investors+'"></label><label>Founders <input type="number" data-tgt="founders" value="'+D.targets.founders+'"></label></div>';
    root.innerHTML=h;
    root.querySelector('#maGo').onclick=function(){var name=root.querySelector('#maName').value.trim(),email=root.querySelector('#maEmail').value.trim(),role=root.querySelector('#maRole').value;if(!name){toast('Name needed');return}api('POST',{action:'member-add',name:name,email:email,role:role}).then(function(r){D.members.push(r.row);renderSettings();toast('Added. They can sign in with Google now.')}).catch(function(){toast('Could not add')})};
    root.querySelectorAll('[data-rm]').forEach(function(b){b.onclick=function(){if(!confirm('Remove access?'))return;api('POST',{action:'member-remove',id:b.getAttribute('data-rm')}).then(function(){D.members=D.members.filter(function(m){return m.id!==b.getAttribute('data-rm')});renderSettings();toast('Removed')}).catch(function(){toast('Could not remove')})}});
    root.querySelectorAll('[data-em]').forEach(function(i){i.addEventListener('change',function(){var id=i.getAttribute('data-em');api('POST',{action:'member-update',id:id,email:i.value.trim()}).then(function(){var m=D.members.filter(function(x){return x.id===id})[0];if(m)m.email=i.value.trim().toLowerCase();toast('Saved')}).catch(function(){toast('Could not save')})})});
    root.querySelectorAll('[data-role]').forEach(function(i){i.addEventListener('change',function(){var id=i.getAttribute('data-role');api('POST',{action:'member-update',id:id,role:i.value}).then(function(){var m=D.members.filter(function(x){return x.id===id})[0];if(m)m.role=i.value;toast('Saved')}).catch(function(){toast('Could not save')})})});
    root.querySelectorAll('[data-copy]').forEach(function(b){b.onclick=function(){navigator.clipboard.writeText(b.getAttribute('data-copy')).then(function(){toast('Link copied')})}});
    root.querySelectorAll('[data-tgt]').forEach(function(i){i.addEventListener('change',function(){D.targets[i.getAttribute('data-tgt')]=+i.value;api('POST',{action:'target',key:i.getAttribute('data-tgt'),value:+i.value}).then(function(){toast('Saved');renderHome()})})});
  }

  /* ---------- help ---------- */
  function help(){localStorage.setItem('mb_help_'+ME.name,'1');var h=E('div','help','<div class="hc"><button class="hx" aria-label="Close">×</button><h2>How this works</h2><ol>'+(ME.role==='admin'?'<li><b>Investors</b> and <b>Founders</b>: every row has three columns, Endeavor · Dan · Final. Tap a number in your column (5 Very High down to 1 Low, or No). It saves on its own; no save button anywhere.</li><li><b>My ratings</b> is the full list, best first. <b>Compare</b> shows only the names both sides have rated, and marks where Endeavor and Dan differ. <b>Final</b> is the agreed call, with the stage and who reaches out.</li><li><b>Speakers</b>, <b>Tours</b> and <b>Budget</b> are the working plan. Budget edits save for everyone.</li>':'<li><b>Home</b> shows where the summit stands.</li><li><b>Speakers</b> and <b>Tours</b> are the working plan.</li><li>Nothing here is public.</li>')+'</ol><button class="go">Got it</button></div>');document.body.appendChild(h);h.querySelector('.hx').onclick=h.querySelector('.go').onclick=function(){h.remove()}}
})();
