import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ClusterCard } from './ClusterCard';
import { makeCluster } from '../test/fixtures';

const renderCard = (cluster = makeCluster()) =>
  render(
    <MemoryRouter>
      <ul>
        <ClusterCard cluster={cluster} />
      </ul>
    </MemoryRouter>,
  );

describe('ClusterCard', () => {
  it('links to the cluster dashboard', () => {
    renderCard();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/clusters/prod');
  });

  it('escapes names that are not URL-safe', () => {
    renderCard(makeCluster({ name: 'eu/west 1' }));
    expect(screen.getByRole('link')).toHaveAttribute('href', '/clusters/eu%2Fwest%201');
  });

  it('states the score and grade in the accessible name', () => {
    renderCard();
    expect(screen.getByRole('img', { name: /score 55 out of 100, grade F/i })).toBeInTheDocument();
  });

  it('keeps an unreachable cluster on the board and shows why', () => {
    renderCard(makeCluster({ error: 'dial tcp: i/o timeout', summary: undefined, scanErrors: 3 }));
    expect(screen.getByText('Scan failed')).toBeInTheDocument();
    expect(screen.getByText('dial tcp: i/o timeout')).toBeInTheDocument();
  });

  it('marks a cluster that has never been scanned', () => {
    renderCard(makeCluster({ summary: undefined, scans: 0 }));
    expect(screen.getByText('Not scanned yet')).toBeInTheDocument();
  });
});
