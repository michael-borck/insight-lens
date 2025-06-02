import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { Card } from './Card';

interface QuickInsightsProps {
  type: 'trending-up' | 'need-attention';
}

export function QuickInsights({ type }: QuickInsightsProps) {
  // Fetch trending up units
  const { data: trendingUp } = useQuery({
    queryKey: ['quick-insights', 'trending-up'],
    queryFn: async () => {
      return window.electronAPI.queryDatabase(`
        WITH unit_trends AS (
          SELECT 
            u.unit_code,
            u.unit_name,
            us1.overall_experience as latest_score,
            us2.overall_experience as previous_score,
            (us1.overall_experience - us2.overall_experience) as score_change,
            us1.response_rate as latest_response_rate,
            uo1.year as latest_year,
            uo1.semester as latest_semester
          FROM unit_survey us1
          JOIN unit_offering uo1 ON us1.unit_offering_id = uo1.unit_offering_id
          JOIN unit u ON uo1.unit_code = u.unit_code
          LEFT JOIN unit_survey us2 ON us2.survey_id = (
            SELECT us3.survey_id 
            FROM unit_survey us3
            JOIN unit_offering uo3 ON us3.unit_offering_id = uo3.unit_offering_id
            WHERE uo3.unit_code = uo1.unit_code
            AND (uo3.year < uo1.year OR (uo3.year = uo1.year AND uo3.semester < uo1.semester))
            ORDER BY uo3.year DESC, uo3.semester DESC
            LIMIT 1
          )
          WHERE us2.overall_experience IS NOT NULL
        )
        SELECT * FROM unit_trends
        WHERE score_change > 5
        ORDER BY score_change DESC
        LIMIT 10
      `);
    },
    enabled: type === 'trending-up'
  });

  // Fetch units needing attention
  const { data: needAttention } = useQuery({
    queryKey: ['quick-insights', 'need-attention'],
    queryFn: async () => {
      return window.electronAPI.queryDatabase(`
        WITH unit_problems AS (
          SELECT 
            u.unit_code,
            u.unit_name,
            us.overall_experience as latest_score,
            us.response_rate,
            uo.year,
            uo.semester,
            CASE 
              WHEN us.overall_experience < 70 THEN 'Low Score'
              WHEN us.response_rate < 20 THEN 'Low Response Rate'
              ELSE 'Other'
            END as issue_type
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
        )
        SELECT * FROM unit_problems
        ORDER BY latest_score ASC, response_rate ASC
        LIMIT 10
      `);
    },
    enabled: type === 'need-attention'
  });

  const data = type === 'trending-up' ? trendingUp : needAttention;
  const title = type === 'trending-up' ? 'Units Trending Up' : 'Units Needing Attention';
  const icon = type === 'trending-up' ? 
    <TrendingUp className="w-6 h-6 text-green-600" /> : 
    <AlertCircle className="w-6 h-6 text-orange-600" />;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        {icon}
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      </div>

      {!data || data.length === 0 ? (
        <p className="text-sm text-gray-500">
          {type === 'trending-up' 
            ? 'No units showing significant improvement'
            : 'No units currently need attention'}
        </p>
      ) : (
        <div className="space-y-3">
          {data.map((unit: any, index: number) => (
            <Link
              key={index}
              to={`/unit/${unit.unit_code}`}
              className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">
                    {unit.unit_code} - {unit.unit_name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {unit.latest_semester || unit.semester} {unit.latest_year || unit.year}
                  </p>
                </div>
                
                <div className="text-right ml-4">
                  {type === 'trending-up' ? (
                    <>
                      <div className="flex items-center gap-1 text-green-600">
                        <ArrowUp className="w-4 h-4" />
                        <span className="font-medium">
                          +{unit.score_change.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Now: {unit.latest_score.toFixed(1)}%
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-orange-600">
                        {unit.issue_type}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Score: {unit.latest_score.toFixed(1)}%
                      </p>
                      {unit.issue_type === 'Low Response Rate' && (
                        <p className="text-xs text-gray-500">
                          Response: {unit.response_rate.toFixed(1)}%
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}