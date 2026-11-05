/* Members area for the Frontier Tech Summit.
   Loads the plan data from /api/summit-members with a personal code, runs the plan page's
   own app, then layers on: Home, Fit ratings (Endeavor · Dan · Final), views, Settings. */
(function(){
  var API='/api/summit-members';
  var q=new URLSearchParams(location.search);
  var TOKEN=q.get('t')||localStorage.getItem('mb_t')||sessionStorage.getItem('mb_t')||'';
  if(q.get('t')){ localStorage.setItem('mb_t',q.get('t')); history.replaceState(null,'',location.pathname+location.hash); }
  var SB='https://kfbetohoebwefimdvrzo.supabase.co';
  var HERE='https://www.endeavorcolorado.org/frontier-tech-summit/members/';
  var hp=new URLSearchParams((location.hash||'').replace(/^#/,''));
  if(hp.get('access_token')){
    history.replaceState(null,'',location.pathname);
    fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'google',access_token:hp.get('access_token')})}).then(function(r){return r.json()}).then(function(d){
      if(d.ok&&d.code){var rem=sessionStorage.getItem('mb_remember')!=='0';(rem?localStorage:sessionStorage).setItem('mb_t',d.code);if(!rem)localStorage.removeItem('mb_t');location.replace(location.pathname)}
      else{gate((d.email?'<b>'+esc(d.email)+'</b> is not on the members list.':'That Google account is not on the members list.')+' If it should be, email Breanna at breanna.real@endeavor.org.')}
    }).catch(function(){gate('Something went wrong signing in. Try again.')});
    return;
  }
  if(hp.get('error_description')){history.replaceState(null,'',location.pathname);gate('Google sign-in did not finish: '+esc(hp.get('error_description')));return}
  var D=null, ME=null, FIT={}, FINAL={}, BYID={}, VIEW={inv:'mine',fdr:'mine'};
  var STAGES=['Approved','Reached out','In conversation','Soft yes','Confirmed','Declined','Do not invite'];
  var FUNNEL=['Unrated','Rated','Approved','Reached out','In conversation','Soft yes','Confirmed','Out'];
  var MODE={inv:localStorage.getItem('mb_mode_inv')||'work',fdr:localStorage.getItem('mb_mode_fdr')||'work'};var STAGE={inv:'all',fdr:'all'};var CUR={inv:null,fdr:null};
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
    document.getElementById('mhOut').onclick=function(){localStorage.removeItem('mb_t');sessionStorage.removeItem('mb_t');location.href='/frontier-tech-summit/'};
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
  function pid(el,kind){var t='';if(kind==='inv'){t=el.getAttribute('data-n')||''}else{var nm=el.querySelector('.co');if(!nm)return null;for(var i=0;i<nm.childNodes.length;i++){if(nm.childNodes[i].nodeType===3)t+=nm.childNodes[i].textContent}}t=t.trim();var r=BYID[(kind==='inv'?'n:':'c:')+t];return r?r.id:null}
  function val(id,col){var f=FIT[id]&&FIT[id][col];return f&&f.v!=null?f.v:null}
  function finalOf(id){return FINAL[id]||{}}
  function stageOf(id){var f=finalOf(id);if(f.stage==='Declined'||f.stage==='Do not invite'||f.fit===0)return 'Out';if(f.stage)return f.stage;if(f.fit!=null)return f.fit>=4?'Approved':'Rated';if(val(id,'endeavor')!=null||val(id,'dan')!=null)return 'Rated';return 'Unrated'}
  function pill(v,extra){if(v==null)return '<span class="pill none">not rated</span>';return '<span class="pill f'+v+(extra||'')+'">'+v+' · '+FITW[v]+'</span>'}
  function chips(attr,v){var h='<div class="chips5">';[1,2,3,4,5].forEach(function(n){h+='<button '+attr+'="'+n+'" class="'+(v===n?'on':'')+'" title="'+FITW[n]+'">'+n+'</button>'});return h+'<button '+attr+'="0" class="no'+(v===0?' on':'')+'" title="Do not invite">No</button></div>'}
  function fitHTML(id){
    var mine=ME.column, canRate=ME.role==='admin';
    var e=val(id,'endeavor'), d=val(id,'dan'), f=finalOf(id);
    var agree=(e!=null&&e===d);
    function col(label,key,v){var h='<div class="fitcol'+(mine===key?' mine':'')+'"><div class="fk">'+label+(mine===key?' <b>you</b>':'')+'</div>';
      if(canRate&&mine===key)h+=chips('data-fit',v);else h+=pill(v,agree&&v!=null?' agree':'');
      return h+'</div>'}
    var h='<div class="fitbar" data-fid="'+id+'">';
    h+=col('Endeavor','endeavor',e);
    h+=col('Dan','dan',d);
    h+='<div class="fitcol"><div class="fk">Final'+(f.by?' <b>'+esc(f.by)+' · '+when(f.at)+'</b>':'')+'</div>';
    if(f.fit!=null||f.stage){h+='<div class="finalctl">'+pill(f.fit)+'<span class="pill stg">'+esc(stageOf(id))+'</span>'+(canRate?'<button class="edit" data-final="1">Edit</button>':'')+'</div>'+(f.note?'<div class="fnote">'+esc(f.note)+'</div>':'')}
    else if(canRate){h+='<div class="finalctl">'+(agree?'<span class="pill f'+e+'">Both say '+e+' · '+FITW[e]+'</span>':'<span class="pill none">not set</span>')+'<button class="edit" data-final="1">'+(agree?'Confirm':'Set')+'</button></div>'}
    else h+=pill(null);
    return h+'</div></div>';
  }
  function fillFit(el){var id=el.getAttribute('data-fid');el.outerHTML=fitHTML(id)}
  function augment(root,kind){
    if(!D.investors)return;
    if(kind==='inv'){root.querySelectorAll('.irow').forEach(function(row){var slot=row.querySelector('.irfit');if(!slot||slot.firstChild)return;var id=pid(row,'inv');if(!id)return;row.setAttribute('data-pid',id);slot.innerHTML=fitHTML(id)})}
    else{root.querySelectorAll('.frow').forEach(function(row){if(row.querySelector('.fitbar'))return;var id=pid(row,'fdr');if(!id)return;row.setAttribute('data-pid',id);var fb=E('div','fitwrap',fitHTML(id));fb.style.gridColumn='1 / -1';row.appendChild(fb)})}
    viewbar(root,kind);applyView(root,kind);
  }
  function rate(id,v){var cur=val(id,ME.column);var nv=(cur===v)?null:v;
    FIT[id]=FIT[id]||{};FIT[id][ME.column]={v:nv,by:ME.name,at:new Date().toISOString()};var bar=document.querySelector('.fitbar[data-fid="'+id+'"]');if(bar)fillFit(bar);
    api('POST',{action:'rate',id:id,fit:nv}).then(function(){toast(nv==null?'Cleared':'Saved: '+(nv===0?'Do not invite':nv+' · '+FITW[nv]));updateProg()}).catch(function(){toast('Did not save. Tap again.');FIT[id][ME.column]={v:cur,by:ME.name,at:''};var el=document.querySelector('.fitbar[data-fid="'+id+'"]');if(el)fillFit(el)})}
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-fit]');if(b){var id=b.closest('.fitbar').getAttribute('data-fid');rate(id,+b.getAttribute('data-fit'));setCur(b.closest('[data-pid]'));return}
    var fb=e.target.closest('[data-final]');if(fb){editFinal(fb.closest('.fitbar'));return}
    var row=e.target.closest('[data-pid]');if(row&&!e.target.closest('a,button,input,select,summary'))setCur(row);
  });
  function editFinal(bar){var id=bar.getAttribute('data-fid'),f=finalOf(id),e=val(id,'endeavor'),d=val(id,'dan');var def=f.fit!=null?f.fit:(e!=null&&e===d?e:(e!=null?e:d));
    var h='<div class="fitcol" style="grid-column:1/-1"><div class="fk">Final</div><div class="finalctl">'+chips('data-ff',def);
    h+='<select data-fs>'+['<option value="">Stage…</option>'].concat(STAGES.map(function(s){return '<option'+(f.stage===s?' selected':'')+'>'+s+'</option>'})).join('')+'</select><input data-fn placeholder="Note" value="'+esc(f.note||'')+'" style="max-width:260px"><button class="edit" data-fsave>Save</button><button class="edit" data-fcancel>Cancel</button>'+(f.fit!=null||f.stage?'<button class="edit" data-fclear>Clear</button>':'')+'</div></div>';
    bar.innerHTML=h;var sel=def;bar.querySelectorAll('[data-ff]').forEach(function(b){b.onclick=function(){sel=+b.getAttribute('data-ff');bar.querySelectorAll('[data-ff]').forEach(function(x){x.classList.toggle('on',x===b)})}});
    bar.querySelector('[data-fcancel]').onclick=function(){fillFit(bar)};
    var cl=bar.querySelector('[data-fclear]');if(cl)cl.onclick=function(){delete FINAL[id];fillFit(bar);api('POST',{action:'final',id:id,fit:'',stage:'',owner:'',note:''}).then(function(){toast('Final cleared');renderHome();updateProg()}).catch(function(){toast('Did not save. Try again.')})};
    bar.querySelector('[data-fsave]').onclick=function(){var data={fit:sel,stage:bar.querySelector('[data-fs]').value,owner:f.owner||'',note:bar.querySelector('[data-fn]').value.trim()};FINAL[id]=Object.assign({},data,{by:ME.name,at:new Date().toISOString()});fillFit(bar);api('POST',Object.assign({action:'final',id:id},data)).then(function(){toast('Final saved');renderHome();updateProg()}).catch(function(){toast('Did not save. Try again.')})};
  }
  /* funnel strip, modes, stage filter */
  function viewbar(root,kind){if(root.querySelector('.viewbar'))return;
    var vb=E('div','viewbar','<div class="vb"><button data-m="rate">Rate</button><button data-m="work">Work</button><span class="hint" id="hint-'+kind+'"></span></div><div class="vb2"><button data-s="all">All</button>'+FUNNEL.map(function(st){return '<button data-s="'+st+'">'+st+' <i></i></button>'}).join('')+'<button data-s="gap">Endeavor ≠ Dan <i></i></button></div>');
    var intro=E('p','m-intro',kind==='inv'?'<b>Investors.</b> One list, best first. Rate in your column; it saves on its own.':'<b>Founders.</b> Who we are flying in. Stars are the research draw; the numbers are our call.');
    var defs=E('div','fitdefs',DEFS.slice().reverse().map(function(d){return '<span><b>'+d[0]+' '+d[1]+'</b>'+d[2]+'</span>'}).join(''));
    var anchor=root.querySelector('#inv-funnel')||root.firstChild;
    if(kind==='inv'){root.insertBefore(intro,root.firstChild);anchor.appendChild(vb);anchor.appendChild(defs)}else{root.insertBefore(intro,root.firstChild);root.insertBefore(vb,intro.nextSibling);root.insertBefore(defs,vb.nextSibling)}
    vb.querySelectorAll('[data-m]').forEach(function(b){b.onclick=function(){MODE[kind]=b.getAttribute('data-m');localStorage.setItem('mb_mode_'+kind,MODE[kind]);applyView(root,kind)}});
    vb.querySelectorAll('[data-s]').forEach(function(b){b.onclick=function(){STAGE[kind]=b.getAttribute('data-s');applyView(root,kind)}});
    if(ME.role!=='admin'){vb.querySelector('.vb').hidden=true}
    var nb=E('button','nextun','Next unrated ↓');nb.onclick=function(){nextUnrated(root,kind)};root.appendChild(nb);
  }
  function rowsOf(root,kind){return [].slice.call(root.querySelectorAll('[data-pid]'))}
  function barProg(){var p=document.getElementById('mbProg');if(!p||!D||!D.investors||ME.role!=='admin')return;var ni=D.investors.filter(function(r){return val(r.id,ME.column)!=null}).length,nf=D.founders.filter(function(r){return val(r.id,ME.column)!=null}).length;p.innerHTML='Investors <b>'+ni+'</b>/'+D.investors.length+' &middot; Founders <b>'+nf+'</b>/'+D.founders.length}
  function updateProg(){barProg();['inv','fdr'].forEach(function(kind){var root=document.getElementById(kind==='inv'?'inv-body':'fdr-body');var vb=root&&root.querySelector('.viewbar');if(!vb)return;var list=kind==='inv'?D.investors:D.founders;var c={};FUNNEL.forEach(function(s){c[s]=0});var gap=0;list.forEach(function(r){c[stageOf(r.id)]++;var e=val(r.id,'endeavor'),d=val(r.id,'dan');if(e!=null&&d!=null&&e!==d)gap++});vb.querySelectorAll('[data-s]').forEach(function(b){var st=b.getAttribute('data-s');var i=b.querySelector('i');if(!i)return;i.textContent=st==='gap'?gap:c[st]});var n=list.filter(function(r){return val(r.id,ME.column)!=null}).length;var hint=vb.querySelector('.hint');if(hint)hint.textContent=(ME.role==='admin'?'You: '+n+' of '+list.length+' rated':'')+(MODE[kind]==='rate'?' · keys 1–5, N, ↓':'')})}
  function applyView(root,kind){var m=MODE[kind],st=STAGE[kind];root.querySelectorAll('.viewbar [data-m]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-m')===m)});root.querySelectorAll('.viewbar [data-s]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-s')===st)});root.classList.toggle('mode-rate',m==='rate');updateProg();
    var vis=0;rowsOf(root,kind).forEach(function(r){var id=r.getAttribute('data-pid');var e=val(id,'endeavor'),d=val(id,'dan');var gap=(e!=null&&d!=null&&e!==d);r.classList.toggle('gap',gap);var hide=false;if(st==='gap')hide=!gap;else if(st!=='all')hide=stageOf(id)!==st;r.classList.toggle('vh',hide);if(!hide)vis++;r.classList.toggle('hasfinal',finalOf(id).fit!=null)});
    var nb=root.querySelector('.nextun');if(nb)nb.hidden=!(m==='rate'&&ME.role==='admin');
  }
  /* keyboard rating */
  function setCur(row){if(!row)return;document.querySelectorAll('[data-pid].cur').forEach(function(r){r.classList.remove('cur')});row.classList.add('cur');var k=row.classList.contains('irow')?'inv':'fdr';CUR[k]=row}
  function visRows(root){return rowsOf(root).filter(function(r){return !r.classList.contains('vh')})}
  function nextUnrated(root,kind){var rows=visRows(root);var start=CUR[kind]?rows.indexOf(CUR[kind])+1:0;for(var i=0;i<rows.length;i++){var r=rows[(start+i)%rows.length];if(val(r.getAttribute('data-pid'),ME.column)==null){setCur(r);r.scrollIntoView({block:'center',behavior:'smooth'});return}}toast('Everything here is rated')}
  function step(root,kind,dir){var rows=visRows(root);var i=CUR[kind]?rows.indexOf(CUR[kind]):-1;var n=rows[Math.max(0,Math.min(rows.length-1,i+dir))];if(n){setCur(n);n.scrollIntoView({block:'center',behavior:'smooth'})}}
  document.addEventListener('keydown',function(e){if(ME.role!=='admin')return;if(e.target.matches('input,textarea,select'))return;var kind=document.getElementById('pane-inv').hidden?(document.getElementById('pane-fdr').hidden?null:'fdr'):'inv';if(!kind||MODE[kind]!=='rate')return;var root=document.getElementById(kind==='inv'?'inv-body':'fdr-body');
    if(e.key==='ArrowDown'||e.key==='j'){e.preventDefault();step(root,kind,1);return}if(e.key==='ArrowUp'||e.key==='k'){e.preventDefault();step(root,kind,-1);return}
    if(!CUR[kind]){nextUnrated(root,kind);return}
    var v=null;if(/^[1-5]$/.test(e.key))v=+e.key;else if(e.key==='n'||e.key==='N'||e.key==='0')v=0;if(v==null)return;e.preventDefault();var id=CUR[kind].getAttribute('data-pid');rate(id,v);setTimeout(function(){nextUnrated(root,kind)},150)});
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
    if(D.investors){h+='<div class="home-grid">';[['Investors & buyers',D.investors,D.targets.investors],['Founders',D.founders,D.targets.founders]].forEach(function(x){var list=x[1];var rated=list.filter(function(r){return val(r.id,'endeavor')!=null||val(r.id,'dan')!=null}).length;var ST=list.map(function(r){return stageOf(r.id)});var appr=ST.filter(function(x){return x!=='Unrated'&&x!=='Rated'&&x!=='Out'}).length;var inv=ST.filter(function(x){return x==='Reached out'||x==='In conversation'||x==='Soft yes'||x==='Confirmed'}).length;var conf=ST.filter(function(x){return x==='Confirmed'}).length;
      h+='<div class="hnum"><p class="hk">'+x[0]+' · target '+x[2]+'</p><div class="hrow"><div><div class="hv">'+rated+'</div><div class="hl">rated</div></div><div><div class="hv">'+appr+'</div><div class="hl">approved</div></div><div><div class="hv">'+inv+'</div><div class="hl">reached out</div></div><div><div class="hv">'+conf+'</div><div class="hl">confirmed</div></div></div><div class="ht">'+list.length+' on the list</div></div>'});h+='</div>';
      if(ME.role==='admin'){h+='<h3 class="sec">Needs you</h3><div class="needs">';var ui=D.investors.filter(function(r){return val(r.id,ME.column)==null}).length,uf=D.founders.filter(function(r){return val(r.id,ME.column)==null}).length;var dis=D.investors.concat(D.founders).filter(function(r){var e=val(r.id,'endeavor'),d=val(r.id,'dan');return e!=null&&d!=null&&e!==d&&finalOf(r.id).fit==null}).length;var nof=D.investors.concat(D.founders).filter(function(r){return stageOf(r.id)==='Approved'}).length;
        h+='<a href="#investors">Investors you have not rated yet<b>'+ui+'</b></a><a href="#founders">Founders you have not rated yet<b>'+uf+'</b></a>'+(isDan?'':'<a href="#investors">Where Endeavor and Dan disagree, no Final yet<b>'+dis+'</b></a><a href="#investors">Approved, not yet reached out<b>'+nof+'</b></a>')+'</div>'}}
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
  function help(){localStorage.setItem('mb_help_'+ME.name,'1');var h=E('div','help','<div class="hc"><button class="hx" aria-label="Close">×</button><h2>How this works</h2><ol>'+(ME.role==='admin'?'<li><b>Investors</b> and <b>Founders</b>: every row has three columns, Endeavor · Dan · Final. Tap a number in your column (1 Low up to 5 Very High, or No). It saves on its own; no save button anywhere.</li><li><b>Rate</b> mode strips each row down and lets you use the keyboard: 1–5 or N to rate, ↓ for the next one. <b>Work</b> mode shows everything. The stage row at the top is the funnel; click a stage to see only those names. <b>Final</b> is the agreed call and its stage.</li><li><b>Speakers</b>, <b>Tours</b> and <b>Budget</b> are the working plan. Budget edits save for everyone.</li>':'<li><b>Home</b> shows where the summit stands.</li><li><b>Speakers</b> and <b>Tours</b> are the working plan.</li><li>Nothing here is public.</li>')+'</ol><button class="go">Got it</button></div>');document.body.appendChild(h);h.querySelector('.hx').onclick=h.querySelector('.go').onclick=function(){h.remove()}}
})();
