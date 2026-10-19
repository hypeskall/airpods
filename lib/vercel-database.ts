import {createClient, type Client, type InStatement, type ResultSet} from '@libsql/client/web';
import migration from '../drizzle/0000_yellow_hairball.sql?raw';
import {CommerceError} from './commerce';

export type VercelEnvironment = Record<string,string|undefined>;

function result(set:ResultSet){
  return {
    success:true,
    results:set.rows.map(row=>Object.fromEntries(set.columns.map(column=>[column,row[column]]))),
    meta:{changes:set.rowsAffected},
  };
}

/** Preserve D1's prepared-query shape and atomic batch semantics over remote libSQL. */
export function adaptDatabase(client:Pick<Client,'execute'|'batch'>){
  class Statement {
    query:string; values:unknown[];
    constructor(query:string,values:unknown[]=[]){this.query=query;this.values=values;}
    bind(...values:unknown[]){return new Statement(this.query,values);}
    input(){return {sql:this.query,args:this.values} as InStatement;}
    async first<T=any>():Promise<T|null>{return (await this.all()).results[0] as T??null;}
    async all(){return result(await client.execute(this.input()));}
    async run(){return this.all();}
  }
  return {
    prepare:(query:string)=>new Statement(query),
    async batch(statements:Statement[]){
      if(statements.some(statement=>!(statement instanceof Statement)))throw new Error('Invalid database statement');
      return (await client.batch(statements.map(statement=>statement.input()),'write')).map(result);
    },
  };
}

/** Idempotent initialization, including when two cold functions initialize together. */
export async function migrateDatabase(client:Pick<Client,'execute'|'batch'>){
  await client.execute('CREATE TABLE IF NOT EXISTS elitepods_migrations (id TEXT PRIMARY KEY NOT NULL, applied_at TEXT NOT NULL)');
  const id='0000_yellow_hairball';
  const applied=await client.execute({sql:'SELECT id FROM elitepods_migrations WHERE id=?',args:[id]});
  if(applied.rows.length)return;
  const statements=migration.split('--> statement-breakpoint').map(sql=>sql.trim()).filter(Boolean).map(sql=>({
    sql:sql.replace(/CREATE TABLE\s+/g,'CREATE TABLE IF NOT EXISTS ').replace(/CREATE UNIQUE INDEX\s+/g,'CREATE UNIQUE INDEX IF NOT EXISTS ').replace(/CREATE INDEX\s+/g,'CREATE INDEX IF NOT EXISTS '),
    args:[],
  }));
  await client.batch([...statements,{sql:'INSERT OR IGNORE INTO elitepods_migrations (id,applied_at) VALUES (?,?)',args:[id,new Date().toISOString()]}],'write');
}

let cachedKey='';
let pending:Promise<ReturnType<typeof adaptDatabase>>|undefined;
export async function vercelDatabase(environment:VercelEnvironment=process.env){
  const url=environment.TURSO_DATABASE_URL;
  const authToken=environment.TURSO_AUTH_TOKEN;
  if(!url||!authToken||!/^libsql:\/\//.test(url))throw new CommerceError('Serviciul de comenzi nu este încă configurat.',503);
  const key=url+'\n'+authToken;
  if(pending&&key===cachedKey)return pending;
  cachedKey=key;
  const initialization=(async()=>{
    const client=createClient({url,authToken,intMode:'number'});
    await migrateDatabase(client);
    return adaptDatabase(client);
  })();
  pending=initialization;
  try{return await initialization;}catch(error){if(pending===initialization)pending=undefined;throw error;}
}
