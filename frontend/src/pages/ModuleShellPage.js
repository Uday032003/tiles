import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Server } from 'lucide-react';
import apiClient from '../services/apiClient.js';
import EmptyState from '../components/common/EmptyState.js';

export default function ModuleShellPage({
  title,
  subtitle,
  icon,
  phaseLabel,
  description,
  showHealthCheck = false,
}) {
  const healthQuery = useQuery({
    queryKey: ['api-health'],
    queryFn: async () => {
      const { data } = await apiClient.get('/health');
      return data.data;
    },
    enabled: showHealthCheck,
    retry: 1,
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        <span className="badge badge-primary">{phaseLabel}</span>
      </div>

      {showHealthCheck && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Server size={18} color="var(--primary)" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>Backend API Connection</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {healthQuery.isLoading
                    ? 'Checking backend status...'
                    : healthQuery.isError
                      ? `Offline (${healthQuery.error.message})`
                      : `Connected • Database: ${healthQuery.data?.database?.ok ? 'Online' : healthQuery.data?.database?.message || 'Not configured'}`}
                </div>
              </div>
            </div>
            {healthQuery.data?.status === 'ok' && (
              <span className="badge badge-success">
                <CheckCircle2 size={14} /> API Ready
              </span>
            )}
          </div>
        </div>
      )}

      <EmptyState icon={icon} title={title} description={description} />
    </div>
  );
}

