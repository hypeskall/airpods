import {productPage} from '../../../lib/storefront';
export async function GET(_request:Request,context:{params:Promise<{id:string}>}){
 const {id}=await context.params;return productPage(id);
}
