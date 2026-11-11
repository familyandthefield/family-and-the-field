import productsJson from "../data/products.json";

/**
 * Weekly produce stays in the main shop grid.
 * A veg box uses the same fields with "category": "box".
 * It appears in the Veg boxes section only when available is true.
 */
export type Product = {
  id: string;
  name: string;
  price: string;
  description?: string;
  image?: string;
  alt?: string;
  width?: number;
  height?: number;
  available?: boolean;
  category?: string;
};

export function allProducts(): Product[] {
  return productsJson as Product[];
}

export function availableProduce(products = allProducts()): Product[] {
  return products.filter((product) => product.available && product.category !== "box");
}

export function availableBoxes(products = allProducts()): Product[] {
  return products.filter((product) => product.available && product.category === "box");
}
