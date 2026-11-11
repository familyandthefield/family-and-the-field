import productsJson from "../data/products.json";

/**
 * Weekly produce stays in the main shop grid, including items with
 * available set to false. ProductCard shows those as out of stock.
 * A veg box uses the same fields with "category": "box" and stays in
 * the Veg boxes section, including when it is out of stock.
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

export function produce(products = allProducts()): Product[] {
  return products.filter((product) => product.category !== "box");
}

export function vegBoxes(products = allProducts()): Product[] {
  return products.filter((product) => product.category === "box");
}
