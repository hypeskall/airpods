const motionFallbacks=new WeakMap();
export function disableProductCarouselMotion(root){motionFallbacks.get(root)?.();}

// Keep the visitor's latest choice while the current transition completes.
export function createSlideNavigator(count, initial, transition) {
 let current=initial,desired=initial,direction=1,running=false;
 const wrap=index=>((index%count)+count)%count;
 const advance=async()=>{
  if(running)return;
  running=true;
  try{
   while(current!==desired){
    const next=desired,from=current,travel=direction;
    await transition(from,next,travel);
    current=next;
   }
  }finally{running=false;}
 };
 return {
  select(index,travel){const next=wrap(index);direction=travel??(next>=desired?1:-1);desired=next;return advance();},
  step(delta){return this.select(desired+delta,delta>0?1:-1);},
  get current(){return current;},get desired(){return desired;},get running(){return running;},
 };
}

export function initProductCarousel(root,gsap){
 if(!root||root.dataset.carouselReady)return;
 const slides=[...root.querySelectorAll('.story-slide')],buttons=[...root.querySelectorAll('[data-story-select]')];
 if(slides.length<2)return;
 root.dataset.carouselReady='true';
 const status=root.querySelector('.story-status');let activeFinish;
 motionFallbacks.set(root,()=>{gsap=null;activeFinish?.();});
 const activate=index=>{
  buttons.forEach((button,i)=>{button.classList.toggle('is-active',i===index);button.setAttribute('aria-pressed',String(i===index));});
  root.dataset.storyModel=slides[index].dataset.storyModel;
 };
 const navigator=createSlideNavigator(slides.length,0,(from,to,direction)=>new Promise(resolve=>{
  const outgoing=slides[from],incoming=slides[to];let finished=false;
  const finish=()=>{
   if(finished)return;finished=true;activeFinish=undefined;
   outgoing.hidden=true;outgoing.inert=true;
   incoming.hidden=false;incoming.inert=false;
   const nodes=[outgoing,incoming,...outgoing.querySelectorAll('.story-copy,.story-image-motion'),...incoming.querySelectorAll('.story-copy,.story-image-motion')];
   try{gsap?.set(nodes,{clearProps:'transform,opacity,visibility'});}catch{}
   nodes.forEach(node=>['transform','opacity','visibility'].forEach(property=>node.style.removeProperty(property)));
   status.textContent=`${incoming.dataset.storyName}, modelul ${to+1} din ${slides.length}.`;
   resolve();
  };
  activeFinish=finish;
  if(outgoing.contains(document.activeElement))buttons[to].focus({preventScroll:true});
  outgoing.inert=true;incoming.hidden=false;incoming.inert=false;
  activate(to);
  try{
   if(!gsap){finish();return;}
   const outgoingCopy=outgoing.querySelector('.story-copy'),incomingCopy=incoming.querySelector('.story-copy');
   const outgoingImage=outgoing.querySelector('.story-image-motion'),incomingImage=incoming.querySelector('.story-image-motion');
   gsap.set(incoming,{opacity:1,visibility:'visible'});
   const timeline=gsap.timeline({onComplete:finish,onInterrupt:finish});
   timeline.to(outgoing,{opacity:0,duration:.35,ease:'power2.out'},0)
    .to(outgoingCopy,{x:-45*direction,duration:.5,ease:'power3.inOut'},0)
    .to(outgoingImage,{x:-110*direction,rotation:-7*direction,scale:.94,duration:.65,ease:'power3.inOut'},0)
    .fromTo(incomingCopy,{x:65*direction,opacity:0},{x:0,opacity:1,duration:.7,ease:'power3.out'},.17)
    .fromTo(incomingImage,{x:135*direction,rotation:8*direction,scale:.92,opacity:0},{x:0,rotation:0,scale:1,opacity:1,duration:.9,ease:'power3.out'},.1);
  }catch{finish();}
 }));
 buttons.forEach((button,index)=>button.addEventListener('click',()=>navigator.select(index)));
 root.querySelector('[data-story-prev]').addEventListener('click',()=>navigator.step(-1));
 root.querySelector('[data-story-next]').addEventListener('click',()=>navigator.step(1));
 root.addEventListener('keydown',event=>{
  if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();navigator.step(event.key==='ArrowRight'?1:-1);}
 });
 let touch;
 root.addEventListener('pointerdown',event=>{if(event.pointerType==='touch'&&!event.target.closest('button,a'))touch={x:event.clientX,y:event.clientY,id:event.pointerId};});
 root.addEventListener('pointerup',event=>{
  if(!touch||event.pointerId!==touch.id)return;
  const x=event.clientX-touch.x,y=event.clientY-touch.y;touch=null;
  if(Math.abs(x)>55&&Math.abs(x)>Math.abs(y)*1.4)navigator.step(x<0?1:-1);
 });
 root.addEventListener('pointercancel',()=>{touch=null;});
 root.querySelector('.story-navigation').hidden=false;
 activate(0);
 return navigator;
}
