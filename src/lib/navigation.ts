import type { Component } from "svelte";
import {
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
} from "@lucide/svelte";

export type NavItem = {
  label: string;
  href: string;
  icon: Component;
  /** Optional pill badge, e.g. an item count. */
  badge?: string;
};

/**
 * Primary POS navigation. Order mirrors the original shell:
 * Dashboard, Products, Cart, Sales, Settings.
 */
export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Products", href: "/dashboard/products", icon: Package },
  { label: "Cart", href: "/dashboard/cart", icon: ShoppingCart },
  { label: "Sales", href: "/dashboard/sales", icon: Receipt },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];
