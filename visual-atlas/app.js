(() => {
'use strict';
const catalogue=window.REFERENCES;let refs=[];
const categories={all:['全部','ALL DESIGN'],motion:['UI 与动效','UI & MOTION'],product:['产品界面','PRODUCT INTERFACES'],graphic:['平面与品牌','GRAPHIC & IDENTITY']};
const $=s=>document.querySelector(s), hasMotion=r=>Boolean(r.clips?.length||r.video||r.embed||r.interactive);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
document.querySelectorAll('[data-total-count]').forEach(el=>el.textContent=refs.length);
// Retain favorite IDs from earlier editions without displaying removed references.
let received=new Map();
let saved=new Set();try{const x=JSON.parse(localStorage.getItem('other-intelligence-saved')||'[]');if(Array.isArray(x))saved=new Set(x.filter(id=>typeof id==='string'));}catch{}
let filter='all',favorites=false,motionOnly=false,query='',active=null,visible=refs,navIds=[],toastTimer,feedbackStore;
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2800);}
function syncSaved(){syncReceived();$('#collectionTop').setAttribute('aria-pressed',favorites);document.querySelectorAll('.saved-count').forEach(el=>el.textContent=received.size);document.querySelectorAll('[data-save]').forEach(el=>{const yes=saved.has(el.dataset.save);el.setAttribute('aria-pressed',yes);el.textContent=yes?'♥':'♡';el.setAttribute('aria-label',(yes?'取消收藏 ':'收藏 ')+refs.find(r=>r.id===el.dataset.save).title);});if(active){const yes=saved.has(active.id);$('#detailSave').setAttribute('aria-pressed',yes);$('#detailSave').textContent=yes?'♥ 已收藏':'♡ 收藏';}}
function toggleSave(id){feedbackStore.set(id,!saved.has(id));}
function reasonFor(r){if(r.submitted)return (saved.has(r.id)?'♥ 你的选择 · ':'收集的参考 · ')+(r.platform||'X');if(saved.has(r.id))return '♥ 已收藏';const matches=catalogue.filter(x=>saved.has(x.id)&&((r.similarTo||[]).includes(x.id)||(x.similarTo||[]).some(id=>(r.similarTo||[]).includes(id))));return matches.length?'因为你喜欢 '+matches[0].title:'新增参考 · 待你选择';}
function updateCollection(){
 refs=curateReferences(catalogue,saved);
 document.querySelectorAll('[data-total-count]').forEach(el=>el.textContent=refs.length);
 
}
const inlineCards=new Set(),inlineCarousels=new Map();
function stopPreview(el){
 if(!inlineCards.delete(el))return;
 inlineCarousels.get(el)?.destroy();inlineCarousels.delete(el);
 el.querySelectorAll('video').forEach(v=>{v.pause();v.removeAttribute('src');v.load();});
 el.querySelector('.inline-mount')?.remove();
 el.querySelector('.inline-toolbar')?.remove();
 el.classList.remove('is-playing');
 const b=el.querySelector('[data-play]');if(b)b.setAttribute('aria-expanded','false');
}
function stopPreviews(){for(const el of inlineCards)stopPreview(el);}
function startPreviews(){for(const r of visible)if(hasMotion(r)||r.submitted||r.images.length>1)playInline(r.id);}
function configureVideo(v){v.controls=true;v.autoplay=true;v.playsInline=true;v.defaultMuted=true;v.muted=true;v.loop=true;v.preload='auto';}
function autoplayEmbed(src){
 const u=new URL(src);
 for(const [key,value] of Object.entries({autoplay:'1',muted:'1',loop:'1',autopause:'0',background:'0',controls:'1',dnt:'1'}))u.searchParams.set(key,value);
 return u.href;
}
function playInline(id,clipIndex=0){
 const r=refs.find(x=>x.id===id),card=document.querySelector('.card[data-id="'+id+'"]');
 if(!r||!card)return;
 const el=card.querySelector('.card-media');stopPreview(el);inlineCards.add(el);
 el.classList.add('is-playing');el.querySelector('[data-play]')?.setAttribute('aria-expanded','true');
 const mount=document.createElement('div');mount.className='inline-mount';
 const toolbar=document.createElement('div');toolbar.className='inline-toolbar';
 const stop=document.createElement('button');stop.type='button';stop.className='inline-stop';stop.textContent='✕';stop.setAttribute('aria-label','关闭 '+r.title+' 的卡片预览');stop.addEventListener('click',()=>stopPreview(el));toolbar.append(stop);
 const options=r.submitted
  ?[...(r.clips||[]).map((c,i)=>({kind:'clip',index:i,label:c.label})),...r.images.map((img,i)=>({kind:'image',index:i,label:img.label||'图像 '+(i+1),poster:img.poster})).filter(x=>!x.poster)]
  :!hasMotion(r)?r.images.map((_,i)=>({kind:'image',index:i,label:'图像 '+(i+1)})):(r.clips||[]).map((c,i)=>({kind:'clip',index:i,label:c.label}));
 const selected=options[clipIndex]||options[0];
 if(options.length>1){
  const select=document.createElement('select');select.setAttribute('aria-label',r.title+' 媒体切换');
  options.forEach((item,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=item.label;option.selected=i===clipIndex;select.append(option);});
  select.addEventListener('change',()=>playInline(id,Number(select.value)));toolbar.append(select);
 }else{const label=document.createElement('span');label.textContent=r.interactive?'实时交互':selected?.label||(r.embed||r.video?'原作影片':'静态设计 · 放大查看');toolbar.append(label);}
 const note=document.createElement('p');note.className='inline-note';note.setAttribute('role','status');
 const source=document.createElement('a');source.href=r.source;source.target='_blank';source.rel='noopener noreferrer';source.textContent='完整原作 ↗';
 const clip=selected?.kind==='clip'?r.clips[selected.index]:null;
 if(r.interactive){
  const f=document.createElement('iframe');f.className='inline-frame';f.src=r.interactive;f.title=r.title+' 实时交互预览';mount.append(f);
 }else if(selected?.kind!=='image'&&(clip||r.video)){
  const v=document.createElement('video');v.className='inline-video';configureVideo(v);v.src=clip?.local||r.video;v.poster=r.images[0].local;v.setAttribute('aria-label',r.title+' 动态预览');
  note.textContent='正在加载…';v.addEventListener('loadeddata',()=>{note.textContent='';});
  v.addEventListener('error',()=>{note.replaceChildren(document.createTextNode('暂时无法载入 · '),source);});
  mount.append(v);
 }else if(r.embed){
  const f=document.createElement('iframe');f.className='inline-frame';f.src=autoplayEmbed(r.embed);f.title=r.title+' 原作播放器';f.allow='autoplay; fullscreen; picture-in-picture; encrypted-media';f.allowFullscreen=true;f.referrerPolicy='strict-origin-when-cross-origin';mount.append(f);
  note.append(source);
 }else{
  mount.classList.add('still-mount');
  const photos=r.images.map((img,i)=>({...img,index:i})).filter(img=>!img.poster);
  if(photos.length>1){
   const imageIndex=selected?.index??clipIndex;
   const initial=Math.max(0,photos.findIndex(img=>img.index===imageIndex));
   mount.classList.add('carousel-mount');
   const carousel=mountImageCarousel({mount,images:photos,index:initial,title:r.title,onChange:n=>{
    const select=toolbar.querySelector('select');
    if(select)select.value=String(options.findIndex(item=>item.kind==='image'&&item.index===photos[n].index));
   }});inlineCarousels.set(el,carousel);
   const zoom=document.createElement('button');zoom.type='button';zoom.className='inline-stop image-zoom';zoom.textContent='放大';zoom.setAttribute('aria-label','放大静态设计');zoom.addEventListener('click',()=>{const select=toolbar.querySelector('select');const item=options[Number(select?.value||0)];openDetail(id);showMedia('image-'+(item?.index??imageIndex));});toolbar.append(zoom);
  }else{
   const img=new Image();img.src=r.images[selected?.index??clipIndex]?.local||r.images[0].local;img.alt=r.title+' 静态设计细节';mount.append(img);
   const zoom=document.createElement('button');zoom.type='button';zoom.className='inline-stop image-zoom';zoom.textContent='放大';zoom.setAttribute('aria-label','放大静态设计');zoom.addEventListener('click',()=>{const enlarged=mount.classList.toggle('enlarged');zoom.textContent=enlarged?'适应':'放大';});toolbar.append(zoom);
  }
 }
 mount.append(note);el.append(mount,toolbar);
 const v=mount.querySelector('video');
 if(v)v.play().catch(()=>{if(mount.parentNode===el&&!v.error)note.textContent='浏览器暂未允许自动播放 · 点击播放继续';});
}
function render(){
stopPreviews();
updateCollection();
document.querySelectorAll('[data-filter]').forEach(b=>{b.setAttribute('aria-pressed',b.dataset.filter===filter);b.querySelector('sup').textContent=String(refs.filter(r=>(b.dataset.filter==='all'||r.category===b.dataset.filter)&&(!motionOnly||hasMotion(r))).length).padStart(2,'0');});
visible=refs.filter(r=>(filter==='all'||r.category===filter)&&(!favorites||received.has(r.id))&&(!motionOnly||hasMotion(r))&&(!query||[r.title,r.studio,r.medium,r.line,r.description,r.fit,...r.tags,categories[r.category][0]].join(' ').toLowerCase().includes(query)));
$('#motionToggle').setAttribute('aria-pressed',motionOnly);$('#empty').hidden=visible.length>0;
$('#gallery').innerHTML=visible.map(r=>`<article class="card" data-id="${r.id}"><div class="card-media"><button class="open-image" data-open="${r.id}" aria-label="查看 ${esc(r.title)}"><img src="${r.images[0].local}" alt="${esc(r.title+' — '+r.line)}" loading="lazy" decoding="async"></button><span class="card-number">${String(refs.indexOf(r)+1).padStart(2,'0')}</span><span class="received-like" data-received="${r.id}" hidden></span><button class="bookmark" data-save="${r.id}" aria-label="收藏 ${esc(r.title)}" aria-pressed="false">♡</button><button class="preview-play" data-play="${r.id}" aria-label="在卡片中预览 ${esc(r.title)}" aria-expanded="false">${r.interactive?'↔':hasMotion(r)?'▷':'⊕'} <span>${r.interactive?'直接交互':hasMotion(r)?'直接播放':'放大查看'}</span></button></div><div class="card-copy"><p class="recommendation" data-reason="${r.id}">${esc(reasonFor(r))}</p><p class="work-kind">${esc(r.medium)}</p><div class="card-title-row"><button class="card-title" data-open="${r.id}">${esc(r.title)}</button>${r.pick?'<span class="pick-dot" title="优先推荐" aria-label="优先推荐"></span>':''}</div><p class="card-studio">${esc(r.studio)}</p><p class="card-line">${esc(r.line)}</p><div class="card-bottom"><span class="card-category">${categories[r.category][0]}</span><div class="card-tags">${r.tags.slice(0,2).map(t=>`<span>${esc(t)}</span>`).join('')}</div></div></article>`).join('');
syncSaved();startPreviews();}
function setFilter(value){filter=value;render();}
function reset(){favorites=false;motionOnly=false;query='';filter='all';$('#search').value='';render();}
function showSaved(){favorites=!favorites;motionOnly=false;query='';$('#search').value='';setFilter('all');$('#archive').scrollIntoView({behavior:'smooth'});}
function clearMedia(){const v=$('#mediaStage video');if(v)v.pause();$('#mediaStage').replaceChildren();}
function showMedia(kind){clearMedia();let note='原作图像预览 · 选择下方按钮切换细节';
if(kind==='interactive'){const f=document.createElement('iframe');f.src=active.interactive;f.title=active.title+' 交互预览';$('#mediaStage').append(f);note='运行原作者开源 Shader · 本页提供配色、速度与指针控制';}
else if(kind.startsWith('image')){const n=Number(kind.split('-')[1]),img=new Image();img.src=active.images[n].local;img.alt=active.title+' — 原作预览 '+(n+1);$('#mediaStage').append(img);if(active.id==='raycast')note='官方产品演示网页截图 · 2026.10.21';}
else if(kind.startsWith('clip')||active.video){const clip=kind.startsWith('clip')?active.clips[Number(kind.split('-')[1])]:null;const v=document.createElement('video');v.src=clip?clip.local:active.video;configureVideo(v);v.poster=active.images[0].local;v.addEventListener('error',()=>{$('#mediaNote').textContent='此段视频暂时无法载入，可通过「访问原作」观看。';});$('#mediaStage').append(v);v.play().catch(()=>{});note=clip?clip.label+' · 原作短片预览 · 静音，可暂停':'原站影片 · 静音播放，可打开声音';}
else if(active.embed){const f=document.createElement('iframe');f.src=autoplayEmbed(active.embed);f.title=active.title+' — 原作影片';f.allow='autoplay; fullscreen; picture-in-picture; encrypted-media';f.allowFullscreen=true;f.referrerPolicy='strict-origin-when-cross-origin';$('#mediaStage').append(f);note='原作播放器 · 需联网；也可通过「访问原作」打开完整案例';}
$('#mediaNote').textContent=note;document.querySelectorAll('[data-media]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.media===kind));}
function openDetail(id,keepNav=false){active=refs.find(r=>r.id===id);if(!active)return;if(!keepNav)navIds=visible.some(r=>r.id===id)?visible.map(r=>r.id):refs.map(r=>r.id);$('#detailIndex').textContent='REFERENCE '+String(refs.indexOf(active)+1).padStart(2,'0')+' / '+refs.length;$('#detailCategory').textContent=categories[active.category][1]+' / '+active.medium;for(const [key,field] of Object.entries({Title:'title',Studio:'studio',Line:'line',Description:'description',Borrow:'borrow',Motion:'motion',Fit:'fit',Credit:'credit'}))$('#detail'+key).textContent=active[field];$('#detailSource').hidden=!active.source;$('#detailSource').href=active.source||'#';$('#detailTags').innerHTML=active.tags.map(t=>`<span>${esc(t)}</span>`).join('');$('#mediaControls').innerHTML=active.images.map((_,i)=>`<button data-media="image-${i}" aria-pressed="false">图像 ${String(i+1).padStart(2,'0')}</button>`).join('')+(active.clips||[]).map((c,i)=>`<button data-media="clip-${i}" aria-pressed="false">▷ ${esc(c.label)}</button>`).join('')+(active.video||active.embed?'<button data-media="video" aria-pressed="false">▷ 原作影片</button>':'')+(active.interactive?'<button data-media="interactive" aria-pressed="false">↔ 实时交互</button>':'');showMedia(active.interactive?'interactive':active.clips?.length?'clip-0':active.video||active.embed?'video':'image-0');syncSaved();if(!$('#detail').open){$('#detail').showModal();document.body.classList.add('modal-open');}$('#detail').scrollTop=0;history.replaceState(null,'','#work='+id);}
function closeDetail(){clearMedia();$('#detail').close();document.body.classList.remove('modal-open');active=null;history.replaceState(null,'',location.pathname+'#archive');}
function moveDetail(step){if(active){const n=navIds.indexOf(active.id);openDetail(navIds[(n+step+navIds.length)%navIds.length],true);}}
document.addEventListener('click',e=>{const save=e.target.closest('[data-save]');if(save){toggleSave(save.dataset.save);return;}const play=e.target.closest('[data-play]');if(play){playInline(play.dataset.play);return;}const open=e.target.closest('[data-open]');if(open){openDetail(open.dataset.open);return;}const f=e.target.closest('[data-filter]');if(f){setFilter(f.dataset.filter);return;}const m=e.target.closest('[data-media]');if(m)showMedia(m.dataset.media);});
$('#search').addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();render();});$('#motionToggle').addEventListener('click',()=>{motionOnly=!motionOnly;render();});$('#collectionTop').addEventListener('click',showSaved);$('#reset').addEventListener('click',reset);$('#detailSave').addEventListener('click',()=>toggleSave(active.id));$('#closeDetail').addEventListener('click',closeDetail);$('#prevWork').addEventListener('click',()=>moveDetail(-1));$('#nextWork').addEventListener('click',()=>moveDetail(1));$('#detail').addEventListener('cancel',e=>{e.preventDefault();closeDetail();});$('#detail').addEventListener('click',e=>{if(e.target===$('#detail')){const b=$('#detail').getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)closeDetail();}});document.addEventListener('keydown',e=>{if(!$('#detail').open||e.target.closest('video,iframe'))return;if(e.key==='ArrowRight')moveDetail(1);if(e.key==='ArrowLeft')moveDetail(-1);});
let feedbackStorage;try{feedbackStorage=window.localStorage;}catch{}
feedbackStore=new FeedbackStore({storage:feedbackStorage,onStatus:status=>{const el=document.querySelector('#feedbackSync');el.textContent=status.state==='offline'?'点赞待同步':status.state==='saving'?'保存中…':'点赞已同步';if(status.state==='saved')refreshReceived();el.title=status.state==='offline'?'点赞已暂存在此浏览器，连接恢复后重试':'你的点赞匿名保存，可随时取消';},onChange:next=>{
 const changed=next.size!==saved.size||[...next].some(id=>!saved.has(id));saved=next;
 const selected=curateReferences(catalogue,saved),membershipChanged=selected.length!==refs.length||selected.some(r=>!refs.some(x=>x.id===r.id));
 if(changed&&(favorites||membershipChanged)){if(active&&!selected.some(r=>r.id===active.id))closeDetail();render();}else{syncSaved();document.querySelectorAll('[data-reason]').forEach(el=>{el.textContent=reasonFor(catalogue.find(r=>r.id===el.dataset.reason));});}
}});
saved=new Set(feedbackStore.saved);
window.addEventListener('online',()=>feedbackStore.sync());
window.addEventListener('focus',()=>feedbackStore.sync());
window.addEventListener('storage',event=>{if(event.key==='other-intelligence-feedback-outbox-v1'&&feedbackStore.pending().length)feedbackStore.sync();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)feedbackStore.sync();});
render();feedbackStore.sync();const requested=location.hash.match(/^#work=([a-z0-9-]+)$/);if(requested&&refs.some(r=>r.id===requested[1]))openDetail(requested[1]);
// Public aggregate counts are separate from this browser's own vote state.
function syncReceived(){
 document.querySelectorAll('.saved-count').forEach(el=>el.textContent=received.size);
 document.querySelectorAll('[data-received]').forEach(el=>{
  const count=received.get(el.dataset.received)||0;el.hidden=count===0;el.textContent='♥ '+count;el.title='收到 '+count+' 个赞';
 });
}
let receivedBusy=false;
async function refreshReceived(){
 if(receivedBusy)return;receivedBusy=true;
 try{
  const response=await fetch('https://visual-atlas-055592.laijianxun123.workers.dev/visual-atlas/api/likes',{cache:'no-store',credentials:'omit'});
  if(!response.ok)throw Error('Unable to read likes');
  const data=await response.json();if(!Array.isArray(data.items))throw Error('Invalid likes');
  const next=new Map(data.items.filter(r=>catalogue.some(c=>c.id===r.id)&&Number.isInteger(r.likes)&&r.likes>0).map(r=>[r.id,r.likes]));
  const membershipChanged=next.size!==received.size||[...next.keys()].some(id=>!received.has(id));received=next;
  if(favorites&&membershipChanged)render();else syncReceived();
  $('#collectionTop').title='收到的点赞 · 自动更新';
 }catch{$('#collectionTop').title='点赞数据暂时无法更新，稍后自动重试';}
 finally{receivedBusy=false;}
}
refreshReceived();
setInterval(()=>{if(!document.hidden)refreshReceived();},30000);
window.addEventListener('focus',refreshReceived);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshReceived();});

})();