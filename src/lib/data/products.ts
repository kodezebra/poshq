import type { Product } from "$lib/types";

/** Seed catalog used by the dashboard and products screens. */
export const products: Product[] = [
  { id: 1, name: "Coffee", price: "$4.50", category: "Beverages" },
  { id: 2, name: "Croissant", price: "$3.25", category: "Bakery" },
  { id: 3, name: "Sandwich", price: "$8.99", category: "Food" },
  { id: 4, name: "Cake", price: "$6.50", category: "Desserts" },
];
