import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export function QuickInsightPreview() {
  const { data: units } = useQuery({
    queryKey: ['quick-insight-preview'],
    queryFn: async () => {
      return window.electronAPI.queryDatabase(`
        SELECT 
          u.unit_code,
          u.unit_name,
          us.overall_experience,
          us.response_rate,
          uo.year,
          uo.semester
        FROM unit_survey us
        JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
        JOIN unit u ON uo.unit_code = u.unit_code
        WHERE us.survey_id IN (
          SELECT MAX(us2.survey_id)
          FROM unit_survey us2
          JOIN unit_offering uo2 ON us2.unit_offering_id = uo2.unit_offering_id
          WHERE uo2.unit_code = uo.unit_code
          GROUP BY uo2.unit_code
        )
        AND (us.overall_experience < 70 OR us.response_rate < 20)
        ORDER BY us.overall_experience ASC
        LIMIT 3
      `);
    }
  });

  if (!units || units.length === 0) {
    return (
      <p className="text-sm text-gray-500">
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
          className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {unit.unit_code}
              </p>
              <p className="text-xs text-gray-500">
                {unit.unit_name}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {unit.overall_experience.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500">
              {unit.semester} {unit.year}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}