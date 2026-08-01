import type { Grade } from '../../api/types';
import { GRADE_DESCRIPTION, gradeColorVar, gradeOf } from '../../lib/grade';

interface ScoreGaugeProps {
  score: number;
  grade?: Grade;
  size?: number;
  /** Suppress the caption when the surrounding card already labels it. */
  caption?: string | null;
}

/**
 * A single headline number, not a chart: one value, no comparison, so it gets
 * a hero figure with a ring rather than a plot. The ring is decorative — the
 * score and letter are both present as text, and the accessible name carries
 * the whole thing.
 */
export function ScoreGauge({ score, grade, size = 60, caption = 'Health score' }: ScoreGaugeProps) {
  const g = grade ?? gradeOf(score);
  const clamped = Math.max(0, Math.min(100, score));
  const stroke = Math.max(6, Math.round(size * 0.13));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (clamped / 100) * circumference;
  const color = gradeColorVar(g);

  return (
    <div className="score">
      <svg
        className="score__gauge"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Health score ${clamped} out of 100, grade ${g} — ${GRADE_DESCRIPTION[g]}`}
      >
        <circle
          className="score__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
        />
        <circle
          className="score__meter"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          stroke={color}
          strokeDasharray={`${filled} ${circumference - filled}`}
        />
      </svg>
      <div>
        <span className="score__grade tabular" style={{ color }} aria-hidden="true">
          {g}
        </span>
        <span className="score__caption" aria-hidden="true">
          {' '}
          {clamped}/100
        </span>
        {caption && <div className="score__caption">{caption}</div>}
      </div>
    </div>
  );
}
