import {initProductCarousel,disableProductCarouselMotion} from './product-carousel.js';
let started=false,gsap,ScrollTrigger,productContext,productCleanup=[];
const revealed=new WeakSet(),sectionTweens=new Map();
let failed=false,refreshTimer;
const select=(selector,root=document)=>[...root.querySelectorAll(selector)];

function updateSectionMotion(){
 if(!started)return;
 for(const [node,tween] of sectionTweens){if(!node.isConnected){tween.scrollTrigger?.kill();tween.kill();sectionTweens.delete(node);}}
 select('.section-heading h2,.comparison-card,.reassurance>div,.reassurance li,.faq-list details,.spec-highlights>div,.spec-group,.compatibility-box,footer .footer-main').forEach(el=>{
  if(revealed.has(el))return;revealed.add(el);
  const tween=gsap.from(el,{y:44,opacity:0,duration:.85,ease:'power3.out',clearProps:'transform,opacity',immediateRender:false,scrollTrigger:{trigger:el,start:'top 94%',once:true}});sectionTweens.set(el,tween);
 });
 ScrollTrigger.refresh();
}

function updateProductMotion(){
 if(!started)return;
 productCleanup.forEach(fn=>fn());productCleanup=[];
 productContext?.revert();
 const cards=select('#products .product-card');if(!cards.length)return;
 productContext=gsap.context(()=>{
  gsap.from(cards,{y:52,opacity:0,duration:1,ease:'power3.out',stagger:.1,clearProps:'transform,opacity'});
  cards.forEach((card,index)=>{
   const image=card.querySelector('.product-image'),tilt=card.querySelector('.product-tilt');
   const float=gsap.to(card.querySelector('.product-float'),{y:-11-index*2,duration:2.8+index*.4,repeat:-1,yoyo:true,ease:'sine.inOut',paused:true});
   ScrollTrigger.create({trigger:card,start:'top bottom',end:'bottom top',onEnter:()=>float.play(),onEnterBack:()=>float.play(),onLeave:()=>float.pause(),onLeaveBack:()=>float.pause()});
   gsap.fromTo(card.querySelector('.product-scroll'),{yPercent:4},{yPercent:-12,ease:'none',scrollTrigger:{trigger:document.querySelector('#colectie'),start:'top top',end:'bottom top',scrub:.8}});
   gsap.to(card.querySelector('.orbit-one'),{rotation:28,ease:'none',scrollTrigger:{trigger:document.querySelector('#colectie'),start:'top top',end:'bottom top',scrub:1}});
   if(matchMedia('(hover: hover) and (pointer: fine)').matches){
    let bounds;
    const rotateX=gsap.quickTo(tilt,'rotationX',{duration:.6,ease:'power3.out'}),rotateY=gsap.quickTo(tilt,'rotationY',{duration:.6,ease:'power3.out'});
    const enter=()=>{bounds=image.getBoundingClientRect();};
    const move=e=>{if(!bounds)return;rotateX(-((e.clientY-bounds.top)/bounds.height-.5)*9);rotateY(((e.clientX-bounds.left)/bounds.width-.5)*12);};
    const leave=()=>{bounds=null;rotateX(0);rotateY(0);};
    image.addEventListener('pointerenter',enter);image.addEventListener('pointermove',move);image.addEventListener('pointerleave',leave);
    productCleanup.push(()=>{image.removeEventListener('pointerenter',enter);image.removeEventListener('pointermove',move);image.removeEventListener('pointerleave',leave);});
   }
  });
 },document.querySelector('#products'));
 ScrollTrigger.refresh();
}

function startSiteMotion(){
 if(started)return;
 gsap=window.gsap;ScrollTrigger=window.ScrollTrigger;
 if(!gsap||!ScrollTrigger){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initSiteMotion,{once:true});return;}
 started=true;gsap.registerPlugin(ScrollTrigger);
 ScrollTrigger.config({ignoreMobileResize:true});
 gsap.from('.hero-eyebrow,.headline-line,.hero-summary',{y:32,opacity:0,duration:1,ease:'power3.out',stagger:.1,clearProps:'transform,opacity'});
 const autumn=document.querySelector('.autumn-scene');
 if(autumn){
  gsap.from('.season-pill',{y:12,opacity:0,duration:.9,ease:'power3.out',clearProps:'transform,opacity'});
  select('.autumn-drift',autumn).forEach((leaf,index)=>{
   const drift=gsap.to(leaf.querySelector('img'),{y:index%2?-9:12,rotation:index%2?9:-10,duration:4.5+index*.7,repeat:-1,yoyo:true,ease:'sine.inOut',paused:true});
   ScrollTrigger.create({trigger:autumn,start:'top bottom',end:'bottom top',onEnter:()=>drift.play(),onEnterBack:()=>drift.play(),onLeave:()=>drift.pause(),onLeaveBack:()=>drift.pause()});
   gsap.to(leaf,{y:60+index*22,x:index%2?-20:24,rotation:index%2?35:-35,ease:'none',scrollTrigger:{trigger:'#colectie',start:'top top',end:'bottom top',scrub:1.4}});
  });
 }
 if(document.querySelector('.product-layout')){
  gsap.from('.product-visual',{y:30,opacity:0,duration:.9,ease:'power3.out',clearProps:'transform,opacity'});
  gsap.from('.product-purchase>.eyebrow,.product-purchase h1,.product-lead,#product-offer',{y:22,opacity:0,duration:.75,stagger:.07,ease:'power3.out',clearProps:'transform,opacity'});
 }
 refreshProductMotion();refreshSectionMotion();if(failed)return;
 const story=document.querySelector('.sound-story');
 if(story){
  const timeline=gsap.timeline({scrollTrigger:{trigger:story,start:'top top',end:'bottom bottom',scrub:1}});
  initProductCarousel(story,gsap);
  timeline.fromTo('.story-panorama',{y:35},{y:-28,ease:'none'},0)
   .fromTo('.story-orbit',{rotation:-20,scale:.85},{rotation:20,scale:1.15,ease:'none'},0)
   .fromTo('.story-progress>span',{scaleX:0},{scaleX:1,ease:'none'},0);
  gsap.from('.story-scene-label,.story-navigation',{y:20,opacity:0,duration:.85,stagger:.1,ease:'power3.out',clearProps:'transform,opacity',immediateRender:false,scrollTrigger:{trigger:story,start:'top 65%',once:true}});
 }
 const progress=document.createElement('div');progress.className='reading-progress';progress.setAttribute('aria-hidden','true');document.body.prepend(progress);
 gsap.fromTo(progress,{scaleX:0},{scaleX:1,ease:'none',scrollTrigger:{start:0,end:'max',scrub:.2}});
 document.addEventListener('toggle',event=>{if(event.target instanceof HTMLDetailsElement&&!event.target.closest('dialog')){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{if(started)ScrollTrigger.refresh();},300);}},{capture:true});
 const header=document.querySelector('.header');
 ScrollTrigger.create({start:12,end:'max',onToggle:self=>header.classList.toggle('is-scrolled',self.isActive)});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)gsap.globalTimeline.pause();else gsap.globalTimeline.resume();});
 document.fonts?.ready.then(()=>ScrollTrigger.refresh());
 select('main img').forEach(img=>{if(!img.complete)img.addEventListener('load',()=>ScrollTrigger.refresh(),{once:true});});
}

function motionFailure(){
 failed=true;started=false;
 productCleanup.forEach(fn=>fn());productCleanup=[];
 disableProductCarouselMotion(document.querySelector('.sound-story'));
 try{ScrollTrigger?.getAll().forEach(trigger=>trigger.kill());gsap?.globalTimeline.clear();}catch{}
 document.querySelectorAll('main [style]').forEach(el=>{['opacity','visibility','transform'].forEach(name=>el.style.removeProperty(name));});
 console.warn('Motion unavailable; the storefront remains usable.');
}
export function refreshSectionMotion(){if(!failed)try{updateSectionMotion();}catch{motionFailure();}}
export function refreshProductMotion(){if(!failed)try{updateProductMotion();}catch{motionFailure();}}
export function initSiteMotion(){if(!failed)try{startSiteMotion();}catch{motionFailure();}initProductCarousel(document.querySelector('.sound-story'),failed?null:window.gsap);}
