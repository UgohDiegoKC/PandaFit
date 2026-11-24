"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { FigureFrame, figureFor, fittedViewBox } from "./exercise-figure";

const PERIOD_MS = 2800;

/** Large looping form demo for the exercise page: start → finish → start. Respects reduced motion. */
export function AnimatedFigure({ slug, name }: { slug: string; name: string }) {
  const f = figureFor(slug);
  const [t, setT] = useState(1);
  const [playing, setPlaying] = useState(true);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPlaying(false); // eslint-disable-line react-hooks/set-state-in-effect -- reading a browser preference after mount
    }
  }, []);

  useEffect(() => {
    if (!playing) return;
    const start = performance.now();
    const tick = (now: number) => {
      const phase = ((now - start) % PERIOD_MS) / PERIOD_MS;
      // Ease in/out with a short hold at each end of the movement.
      const raw = (1 - Math.cos(phase * 2 * Math.PI)) / 2;
      setT(Math.min(1, Math.max(0, (raw - 0.08) / 0.84)));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);

  if (!f) return null;
  const box = fittedViewBox(f.template, [0, 0.25, 0.5, 0.75, 1], 10, 80);

  return (
    <figure className="card overflow-hidden">
      <div className="relative bg-surface-2">
        <svg viewBox={box} className="mx-auto block aspect-square w-full max-w-sm" role="img" aria-label={`${name}: illustration of the movement from start to finish position`}>
          <FigureFrame template={f.template} weight={f.weight} t={t} />
        </svg>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="absolute bottom-3 right-3 grid size-10 place-items-center rounded-full bg-surface/90 text-fg shadow"
          aria-label={playing ? "Pause animation" : "Play animation"}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
      </div>
      <figcaption className="grid grid-cols-2 divide-x divide-line border-t border-line text-center text-xs text-muted">
        {[["Start", 0], ["Finish", 1]].map(([label, frame]) => (
          <button key={label} type="button" className="flex items-center justify-center gap-2 py-2 hover:text-fg" onClick={() => { setPlaying(false); setT(frame as number); }}>
            <svg viewBox={fittedViewBox(f.template, [frame as number])} width={40} height={40} aria-hidden><FigureFrame template={f.template} weight={f.weight} t={frame as number} /></svg>
            {label as string}
          </button>
        ))}
      </figcaption>
      <p className="flex items-center gap-2 border-t border-line px-4 py-2 text-xs text-muted">
        <span className="inline-block size-2.5 rounded-full bg-accent" aria-hidden /> Highlighted: the body parts doing most of the work
      </p>
    </figure>
  );
}
