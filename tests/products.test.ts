import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const products = JSON.parse(
  readFileSync(new URL("../src/data/products.json", import.meta.url), "utf8"),
);

describe("shop catalogue availability", () => {
  it("keeps every product visible and marks Eggs and Secret Salad out of stock", () => {
    const byId = Object.fromEntries(products.map((product) => [product.id, product]));

    assert.deepEqual(Object.keys(byId).sort(), ["eggs", "heirloom-carrots", "secret-salad"]);
    assert.equal(byId.eggs.available, false);
    assert.equal(byId.eggs.stockNote, "See you in the spring");
    assert.equal(byId["heirloom-carrots"].available, true);
    assert.equal(byId["heirloom-carrots"].stockNote, undefined);
    assert.equal(byId["secret-salad"].available, false);
    assert.equal(byId["secret-salad"].stockNote, undefined);
    assert.equal(byId["secret-salad"].name, "Secret Salad (150g)");
    assert.equal(byId["secret-salad"].price, "£2.50");
  });
});
