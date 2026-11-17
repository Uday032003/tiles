import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Layers,
  Plus,
  Ruler,
} from 'lucide-react';
import { dashboardService } from '../services/dashboardService.js';
import { buildingService } from '../services/buildingService.js';
import { useUI } from '../context/UIContext.js';
import BuildingCard from '../components/buildings/BuildingCard.js';
import BuildingFormModal from '../components/buildings/BuildingFormModal.js';
import LoadingSkeleton from '../components/common/LoadingSkeleton.js';
import EmptyState from '../components/common/EmptyState.js';
import ErrorState from '../components/common/ErrorState.js';
import { formatArea } from '../utils/formatters.js';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { showToast } = useUI();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);

  const summaryQuery = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardService.getSummary(),
  });

  const buildingsQuery = useQuery({
    queryKey: ['dashboard-buildings'],
    queryFn: () => buildingService.list({ limit: 8, sortBy: 'updated_at', sortOrder: 'desc' }),
  });

  const createBuildingMutation = useMutation({
    mutationFn: (payload) => buildingService.create(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-buildings'] });
      showToast(`Building "${created.name}" created.`, 'success');
      navigate(`/buildings/${created.id}`);
    },
  });

  const summary = summaryQuery.data;

  const kpiCards = summary
    ? [
        { label: 'Total Buildings', value: summary.totalBuildings, icon: Building2, color: 'var(--primary)' },
        { label: 'Floor Tile Area', value: formatArea(summary.totalFloorTileArea), icon: Layers, color: 'var(--primary)' },
        { label: 'Wall Tile Area', value: formatArea(summary.totalWallTileArea), icon: Layers, color: '#0ea5e9' },
        { label: 'Granite Area', value: formatArea(summary.totalGraniteArea), icon: Ruler, color: 'var(--warning)' },
        { label: 'Staircase Area', value: formatArea(summary.totalStaircaseArea), icon: Layers, color: '#8b5cf6' },
        { label: 'Total Measured Area', value: formatArea(summary.totalMeasuredArea), icon: Ruler, color: 'var(--text-primary)' },
      ]
    : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Contractor Dashboard</h1>
          <p className="page-subtitle">
            Live overview of buildings, floors, rooms, and tile &amp; granite measurements.
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus size={18} /> New Building
        </button>
      </div>

      {/* Summary KPI Cards */}
      {summaryQuery.isLoading ? (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <LoadingSkeleton lines={3} height={40} />
        </div>
      ) : summaryQuery.isError ? (
        <div style={{ marginBottom: '1.25rem' }}>
          <ErrorState message={summaryQuery.error.message} onRetry={() => summaryQuery.refetch()} />
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '0.75rem',
            marginBottom: '1.25rem',
          }}
        >
          {kpiCards.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="card" style={{ padding: '0.95rem 1.05rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {kpi.label}
                  </span>
                  <Icon size={17} color={kpi.color} />
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Buildings Data */}
      <div style={{ marginTop: '0.75rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.85rem',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Buildings</h2>
            <p className="page-subtitle" style={{ margin: '0.15rem 0 0', fontSize: '0.82rem' }}>
              Your construction sites and measurement workspaces
            </p>
          </div>
          <Link to="/buildings" className="btn btn-secondary btn-sm">
            View All ({summary?.totalBuildings || 0})
          </Link>
        </div>

        {buildingsQuery.isLoading ? (
          <LoadingSkeleton lines={4} height={70} />
        ) : buildingsQuery.isError ? (
          <ErrorState
            message={buildingsQuery.error.message}
            onRetry={() => buildingsQuery.refetch()}
          />
        ) : (buildingsQuery.data?.items || []).length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No buildings yet"
            description="Create your first building to start adding floors, rooms, and tile measurements."
            action={
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setCreateOpen(true)}
              >
                <Plus size={15} /> Add Building
              </button>
            }
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '0.85rem',
            }}
          >
            {buildingsQuery.data.items.map((b) => (
              <BuildingCard key={b.id} building={b} />
            ))}
          </div>
        )}
      </div>

      <BuildingFormModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={(values) => createBuildingMutation.mutateAsync(values)}
      />
    </div>
  );
}

