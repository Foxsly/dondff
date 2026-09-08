import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteLeague, updateLeague } from '../../api/leagues';
import type { LeaguePosition } from '../../types';
import type { SportConfig } from '../../sports/types';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Modal,
  useToast,
} from '../ui';

export interface SettingsTabProps {
  leagueId: string;
  leagueName: string;
  positions: LeaguePosition[];
  sportConfig: SportConfig | null;
  onChanged: () => void | Promise<void>;
}

/**
 * Admin-only league settings.
 *
 * Sport is deliberately read-only: it decides the position set a lineup is
 * drafted from, so changing it on a league with existing entries would leave
 * those entries referencing positions the league no longer has.
 */
export const SettingsTab: React.FC<SettingsTabProps> = ({
  leagueId,
  leagueName,
  positions,
  sportConfig,
  onChanged,
}) => {
  const navigate = useNavigate();
  const { success, error: errorToast } = useToast();

  const [name, setName] = useState(leagueName);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const isDirty = name.trim() !== leagueName && name.trim().length > 0;

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('A league needs a name.');
      return;
    }

    setSaving(true);
    setNameError('');
    try {
      await updateLeague(leagueId, { name: trimmed });
      await onChanged();
      success('League renamed');
    } catch (err: any) {
      console.error('Failed to rename league', err);
      setNameError(err?.message ?? 'Failed to rename league');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteLeague(leagueId);
      success(`Deleted ${leagueName}`);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Failed to delete league', err);
      errorToast(err?.message ?? 'Failed to delete league');
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>League details</CardTitle>
        </CardHeader>
        <CardBody className="space-y-5">
          <Field label="League name" error={nameError} required>
            {(field) => (
              <Input
                {...field}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            )}
          </Field>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-muted">Sport</span>
            <div className="flex items-center gap-2">
              <Badge variant="brand">{sportConfig?.displayName ?? 'Unknown'}</Badge>
              <span className="text-xs text-text-subtle">
                Can't be changed after a league is created.
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-muted">Lineup positions</span>
            {positions.length === 0 ? (
              <p className="text-xs text-text-subtle">No positions configured.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {positions.map((position) => (
                  <Badge key={position.position} variant="neutral">
                    {sportConfig?.getPositionDisplayName(position.position) ?? position.position}
                    <span className="ml-1 font-normal text-text-subtle">
                      · pool {position.poolSize}
                    </span>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardBody>
        <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-4">
          <Button
            variant="ghost"
            disabled={!isDirty || saving}
            onClick={() => {
              setName(leagueName);
              setNameError('');
            }}
          >
            Reset
          </Button>
          <Button disabled={!isDirty} loading={saving} onClick={handleSave}>
            Save changes
          </Button>
        </div>
      </Card>

      {/* ── Danger zone ──────────────────────────────────────────────────── */}
      <Card tone="danger">
        <CardHeader tone="danger">
          <CardTitle tone="danger">Danger zone</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-text">Delete this league</p>
            <p className="mt-0.5 text-sm text-text-muted">
              Removes the league, its members and every entry. This can't be undone.
            </p>
          </div>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            Delete league
          </Button>
        </CardBody>
      </Card>

      <Modal
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setConfirmText('');
        }}
        title="Delete this league?"
        dismissOnBackdrop={false}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteOpen(false);
                setConfirmText('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              // Typing the name is the point: it makes deletion deliberate
              // rather than a mis-click on a red button.
              disabled={confirmText !== leagueName}
              loading={deleting}
              onClick={handleDelete}
            >
              Delete permanently
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Alert variant="danger">
            Every entry, result and member of this league is deleted. There is no undo.
          </Alert>

          <Field
            label={`Type "${leagueName}" to confirm`}
            hint="This is case-sensitive."
          >
            {(field) => (
              <Input
                {...field}
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                placeholder={leagueName}
                autoComplete="off"
              />
            )}
          </Field>
        </div>
      </Modal>
    </div>
  );
};

export default SettingsTab;
