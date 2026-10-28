import { speciesById } from "../data/species";
import { QUESTS, questInSeason } from "../lib/quests";
import { useAtlas } from "../lib/atlas";
import { placeByRef } from "../lib/places";
import { currentMonth } from "../lib/season";
import { useActions } from "../components/PlaceSections";

const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function Quests() {
  const d = useAtlas();
  const act = useActions();
  const month = currentMonth();
  const rows = QUESTS.map((q) => ({ q, p: q.progress(d), now: questInSeason(q, month) }))
    /* finished last, in-season first, then closest to done */
    .sort((a, b) => Number(a.p.done) - Number(b.p.done) || Number(b.now) - Number(a.now) || b.p.count / b.p.target - a.p.count / a.p.target);
  const done = rows.filter((r) => r.p.done).length;
  return (
    <div className="screen quests">
      <p className="screen-eyebrow" aria-hidden="true">No. 4 · Field assignments</p>
      <h2 className="screen-title">Quests</h2>
      <p className="screen-lede">Optional things to look for. Progress comes only from finds and outings you've saved, so there's nothing to tap through. {done ? `${done} of ${QUESTS.length} complete.` : ""}</p>
      <ul className="quest-list">
        {rows.map(({ q, p, now }) => (
          <li key={q.id} className={"quest" + (p.done ? " quest-done" : "") + (!now && !p.done ? " quest-off" : "")}>
            <div className="quest-top">
              <h3 className="quest-title">{q.title}</h3>
              {q.months && !p.done && (
                <span className={"season-badge" + (now ? " on" : "")}>
                  {now ? "in season" : `${MONTH[q.months[0] - 1]}–${MONTH[q.months[q.months.length - 1] - 1]}`}
                </span>
              )}
            </div>
            <p className="quest-blurb">{q.blurb}</p>
            <div className="quest-bar" role="progressbar" aria-label={`${q.title} progress`} aria-valuemin={0} aria-valuemax={p.target} aria-valuenow={p.count}>
              <span style={{ width: `${(p.count / p.target) * 100}%` }} />
            </div>
            <div className="quest-count"><b>{p.count}</b> / {p.target}</div>
            {!!p.items.length && (
              <div className="quest-items">
                {p.items.map((it) => it.kind === "species" ? (
                  <button key={it.id} type="button" className="q-item" onClick={() => act.openSpecies(it.id)}>{speciesById(it.id)?.common}</button>
                ) : (
                  <button key={it.id} type="button" className="q-item" onClick={() => act.openPlace(it.id)}>{placeByRef(it.id)?.name}</button>
                ))}
              </div>
            )}
            {!p.done && <p className="quest-hint">{q.hint}</p>}
            {p.done && <div className="stamp" aria-hidden="true">DONE</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
