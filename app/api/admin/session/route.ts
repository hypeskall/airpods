import { isAdmin,response } from '../../../../lib/http';
export const dynamic='force-dynamic';
export async function GET(){return response({isAdmin:await isAdmin()});}
