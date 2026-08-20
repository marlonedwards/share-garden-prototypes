// Money on screen. Whole dollars everywhere a total is read, cents only on a
// price, and tabular-nums does the lining up because there is no monospace on
// this site. Contract: docs/clean-type.md section 4.

export function money(v: number): string {
  const n = Math.round(v);
  return `$${Math.abs(n).toLocaleString("en-US")}`;
}

export function signedMoney(v: number): string {
  const n = Math.round(v);
  if (n === 0) return "$0";
  return `${n > 0 ? "+" : "-"}${money(n)}`;
}

// A price keeps its cents, and a price under a cent keeps enough digits to
// still be a number rather than a zero.
export function price(v: number): string {
  if (v >= 1000) return `$${v.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
  if (v >= 1) return `$${v.toFixed(2)}`;
  if (v <= 0) return "$0.00";
  return `$${v.toFixed(4)}`;
}

export function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}
