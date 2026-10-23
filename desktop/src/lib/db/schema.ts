import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { z } from "zod";

/**
 * Amounts are whole Ugandan shillings (UGX has no minor unit).
 * Timestamps are epoch milliseconds — integers keep the proxy transport
 * JSON-safe (no Date objects crossing `invoke`) and the DB clock is the
 * single source of truth for every writer, including the Rust seed.
 */
const timestamp = (name: string) =>
  integer(name)
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    sku: text("sku"),
    price: integer("price").notNull(),
    category: text("category").notNull().default("General"),
    imageUrl: text("image_url"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    index("products_name_idx").on(table.name),
    uniqueIndex("products_sku_idx").on(table.sku),
  ],
);

export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    orderNo: text("order_no").notNull().unique(),
    /** The till that rang the sale. Null on orders from before multi-till. */
    tillName: text("till_name"),
    status: text("status", { enum: ["completed", "void"] })
      .notNull()
      .default("completed"),
    subtotal: integer("subtotal").notNull(),
    taxRate: integer("tax_rate").notNull().default(18),
    tax: integer("tax").notNull().default(0),
    total: integer("total").notNull(),
    paymentMethod: text("payment_method", { enum: ["cash", "card"] })
      .notNull()
      .default("cash"),
    /** What the customer handed over. For a card payment this equals `total`. */
    tendered: integer("tendered").notNull().default(0),
    /** Change handed back from the till. Always 0 for a card payment. */
    changeGiven: integer("change_given").notNull().default(0),
    createdAt: timestamp("created_at"),
    voidedAt: integer("voided_at"),
  },
  (table) => [index("orders_created_at_idx").on(table.createdAt)],
);

export const orderItems = sqliteTable(
  "order_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    /** Snapshot: catalog edits never rewrite history. */
    name: text("name").notNull(),
    unitPrice: integer("unit_price").notNull(),
    qty: integer("qty").notNull(),
    lineTotal: integer("line_total").notNull(),
  },
  (table) => [index("order_items_order_id_idx").on(table.orderId)],
);

/** Key/value app settings. `vat_rate` is `"0"` or `"18"`. */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => (value === "" ? null : value));

/** Validated product input shared by create and edit forms. */
export const productInputSchema = createInsertSchema(products)
  .pick({
    name: true,
    sku: true,
    price: true,
    category: true,
    imageUrl: true,
    active: true,
  })
  .extend({
    name: z.string().trim().min(1, "Name is required").max(120),
    price: z.int().min(0, "Price must be 0 or more"),
    category: z.string().trim().min(1, "Category is required").max(60),
    sku: optionalTrimmed(64),
    imageUrl: optionalTrimmed(500),
  });

export type ProductInput = z.infer<typeof productInputSchema>;
