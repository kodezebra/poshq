import type { Component } from "svelte";
import { Package, Receipt, Settings, Store } from "@lucide/svelte";

export type NavItem = {
  label: string;
  href: string;
  icon: Component;
  /** Optional pill badge, e.g. an item count. */
  badge?: string;
};

/** Primary POS navigation, in the order a cashier uses it. */
export const navItems: NavItem[] = [
  { label: "Terminal", href: "/", icon: Store },
  { label: "Products", href: "/products", icon: Package },
  { label: "Orders", href: "/orders", icon: Receipt },
  { label: "Settings", href: "/settings", icon: Settings },
];
