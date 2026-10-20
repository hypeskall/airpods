import { placeOrder,storeSettings } from '../../../lib/commerce';
import { database,response,failure,jsonBody,rateLimit,isAdmin } from '../../../lib/http';
import {env} from 'cloudflare:workers';
import {sendPendingForOrder} from '../../../lib/fulfillment';
export async function POST(request:Request){try{const body=await jsonBody(request);await rateLimit(request);const test=body.isTest===true;const admin=await isAdmin();if(test&&!admin)return response({error:'Comenzile de test sunt rezervate administratorului.'},403);const settings=await storeSettings(database());if(!test&&!settings.checkoutOpen)return response({error:'Magazinul nu primește încă comenzi. Revino în curând.'},503);const order=await placeOrder(database(),body,test);if(!test){try{await sendPendingForOrder(database(),body.idempotencyKey,env);}catch{console.error('Order saved; receipt needs retry');}}return response({order},201);}catch(e){return failure(e);}}
