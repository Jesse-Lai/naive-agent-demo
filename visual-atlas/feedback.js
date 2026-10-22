/* Explicit favorite feedback, with a persistent browser outbox and local server sync. */
(() => {
'use strict';
const SAVED='other-intelligence-saved', OUTBOX='other-intelligence-feedback-outbox-v1', CLIENT='other-intelligence-feedback-client-v1';
const API='https://visual-atlas-055592.laijianxun123.workers.dev/visual-atlas/api/feedback/sync', TOKEN='visual-atlas-public-visitor-v1';
const uuid=()=>globalThis.crypto.randomUUID();
class FeedbackStore {
 constructor({storage,request=globalThis.fetch.bind(globalThis),onChange=()=>{},onStatus=()=>{}}){
  this.storage=storage;this.request=request;this.onChange=onChange;this.onStatus=onStatus;
  this.memory={};this.storageOK=true;this.busy=false;this.timer=null;
  this.clientId=this.read(CLIENT,null)||uuid();this.write(CLIENT,this.clientId);
  const existing=this.read(SAVED,[]);this.saved=new Set(Array.isArray(existing)?existing.filter(id=>typeof id==='string'):[]);
 }
 read(key,fallback){if(!this.storageOK&&key in this.memory)return this.memory[key];try{const raw=this.storage?.getItem(key);return raw===null||raw===undefined?(this.memory[key]??fallback):JSON.parse(raw);}catch{this.storageOK=false;return this.memory[key]??fallback;}}
 write(key,value){this.memory[key]=value;try{if(!this.storage)throw Error('Storage unavailable');this.storage.setItem(key,JSON.stringify(value));}catch{this.storageOK=false;}}
 pending(){const value=this.read(OUTBOX,[]);return Array.isArray(value)?value:[];}
 status(state,data={}){this.onStatus({state,storageOK:this.storageOK,...data});}
 set(id,liked){
  const queue=this.pending();queue.push({opId:uuid(),id,liked});this.write(OUTBOX,queue);
  if(liked)this.saved.add(id);else this.saved.delete(id);
  this.write(SAVED,[...this.saved]);this.onChange(new Set(this.saved));
  this.status('saving');this.sync();
 }
 async sync(){
  if(globalThis.navigator?.locks)return navigator.locks.request('visual-atlas-feedback-sync',()=>this.syncUnlocked());
  return this.syncUnlocked();
 }
 async syncUnlocked(){
  if(this.busy)return;this.busy=true;clearTimeout(this.timer);this.status('saving');
  if(!this.read('visual-atlas-public-migrated-v1',false)){
   const queue=this.pending(),queued=new Set(queue.map(op=>op.id));
   for(const id of this.saved)if(!queued.has(id))queue.unshift({opId:uuid(),id,liked:true});
   this.write(OUTBOX,queue);this.write('visual-atlas-public-migrated-v1',true);
  }
  const operations=this.pending().slice(0,100),initialSaved=[];
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
  let success=false;
  try{
   // Establish and persist identity before votes, so a lost first response cannot duplicate likes.
   let token=this.read(TOKEN,null);
   if(!token){
    const session=await this.request(API,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json','X-Visual-Atlas':'feedback-v1'},body:JSON.stringify({operations:[],initialSaved:[]}),signal:controller.signal});
    if(!session.ok)throw Error('Session failed');
    const identity=await session.json();
    if(typeof identity.visitorToken!=='string')throw Error('Invalid session');
    token=identity.visitorToken;this.write(TOKEN,token);
   }
   const response=await this.request(API,{
    method:'POST',credentials:'omit',headers:{'Content-Type':'application/json','X-Visual-Atlas':'feedback-v1','X-Atlas-Visitor':token},
    body:JSON.stringify({clientId:this.clientId,initialSaved,operations}),signal:controller.signal,keepalive:true
   });
   if(!response.ok)throw Error('Save failed');
   const result=await response.json();
   if(result.schemaVersion!==1||!Array.isArray(result.favorites)||!Array.isArray(result.acknowledged))throw Error('Invalid response');
   const ack=new Set(result.acknowledged),remaining=this.pending().filter(op=>!ack.has(op.opId));this.write(OUTBOX,remaining);
   this.saved=new Set(result.favorites);
   for(const op of remaining){if(op.liked)this.saved.add(op.id);else this.saved.delete(op.id);}
   this.write(SAVED,[...this.saved]);this.onChange(new Set(this.saved));
   this.status(remaining.length?'saving':'saved',{updatedAt:result.updatedAt,count:result.favorites.length});success=true;
  }catch{this.status('offline');}
  finally{clearTimeout(timeout);this.busy=false;}
  if(success&&this.pending().length)this.sync();
  else if(!success)this.timer=setTimeout(()=>this.sync(),15000);
 }
}
globalThis.FeedbackStore=FeedbackStore;
})();
