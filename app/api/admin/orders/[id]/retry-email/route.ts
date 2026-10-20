import {env} from 'cloudflare:workers';
import {sendPendingForOrder} from '../../../../../../lib/fulfillment';
import {requireAdmin,database,response,failure,jsonBody} from '../../../../../../lib/http';
export async function POST(request:Request,context:{params:Promise<{id:string}>}){try{await requireAdmin();await jsonBody(request);const {id}=await context.params;return response(await sendPendingForOrder(database(),id,env));}catch(e){return failure(e);}}
