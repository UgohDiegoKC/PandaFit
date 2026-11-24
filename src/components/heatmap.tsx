import clsx from "clsx";

const ROWS = ["M", "T", "W", "T", "F", "S", "S"];

/** Yellow activity grid (habit-tracker reference): columns = weeks, rows = Mon..Sun. */
export function ActivityHeatmap({ grid }: { grid: { date: string; active: boolean; future: boolean }[][] }) {
  const total = grid.flat().filter((c) => c.active).length;
  return (
    <figure aria-label={`Workout activity: ${total} sessions in the last ${grid.length} weeks`}>
      <div className="flex gap-1.5">
        <div className="grid grid-rows-7 gap-1 pr-1 text-[10px] text-muted">
          {ROWS.map((r, i) => (
            <span key={i} className="flex h-3.5 items-center sm:h-4">{r}</span>
          ))}
        </div>
        <div className="grid flex-1 grid-flow-col grid-rows-7 gap-1">
          {grid.flatMap((week) =>
            week.map((c) => (
              <span
                key={c.date}
                title={c.date}
                className={clsx(
                  "h-3.5 rounded-[4px] sm:h-4",
                  c.future ? "bg-transparent" : c.active ? "bg-accent" : "bg-accent-faint",
                )}
              />
            )),
          )}
        </div>
      </div>
    </figure>
  );
}
