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
  function route(){var h=location.hash||'#home';var map={'#home':0,'#investors':1,'#founders':2,'#program':3,'#speakers':3,'#tours':3,'#budget':4};if(h==='#settings'){showSettings();return}document.getElementById('pane-settings').hidden=true;if(window.__showTop&&map[h]!=null)window.__showTop(map[h]);window.scrollTo(0,0)}
  document.querySelectorAll('.tabs.top button').forEach(function(b){b.addEventListener('click',function(){var m={'t-home':'#home','t-inv':'#investors','t-fdr':'#founders','t-prog':'#program','t-budget':'#budget'};if(!m[b.id])return;history.replaceState(null,'',m[b.id]);document.getElementById('pane-settings').hidden=true;document.getElementById('mhSettings').setAttribute('aria-selected','false');window.scrollTo(0,0)})});

  /* ---------- Fit ---------- */
  function pid(el,kind){var t=(el.getAttribute('data-n')||'').trim();var r=BYID[(kind==='inv'?'n:':'c:')+t];return r?r.id:null}
  // Endeavor's founder rating starts from the research stars until someone at Endeavor sets it by hand
  function research(id){var r=BYID[id];return (r&&r.r&&/^fdr-/.test(id))?Math.max(1,Math.min(5,+r.r)):null}
  function isResearch(id,col){return col==='endeavor'&&!(FIT[id]&&FIT[id][col]&&FIT[id][col].v!=null)&&research(id)!=null}
  function val(id,col){var f=FIT[id]&&FIT[id][col];if(f&&f.v!=null)return f.v;if(col==='endeavor')return research(id);return null}
  function valHand(id,col){var f=FIT[id]&&FIT[id][col];return f&&f.v!=null?f.v:null}
  function finalOf(id){return FINAL[id]||{}}
  function stageOf(id){var f=finalOf(id);if(f.stage==='Declined'||f.stage==='Do not invite'||f.fit===0)return 'Out';if(f.stage)return f.stage;if(f.fit!=null)return f.fit>=4?'Approved':'Rated';if(val(id,'endeavor')!=null||val(id,'dan')!=null)return 'Rated';return 'Unrated'}
  function word(v){return v==null?'':(v===0?'Don’t invite':v+' · '+FITW[v])}
  function pill(v,extra){if(v==null)return '<span class="pill none">not rated</span>';return '<span class="pill f'+v+(extra||'')+'">'+word(v)+'</span>'}
  function chips(attr,v){var h='<div class="chips5">';[1,2,3,4,5].forEach(function(n){h+='<button '+attr+'="'+n+'" class="'+(v===n?'on':'')+'" title="'+FITW[n]+'">'+n+'</button>'});return h+'<button '+attr+'="0" class="no'+(v===0?' on':'')+'" title="A reason not to have them in the room">Don’t invite</button></div>'}
  function fitHTML(id){
    var mine=ME.column, other=mine==='dan'?'endeavor':'dan', canRate=ME.role==='admin';
    var me=val(id,mine), them=val(id,other), f=finalOf(id);
    var otherName=other==='dan'?'Dan':'Endeavor';
    var h='<div class="fitbar" data-fid="'+id+'">';
    var rs=isResearch(id,mine);
    if(canRate){h+='<div class="fme"><span class="fk">Your rating</span>'+chips('data-fit',me)+(rs?'<span class="rsrch" title="Starts from the research stars. Click a number to make it yours.">from research</span>':'')+'</div>'}
    else h+='<div class="fme"><span class="fk">Endeavor</span>'+pill(val(id,'endeavor'))+' <span class="fk">Dan</span>'+pill(val(id,'dan'))+'</div>';
    h+='<div class="fside">';
    var dv=val(id,'dan'),ev=val(id,'endeavor');var both=dv!=null&&ev!=null;var agree=both&&dv===ev;
    function line(label,col,v){var you=col===mine&&canRate;return '<div class="fthem'+(you?' you':'')+'"><span class="fk">'+label+(you?' (you)':'')+':</span> '+(v==null?'<span class="muted">not yet</span>':'<b>'+word(v)+'</b>'+(isResearch(id,col)?' <span class="muted">(research)</span>':''))+'</div>'}
    h+=line('Dan','dan',dv);
    h+=line('Endeavor','endeavor',ev);
    if(both)h+='<div class="fcmp">'+(agree?'<span class="ok">\u2713 agree</span>':'<span class="diff">differ by '+Math.abs(dv-ev)+'</span>')+'</div>';
    h+='<div class="ffinal"><span class="fk">Final:</span> '+(f.fit!=null||f.stage?'<b>'+(f.fit!=null?word(f.fit):'')+(f.stage?(f.fit!=null?' — ':'')+esc(f.stage):'')+'</b>'+(f.note?' <span class="muted">'+esc(f.note)+'</span>':''):'<span class="muted">not yet</span>')+(canRate?' <button class="edit" data-final="1">'+(f.fit!=null||f.stage?'Edit':'Set')+'</button>':'')+'</div>';
    return h+'</div></div>';
  }
  function fillFit(el){var id=el.getAttribute('data-fid');el.outerHTML=fitHTML(id)}
  function augment(root,kind){
    if(!D.investors)return;
    if(kind==='spk'||kind==='tour'){root.querySelectorAll('table.tours tbody tr:not(.bench-head):not(.fitrow)').forEach(function(tr){if(tr.nextElementSibling&&tr.nextElementSibling.classList.contains('fitrow'))return;var nm=tr.querySelector('td.nm');if(!nm)return;var t='';for(var i=0;i<nm.childNodes.length;i++){if(nm.childNodes[i].nodeType===3)t+=nm.childNodes[i].textContent}t=t.trim();if(!t)return;var id=kind+'-'+t.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');BYID[id]=BYID[id]||{n:t};tr.setAttribute('data-pid',id);var fr=E('tr','fitrow','<td colspan="4">'+fitHTML(id)+'</td>');tr.parentNode.insertBefore(fr,tr.nextSibling)});return}
    root.querySelectorAll('.irow').forEach(function(row){var slot=row.querySelector('.irfit');if(!slot||slot.firstChild)return;var id=pid(row,kind);if(!id)return;row.setAttribute('data-pid',id);slot.innerHTML=fitHTML(id)});
    viewbar(root,kind);applyView(root,kind);
  }
  function rate(id,v){var cur=valHand(id,ME.column);var nv=(cur===v)?null:v;
    FIT[id]=FIT[id]||{};FIT[id][ME.column]={v:nv,by:ME.name,at:new Date().toISOString()};var bar=document.querySelector('.fitbar[data-fid="'+id+'"]');if(bar)fillFit(bar);
    api('POST',{action:'rate',id:id,fit:nv}).then(function(){toast(nv==null?'Cleared':'Saved: '+(nv===0?'Do not invite':nv+' · '+FITW[nv]));updateProg()}).catch(function(){toast('Did not save. Tap again.');FIT[id][ME.column]={v:cur,by:ME.name,at:''};var el=document.querySelector('.fitbar[data-fid="'+id+'"]');if(el)fillFit(el)})}
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-fit]');if(b){var id=b.closest('.fitbar').getAttribute('data-fid');rate(id,+b.getAttribute('data-fit'));setCur(b.closest('[data-pid]'));return}
    var fb=e.target.closest('[data-final]');if(fb){editFinal(fb.closest('.fitbar'));return}
    var row=e.target.closest('[data-pid]');if(row&&!e.target.closest('a,button,input,select,summary'))setCur(row);
    var mo=e.target.closest('.irx summary');if(mo)setTimeout(function(){tidy()},0);
  });
  function editFinal(bar){var id=bar.getAttribute('data-fid'),f=finalOf(id),e=val(id,'endeavor'),d=val(id,'dan');var def=f.fit!=null?f.fit:(e!=null&&e===d?e:(e!=null?e:d));
    var h='<div class="fedit"><span class="fk">Final rating</span>'+chips('data-ff',def)+'<label class="fk">Stage <select data-fs>'+['<option value="">not set</option>'].concat(STAGES.map(function(s){return '<option'+(f.stage===s?' selected':'')+'>'+s+'</option>'})).join('')+'</select></label><input data-fn placeholder="Note (optional)" value="'+esc(f.note||'')+'"><span class="facts"><button class="edit save" data-fsave>Save</button><button class="edit" data-fcancel>Cancel</button>'+(f.fit!=null||f.stage?'<button class="edit" data-fclear>Clear</button>':'')+'</span></div>';
    bar.innerHTML=h;var sel=def;bar.querySelectorAll('[data-ff]').forEach(function(b){b.onclick=function(){sel=+b.getAttribute('data-ff');bar.querySelectorAll('[data-ff]').forEach(function(x){x.classList.toggle('on',x===b)})}});
    bar.querySelector('[data-fcancel]').onclick=function(){fillFit(bar)};
    var cl=bar.querySelector('[data-fclear]');if(cl)cl.onclick=function(){delete FINAL[id];fillFit(bar);api('POST',{action:'final',id:id,fit:'',stage:'',owner:'',note:''}).then(function(){toast('Final cleared');renderHome();updateProg()}).catch(function(){toast('Did not save. Try again.')})};
    bar.querySelector('[data-fsave]').onclick=function(){var data={fit:sel,stage:bar.querySelector('[data-fs]').value,owner:f.owner||'',note:bar.querySelector('[data-fn]').value.trim()};FINAL[id]=Object.assign({},data,{by:ME.name,at:new Date().toISOString()});fillFit(bar);api('POST',Object.assign({action:'final',id:id},data)).then(function(){toast('Final saved');renderHome();updateProg()}).catch(function(){toast('Did not save. Try again.')})};
  }
  /* header strip: count, one dropdown, search */
  var SHOW={inv:'all',fdr:'all'};
  function viewbar(root,kind){if(root.querySelector('.ihs'))return;
    var isInv=kind==='inv';
    var opts=[['all','All'],['side','Side by side: Endeavor · Dan · Final'],['unrated','Not yet rated by me'],['rated','Rated by me'],['gap','Where Bre and Dan disagree'],['waiting','Waiting on '+(ME.column==='dan'?'Bre':'Dan')],['Approved','Approved'],['Reached out','Reached out'],['Confirmed','Confirmed'],['Out','Not inviting']];if(!isInv&&ME.column==='endeavor')opts.splice(4,0,['research','Still on the research rating']);
    if(isInv)opts=opts.concat([['-','──────'],['t:vc','Venture funds only'],['t:str','Strategics & buyers only'],['t:co','Colorado funds only']]);
    var hs=E('div','ihs','<div class="ihs-l"><span class="ihs-n" id="ihsn-'+kind+'"></span></div><div class="ihs-r"><label>Show <select class="ihs-sel">'+opts.map(function(o){return '<option value="'+o[0]+'"'+(o[0]==='-'?' disabled':'')+'>'+o[1]+'</option>'}).join('')+'</select></label><input type="search" class="ihs-q" placeholder="Search" aria-label="Search"></div>');
    var anchor=root.querySelector('#inv-head')||root.querySelector('#fdr-head');if(anchor)anchor.appendChild(hs);else root.insertBefore(hs,root.firstChild);var off=root.querySelector('#fdr-off');if(off)hs.querySelector('.ihs-r').insertBefore(off,hs.querySelector('.ihs-q'));
    var sel=hs.querySelector('.ihs-sel');sel.value=(isInv&&invTypeCur!=='all')?'t:'+invTypeCur:SHOW[kind];
    sel.onchange=function(){var v=sel.value;if(v.indexOf('t:')===0){SHOW[kind]='all';setType(v.slice(2));return}SHOW[kind]=v;if(isInv&&invTypeCur!=='all'){setType('all');return}applyView(root,kind)};
    var q=hs.querySelector('.ihs-q');var inner=root.querySelector(isInv?'#inv-q':'#fdr-q');if(inner){q.value=inner.value;q.oninput=function(){inner.value=q.value;inner.dispatchEvent(new Event('input',{bubbles:true}));setTimeout(function(){var nq=root.querySelector('.ihs-q');if(nq){nq.focus();nq.setSelectionRange(nq.value.length,nq.value.length)}},0)}}else q.hidden=true;
    var nb=E('button','nextun','Next one I haven’t rated ↓');nb.onclick=function(){nextUnrated(root,kind)};root.appendChild(nb);
  }
  var invTypeCur='all';function setType(t){invTypeCur=t;window.__invType(t)}
  function rowsOf(root,kind){return [].slice.call(root.querySelectorAll('[data-pid]'))}
  function barProg(){var p=document.getElementById('mbProg');if(!p||!D||!D.investors||ME.role!=='admin')return;var ni=D.investors.filter(function(r){return val(r.id,ME.column)!=null}).length,nf=D.founders.filter(function(r){return val(r.id,ME.column)!=null}).length;p.innerHTML='Investors <b>'+ni+'</b>/'+D.investors.length+' &middot; Founders <b>'+nf+'</b>/'+D.founders.length}
  function updateProg(){barProg();['inv','fdr'].forEach(function(kind){var n=document.getElementById('ihsn-'+kind);if(!n||!D.investors)return;var list=kind==='inv'?D.investors:D.founders;var rated=list.filter(function(r){return val(r.id,ME.column)!=null}).length;var rsn=list.filter(function(r){return isResearch(r.id,ME.column)}).length;var vis=rowsOf(document.getElementById(kind==='inv'?'inv-body':'fdr-body')).filter(function(r){return !r.classList.contains('vh')}).length;n.innerHTML=(ME.role==='admin'?'<b>'+list.length+'</b> '+(kind==='inv'?'investors':'founders')+' &middot; you have rated <b>'+rated+'</b>'+(rsn?' (<b>'+rsn+'</b> from research)':'')+' &middot; <b>'+(list.length-rated)+'</b> to go':'<b>'+list.length+'</b> '+(kind==='inv'?'investors':'founders'))+(vis!==list.length?' &middot; showing '+vis:'')})}
  function applyView(root,kind){var v=SHOW[kind];var mine=ME.column;
    rowsOf(root,kind).forEach(function(r){var id=r.getAttribute('data-pid');var e=val(id,'endeavor'),d=val(id,'dan');var gap=(e!=null&&d!=null&&e!==d);var st=stageOf(id);var hide=false;
      var other=mine==='dan'?'endeavor':'dan';
      if(v==='unrated')hide=valHand(id,mine)!=null&&!isResearch(id,mine)?true:(valHand(id,mine)!=null);else if(v==='rated')hide=valHand(id,mine)==null;else if(v==='research')hide=!isResearch(id,'endeavor');else if(v==='gap')hide=!gap;else if(v==='waiting')hide=!(val(id,mine)!=null&&val(id,other)==null);else if(v!=='all'&&v!=='side')hide=st!==v;
      r.classList.toggle('vh',hide);r.classList.toggle('hasfinal',finalOf(id).fit!=null)});
    var nb=root.querySelector('.nextun');if(nb)nb.hidden=ME.role!=='admin'||v==='side';root.classList.toggle('side-on',v==='side');if(v==='side')renderSide(root,kind);else{var sb=root.querySelector('.sbs');if(sb)sb.remove()}updateProg();
  }
  /* side by side */
  function renderSide(root,kind){var list=(kind==='inv'?D.investors:D.founders).slice();var mine=ME.column,canRate=ME.role==='admin';
    var vis={};rowsOf(root,kind).forEach(function(r){vis[r.getAttribute('data-pid')]=1});list=list.filter(function(r){return vis[r.id]});
    function state(id){var e=val(id,'endeavor'),d=val(id,'dan'),f=finalOf(id);if(f.fit!=null)return 'final';if(e==null&&d==null)return 'none';if(e==null||d==null)return 'wait';return e===d?'agree':'gap'}
    var order={gap:0,wait:1,none:2,agree:3,final:4};list.sort(function(a,b){return (order[state(a.id)]-order[state(b.id)])||((val(b.id,'endeavor')||0)-(val(a.id,'endeavor')||0))});
    var c={gap:0,wait:0,none:0,agree:0,final:0};list.forEach(function(r){c[state(r.id)]++});
    var h='<div class="sbs"><p class="sbs-sum"><b>'+c.gap+'</b> disagree · <b>'+c.wait+'</b> waiting on one of you · <b>'+c.agree+'</b> agree · <b>'+c.final+'</b> final</p>';
    h+='<table class="sbs-t"><thead><tr><th>Name</th><th>Endeavor</th><th>Dan</th><th>Final</th></tr></thead><tbody>';
    list.forEach(function(r){var id=r.id,e=val(id,'endeavor'),d=val(id,'dan'),f=finalOf(id),st=state(id);
      function cell(col,v){if(canRate&&mine===col)return '<td class="c-'+col+'"><span class="sbs-chips" data-sid="'+id+'">'+[1,2,3,4,5].map(function(n){return '<button data-sfit="'+n+'" class="'+(v===n?'on':'')+'">'+n+'</button>'}).join('')+'<button data-sfit="0" class="no'+(v===0?' on':'')+'" title="Don’t invite">No</button></span>'+(isResearch(id,col)?'<span class="rsrch">research</span>':'')+'</td>';return '<td class="c-'+col+'">'+(v==null?'<span class="muted">—</span>':'<b>'+word(v)+'</b>'+(isResearch(id,col)?' <span class="muted">(research)</span>':''))+'</td>'}
      h+='<tr class="s-'+st+'" data-sid="'+id+'"><td class="sbs-n"><b>'+esc(kind==='inv'?r.n:r.c)+'</b><small>'+esc(kind==='inv'?(r.hq||''):(r.o||''))+'</small></td>'+cell('endeavor',e)+cell('dan',d);
      h+='<td class="sbs-f">'+(f.fit!=null||f.stage?'<b>'+(f.fit!=null?word(f.fit):'')+(f.stage?' — '+esc(f.stage):'')+'</b>'+(canRate?' <button class="lnk" data-sfinal="'+id+'" data-v="">Edit</button>':''):(canRate?(st==='agree'?'<button class="lnk" data-sfinal="'+id+'" data-v="'+e+'">Confirm '+e+'</button>':st==='gap'?'<button class="lnk" data-sfinal="'+id+'" data-v="'+e+'">Use Endeavor’s '+e+'</button> <button class="lnk" data-sfinal="'+id+'" data-v="'+d+'">Use Dan’s '+d+'</button>':'<span class="muted">'+(st==='wait'?'waiting':'—')+'</span>'):'<span class="muted">—</span>'))+'</td></tr>'});
    h+='</tbody></table></div>';
    var old=root.querySelector('.sbs');if(old)old.remove();root.querySelector('.ilist').insertAdjacentHTML('beforebegin',h);
    root.querySelectorAll('[data-sfit]').forEach(function(b){b.onclick=function(){var id=b.closest('[data-sid]').getAttribute('data-sid');rate(id,+b.getAttribute('data-sfit'));renderSide(root,kind)}});
    root.querySelectorAll('[data-sfinal]').forEach(function(b){b.onclick=function(){var id=b.getAttribute('data-sfinal'),v=b.getAttribute('data-v');if(v===''){SHOW[kind]='all';var sel=root.querySelector('.ihs-sel');if(sel)sel.value='all';applyView(root,kind);var bar=root.querySelector('.fitbar[data-fid="'+id+'"]');if(bar){editFinal(bar);bar.closest('.irow').scrollIntoView({block:'center'})}return}
      var f=finalOf(id);var data={fit:+v,stage:f.stage||'Approved',owner:'',note:f.note||''};if(+v<4&&!f.stage)data.stage='';FINAL[id]=Object.assign({},data,{by:ME.name,at:new Date().toISOString()});var bar=root.querySelector('.fitbar[data-fid="'+id+'"]');if(bar)fillFit(bar);renderSide(root,kind);api('POST',Object.assign({action:'final',id:id},data)).then(function(){toast('Final saved');renderHome();updateProg()}).catch(function(){toast('Did not save. Try again.')})}});
  }
  /* keyboard rating */
  function setCur(row){if(!row)return;document.querySelectorAll('[data-pid].cur').forEach(function(r){r.classList.remove('cur')});row.classList.add('cur');var k=row.classList.contains('irow')?'inv':'fdr';CUR[k]=row}
  function visRows(root){return rowsOf(root).filter(function(r){return !r.classList.contains('vh')})}
  function nextUnrated(root,kind){var rows=visRows(root);var start=CUR[kind]?rows.indexOf(CUR[kind])+1:0;for(var i=0;i<rows.length;i++){var r=rows[(start+i)%rows.length];if(val(r.getAttribute('data-pid'),ME.column)==null){setCur(r);r.scrollIntoView({block:'center',behavior:'smooth'});return}}toast('Everything here is rated')}
  function step(root,kind,dir){var rows=visRows(root);var i=CUR[kind]?rows.indexOf(CUR[kind]):-1;var n=rows[Math.max(0,Math.min(rows.length-1,i+dir))];if(n){setCur(n);n.scrollIntoView({block:'center',behavior:'smooth'})}}
  document.addEventListener('keydown',function(e){if(ME.role!=='admin')return;if(e.target.matches('input,textarea,select'))return;var kind=document.getElementById('pane-inv').hidden?(document.getElementById('pane-fdr').hidden?null:'fdr'):'inv';if(!kind)return;var root=document.getElementById(kind==='inv'?'inv-body':'fdr-body');
    if(e.key==='ArrowDown'||e.key==='j'){e.preventDefault();step(root,kind,1);return}if(e.key==='ArrowUp'||e.key==='k'){e.preventDefault();step(root,kind,-1);return}
    if(!CUR[kind]){nextUnrated(root,kind);return}
    var v=null;if(/^[1-5]$/.test(e.key))v=+e.key;else if(e.key==='n'||e.key==='N'||e.key==='0')v=0;if(v==null)return;e.preventDefault();var id=CUR[kind].getAttribute('data-pid');rate(id,v);setTimeout(function(){nextUnrated(root,kind)},150)});
  function tidy(){document.querySelectorAll('h3.sec,h2,h4').forEach(function(h){var t=h.textContent;var n=t.replace(/\s*\.$/,'');if(n!==t)h.textContent=n})}
  function observe(){['inv-body','fdr-body','spk-body','tours-body'].forEach(function(id){var root=document.getElementById(id);var kind={'inv-body':'inv','fdr-body':'fdr','spk-body':'spk','tours-body':'tour'}[id];var busy=false;new MutationObserver(function(muts){var real=muts.some(function(m){return [].concat([].slice.call(m.addedNodes),[].slice.call(m.removedNodes)).some(function(n){return !(n.classList&&(n.classList.contains('sbs')||n.classList.contains('nextun')||n.classList.contains('ihs')))})});if(!real||busy)return;busy=true;try{augment(root,kind);tidy()}finally{busy=false}}).observe(root,{childList:true});augment(root,kind)})}

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
        h+='<a href="#investors">Investors you have not rated yet<b>'+ui+'</b></a><a href="#founders">Founders you have not rated yet<b>'+uf+'</b></a>'+(isDan?'':'<a href="#founders">Founders waiting on Dan<b>'+D.founders.filter(function(r){return val(r.id,'dan')==null}).length+'</b></a>')+''+(isDan?'':'<a href="#investors">Where Endeavor and Dan disagree, no Final yet<b>'+dis+'</b></a><a href="#investors">Approved, not yet reached out<b>'+nof+'</b></a>')+'</div>'}}
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
  function help(){localStorage.setItem('mb_help_'+ME.name,'1');var h=E('div','help','<div class="hc"><button class="hx" aria-label="Close">×</button><h2>How this works</h2><ol>'+(ME.role==='admin'?'<li><b>Investors</b> and <b>Founders</b>: every row has three columns, Endeavor · Dan · Final. Under each name, tap your rating: 1 Low, 2 Medium, 3 Medium-High, 4 High, 5 Very High, or Don’t invite. It saves on its own; there is no save button anywhere.</li><li><b>Show</b> narrows the list: the ones you have not rated yet, where Bre and Dan disagree, who is approved or confirmed. <b>Final</b> is the agreed call and where it stands. Keyboard, if you like it: 1–5 or N rates the highlighted name, ↓ goes to the next.</li><li><b>Program</b> is who is on stage and Thursday\u2019s tours; each speaker and each site has the same 1\u20135 rating under it. <b>Budget</b> is the working spreadsheet; edits save for everyone.</li>':'<li><b>Home</b> shows where the summit stands.</li><li><b>Program</b> is who is on stage and Thursday\u2019s tours.</li><li>Nothing here is public.</li>')+'</ol><button class="go">Got it</button></div>');document.body.appendChild(h);h.querySelector('.hx').onclick=h.querySelector('.go').onclick=function(){h.remove()}}
})();
