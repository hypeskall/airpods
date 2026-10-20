import {shippingEmail} from '../../../../lib/shipping-email';
import {storeSettings} from '../../../../lib/commerce';
import {requireAdmin,database,failure} from '../../../../lib/http';
export async function GET(){try{await requireAdmin();const settings=await storeSettings(database());return new Response(shippingEmail({reference:'EP-DEMO-001',customer_name:'Alex',tracking:'7000158682653',items:[{name:'AirPods Pro 3',price:24900,quantity:1}],shipping:2499,total:27399,paid:false,city:'București',county:'București'},settings).html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});}catch(e){return failure(e);}}
