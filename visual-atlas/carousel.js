/* A separate clock per card; closing or filtering a card disposes its timer. */
(() => {
'use strict';
function createCarouselClock({count,index=0,onChange,delay=2450,setTimer=setTimeout,clearTimer=clearTimeout}){
 let timer=null,paused=false,destroyed=false;
 const normalize=n=>(n%count+count)%count;
 function clear(){if(timer!==null)clearTimer(timer);timer=null;}
 function schedule(){clear();if(!destroyed&&!paused&&count>1)timer=setTimer(()=>go(index+1),delay);}
 function go(next){if(destroyed)return;const previous=index;index=normalize(next);onChange(index,previous);schedule();}
 schedule();
 return {go,next:()=>go(index+1),previous:()=>go(index-1),pause(value=true){paused=value;schedule();},destroy(){destroyed=true;clear();},get index(){return index;}};
}
function mountImageCarousel({mount,images,index=0,title,onChange}){
 const viewport=document.createElement('div');viewport.className='carousel-viewport';
 const track=document.createElement('div');track.className='carousel-track';
 const controls=document.createElement('div');controls.className='carousel-controls';
 const counter=document.createElement('span');
 let clock,paused=false,destroyed=false,resetTimer=null;
 const slides=[images[images.length-1],...images,images[0]];
 for(const [i,item] of slides.entries()){
  const slide=document.createElement('div');slide.className='carousel-slide';
  const img=new Image();img.src=item.local;img.alt=title+' · '+(item.label||'图像');img.draggable=false;slide.append(img);
  if(i===0||i===slides.length-1)slide.setAttribute('aria-hidden','true');track.append(slide);
 }
 function position(n,animate){track.style.transition=animate?'':'none';track.style.transform=`translateX(-${(n+1)*100}%)`;}
 function update(n,previous){
  clearTimeout(resetTimer);position(n,false);
  // Use the two duplicate edge slides to keep the wrap moving by just one frame.
  if(previous!==undefined){
   position(previous,false);void track.offsetWidth;
   const visual=previous===images.length-1&&n===0?images.length:previous===0&&n===images.length-1?-1:n;
   position(visual,true);resetTimer=setTimeout(()=>{if(!destroyed)position(n,false);},550);
  }
  counter.textContent=`${n+1} / ${images.length}`;
  [...track.children].forEach((slide,i)=>slide.setAttribute('aria-hidden',i!==n+1));
  onChange?.(n);
 }
 function button(text,label,action){const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',title+' · '+label);b.addEventListener('click',action);return b;}
 const previous=button('←','上一张',()=>clock.previous());
 const next=button('→','下一张',()=>clock.next());
 const pause=button('Ⅱ','暂停轮播',()=>{paused=!paused;pause.textContent=paused?'▶':'Ⅱ';pause.setAttribute('aria-label',title+' · '+(paused?'继续轮播':'暂停轮播'));pause.setAttribute('aria-pressed',String(paused));clock.pause(paused||document.hidden);});pause.setAttribute('aria-pressed','false');
 controls.append(previous,counter,next,pause);viewport.append(track);mount.append(viewport,controls);
 update(index);
 clock=createCarouselClock({count:images.length,index,onChange:update});
 const visibility=()=>clock.pause(paused||document.hidden);
 document.addEventListener('visibilitychange',visibility);visibility();
 return {destroy(){destroyed=true;clock.destroy();clearTimeout(resetTimer);document.removeEventListener('visibilitychange',visibility);}};
}
globalThis.createCarouselClock=createCarouselClock;
globalThis.mountImageCarousel=mountImageCarousel;
})();
