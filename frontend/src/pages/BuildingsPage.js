import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Search } from 'lucide-react';
import { buildingService } from '../services/buildingService.js';
import { useUI } from '../context/UIContext.js';
import BuildingCard from '../components/buildings/BuildingCard.js';
import BuildingFormModal from '../components/buildings/BuildingFormModal.js';
import LoadingSkeleton from '../components/common/LoadingSkeleton.js';
import EmptyState from '../components/common/EmptyState.js';
import ErrorState from '../components/common/ErrorState.js';

export default function BuildingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { searchQuery, setSearchQuery, showToast } = useUI();
  const queryClient = useQueryClient();

  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setIsCreateOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const buildingsQuery = useQuery({
    queryKey: ['buildings', { search: searchQuery, sortBy, sortOrder, page }],
    queryFn: () =>
      buildingService.list({
        search: searchQuery,
        sortBy,
        sortOrder,
        page,
        limit: 18,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => buildingService.create(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      showToast(`Building "${created.name}" created.`, 'success');
      navigate(`/buildings/${created.id}`);
    },
  });

  const items = buildingsQuery.data?.items || [];
  const meta = buildingsQuery.data?.meta || { page: 1, totalPages: 1, total: 0 };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Buildings</h1>
          <p className="page-subtitle">
            Manage all construction sites, floors, and rooms ({meta.total} total).
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
          <Plus size={18} />
          Add Building
        </button>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
        <div className="filter-bar" style={{ marginBottom: '0.85rem' }}>
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="search"
              className="form-input"
              style={{ paddingLeft: '2.3rem', minHeight: 40 }}
              placeholder="Search by building name, customer, location, or code..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select
              className="form-select"
              style={{ minHeight: 40, width: 'auto' }}
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split(':');
                setSortBy(field);
                setSortOrder(order);
                setPage(1);
              }}
              aria-label="Sort buildings"
            >
              <option value="updated_at:desc">Recently Updated</option>
              <option value="created_at:desc">Newest Created</option>
              <option value="name:asc">Name (A–Z)</option>
              <option value="total_area:desc">Largest Area</option>
            </select>
          </div>
        </div>
      </div>

      {buildingsQuery.isLoading ? (
        <div className="grid-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card">
              <LoadingSkeleton lines={5} height={18} />
            </div>
          ))}
        </div>
      ) : buildingsQuery.isError ? (
        <ErrorState message={buildingsQuery.error.message} onRetry={() => buildingsQuery.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={searchQuery ? 'No matching buildings found' : 'No buildings yet'}
          description={
            searchQuery
              ? 'Try clearing your search query.'
              : 'Create your first building to start adding floors, rooms, and tile/granite measurements.'
          }
          action={
            <button type="button" className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
              <Plus size={16} /> Add Building
            </button>
          }
        />
      ) : (
        <>
          <div className="grid-3">
            {items.map((building) => (
              <BuildingCard key={building.id} building={building} />
            ))}
          </div>

          {meta.totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.75rem',
                marginTop: '1.5rem',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <BuildingFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={(values) => createMutation.mutateAsync(values)}
      />
    </div>
  );
}

