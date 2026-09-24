const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
export const MONTH_LBL = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* Parse strings like "Jul–Sep", "Mar–Jun, Sep–Nov", "Year-round (…)", "Sep–May" (wraps the year).
   `month` is 1–12. Text we can't read counts as in season rather than hiding a trail. */
export function inSeason(prime: string | undefined, month: number): boolean {
  if (!prime) return true;
  const txt = prime.toLowerCase();
  if (txt.includes("year-round")) return true;
  const segs = txt.split(",").map((seg) => {
    const found: { i: number; at: number }[] = [];
    MONTHS.forEach((m, i) => {
      const at = seg.indexOf(m);
      if (at >= 0) found.push({ i: i + 1, at });
    });
    return found.sort((a, b) => a.at - b.at);
  }).filter((f) => f.length);
  if (!segs.length) return true;
  return segs.some((found) => {
    const a = found[0].i, b = found[found.length - 1].i;
    return a <= b ? month >= a && month <= b : month >= a || month <= b;
  });
}

/* True when the text names at least one month (or says year-round) — used by the data checks. */
export function seasonParses(prime: string): boolean {
  const txt = prime.toLowerCase();
  return txt.includes("year-round") || MONTHS.some((m) => txt.includes(m));
}

export const currentMonth = () => new Date().getMonth() + 1;
