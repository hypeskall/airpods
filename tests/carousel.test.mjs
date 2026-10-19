import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSlideNavigator,initProductCarousel,disableProductCarouselMotion} from '../public/product-carousel.js';

test('carousel wraps both directions and direct selection uses the same transition',async()=>{
 const calls=[];
 const navigator=createSlideNavigator(3,0,async(...args)=>calls.push(args));
 await navigator.step(-1);assert.equal(navigator.current,2);
 await navigator.step(1);assert.equal(navigator.current,0);
 await navigator.select(1);assert.equal(navigator.current,1);
 assert.deepEqual(calls,[[0,2,-1],[2,0,1],[0,1,1]]);
});

test('rapid taps queue the latest destination without overlapping transitions',async()=>{
 const calls=[],finish=[];
 const navigator=createSlideNavigator(3,0,(...args)=>{calls.push(args);return new Promise(resolve=>finish.push(resolve));});
 const settled=navigator.step(1);
 navigator.step(1);navigator.step(1);navigator.step(-1);
 assert.equal(calls.length,1);assert.equal(navigator.desired,2);assert.equal(navigator.running,true);
 finish.shift()();await Promise.resolve();
 assert.deepEqual(calls,[[0,1,1],[1,2,-1]]);
 finish.shift()();await settled;
 assert.equal(navigator.current,2);assert.equal(navigator.running,false);
});

test('selecting the current slide does not animate or change state',async()=>{
 let calls=0;
 const navigator=createSlideNavigator(3,0,async()=>calls++);
 await navigator.select(0);
 assert.equal(calls,0);assert.equal(navigator.current,0);
});

test('a global motion failure settles the active slide and queued choices remain usable',async()=>{
 const element=()=>({style:{removeProperty(){}},classList:{toggle(){}},setAttribute(){},addEventListener(){},focus(){}});
 const slides=['four','pro','max'].map((name,index)=>{
  const copy=element(),image=element();
  return {...element(),hidden:index!==0,inert:index!==0,dataset:{storyName:name,storyModel:name},contains(){return false;},querySelector(selector){return selector==='.story-copy'?copy:image;},querySelectorAll(){return [copy,image];}};
 });
 const buttons=slides.map(element),status={},navigation={hidden:true},control=element();
 const root={...element(),dataset:{},querySelectorAll(selector){return selector==='.story-slide'?slides:buttons;},querySelector(selector){return selector==='.story-status'?status:selector==='.story-navigation'?navigation:control;}};
 const timelines=[],gsap={set(){},timeline(options){timelines.push(options);const timeline={to(){return timeline;},fromTo(){return timeline;}};return timeline;}};
 const previousDocument=globalThis.document;globalThis.document={activeElement:null};
 try{
  const navigator=initProductCarousel(root,gsap),settled=navigator.step(1);
  navigator.step(1);assert.equal(navigator.running,true);
  disableProductCarouselMotion(root);await settled;
  assert.equal(navigator.running,false);assert.equal(navigator.current,2);
  assert.deepEqual(slides.map(slide=>slide.hidden),[true,true,false]);
  assert.equal(timelines.length,1);assert.equal(status.textContent,'max, modelul 3 din 3.');
  timelines[0].onComplete();assert.equal(status.textContent,'max, modelul 3 din 3.');
  await navigator.step(1);assert.equal(navigator.current,0);
 }finally{globalThis.document=previousDocument;}
});
