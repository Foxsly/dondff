import React, { useState } from 'react';
import { removeLeagueUser, updateLeagueUser } from '../../api/leagues';
import type { User } from '../../types';
import {
  Badge,
  Button,
  Card,
  Modal,
  Select,
  useToast,
} from '../ui';

export interface LeagueMemberWithUser {
  userId: string;
  role?: string;
  user?: User;
}

export interface MembersTabProps {
  leagueId: string;
  members: LeagueMemberWithUser[];
  /** The signed-in user, so they can be marked and protected from self-removal. */
  currentUserId?: string;
  isAdmin: boolean;
  onChanged: () => void | Promise<void>;
}

const displayNameOf = (member: LeagueMemberWithUser): string =>
  member.user?.name || member.user?.email || 'Unknown member';

const initialsOf = (label: string): string => {
  const words = label.split('@')[0].trim().split(/[\s._-]+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

/**
 * League roster with admin controls.
 *
 * The role select and remove button are gated on `isAdmin`, but note that the
 * backend endpoints behind them (PUT/DELETE /leagues/:id/users/:userId) do not
 * check the caller's role — this is a UI affordance, not access control.
 */
export const MembersTab: React.FC<MembersTabProps> = ({
  leagueId,
  members,
  currentUserId,
  isAdmin,
  onChanged,
}) => {
  const { success, error: errorToast } = useToast();
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<LeagueMemberWithUser | null>(null);
  const [removing, setRemoving] = useState(false);
  // Bumped whenever a role change is rejected. The <select> is controlled by
  // `member.role`, so refusing a change without touching state would leave the
  // browser showing the option the user picked while the real role is
  // unchanged. Forcing a render snaps it back to the truth.
  const [, forceResync] = useState(0);

  const adminCount = members.filter((member) => member.role === 'admin').length;

  const handleRoleChange = async (member: LeagueMemberWithUser, role: string) => {
    if (role === member.role) return;

    // Demoting the only admin would leave the league with nobody able to manage
    // it, and no way back short of a database edit.
    if (member.role === 'admin' && role !== 'admin' && adminCount === 1) {
      errorToast('Promote someone else to admin first — a league needs at least one.');
      forceResync((n) => n + 1);
      return;
    }

    setPendingUserId(member.userId);
    try {
      await updateLeagueUser(leagueId, member.userId, { role });
      await onChanged();
      success(`${displayNameOf(member)} is now ${role}`);
    } catch (err: any) {
      console.error('Failed to update role', err);
      errorToast(err?.message ?? 'Failed to update role');
    } finally {
      setPendingUserId(null);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;

    setRemoving(true);
    try {
      await removeLeagueUser(leagueId, removeTarget.userId);
      await onChanged();
      success(`Removed ${displayNameOf(removeTarget)}`);
      setRemoveTarget(null);
    } catch (err: any) {
      console.error('Failed to remove member', err);
      errorToast(err?.message ?? 'Failed to remove member');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <Card>
        <ul className="divide-y divide-border">
          {members.map((member) => {
            const label = displayNameOf(member);
            const isSelf = member.userId === currentUserId;
            const isBusy = pendingUserId === member.userId;

            return (
              <li
                key={member.userId}
                className="flex flex-wrap items-center gap-3 px-5 py-4"
              >
                <span
                  aria-hidden
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand"
                >
                  {initialsOf(label)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-strong">
                    {label}
                    {isSelf && <span className="ml-1.5 text-xs text-text-subtle">(you)</span>}
                  </p>
                  {member.user?.email && member.user.email !== label && (
                    <p className="truncate text-xs text-text-subtle">{member.user.email}</p>
                  )}
                </div>

                {isAdmin ? (
                  <div className="flex items-center gap-2">
                    <Select
                      aria-label={`Role for ${label}`}
                      value={member.role ?? 'player'}
                      disabled={isBusy}
                      onChange={(event) => handleRoleChange(member, event.target.value)}
                      className="w-32"
                    >
                      <option value="player">Player</option>
                      <option value="admin">Admin</option>
                    </Select>

                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isSelf || isBusy}
                      // Removing yourself would drop you out of a league you are
                      // currently administering, mid-session.
                      title={isSelf ? 'You cannot remove yourself' : undefined}
                      onClick={() => setRemoveTarget(member)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <Badge variant={member.role === 'admin' ? 'brand' : 'neutral'}>
                    {member.role ?? 'player'}
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <Modal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Remove this member?"
        size="sm"
        dismissOnBackdrop={false}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={removing} onClick={handleRemove}>
              Remove member
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          {removeTarget && (
            <>
              <span className="font-medium text-text">{displayNameOf(removeTarget)}</span> will
              lose access to this league. Their existing entries are kept.
            </>
          )}
        </p>
      </Modal>
    </>
  );
};

export default MembersTab;
