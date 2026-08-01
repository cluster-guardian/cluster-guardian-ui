import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SectionCard } from './SectionCard';
import type { Finding } from '../api/types';

const findings: Finding[] = [
  {
    severity: 'critical',
    message: '2 containers running as root',
    object: 'deployment/api',
    hint: 'Set runAsNonRoot.',
    controls: ['PSS/restricted:runAsNonRoot'],
  },
  { severity: 'info', message: 'Missing HorizontalPodAutoscaler' },
];

describe('SectionCard', () => {
  it('renders every part of a finding', () => {
    render(<SectionCard title="Security" icon="🔒" findings={findings} />);
    expect(screen.getByText('2 containers running as root')).toBeInTheDocument();
    expect(screen.getByText('deployment/api')).toBeInTheDocument();
    expect(screen.getByText('Set runAsNonRoot.')).toBeInTheDocument();
    expect(screen.getByText('PSS/restricted:runAsNonRoot')).toBeInTheDocument();
  });

  it('summarizes counts per severity in the header', () => {
    const { container } = render(<SectionCard title="Security" findings={findings} />);
    // Scoped to the header: the same words also label each finding's own badge.
    const counts = container.querySelector('.section__counts');
    // The badge pairs a glyph with the word, so severity never rides on color.
    expect(counts).toHaveTextContent('1Critical');
    expect(counts).toHaveTextContent('1Info');
    expect(counts).not.toHaveTextContent('Warning');
  });

  it('shows a single OK badge when nothing is wrong', () => {
    render(<SectionCard title="GitOps" findings={[{ severity: 'ok', message: 'All synced' }]} />);
    expect(screen.getAllByText('OK').length).toBeGreaterThan(0);
  });

  it('respects defaultOpen', () => {
    const { container } = render(
      <SectionCard title="Nodes" findings={findings} defaultOpen={false} />,
    );
    expect(container.querySelector('details')).not.toHaveAttribute('open');
  });
});
