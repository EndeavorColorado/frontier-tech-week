  /* investors: one plain list for the members build. The members script adds the rating line. */
  var invType='all';
  function invTypeOf(r){ return (r.t==='CVC'||r.t==='Anchor')?'str':(isCO(r)?'co':'vc'); }
  function typeWords(r){ if(isCO(r)) return 'Colorado fund'; return {VC:'venture fund',CVC:'corporate investor',Anchor:'strategic buyer','Growth/PE':'growth fund','Sovereign/Family office':'family office'}[r.t]||r.t; }
  function firstSentence(t){ t=(t||'').trim(); var m=t.match(/^.*?[.!?](\s|$)/); return m?m[0].trim():t; }
  function shortPath(t){ t=(t||'').trim(); var cut=t.split(/\s*\|\s*/)[0]; if(cut.length>150) cut=cut.slice(0,148).replace(/\s+\S*$/,'')+'\u2026'; return cut; }
  function money(r){ return r.aum?('$'+(r.aum>=1000?(r.aum/1000).toFixed(r.aum>=10000?0:1)+'B':Math.round(r.aum)+'M')+' under management'):''; }
  function row(r,i){
    var cp=caps(r);
    var h='<div class="irow" data-n="'+esc(r.n)+'" data-type="'+invTypeOf(r)+'">';
    h+='<div class="ir1"><span class="rk">'+(i+1)+'</span><span class="nm">'+esc(r.n)+'</span><span class="meta">'+(r.hq?esc(r.hq)+' · ':'')+typeWords(r)+(money(r)?' · '+money(r):'')+'</span></div>';
    h+='<p class="irwhy">'+esc(firstSentence(r.why))+'</p>';
    h+='<p class="irpath">'+(r.zp||r.warm?'<b>Reach them through:</b> '+esc(r.zp||'')+(r.zp&&r.warm?' <span class="sep">·</span> ':'')+esc(shortPath(r.warm)):'<span class="nowarm">No warm path yet</span>')+(r.op?'<span class="op">'+esc(r.op)+'</span>':'')+'</p>';
    h+='<div class="irfit"></div>';
    var more=(r.why&&firstSentence(r.why)!==r.why.trim()?'<p>'+esc(r.why)+'</p>':'')+(r.warm&&shortPath(r.warm)!==r.warm.trim()?'<p><b>Warm path, in full:</b> '+esc(r.warm)+'</p>':'')+(r.who?'<p><b>Who:</b> '+esc(r.who)+'</p>':'')+(r.deals&&r.deals.length?'<p><b>Recent deals:</b> '+r.deals.slice(0,3).map(esc).join(' · ')+'</p>':'')+(cp.length?'<p><b>On the cap table of:</b> '+cp.map(esc).join(', ')+'</p>':'');
    if(more) h+='<details class="irx"><summary>More about '+esc(r.n)+'</summary><div class="irxb">'+more+'</div></details>';
    return h+'</div>';
  }
  function table(rows){ var h='<div class="ilist">'; rows.forEach(function(r,i){ h+=row(r,i); }); return h+'</div>'; }
  function renderInv(){
    var rank=function(a,b){ return (b.score-a.score)||(span(b)-span(a))||((b.aum||0)-(a.aum||0)); };
    var filt=function(r){ return qhit(invQ,[r.n,r.who||'',r.zp||'',r.why||'',r.hq||'',(r.deals||[]).join(' ')]); };
    var base=INV.filter(filt).sort(rank);
    base=base.filter(function(r){return invTypeOf(r)!=='co'}).concat(base.filter(function(r){return invTypeOf(r)==='co'}));
    var rows=invType==='all'?base:base.filter(function(r){return invTypeOf(r)===invType});
    var h='<div id="inv-head"></div>';
    h+='<input type="search" id="inv-q" class="qbox" placeholder="Search by name, person or company" value="'+esc(invQ)+'" aria-label="Search investors" hidden>';
    h+=table(rows);
    h+='<p class="ifoot">Public titles and company names only. Research input for human judgment, October 2026.</p>';
    var root=document.getElementById('inv-body'); root.innerHTML=h;
    root.querySelector('#inv-q').addEventListener('input',function(e){ invQ=e.target.value; renderInv(); var q=document.getElementById('inv-q'); q.focus(); q.setSelectionRange(invQ.length,invQ.length); });
  }
  window.__invType=function(t){ invType=t; renderInv(); };
  renderInv();
