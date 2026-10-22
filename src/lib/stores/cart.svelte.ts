import type { Product } from "$lib/db/schema";
import { DEFAULT_VAT_RATE, type VatRate } from "$lib/utils";

export type CartLine = {
  productId: number;
  /** Snapshot of the name and price at the moment the item was added. */
  name: string;
  unitPrice: number;
  qty: number;
};

export const lineTotal = (line: CartLine) => line.unitPrice * line.qty;

/**
 * The open sale. Tax is exclusive: it is calculated on the current subtotal
 * with the register's loaded VAT rate, and every completed order snapshots
 * the rate it was charged at.
 */
export class Cart {
  lines = $state<CartLine[]>([]);
  vatRate = $state<VatRate>(DEFAULT_VAT_RATE);

  subtotal = $derived(
    this.lines.reduce((sum, line) => sum + lineTotal(line), 0),
  );
  tax = $derived(Math.round((this.subtotal * this.vatRate) / 100));
  total = $derived(this.subtotal + this.tax);
  count = $derived(this.lines.reduce((sum, line) => sum + line.qty, 0));
  isEmpty = $derived(this.lines.length === 0);

  add(product: Product, qty = 1): void {
    const amount = Math.max(1, Math.floor(qty));
    const line = this.lines.find((item) => item.productId === product.id);

    if (line) {
      line.qty += amount;
      return;
    }

    this.lines.push({
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      qty: amount,
    });
  }

  setQty(productId: number, qty: number): void {
    if (qty <= 0) {
      this.remove(productId);
      return;
    }

    const line = this.lines.find((item) => item.productId === productId);
    if (line) line.qty = Math.floor(qty);
  }

  remove(productId: number): void {
    this.lines = this.lines.filter((line) => line.productId !== productId);
  }

  clear(): void {
    this.lines = [];
  }

  setVatRate(rate: VatRate): void {
    this.vatRate = rate;
  }
}

export const cart = new Cart();
