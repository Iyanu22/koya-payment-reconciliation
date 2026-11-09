// Payment reconciliation.
//
// Reads payments.jsonl and works out how much money we actually collected.
// Run:  node reconcile.js

const fs = require("fs");

const latest = new Map();

const lines = fs.readFileSync("payments.jsonl", "utf8").split("\n").filter((l) => l.length > 0);
for (const line of lines) {
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue; // truncated or otherwise unreadable line
  }

  if (!event.txn_id) continue;

  // Attempts are not in file order, so compare timestamps. They are all
  // fixed-width UTC ISO 8601, which sorts correctly as a string.
  const current = latest.get(event.txn_id);
  if (!current || event.ts > current.ts) {
    latest.set(event.txn_id, event);
  }
}

// Amounts are numbers or strings, and strings may have thousands separators.
function toKobo(amount) {
  return Math.round(Number(String(amount).replace(/,/g, "")) * 100);
}

// Sum in whole kobo so floating-point error can't accumulate in the total.
const collected = [...latest.values()].filter((event) => event.status === "success");
const count = collected.length;
const totalKobo = collected.reduce((sum, event) => sum + toKobo(event.amount), 0);
const total = totalKobo / 100;

const expected = parseInt(fs.readFileSync("expected.txt", "utf8").trim(), 10);

if (count !== expected) {
  console.log(`Check failed: counted ${count} successful payments, expected ${expected}.`);
  console.log("Something in the data isn't being handled the way the README describes.");
} else {
  console.log(`Check passed: ${count} successful payments.`);
  console.log(`Your code: KOYA-${Math.round(total)}`);
}
