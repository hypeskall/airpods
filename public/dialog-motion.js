// Preserve native modal focus/keyboard handling throughout the exit animation.
export function createDialogMotion(reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches){
 const closing=new WeakMap();
 function openDialog(dialog){
  const pending=closing.get(dialog);
  if(pending){pending.then(()=>openDialog(dialog));return;}
  if(dialog.open)return;
  dialog.showModal();
  if(!reducedMotion())dialog.animate([
   {opacity:0,transform:dialog.id==='cart'?'translateX(32px)':'translateY(18px) scale(.985)'},
   {opacity:1,transform:'none'},
  ],{duration:240,easing:'cubic-bezier(.2,.7,.2,1)'});
 }
 function closeDialog(dialog){
  if(closing.has(dialog))return closing.get(dialog);
  if(!dialog.open)return Promise.resolve();
  if(reducedMotion()){dialog.close();return Promise.resolve();}
  dialog.getAnimations().forEach(animation=>animation.cancel());
  const task=(async()=>{
   await dialog.animate([
    {opacity:1,transform:'none'},
    {opacity:0,transform:dialog.id==='cart'?'translateX(28px)':'translateY(12px) scale(.985)'},
   ],{duration:150,easing:'ease-in'}).finished.catch(()=>{});
   dialog.close();closing.delete(dialog);
  })();
  closing.set(dialog,task);return task;
 }
 return {openDialog,closeDialog};
}
export const {openDialog,closeDialog}=createDialogMotion();
