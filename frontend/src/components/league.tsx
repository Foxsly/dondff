import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getCurrentUser } from '../api/auth';
import { getLeagueUsers } from '../api/leagues';
import { getUser } from '../api/users';
import { useLeague } from '../contexts/LeagueContext';
import type { User } from '../types';
import MembersTab, { type LeagueMemberWithUser } from './league/MembersTab';
import SettingsTab from './league/SettingsTab';
import Seasons from './seasons';
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CopyField,
  ErrorDisplay,
  LoadingSpinner,
  PageContainer,
  PageHeader,
  TabPanel,
  Tabs,
  buttonVariants,
} from './ui';

const League: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const {
    league,
    positions,
    sportConfig,
    loading: leagueLoading,
    error: leagueError,
    refresh: refreshLeague,
  } = useLeague();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [members, setMembers] = useState<LeagueMemberWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');

  const loadMembers = useCallback(async () => {
    if (!leagueId) return;

    const leagueUsers = await getLeagueUsers(leagueId);

    // The roster endpoint returns ids only, so each profile is a separate
    // request. Run them together rather than in sequence — a twelve-person
    // league is twelve round trips either way, but not twelve in a row.
    const withUsers = await Promise.all(
      (Array.isArray(leagueUsers) ? leagueUsers : []).map(async (member) => {
        try {
          const user = await getUser(member.userId);
          return { userId: member.userId, role: member.role, user };
        } catch {
          // One unreadable profile shouldn't blank the whole roster.
          return { userId: member.userId, role: member.role, user: undefined };
        }
      }),
    );

    setMembers(withUsers);
  }, [leagueId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError('');
        setLoading(true);

        const current = await getCurrentUser();
        const userId = current?.id || current?.userId;

        if (!current || !userId) {
          if (!cancelled) navigate('/');
          return;
        }

        if (cancelled) return;
        setCurrentUser(current);

        await loadMembers();
      } catch (err: any) {
        console.error('Failed to load league', err);
        if (!cancelled) setError(err?.message ?? 'Failed to load league');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (leagueId) {
      load();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [leagueId, navigate, loadMembers]);

  const isLoading = loading || leagueLoading;
  const displayError = error || leagueError;

  const currentUserId = currentUser?.id || currentUser?.userId;
  const currentMember = members.find((member) => member.userId === currentUserId);
  const isAdmin = currentMember?.role === 'admin';

  const breadcrumbs = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: league?.name || 'League' },
  ];

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader title="League" breadcrumbs={breadcrumbs} />
        <LoadingSpinner message="Loading league..." />
      </PageContainer>
    );
  }

  if (displayError) {
    return (
      <PageContainer>
        <PageHeader title="League" breadcrumbs={breadcrumbs} />
        <ErrorDisplay
          message={displayError}
          action={{ label: 'Return to dashboard', onClick: () => navigate('/dashboard') }}
        />
      </PageContainer>
    );
  }

  const tabs = [
    { value: 'overview', label: 'Overview' },
    {
      value: 'members',
      label: 'Members',
      badge: <Badge size="sm">{members.length}</Badge>,
    },
    // Settings is admin-only. The endpoints behind it are not role-checked
    // server-side, so this hides the controls rather than enforcing access.
    ...(isAdmin ? [{ value: 'settings', label: 'Settings' }] : []),
  ];

  return (
    <PageContainer>
      <PageHeader
        title={league?.name || 'League'}
        breadcrumbs={breadcrumbs}
        meta={
          <>
            {sportConfig && <Badge variant="brand">{sportConfig.displayName}</Badge>}
            {currentMember && (
              <Badge variant={isAdmin ? 'gold' : 'neutral'}>{currentMember.role}</Badge>
            )}
          </>
        }
        actions={
          league?.currentSeason && league?.currentEventGroupId ? (
            <Link
              to="/game/setting-lineups"
              state={{
                leagueId,
                season: league.currentSeason,
                eventGroupId: league.currentEventGroupId,
              }}
              className={buttonVariants({ variant: 'primary' })}
            >
              Play current game
            </Link>
          ) : undefined
        }
      />

      <Tabs items={tabs} value={tab} onChange={setTab}>
        <TabPanel value="overview">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Seasons</CardTitle>
              </CardHeader>
              <CardBody>
                <Seasons leagueId={leagueId!} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Invite players</CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                <p className="text-sm text-text-muted">
                  Share this code — anyone with it can join the league from their dashboard.
                </p>
                <CopyField label="Access code" value={leagueId!} />
              </CardBody>
            </Card>
          </div>
        </TabPanel>

        <TabPanel value="members">
          <MembersTab
            leagueId={leagueId!}
            members={members}
            currentUserId={currentUserId}
            isAdmin={!!isAdmin}
            onChanged={loadMembers}
          />
        </TabPanel>

        {isAdmin && (
          <TabPanel value="settings">
            <SettingsTab
              leagueId={leagueId!}
              leagueName={league?.name ?? ''}
              positions={positions}
              sportConfig={sportConfig}
              // The name is held in LeagueContext, so a rename has to refresh
              // it or the header and breadcrumb keep showing the old one.
              onChanged={refreshLeague}
            />
          </TabPanel>
        )}
      </Tabs>
    </PageContainer>
  );
};

export default League;
