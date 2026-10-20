import {demoStoreSettings,saveStoreSettings} from '../../../../../lib/store-settings';
import {requireAdmin,database,response,failure,jsonBody} from '../../../../../lib/http';
export async function POST(request:Request){try{await requireAdmin();await jsonBody(request);const db=database();return response({settings:await saveStoreSettings(await demoStoreSettings(db),db)});}catch(e){return failure(e);}}
