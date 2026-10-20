import {productPage} from '../../../lib/storefront';
import {catalog,storeSettings} from '../../../lib/commerce';
import {database} from '../../../lib/http';
export async function GET(_request:Request,context:{params:Promise<{id:string}>}){const {id}=await context.params;try{const db=database();const [products,settings]=await Promise.all([catalog(db),storeSettings(db)]);return productPage(id,{products,settings});}catch{return productPage(id);}}
