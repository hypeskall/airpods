import {storefront} from '../lib/storefront';
import {catalog,storeSettings} from '../lib/commerce';
import {database} from '../lib/http';
export async function GET(){
 try{const db=database();const [products,settings]=await Promise.all([catalog(db),storeSettings(db)]);return storefront(undefined,undefined,{products,settings});}
 catch{return storefront();}
}
