import {env} from 'cloudflare:workers';
import {updateOrder} from '../../../../../lib/commerce';
import {orderDetail,sendPendingForOrder} from '../../../../../lib/fulfillment';
import {requireAdmin,database,response,failure,jsonBody} from '../../../../../lib/http';
export async function GET(_request:Request,context:{params:Promise<{id:string}>}){try{await requireAdmin();const {id}=await context.params;return response(await orderDetail(database(),id));}catch(e){return failure(e);}}
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}){try{await requireAdmin();const input=await jsonBody(request);const {id}=await context.params;const db=database();await updateOrder(db,id,input);try{await sendPendingForOrder(db,id,env);}catch{console.error('Shipment saved; email dispatch needs retry');}return response(await orderDetail(db,id));}catch(e){return failure(e);}}
