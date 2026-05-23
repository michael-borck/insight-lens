import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { queries } from '../services/queries';

export function QuickInsightPreview() {
  const { data: units } = useQuery({
    queryKey: ['quick-insight-preview'],
    queryFn: async () => {
      return queries.needsAttention(3);
    }
  });

  if (!units || units.length === 0) {
    return (
      <p className="text-sm text-primary-600">
        All units are performing well!
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {units.map((unit: any, index: number) => (
        <Link
          key={index}
          to={`/unit/${unit.unit_code}`}
          className="flex items-center justify-between p-3 rounded-lg hover:bg-primary-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-warning-500" />
            <div>
              <p className="text-sm font-medium text-primary-800">
                {unit.unit_code}
              </p>
              <p className="text-xs text-primary-600">
                {unit.unit_name}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-primary-800">
              {unit.latest_score.toFixed(1)}%
            </p>
            <p className="text-xs text-primary-600">
              {unit.semester} {unit.year}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}