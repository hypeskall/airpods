import { updateOrder } from '../../../../../lib/commerce';
import { requireAdmin,database,response,failure,jsonBody } from '../../../../../lib/http';
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}){try{await requireAdmin();const input=await jsonBody(request);const {id}=await context.params;return response({order:await updateOrder(database(),id,input)});}catch(e){return failure(e);}}
