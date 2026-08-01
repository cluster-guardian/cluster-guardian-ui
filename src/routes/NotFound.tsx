import { Link } from 'react-router';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/States';

export function NotFound() {
  return (
    <div className="page">
      <Card>
        <EmptyState title="Page not found" detail={<Link to="/">Back to the overview</Link>} />
      </Card>
    </div>
  );
}
