import {storeSettings} from '../../../../lib/commerce';
import {saveStoreSettings} from '../../../../lib/store-settings';
import {requireAdmin,database,response,failure,jsonBody} from '../../../../lib/http';
export const dynamic='force-dynamic';
export async function GET(){try{await requireAdmin();return response({settings:await storeSettings(database())});}catch(e){return failure(e);}}
export async function PUT(request:Request){try{await requireAdmin();return response({settings:await saveStoreSettings(await jsonBody(request),database())});}catch(e){return failure(e);}}
