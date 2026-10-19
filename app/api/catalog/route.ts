import { catalog, storeSettings } from '../../../lib/commerce';
import { database,response,failure } from '../../../lib/http';
export const dynamic='force-dynamic';
export async function GET(){try{const db=database();const [products,settings]=await Promise.all([catalog(db),storeSettings(db)]);return response({products,settings});}catch(e){return failure(e);}}
