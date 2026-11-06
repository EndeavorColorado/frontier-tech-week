  /* founders: one plain list, biggest draw first (members build). The members script adds the rating line. */
  function stars(r){ var h=''; for(var i=1;i<=5;i++){ h+=i<=r.r?'★':'☆'; } return '<span class="stars" title="Draw: how much this name pulls investors and other founders into the room">'+h+'</span>'; }
  function statusWords(s){ return {EE:'Endeavor Entrepreneur',Pipeline:'in the pipeline','Scale-up':'ScaleUp',Prospect:'prospect',TBC:'status to confirm',Alumni:'alumni'}[s]||(/^Funnel/.test(s||'')?'Colorado funnel '+s.replace('Funnel ',''):s||''); }
  function reachLine(r){
    var parts=[];
    if(r.us&&r.us.length){ r.us.forEach(function(u){ var x=USR.filter(function(y){return y[0]===u;})[0]; parts.push('Endeavor '+u+(x&&x[1]?' ('+x[1]+')':'')); }); }
    (r.o||'').split(' · ').forEach(function(o){ if(!o) return; var x=OFFN[o]; if(x) parts.push('Endeavor '+o+(x[2]?' ('+x[2]+')':'')); else if(!r.us||!r.us.length) parts.push(o+' (no Endeavor office)'); });
    return parts.length?'<b>Reach them through:</b> '+esc(parts.join(' · ')):'<span class="nowarm">No Endeavor office on this one yet</span>';
  }
  function frow(r,i){
    var h='<div class="irow frow" data-n="'+esc(r.c)+'">';
    h+='<div class="ir1"><span class="rk">'+(i+1)+'</span><span class="nm co">'+esc(r.c)+'</span><span class="meta">'+esc(r.o||'')+(r.w?' · '+esc(r.w):'')+(r.s?' · '+statusWords(r.s):'')+'</span></div>';
    h+='<p class="irwhy">'+(r.p?esc(r.p):'<span class="nowarm">Founder to confirm</span>')+(r.n?' <span class="muted">— '+esc(r.n)+'</span>':'')+'</p>';
    h+='<p class="irpath">'+reachLine(r)+'</p>';
    h+='<div class="irfit"></div>';
    h+='<details class="irx"><summary>More about '+esc(r.c)+'</summary><div class="irxb"><p><b>Research draw:</b> '+stars(r)+' '+r.r+' of 5'+(r.ro?' · office score '+r.ro+'/5':'')+'</p><p><b>Frontier:</b> '+esc(FR[r.f]||'')+(r.f2!=null?' · '+esc(FR[r.f2]||''):'')+'</p>'+(r.ul?'<p>'+esc(r.ul)+'</p>':'')+(r.b?'<p>On the bench: not in the first wave.</p>':'')+'</div></details>';
    return h+'</div>';
  }
  function renderFdr(){
    var rows=FDR.filter(function(r){ return qhit(fdrQ,[r.c,r.p||'',r.w||'',r.o]) && (!fdrOffice || (fdrOffice.indexOf('us:')===0 ? usHit(r) : (r.o||'').split(' · ').indexOf(fdrOffice)>-1)); })
      .sort(function(a,b){ return (b.r-a.r)||((b.s==='EE'?1:0)-(a.s==='EE'?1:0))||((b.x?1:0)-(a.x?1:0))||a.c.localeCompare(b.c); });
    var h='<div id="fdr-head"></div>';
    h+='<input type="search" id="fdr-q" class="qbox" value="'+esc(fdrQ)+'" aria-label="Search founders" hidden>';
    h+='<select id="fdr-off" class="ihs-sel ihs-off" aria-label="Office"><option value="">All offices</option><optgroup label="United States"><option value="us:*"'+(fdrOffice==='us:*'?' selected':'')+'>USA · all regions ('+usCount('*')+')</option>'+USR.map(function(x){ return '<option value="us:'+esc(x[0])+'"'+(fdrOffice==='us:'+x[0]?' selected':'')+'>'+esc(x[0])+' ('+usCount(x[0])+')</option>'; }).join('')+'</optgroup>'+(function(){ var g='', reg=''; OFF.forEach(function(x){ if(x[0]!==reg){ if(reg) g+='</optgroup>'; reg=x[0]; g+='<optgroup label="'+esc(reg)+'">'; } g+='<option value="'+esc(x[1])+'"'+(fdrOffice===x[1]?' selected':'')+'>'+esc(x[1])+' ('+offCount(x[1])+')</option>'; }); return g+(reg?'</optgroup>':''); })()+'</select>';
    h+='<div class="ilist">'; rows.forEach(function(r,i){ h+=frow(r,i); }); h+='</div>';
    h+='<p class="ifoot">Draw is rated on round size and lead, valuation, named customers and government contracts, and press. Nothing has gone to a founder.</p>';
    var root=document.getElementById('fdr-body'); root.innerHTML=h;
    root.querySelector('#fdr-off').addEventListener('change',function(e){ fdrOffice=e.target.value; renderFdr(); });
    root.querySelector('#fdr-q').addEventListener('input',function(e){ fdrQ=e.target.value; renderFdr(); });
  }
  renderFdr();
