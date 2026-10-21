declare module "*.svelte" {
  import { SvelteComponent } from "svelte";
  export default SvelteComponent;
}

interface Product {
  id: number;
  name: string;
  price: string;
  category: string;
  image?: string;
}