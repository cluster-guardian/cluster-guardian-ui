import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  /** Drop the body padding when the child manages its own (lists, tables). */
  flush?: boolean;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
}

export function Card({ children, flush, className = '', as: Tag = 'div' }: CardProps) {
  return (
    <Tag className={`card ${flush ? 'card--flush' : ''} ${className}`.trim()}>
      <div className="card__body">{children}</div>
    </Tag>
  );
}
