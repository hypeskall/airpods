import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDialogMotion} from '../public/dialog-motion.js';
function modal(){
 const endings=[];let calls=0;
 return {id:'cart',open:false,showModal(){this.open=true;},close(){this.open=false;},getAnimations(){return [];},
  animate(){calls++;return {finished:new Promise(resolve=>endings.push(resolve))};},
  finish(){endings.splice(0).forEach(resolve=>resolve());},get calls(){return calls;}};
}
test('closing keeps the modal open until exit completes, and repeated closes share one operation',async()=>{
 const motion=createDialogMotion(()=>false),dialog=modal();motion.openDialog(dialog);
 assert.equal(dialog.open,true);const first=motion.closeDialog(dialog),second=motion.closeDialog(dialog);
 assert.equal(first,second);assert.equal(dialog.open,true);dialog.finish();await first;assert.equal(dialog.open,false);
});
test('reopening during exit waits and leaves the modal usable',async()=>{
 const motion=createDialogMotion(()=>false),dialog=modal();motion.openDialog(dialog);
 const exit=motion.closeDialog(dialog);motion.openDialog(dialog);dialog.finish();await exit;await Promise.resolve();
 assert.equal(dialog.open,true);const next=motion.closeDialog(dialog);dialog.finish();await next;assert.equal(dialog.open,false);
});
test('reduced motion closes immediately and allows repeated reopen without a stale promise',async()=>{
 const motion=createDialogMotion(()=>true),dialog=modal();
 for(let i=0;i<3;i++){motion.openDialog(dialog);assert.equal(dialog.open,true);await motion.closeDialog(dialog);assert.equal(dialog.open,false);}
 assert.equal(dialog.calls,0);
});
