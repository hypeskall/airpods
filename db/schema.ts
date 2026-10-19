import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  price: integer('price').notNull(),
  stock: integer('stock'),
  active: integer('active').notNull().default(1),
  version: integer('version').notNull().default(1),
});
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  reference: text('reference').notNull().unique(),
  fingerprint: text('fingerprint').notNull(),
  status: text('status').notNull().default('new'),
  customerName: text('customer_name').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull().default(''),
  county: text('county').notNull(),
  city: text('city').notNull(),
  address: text('address').notNull(),
  notes: text('notes').notNull().default(''),
  items: text('items').notNull(),
  subtotal: integer('subtotal').notNull(),
  shipping: integer('shipping').notNull(),
  total: integer('total').notNull(),
  paid: integer('paid').notNull().default(0),
  tracking: text('tracking').notNull().default(''),
  internalNote: text('internal_note').notNull().default(''),
  inventoryRestored: integer('inventory_restored').notNull().default(0),
  isTest: integer('is_test').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  version: integer('version').notNull().default(1),
}, t => [index('orders_created_idx').on(t.createdAt), index('orders_status_idx').on(t.status)]);
export const settings = sqliteTable('store_settings', {
  id: text('id').primaryKey(),
  value: text('value').notNull(),
});
export const limits = sqliteTable('request_limits', {
  key: text('key').primaryKey(),
  windowStart: integer('window_start').notNull(),
  attempts: integer('attempts').notNull(),
});
