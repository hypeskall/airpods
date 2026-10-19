import { decodeOrder } from '../../../../lib/commerce';
import { requireAdmin,database,response,failure } from '../../../../lib/http';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{
  await requireAdmin();const db=database();const url=new URL(request.url);const status=url.searchParams.get('status')||'';const search=(url.searchParams.get('search')||'').slice(0,100);const test=url.searchParams.get('test')==='1'?1:0;
  const page=Math.max(1,Math.min(100000,parseInt(url.searchParams.get('page')||'1')||1));const conditions=['is_test=?'];const args:any[]=[test];
  if(status){conditions.push('status=?');args.push(status);}if(search){conditions.push('(reference LIKE ? OR customer_name LIKE ? OR phone LIKE ?)');args.push('%'+search+'%','%'+search+'%','%'+search+'%');}
  const where=conditions.join(' AND ');const [list,count,stats]=await Promise.all([
    db.prepare(`SELECT * FROM orders WHERE ${where} ORDER BY created_at DESC,id DESC LIMIT 40 OFFSET ?`).bind(...args,(page-1)*40).all(),
    db.prepare(`SELECT COUNT(*) AS count FROM orders WHERE ${where}`).bind(...args).first(),
    db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(CASE WHEN status='new' THEN 1 ELSE 0 END),0) AS newCount,COALESCE(SUM(CASE WHEN paid=0 AND status NOT IN ('cancelled','returned') THEN total ELSE 0 END),0) AS pendingCod,COALESCE(SUM(CASE WHEN paid=1 THEN total ELSE 0 END),0) AS collected FROM orders WHERE is_test=?").bind(test).first(),
  ]);return response({orders:list.results.map(decodeOrder),count:count?.count||0,page,stats});
}catch(e){return failure(e);}}
