import {env} from 'cloudflare:workers';
import {emailReadiness} from '../../../../lib/fulfillment';
import {storeSettings} from '../../../../lib/commerce';
import {requireAdmin,database,response,failure} from '../../../../lib/http';
export async function GET(){try{await requireAdmin();return response({email:emailReadiness(env),settings:await storeSettings(database())});}catch(e){return failure(e);}}
