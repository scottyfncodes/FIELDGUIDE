/* The opening card of the home screen: a small, symmetrical diorama with the
   month's expedition on a plaque. Every number on it is counted from the data. */

const MONTH_NAME = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/* one side of each range, left edge to the center summit; mirrored about the
   center so the scene is exactly symmetrical however wide the screen is */
const W = 1400;
const C = W / 2;
const HALF_FAR = "M0,64 L0,46 L90,38 L180,44 L260,30 L340,40 L410,24 L470,34 L520,20 L570,32 L610,18 L650,28 L700,8";
const HALF_MID = "M0,64 L0,52 L110,46 L220,52 L320,40 L420,50 L480,36 L540,46 L590,32 L640,42 L700,30";
const mirror = (d: string) => {
  const pts = d.replace(/^M/, "").split(" L").map((p) => p.split(",").map(Number));
  const back = pts.slice(0, -1).reverse().map(([x, y]) => `L${W - x},${y}`).join(" ");
  return `${d} ${back} Z`;
};
const PINES = [30, 60, 160, 190, 300, 330, 440, 470, 520, 548, 576, 616, 640];

export function TitleCard({ month, date, counts, place }: {
  month: number;
  date: Date;
  /** trails: how many the current search found; null before there is one */
  counts: { trails: number | null; color: number; sky: number };
  place: string | null;
}) {
  return (
    <header className="title-card">
      <div className="tc-sky" aria-hidden="true">
        <span className="tc-sun" />
        <svg className="tc-range" viewBox={`0 0 ${W} 64`} width={W} height="64">
          <path className="tc-far" d={mirror(HALF_FAR)} />
          <path className="tc-mid" d={mirror(HALF_MID)} />
          <path className="tc-flag" d={`M${C},8 L${C},-8 L${C + 11},-4.5 L${C},-1`} />
          {PINES.flatMap((x) => [x, W - x]).map((x) => (
            <path key={x} className="tc-pine" d={`M${x - 6},64 L${x},44 L${x + 6},64 Z`} />
          ))}
          <path className="tc-tent" d={`M${C + 226},64 L${C + 236},51 L${C + 246},64 Z M${C + 236},51 L${C + 236},64`} />
        </svg>
        <span className="tc-band" />
      </div>
      <p className="tc-eyebrow">{place ?? "Colorado and beyond"} · {date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</p>
      <div className="tc-plaque">
        <p className="tc-title">The {MONTH_NAME[month - 1]} Expedition</p>
        <p className="tc-counts">
          {counts.trails != null ? `${counts.trails} trails nearby` : "Trails anywhere"} <i aria-hidden="true">◆</i> {counts.color} color spots <i aria-hidden="true">◆</i> {counts.sky} dark skies
        </p>
      </div>
    </header>
  );
}
