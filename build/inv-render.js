  /* investors: one ranked list, type chips, decision-first rows (members build) */
  var invType='all';
  function invTypeOf(r){ return (r.t==='CVC'||r.t==='Anchor')?'str':(isCO(r)?'co':'vc'); }
  function row(r,i){
    var cv=cov(r), dots='<span class="dots">'; for(var f=0;f<6;f++){ dots+='<b class="'+(cv[f]==='p'?'p':cv[f]==='s'?'s':'')+'" style="--fc:'+fc(f)+'" title="'+FR[f]+(cv[f]==='p'?' · core':cv[f]==='s'?' · also active':'')+'"></b>'; } dots+='</span>';
    var cp=caps(r), aum=r.aum?('$'+(r.aum>=1000?(r.aum/1000).toFixed(r.aum>=10000?0:1)+'B':Math.round(r.aum)+'M')):'';
    var tl=invTypeOf(r)==='str'?'Strategic':invTypeOf(r)==='co'?'Colorado':'Venture';
    var h='<div class="irow" data-n="'+esc(r.n)+'" data-type="'+invTypeOf(r)+'">';
    h+='<div class="ir1"><span class="rk">'+(i+1)+'</span><span class="nm">'+esc(r.n)+'</span><span class="meta">'+esc(r.t)+(r.hq?' · '+esc(r.hq):'')+(aum?' · '+aum:'')+'</span>'+dots+(r.zb?'<span class="st">Bench</span>':'')+(r.zp?'<span class="inv">Invite: '+esc(r.zp)+'</span>':'')+'</div>';
    h+='<div class="ir2">'+(r.warm?'<b>Warm path</b> '+esc(r.warm):'<span class="nowarm">No warm path yet</span>')+(r.op?'<span class="op">'+esc(r.op)+'</span>':'')+'</div>';
    h+='<div class="irfit"></div>';
    h+='<details class="irx"'+(i<20?' open':'')+'><summary>Why they matter · deals · cap table</summary><div class="irxb">'+(r.why?'<p>'+esc(r.why)+'</p>':'')+(r.deals&&r.deals.length?'<p class="deals">'+r.deals.slice(0,3).map(esc).join(' · ')+'</p>':'')+(cp.length?'<span class="caps">'+cp.map(function(c){return '<span>'+esc(c)+'</span>';}).join('')+'</span>':'')+'</div></details>';
    return h+'</div>';
  }
  function table(rows){ var h='<div class="ilist">'; rows.forEach(function(r,i){ h+=row(r,i); }); return h+'</div>'; }
  function renderInv(){
    var rank=function(a,b){ return (b.score-a.score)||(span(b)-span(a))||((b.aum||0)-(a.aum||0)); };
    var filt=function(r){ return (invFilter===null || cov(r)[invFilter]) && qhit(invQ,[r.n,r.who||'',r.zp||'',r.why||'',r.hq||'',(r.deals||[]).join(' ')]); };
    var base=INV.filter(filt).sort(rank);
    // Colorado funds rank after the national lists: our own doors
    base=base.filter(function(r){return invTypeOf(r)!=='co'}).concat(base.filter(function(r){return invTypeOf(r)==='co'}));
    var n={all:base.length,vc:0,str:0,co:0}; base.forEach(function(r){ n[invTypeOf(r)]++; });
    var rows=invType==='all'?base:base.filter(function(r){return invTypeOf(r)===invType});
    var h='<div class="ihead"><div class="itypes">';
    [['all','All'],['vc','Venture'],['str','Strategics & buyers'],['co','Colorado']].forEach(function(t){ h+='<button class="chip" data-t="'+t[0]+'" aria-pressed="'+(invType===t[0])+'">'+t[1]+' <i>'+n[t[0]]+'</i></button>'; });
    h+='</div><div class="ifr">'; for(var i=0;i<6;i++){ h+='<button class="chip fr" data-f="'+i+'" aria-pressed="'+(invFilter===i)+'" style="--fc:'+fc(i)+'" title="'+FR[i]+'"><i></i>'+FRS[i]+'</button>'; }
    h+='</div><input type="search" id="inv-q" class="qbox" placeholder="Search firm, person or portfolio company" value="'+esc(invQ)+'" aria-label="Search investors"></div>';
    h+='<div id="inv-funnel"></div>';
    h+='<p class="ilede">Best first. Score is capital weight, verified 2025 to 2026 frontier deals, ability to lead $10M+, and a warm path through our companies.</p>';
    h+=table(rows);
    h+='<p class="ifoot">Public titles and company names only. Research input for human judgment, October 2026.</p>';
    var root=document.getElementById('inv-body'); root.innerHTML=h;
    root.querySelectorAll('.chip[data-t]').forEach(function(b){ b.addEventListener('click',function(){ invType=b.dataset.t; renderInv(); }); });
    root.querySelectorAll('.chip[data-f]').forEach(function(b){ b.addEventListener('click',function(){ var f=+b.dataset.f; invFilter=(invFilter===f)?null:f; renderInv(); }); });
    root.querySelector('#inv-q').addEventListener('input',function(e){ invQ=e.target.value; renderInv(); var q=document.getElementById('inv-q'); q.focus(); q.setSelectionRange(invQ.length,invQ.length); });
  }
  dark.addEventListener&&dark.addEventListener('change',renderInv);
  renderInv();
