// One small geometry read per scroll frame keeps the header in the scene's palette.
export function initHeaderSurface(){
 const header=document.querySelector('.header'),story=document.querySelector('.sound-story');
 if(!header||!story)return;
 let pending=false,dark;
 const update=()=>{
  pending=false;
  const rect=story.getBoundingClientRect(),middle=header.getBoundingClientRect().height/2;
  const next=rect.top<=middle&&rect.bottom>middle;
  if(next!==dark){dark=next;header.classList.toggle('is-over-story',next);}
 };
 const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(update);}};
 window.addEventListener('scroll',schedule,{passive:true});
 window.addEventListener('resize',schedule,{passive:true});
 window.addEventListener('pageshow',schedule);
 update();
}
