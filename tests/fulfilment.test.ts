import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deliveryAllowed, deliveryWarning, formatPounds } from "../src/lib/fulfilment.ts";

describe("home delivery minimum", () => {
  it("allows only baskets over £20", () => {
    assert.equal(deliveryAllowed(19.99), false);
    assert.equal(deliveryAllowed(20), false);
    assert.equal(deliveryAllowed(20.01), true);
    assert.equal(deliveryAllowed(3), false);
  });

  it("warns with the basket total and the existing delivery wording", () => {
    const warning = deliveryWarning(5.5);
    assert.match(warning, /orders over £20/);
    assert.match(warning, /two working days/);
    assert.match(warning, /12:00/);
    assert.match(warning, /19:00/);
    assert.match(warning, /Noa Bakehouse, Douglas \(free\)/);
    assert.equal(formatPounds(5.5), "£5.50");
    assert.ok(warning.includes("£5.50"));
  });
});
