/* Review mode for the Frontier Tech Summit site.
   Loaded only on /frontier-tech-summit/review/. Adds a bar with
   Live · Dan's Version · Compare, click-to-edit text, pinned comments. */
(function(){
  var API='/api/summit-review';
  var q=new URLSearchParams(location.search);
  var TOKEN=q.get('t')||sessionStorage.getItem('rv_t')||'';
  if(!TOKEN){document.body.insertAdjacentHTML('beforeend','<div class="rvx-gate"><div><h2>Review link needed</h2><p>Open this page from the link you were sent.</p></div></div>');return}
  sessionStorage.setItem('rv_t',TOKEN);
  var EMBED=q.get('embed')==='1';
  var MODE='live';
  var ME='';var ROWS=[];var EDITS={};var ORIG={};var PINS=[];
  var SEL='h1,h2,h3,h4,p,li,.eyebrow,.seg-tag,.k,.bk,.bv,.fk,.fsub,.lede,.tag,.gmeta span,.btn,.see,.ag-sub,.d,.fmt-when,.fmt-what,.w-tags span,.sxd-pane p,.sxd-pane h3';
  var SKIP='.rvx-bar,.rvx-panel,.rvx-pin,.rvx-box,.rvx-help,footer,.nav-links,.brand,.rvx-tag';

  function E(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function modalOpen(){var m=document.getElementById('fmodal');return m&&m.classList.contains('open')}
  function modalPid(){var n=document.getElementById('fmName');return 'modal:'+((n&&n.textContent.trim())||'Frontier')}
  function container(){if(modalOpen())return document.querySelector('#fmodal .box');return document.querySelector('.page.active')}
  function pageId(){if(modalOpen())return modalPid();var p=document.querySelector('.page.active');return p?p.id:'page-home'}
  function pageName(id){if(id&&id.indexOf('modal:')===0)return 'Frontier pop-up · '+id.slice(6);return{ 'page-home':'Home','page-attend':'Who Attends','page-frontiers':'Frontiers','page-program':'Program','page-boulder':'Boulder','page-partners':'Partners','modal':'Frontier Pop-up'}[id]||id}
  function api(method,body){var o={method:method,headers:{'Content-Type':'application/json'}};var u=API+'?t='+encodeURIComponent(TOKEN);if(body){body.t=TOKEN;o.body=JSON.stringify(body)}return fetch(u,o).then(function(r){if(!r.ok)throw new Error('api '+r.status);return r.json()})}
  function toast(m){var t=document.querySelector('.rvx-toast');if(!t){t=E('div','rvx-toast');document.body.appendChild(t)}t.textContent=m;t.classList.add('on');clearTimeout(t._h);t._h=setTimeout(function(){t.classList.remove('on')},1800)}

  /* ---- stable keys for every text block ---- */
  function keyAll(){
    var pages=[].slice.call(document.querySelectorAll('.page'));pages.push(document.getElementById('fmodal'));
    pages.forEach(function(pg){if(!pg)return;var pid=pg.id==='fmodal'?'modal':pg.id;var counts={};
      [].slice.call(pg.querySelectorAll(SEL)).forEach(function(el){
        if(el.closest(SKIP))return;if(el.querySelector(SEL)&&el.tagName!=='LI'&&!el.matches('h1,h2,h3,h4,p,.btn,.see'))return;
        if(el.hasAttribute('data-rvk'))return;
        var tag=el.tagName.toLowerCase();counts[tag]=(counts[tag]||0)+1;
        var k=pid+'/'+tag+'#'+counts[tag];el.setAttribute('data-rvk',k);el.setAttribute('data-rvp',pid);ORIG[k]=el.innerHTML;
      });
    });
  }

  /* ---- apply edits ---- */
  function latestEdits(){var m={};ROWS.forEach(function(r){if(r.kind==='edit'&&r.key)m[r.key]=r});return m}
  function applyMode(){
    EDITS=latestEdits();
    document.documentElement.setAttribute('data-rvmode',MODE);
    [].slice.call(document.querySelectorAll('[data-rvk]')).forEach(function(el){var k=el.getAttribute('data-rvk');var e=EDITS[k];
      var tag=el.querySelector(':scope > .rvx-tag');if(tag)tag.remove();
      if(MODE==='dan'&&e&&e.body!=null&&e.body!==ORIG[k]){el.innerHTML=e.body;el.classList.add('rvx-edited');var tg=E('span','rvx-tag','Edited');tg.contentEditable='false';tg._el=el;el.appendChild(tg)}
      else{el.innerHTML=ORIG[k];el.classList.remove('rvx-edited')}
      el.contentEditable=(MODE==='dan'&&!EMBED)?'true':'false';
    });
    document.querySelectorAll('.rvx-bar [data-m]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-m')===MODE)});
  }

  /* ---- editing ---- */
  function wireEditing(){
    var lastPtr=null,lastPtrAt=0;document.addEventListener('pointerdown',function(e){lastPtr=e.target;lastPtrAt=Date.now()},true);
    document.addEventListener('focusin',function(e){var el=e.target.closest&&e.target.closest('[data-rvk]');if(!el||MODE!=='dan')return;if(!(lastPtr&&Date.now()-lastPtrAt<800&&el.contains(lastPtr))){el.blur();return}var tag=el.querySelector(':scope > .rvx-tag');if(tag)tag.remove();el._before=el.innerHTML;el.classList.add('rvx-editing')});
    document.addEventListener('focusout',function(e){var el=e.target.closest&&e.target.closest('[data-rvk]');if(!el||MODE!=='dan')return;el.classList.remove('rvx-editing');
      var html=clean(el.innerHTML);var k=el.getAttribute('data-rvk');var cur=(EDITS[k]&&EDITS[k].body)||ORIG[k];
      if(html===cur||html===el._before){applyOne(el);return}
      api('POST',{kind:'edit',page:el.getAttribute('data-rvp'),key:k,body:html,before:cur.replace(/<[^>]+>/g,'')}).then(function(r){ROWS.push(r.row);toast('Saved');applyOne(el)}).catch(function(){toast('Could not save. Check your connection.')});
    });
    document.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey&&e.target.closest&&e.target.closest('[data-rvk]')&&!e.target.closest('li,p')){e.preventDefault();e.target.blur()}if(e.key==='Escape'&&e.target.closest&&e.target.closest('[data-rvk]')){e.target.innerHTML=e.target._before;e.target.blur()}});
    /* clicks on editable links/buttons shouldn't navigate in Dan mode */
    document.addEventListener('click',function(e){if(MODE!=='dan'||EMBED)return;var el=e.target.closest('[data-rvk]');if(!el||e.target.closest('.rvx-tag'))return;if(el.matches('a,.btn,.see')||el.closest('a,button,.ftile,[data-space-open],.sx-tile,.fr')){e.preventDefault();e.stopPropagation();if(document.activeElement!==el)el.focus()}},true);
    document.addEventListener('mousedown',function(e){if(MODE!=='dan'||EMBED)return;var el=e.target.closest('[data-rvk]');if(el&&el.closest('a,button,.ftile,[data-space-open],.sx-tile,.fr'))e.stopPropagation()},true);
    document.addEventListener('mousedown',function(e){if(e.target.closest&&e.target.closest('.rvx-tag')){e.preventDefault();e.stopPropagation()}},true);
    document.addEventListener('click',function(e){var r=e.target.closest('.rvx-tag');if(!r)return;e.preventDefault();e.stopPropagation();var el=r._el||r.parentElement;if(!el)return;var k=el.getAttribute('data-rvk');if(!confirm('Put this back to the live wording?'))return;api('POST',{kind:'edit',page:el.getAttribute('data-rvp'),key:k,body:ORIG[k],before:''}).then(function(x){ROWS.push(x.row);applyOne(el);toast('Restored')})});
  }
  function applyOne(el){EDITS=latestEdits();var k=el.getAttribute('data-rvk');var e=EDITS[k];var tag=el.querySelector(':scope > .rvx-tag');if(tag)tag.remove();if(e&&e.body!==ORIG[k]){el.innerHTML=e.body;el.classList.add('rvx-edited');var tg=E('span','rvx-tag','Edited');tg.contentEditable='false';tg._el=el;el.appendChild(tg)}else{el.innerHTML=ORIG[k];el.classList.remove('rvx-edited')}}
  function clean(h){var d=E('div');d.innerHTML=h;d.querySelectorAll('.rvx-tag,script,style').forEach(function(x){x.remove()});d.querySelectorAll('*').forEach(function(x){[].slice.call(x.attributes).forEach(function(a){if(/^on/i.test(a.name)||a.name==='contenteditable'||a.name==='style')x.removeAttribute(a.name)})});return d.innerHTML.replace(/&nbsp;/g,' ').trim()}

  /* ---- comments ---- */
  var placing=false;
  function comments(){var c=ROWS.filter(function(r){return r.kind==='comment'});var replies={},res={},mv={};ROWS.forEach(function(r){if(r.kind==='reply'&&r.parent){(replies[r.parent]=replies[r.parent]||[]).push(r)}if((r.kind==='resolve'||r.kind==='reopen')&&r.parent)res[r.parent]=r.kind==='resolve';if(r.kind==='move'&&r.parent)mv[r.parent]=r});return c.map(function(x,i){var o=Object.assign({},x);o.n=i+1;o.replies=replies[x.id]||[];o.resolved=!!res[x.id];if(mv[x.id]){o.x=mv[x.id].x;o.y=mv[x.id].y}return o})}
  function renderPins(){document.querySelectorAll('.rvx-pin').forEach(function(p){p.remove()});var pg=container();if(!pg)return;var pid=pageId();if(!modalOpen())pg.style.position='relative';
    comments().forEach(function(c){if(c.page!==pid||c.resolved)return;var p=E('button','rvx-pin','<span></span>');p.style.left=c.x+'%';p.style.top=c.y+'px';p.title=c.author+': '+c.body.slice(0,80);p.setAttribute('data-cid',c.id);pg.appendChild(p);makeDraggable(p,c)});
    var n=comments().filter(function(c){return !c.resolved}).length;var nw=ROWS.filter(function(r){return (r.kind==='comment'||r.kind==='reply')&&isNew(r)}).length;var b=document.querySelector('.rvx-bar .rvx-count');if(b)b.innerHTML=(n?'Comments ('+n+')':'Comments')+(nw?' <i class="rvx-new">'+nw+' new</i>':'')}
  function makeDraggable(p,c){var sx,sy,moved,ox,oy;p.draggable=false;p.addEventListener('dragstart',function(e){e.preventDefault()});p.addEventListener('pointerdown',function(e){if(e.button)return;e.preventDefault();sx=e.clientX;sy=e.clientY;moved=false;ox=parseFloat(p.style.left);oy=parseFloat(p.style.top);p.setPointerCapture(e.pointerId);p.classList.add('drag')});p.addEventListener('pointermove',function(e){if(sx==null)return;var dx=e.clientX-sx,dy=e.clientY-sy;if(!moved&&Math.abs(dx)+Math.abs(dy)<6)return;moved=true;var pg=p.parentElement,r=pg.getBoundingClientRect();p.style.left=Math.max(0,Math.min(100,ox+dx/r.width*100))+'%';p.style.top=Math.max(0,oy+dy)+'px'});function end(e){if(sx==null)return;sx=null;p.classList.remove('drag');if(moved){p._moved=Date.now();var x=parseFloat(p.style.left),y=parseFloat(p.style.top);api('POST',{kind:'move',page:c.page,parent:c.id,x:x,y:y}).then(function(r){ROWS.push(r.row);toast('Pin moved')}).catch(function(){toast('Could not move pin')})}}p.addEventListener('pointerup',end);p.addEventListener('pointercancel',end)}
  function startPlace(){placing=!placing;document.documentElement.classList.toggle('rvx-placing',placing);document.querySelector('.rvx-bar .rvx-add').classList.toggle('on',placing);if(placing)toast('Click the spot you want to comment on')}
  function placeAt(e){var pg=container();if(!pg)return;if(modalOpen()&&!e.target.closest('#fmodal .box')){toast('Click inside the pop-up, or close it first');return}var r=pg.getBoundingClientRect();var x=((e.clientX-r.left)/r.width)*100;var y=e.clientY-r.top;placing=false;document.documentElement.classList.remove('rvx-placing');document.querySelector('.rvx-bar .rvx-add').classList.remove('on');openBox(pg,x,y,null)}
  function openBox(pg,x,y,cid){closeBox();var box=E('div','rvx-box');var c=cid?comments().filter(function(z){return z.id===cid})[0]:null;
    if(c){box.innerHTML='<div class="rvx-th"><b>'+esc(c.author)+'</b><span>'+when(c.created_at)+'</span><button class="rvx-x" aria-label="Close">×</button></div><p class="rvx-body">'+esc(c.body)+'</p>'+c.replies.map(function(r){return '<div class="rvx-reply"><b>'+esc(r.author)+'</b> <span>'+when(r.created_at)+'</span><p>'+esc(r.body)+'</p></div>'}).join('')+'<textarea placeholder="Reply…"></textarea><div class="rvx-acts"><button class="rvx-post">Reply</button>'+(ME==='Bre'?'<button class="rvx-res">'+(c.resolved?'Reopen':'Resolve')+'</button>':'')+'</div>'}
    else{box.innerHTML='<div class="rvx-th"><b>New comment</b><button class="rvx-x" aria-label="Close">×</button></div><textarea placeholder="Type your comment, then press Enter" autofocus></textarea><div class="rvx-acts"><button class="rvx-post">Post Comment</button><button class="rvx-cancel">Cancel</button></div>'}
    box.style.left=Math.min(x,70)+'%';box.style.top=(y+18)+'px';pg.appendChild(box);var ta=box.querySelector('textarea');setTimeout(function(){ta&&ta.focus()},50);
    box.querySelector('.rvx-x').onclick=closeBox;ta.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();box.querySelector('.rvx-post').click()}});var cn=box.querySelector('.rvx-cancel');if(cn)cn.onclick=closeBox;
    box.querySelector('.rvx-post').onclick=function(){var v=ta.value.trim();if(!v)return;var body=c?{kind:'reply',page:c.page,parent:c.id,body:v}:{kind:'comment',page:pageId(),x:x,y:y,body:v};api('POST',body).then(function(r){ROWS.push(r.row);closeBox();renderPins();renderPanel();toast(c?'Reply posted':'Comment posted')}).catch(function(){toast('Could not post. Try again.')})};
    var rs=box.querySelector('.rvx-res');if(rs)rs.onclick=function(){api('POST',{kind:c.resolved?'reopen':'resolve',page:c.page,parent:c.id}).then(function(r){ROWS.push(r.row);closeBox();renderPins();renderPanel()})};
  }
  function closeBox(){document.querySelectorAll('.rvx-box').forEach(function(b){b.remove()})}
  function when(s){var d=new Date(s);return d.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' '+d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}
  function isNew(r){var seen=localStorage.getItem('rv_seen_'+ME);return r.author!==ME&&(!seen||r.created_at>seen)}
  function renderEdits(pn){var m={};ROWS.forEach(function(r){if(r.kind==='edit'&&r.key)m[r.key]=r});var items=Object.keys(m).map(function(k){return m[k]}).filter(function(r){return r.body!==ORIG[r.key]}).sort(function(a,b){return a.created_at<b.created_at?1:-1});pn.querySelector('.rvx-elist').innerHTML=items.length?items.map(function(r){var before=(ORIG[r.key]||'').replace(/<[^>]+>/g,'');var after=(r.body||'').replace(/<[^>]+>/g,'');return '<div class="rvx-it rvx-ed'+(isNew(r)?' new':'')+'" data-page="'+r.page+'" data-key="'+r.key+'"><span class="rvx-n">✎</span><div><div class="rvx-meta"><b>'+esc(r.author)+'</b> · '+esc(pageName(r.page))+' · '+when(r.created_at)+(isNew(r)?' · <em>New</em>':'')+'</div><p class="rvx-before">'+esc(before)+'</p><p class="rvx-after">'+esc(after)+'</p></div></div>'}).join(''):'<p class="rvx-empty">No text changes yet. In <b>Dan\'s Version</b>, click any text and type.</p>'}
  function renderPanel(){var pn=document.querySelector('.rvx-panel');if(!pn)return;renderEdits(pn);var list=comments();var open=list.filter(function(c){return !c.resolved}),done=list.filter(function(c){return c.resolved});
    function item(c){var nw=isNew(c)||c.replies.some(isNew);return '<div class="rvx-it'+(c.resolved?' done':'')+(nw?' new':'')+'" data-cid="'+c.id+'" data-page="'+c.page+'"><span class="rvx-n">'+c.n+'</span><div><div class="rvx-meta"><b>'+esc(c.author)+'</b> · '+esc(pageName(c.page))+' · '+when(c.created_at)+(nw?' · <em>New</em>':'')+'</div><p>'+esc(c.body)+'</p>'+(c.replies.length?'<div class="rvx-rc">'+c.replies.length+' repl'+(c.replies.length>1?'ies':'y')+'</div>':'')+'</div></div>'}
    pn.querySelector('.rvx-list').innerHTML=(open.length?open.map(item).join(''):'<p class="rvx-empty">No open comments yet. Click <b>+ Comment</b>, then click anywhere on the page.</p>')+(done.length?'<h4>Resolved</h4>'+done.map(item).join(''):'')}

  /* ---- compare ---- */
  function compare(){var base=location.pathname+'?t='+encodeURIComponent(TOKEN)+'&embed=1&mode=';var h=location.hash||'#home';
    var w=E('div','rvx-cmp','<div><span>Live</span><iframe src="'+base+'live'+h+'"></iframe></div><div><span>Dan\'s Version</span><iframe src="'+base+'dan'+h+'"></iframe></div>');document.body.appendChild(w);document.documentElement.classList.add('rvx-cmpon');
    var fr=w.querySelectorAll('iframe');var lock=false;function sync(a,b){try{a.contentWindow.addEventListener('scroll',function(){if(lock)return;lock=true;b.contentWindow.scrollTo(0,a.contentWindow.scrollY);setTimeout(function(){lock=false},30)})}catch(e){}}
    fr[0].onload=function(){sync(fr[0],fr[1])};fr[1].onload=function(){sync(fr[1],fr[0])};
    window.addEventListener('hashchange',function(){fr.forEach(function(f){try{f.contentWindow.location.hash=location.hash}catch(e){}})});
  }
  function uncompare(){var w=document.querySelector('.rvx-cmp');if(w)w.remove();document.documentElement.classList.remove('rvx-cmpon')}

  /* ---- bar, panel, help ---- */
  function build(){
    if(EMBED){document.documentElement.classList.add('rvx-embed');return}
    var bar=E('div','rvx-bar','<div class="rvx-l"><span class="rvx-brand">Site Review</span><span class="rvx-hint">Click <b>+ Comment</b>, then click anywhere on the page</span></div><div class="rvx-r"><button class="rvx-add">+ Comment</button><button class="rvx-count">Comments</button><button class="rvx-helpb" title="How this works">?</button></div>');
    document.body.appendChild(bar);
    bar.querySelectorAll('[data-m]').forEach(function(b){b.onclick=function(){setMode(b.getAttribute('data-m'))}});
    bar.querySelector('.rvx-add').onclick=function(){startPlace()};
    bar.querySelector('.rvx-count').onclick=function(){var p=document.querySelector('.rvx-panel');p.classList.toggle('on');if(p.classList.contains('on')){localStorage.setItem('rv_seen_'+ME,new Date().toISOString());renderPanel()}};
    bar.querySelector('.rvx-helpb').onclick=showHelp;
    var pn=E('div','rvx-panel','<div class="rvx-ph"><b>Comments</b><button class="rvx-x" aria-label="Close">×</button></div><div class="rvx-list"></div><div class="rvx-list rvx-elist" hidden></div>');document.body.appendChild(pn);pn.querySelectorAll('[data-pt]').forEach(function(b){b.onclick=function(){pn.querySelectorAll('[data-pt]').forEach(function(x){x.classList.toggle('on',x===b)});pn.querySelector('.rvx-list:not(.rvx-elist)').hidden=b.getAttribute('data-pt')!=='c';pn.querySelector('.rvx-elist').hidden=b.getAttribute('data-pt')!=='e'}});
    pn.querySelector('.rvx-x').onclick=function(){pn.classList.remove('on')};
    pn.addEventListener('click',function(e){var it=e.target.closest('.rvx-it');if(!it)return;var pg=it.getAttribute('data-page');if(pg.indexOf('modal:')===0){var name=pg.slice(6);if(location.hash!=='#frontiers')location.hash='#frontiers';setTimeout(function(){var tile=[].slice.call(document.querySelectorAll('.ftile')).filter(function(t){return t.querySelector('h3').textContent.trim()===name})[0];if(tile)tile.click();setTimeout(function(){renderPins();var c=comments().filter(function(z){return z.id===it.getAttribute('data-cid')})[0];if(c)openBox(container(),c.x,c.y,c.id)},700)},350);return}if(it.classList.contains('rvx-ed')){var hash2='#'+pg.replace('page-','');if(pg==='modal')return;if(location.hash!==hash2)location.hash=hash2;setTimeout(function(){var el=document.querySelector('[data-rvk="'+it.getAttribute('data-key')+'"]');if(el){var top=el.getBoundingClientRect().top+window.scrollY-200;if(window.__lenis)window.__lenis.scrollTo(top,{immediate:true});else window.scrollTo(0,top);el.classList.add('rvx-flash');setTimeout(function(){el.classList.remove('rvx-flash')},1600)}},300);return}var hash='#'+pg.replace('page-','');if(location.hash!==hash){location.hash=hash}setTimeout(function(){var pin=document.querySelector('.rvx-pin[data-cid="'+it.getAttribute('data-cid')+'"]');var c=comments().filter(function(z){return z.id===it.getAttribute('data-cid')})[0];var p=document.querySelector('.page.active');if(c&&p){var top=p.getBoundingClientRect().top+window.scrollY+c.y-160;if(window.__lenis)window.__lenis.scrollTo(top,{immediate:true});else window.scrollTo(0,top);openBox(p,c.x,c.y,c.id)}},300)});
    document.addEventListener('click',function(e){if(placing&&!e.target.closest('.rvx-bar,.rvx-panel,.rvx-box,.rvx-pin')){e.preventDefault();e.stopPropagation();placeAt(e);return}var pin=e.target.closest('.rvx-pin');if(pin){e.preventDefault();if(pin._moved&&Date.now()-pin._moved<400)return;var c=comments().filter(function(z){return z.id===pin.getAttribute('data-cid')})[0];if(c)openBox(container(),c.x,c.y,c.id)}},true);
    if(!localStorage.getItem('rv_help'))showHelp();
  }
  function setMode(m){uncompare();MODE=m;localStorage.setItem('rv_mode',m);if(m==='dan'){document.documentElement.classList.add('rvx-pulse');setTimeout(function(){document.documentElement.classList.remove('rvx-pulse')},2200);toast('Click any text to change it')}if(m==='cmp'){document.querySelectorAll('.rvx-bar [data-m]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-m')==='cmp')});compare();return}applyMode();renderPins()}
  function showHelp(){localStorage.setItem('rv_help','1');var h=E('div','rvx-help','<div class="rvx-hc"><button class="rvx-x" aria-label="Close">×</button><p class="rvx-hk">Frontier Tech Summit · Site Review</p><h2>How this works</h2><ol><li>Click <b>+ Comment</b> at the top.</li><li>Click the spot on the page you want to talk about.</li><li>Type your note and press <b>Enter</b>. A pin stays there. Drag a pin if it's covering something.</li></ol><p class="rvx-hf">Use the menu to move between pages and comment anywhere. <b>Comments</b> at the top lists everything you\'ve written. Nothing here changes the public site; Breanna collects your comments from here.</p><button class="rvx-go">Got it</button></div>');document.body.appendChild(h);h.querySelector('.rvx-x').onclick=h.querySelector('.rvx-go').onclick=function(){h.remove()}}

  /* ---- boot ---- */
  function boot(){keyAll();build();api('GET').then(function(d){ME=d.me;ROWS=d.rows||[];document.documentElement.setAttribute('data-rvme',ME);if(ME==='Bre'){var b=document.querySelector('.rvx-bar [data-m="dan"]');if(b)b.textContent="Dan's Version"}applyMode();renderPins();renderPanel();var fm=document.getElementById('fmodal');if(fm){new MutationObserver(function(){closeBox();setTimeout(renderPins,80)}).observe(fm,{attributes:true,attributeFilter:['class']});var nm=document.getElementById('fmName');if(nm)new MutationObserver(function(){closeBox();setTimeout(renderPins,80)}).observe(nm,{childList:true,characterData:true,subtree:true})}window.addEventListener('hashchange',function(){setTimeout(function(){closeBox();renderPins();if(!EMBED&&MODE!=='cmp'){var m=document.getElementById('fmodal');}},80)});setInterval(function(){api('GET').then(function(d){if(d.rows&&d.rows.length!==ROWS.length){ROWS=d.rows;if(MODE!=='cmp'){applyMode();renderPins()}renderPanel()}}).catch(function(){})},20000)}).catch(function(e){document.body.insertAdjacentHTML('beforeend','<div class="rvx-gate"><div><h2>This review link isn\'t working</h2><p>Ask Breanna for a fresh link.</p></div></div>')})}
  if(document.readyState==='complete')setTimeout(boot,300);else window.addEventListener('load',function(){setTimeout(boot,300)});
})();
