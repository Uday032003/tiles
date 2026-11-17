import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import { staffService } from '../../services/staffService.js';
import { buildingService } from '../../services/buildingService.js';
import { useUI } from '../../context/UIContext.js';
import LoadingSkeleton from '../common/LoadingSkeleton.js';
import Modal from '../common/Modal.js';

export default function StaffAccessPanel() {
  const { showToast } = useUI();
  const queryClient = useQueryClient();

  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [createStaffOpen, setCreateStaffOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [grantForm, setGrantForm] = useState({
    userId: '',
    canViewMeasurements: true,
    canEditMeasurements: false,
  });

  const staffQuery = useQuery({
    queryKey: ['staff-users'],
    queryFn: () => staffService.listStaff(),
  });

  const buildingsQuery = useQuery({
    queryKey: ['buildings', 'selector'],
    queryFn: () => buildingService.list({ limit: 100 }),
  });

  const buildings = buildingsQuery.data?.items || [];
  const staffList = staffQuery.data || [];

  useEffect(() => {
    if (!selectedBuildingId && buildings.length > 0) {
      setSelectedBuildingId(buildings[0].id);
    }
  }, [buildings, selectedBuildingId]);

  useEffect(() => {
    if (!grantForm.userId && staffList.length > 0) {
      setGrantForm((prev) => ({ ...prev, userId: staffList[0].id }));
    }
  }, [staffList, grantForm.userId]);

  const permissionsQuery = useQuery({
    queryKey: ['building-permissions', selectedBuildingId],
    queryFn: () => staffService.listBuildingPermissions(selectedBuildingId),
    enabled: Boolean(selectedBuildingId),
  });

  const createStaffMutation = useMutation({
    mutationFn: () =>
      staffService.createStaff({
        fullName: staffForm.fullName.trim(),
        email: staffForm.email.trim(),
        phone: staffForm.phone.trim() || null,
        password: staffForm.password,
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['staff-users'] });
      setGrantForm((p) => ({ ...p, userId: created.id }));
      setStaffForm({ fullName: '', email: '', phone: '', password: '' });
      setCreateStaffOpen(false);
      showToast(`Created staff user "${created.fullName}"`, 'success');
    },
    onError: (err) => {
      showToast(err.message || 'Failed to create staff account', 'error');
    },
  });

  const upsertPermMutation = useMutation({
    mutationFn: (payload) => staffService.upsertBuildingPermission(selectedBuildingId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['building-permissions', selectedBuildingId] });
      showToast('Staff building permissions updated', 'success');
    },
    onError: (err) => {
      showToast(err.message || 'Failed to update permissions', 'error');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (userId) => staffService.revokeBuildingPermission(selectedBuildingId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['building-permissions', selectedBuildingId] });
      showToast('Staff access revoked', 'info');
    },
    onError: (err) => {
      showToast(err.message || 'Failed to revoke access', 'error');
    },
  });

  const permissions = permissionsQuery.data || [];

  return (
    <section className="card" style={{ marginTop: '1rem' }}>
      <div
        className="card-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}
      >
        <div>
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={18} color="var(--primary)" /> Staff Accounts & Building Permissions
          </h2>
          <p className="muted" style={{ margin: '0.2rem 0 0', fontSize: '0.84rem' }}>
            Add site supervisors and control per-building access to site measurements.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setCreateStaffOpen(true)}
        >
          <UserPlus size={15} /> Add Staff User
        </button>
      </div>

      {staffQuery.isLoading ? (
        <LoadingSkeleton count={2} height={54} />
      ) : staffList.length === 0 ? (
        <div className="stat-mini" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Users size={18} color="var(--text-muted)" />
          <span className="muted" style={{ fontSize: '0.86rem' }}>
            No staff users yet. Click &ldquo;Add Staff User&rdquo; when you want to delegate site
            measurements or progress updates.
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <label className="form-label" style={{ margin: 0 }}>
              Building Access For:
            </label>
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: 230 }}
              value={selectedBuildingId}
              onChange={(e) => setSelectedBuildingId(e.target.value)}
            >
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.buildingCode})
                </option>
              ))}
            </select>
          </div>

          {selectedBuildingId && (
            <div className="stat-mini">
              <strong style={{ fontSize: '0.86rem', display: 'block', marginBottom: '0.55rem' }}>
                Assign / Update Staff Access
              </strong>
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <select
                  className="form-select"
                  style={{ width: 'auto', minWidth: 200 }}
                  value={grantForm.userId}
                  onChange={(e) => setGrantForm((p) => ({ ...p, userId: e.target.value }))}
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.email})
                    </option>
                  ))}
                </select>

                {[
                  ['canViewMeasurements', 'View Meas'],
                  ['canEditMeasurements', 'Edit Meas'],
                ].map(([field, label]) => (
                  <label
                    key={field}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(grantForm[field])}
                      onChange={(e) =>
                        setGrantForm((p) => ({ ...p, [field]: e.target.checked }))
                      }
                    />
                    {label}
                  </label>
                ))}

                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!grantForm.userId || upsertPermMutation.isPending}
                  onClick={() => upsertPermMutation.mutate(grantForm)}
                >
                  Save Access
                </button>
              </div>
            </div>
          )}

          {permissions.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Measurements</th>
                    <th style={{ textAlign: 'right' }}>Revoke</th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((perm) => (
                    <tr key={perm.id}>
                      <td>
                        <strong>{perm.fullName}</strong>
                        <div className="muted" style={{ fontSize: '0.76rem' }}>
                          {perm.email}
                        </div>
                      </td>
                      <td>
                        {perm.canEditMeasurements
                          ? 'View + Edit'
                          : perm.canViewMeasurements
                            ? 'View Only'
                            : 'None'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="icon-btn danger"
                          title="Revoke access"
                          onClick={() => revokeMutation.mutate(perm.userId)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={createStaffOpen}
        onClose={() => setCreateStaffOpen(false)}
        title="Add Staff Account"
        maxWidth={460}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setCreateStaffOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-staff-form"
              className="btn btn-primary"
              disabled={createStaffMutation.isPending}
            >
              {createStaffMutation.isPending ? 'Creating...' : 'Create Staff'}
            </button>
          </>
        }
      >
        <form
          id="create-staff-form"
          onSubmit={(e) => {
            e.preventDefault();
            createStaffMutation.mutate();
          }}
        >
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              required
              value={staffForm.fullName}
              onChange={(e) => setStaffForm((p) => ({ ...p, fullName: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              required
              value={staffForm.email}
              onChange={(e) => setStaffForm((p) => ({ ...p, email: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Phone (Optional)</label>
            <input
              type="tel"
              className="form-input"
              value={staffForm.phone}
              onChange={(e) => setStaffForm((p) => ({ ...p, phone: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Temporary Password</label>
            <input
              type="password"
              minLength={8}
              className="form-input"
              required
              value={staffForm.password}
              onChange={(e) => setStaffForm((p) => ({ ...p, password: e.target.value }))}
            />
          </div>
        </form>
      </Modal>
    </section>
  );
}

