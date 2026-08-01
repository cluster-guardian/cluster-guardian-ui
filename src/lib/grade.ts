import type { Grade } from '../api/types';

/** Same thresholds as report.GradeOf in Go — kept here so a score with no
 *  grade attached (an old history entry) still renders consistently. */
export function gradeOf(score: number): Grade {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/** CSS custom property holding this grade's color. */
export function gradeColorVar(grade: Grade): string {
  return `var(--grade-${grade.toLowerCase()})`;
}

export const GRADE_DESCRIPTION: Record<Grade, string> = {
  A: 'Healthy',
  B: 'Good',
  C: 'Needs attention',
  D: 'At risk',
  F: 'Critical',
};
