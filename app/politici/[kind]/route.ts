import {storeSettings} from '../../../lib/commerce';
import {customerPage} from '../../../lib/customer-pages';
import {database,failure} from '../../../lib/http';
export const dynamic='force-dynamic';
export async function GET(_request:Request,context:{params:Promise<{kind:string}>}){try{const {kind}=await context.params;return customerPage(kind,await storeSettings(database()));}catch(e){return failure(e);}}
