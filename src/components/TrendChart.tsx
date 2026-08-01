import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HistoryEntry } from '../api/types';
import { formatShortTime, formatTimestamp } from '../lib/format';
import { EmptyState } from './ui/States';
import './TrendChart.css';

/**
 * Findings by severity over the retained run history.
 *
 * Form: change-over-time with parts that sum to a meaningful whole (total
 * findings), so a stacked area — one y axis, never two.
 *
 * Color: severity is a status scale, not a categorical one, so the marks come
 * from the validated status set in tokens.css. Critical and warning sit inside
 * the 6-8 CVD band on the dark surface, which is only legal with secondary
 * encoding — supplied here by the 2px surface gap between stacked segments,
 * the always-present legend, the labelled tooltip, and the table view. Removing
 * any of those means re-validating the palette.
 */

interface Series {
  key: 'critical' | 'warning' | 'info';
  label: string;
  color: string;
}

const SERIES: Series[] = [
  { key: 'info', label: 'Info', color: 'var(--mark-info)' },
  { key: 'warning', label: 'Warning', color: 'var(--mark-warning)' },
  { key: 'critical', label: 'Critical', color: 'var(--mark-critical)' },
];

interface Row {
  time: string;
  label: string;
  critical: number;
  warning: number;
  info: number;
  score: number;
}

interface TooltipPayloadItem {
  dataKey?: string | number;
  payload?: Row;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: readonly TooltipPayloadItem[];
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="trend__tooltip">
      <p className="trend__tooltip-time">{formatTimestamp(row.time)}</p>
      {/* Reverse so the tooltip reads worst-first, the way the stack looks. */}
      {[...SERIES].reverse().map((s) => (
        <p className="trend__tooltip-row" key={s.key}>
          <span className="trend__swatch" style={{ background: s.color }} aria-hidden="true" />
          {s.label}
          <span className="trend__tooltip-value tabular">{row[s.key]}</span>
        </p>
      ))}
      <p className="trend__tooltip-row trend__tooltip-row--total">
        Score
        <span className="trend__tooltip-value tabular">{row.score}</span>
      </p>
    </div>
  );
}

export function TrendChart({ entries }: { entries: HistoryEntry[] }) {
  const [showTable, setShowTable] = useState(false);

  const rows = useMemo<Row[]>(
    () =>
      entries.map((e) => ({
        time: e.time,
        label: formatShortTime(e.time),
        critical: e.summary.critical,
        warning: e.summary.warnings,
        info: e.summary.info,
        score: e.summary.score,
      })),
    [entries],
  );

  if (rows.length < 2) {
    return (
      <EmptyState
        title="No trend yet"
        detail="A trend needs at least two runs. History is in-memory unless the server was started with --history-dir."
      />
    );
  }

  return (
    <figure className="trend">
      <figcaption className="trend__caption">
        <span className="trend__title">Findings by severity over {rows.length} runs</span>
        <button
          type="button"
          className="button trend__toggle"
          aria-pressed={showTable}
          onClick={() => setShowTable((v) => !v)}
        >
          {showTable ? 'Show chart' : 'Show table'}
        </button>
      </figcaption>

      {/* Legend is always present: identity never rides on color alone. */}
      <ul className="trend__legend">
        {[...SERIES].reverse().map((s) => (
          <li className="trend__legend-item" key={s.key}>
            <span className="trend__swatch" style={{ background: s.color }} aria-hidden="true" />
            {s.label}
          </li>
        ))}
      </ul>

      {showTable ? (
        <div className="trend__table-wrap">
          <table className="trend__table">
            <caption className="visually-hidden">
              Findings by severity and health score for each recorded run
            </caption>
            <thead>
              <tr>
                <th scope="col">Run</th>
                <th scope="col">Critical</th>
                <th scope="col">Warning</th>
                <th scope="col">Info</th>
                <th scope="col">Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.time}>
                  <th scope="row">{formatTimestamp(r.time)}</th>
                  <td className="tabular">{r.critical}</td>
                  <td className="tabular">{r.warning}</td>
                  <td className="tabular">{r.info}</td>
                  <td className="tabular">{r.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="trend__plot">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              {/* Recessive chrome: horizontal hairlines only, no vertical grid. */}
              <CartesianGrid stroke="var(--chart-grid)" strokeWidth={1} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--chart-ink)', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'var(--chart-axis)' }}
                // Small enough that a two-run history still labels both ends.
                minTickGap={8}
              />
              <YAxis
                tick={{ fill: 'var(--chart-ink)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={44}
                allowDecimals={false}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: 'var(--chart-axis)', strokeWidth: 1 }}
              />
              {SERIES.map((s) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stackId="severity"
                  name={s.label}
                  // The stroke is the surface color, not the series color: it
                  // draws the 2px gap that keeps adjacent stacked fills apart.
                  // That gap is the secondary encoding the dark palette leans
                  // on — do not repaint it with s.color.
                  stroke="var(--surface-card)"
                  strokeWidth={2}
                  fill={s.color}
                  fillOpacity={0.9}
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </figure>
  );
}
