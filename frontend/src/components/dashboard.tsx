import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../api/auth';
import { addLeagueUser, createLeague } from '../api/leagues';
import { getUserLeagues } from '../api/users';
import { getAllSports } from '../sports/registry';
import type { League, SportLeague, User } from '../types';
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorDisplay,
  Field,
  Input,
  LoadingSpinner,
  Modal,
  PageContainer,
  PageHeader,
  Select,
  buttonVariants,
  useToast,
} from './ui';

const roleBadge = (role?: string) =>
  role === 'admin' ? <Badge variant="brand">Admin</Badge> : <Badge>{role ?? 'Player'}</Badge>;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { success } = useToast();
  const sports = getAllSports();

  const [user, setUser] = useState<User | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newLeagueName, setNewLeagueName] = useState('');
  const [sportLeague, setSportLeague] = useState<SportLeague>('NFL');
  const [joinCode, setJoinCode] = useState('');
  const [formError, setFormError] = useState('');

  const refreshLeagues = async (userId: string) => {
    const data = await getUserLeagues(userId);
    setLeagues(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const current = await getCurrentUser();
        const userId = current?.userId;

        if (!current || !userId) {
          if (!cancelled) navigate('/');
          return;
        }

        if (cancelled) return;
        setUser({ ...current, id: current.userId });

        const data = await getUserLeagues(userId);
        if (!cancelled) setLeagues(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error('Failed to load dashboard data', err);
        if (!cancelled) setError(err?.message ?? 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const closeCreate = () => {
    setCreateOpen(false);
    setNewLeagueName('');
    setSportLeague('NFL');
    setFormError('');
  };

  const closeJoin = () => {
    setJoinOpen(false);
    setJoinCode('');
    setFormError('');
  };

  const handleCreate = async () => {
    const name = newLeagueName.trim();
    const userId = user?.userId;
    if (!userId) return;

    if (!name) {
      setFormError('Give your league a name.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const created = await createLeague({ name, sportLeague });

      // Creating a league does not make you a member of it, so the creator is
      // added as its admin immediately afterwards. If that second call fails
      // the league exists with nobody in it, which the user has to know about —
      // the previous version only logged it to the console.
      try {
        await addLeagueUser(created.leagueId!, { userId, role: 'admin' });
      } catch (err) {
        console.error('Error while adding user to league', err);
        setFormError(
          'The league was created, but adding you to it failed. Try joining it with its access code.',
        );
        return;
      }

      await refreshLeagues(userId);
      success(`Created ${name}`);
      closeCreate();
    } catch (err: any) {
      console.error('Failed to create league', err);
      setFormError(err?.message ?? 'Failed to create league');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async () => {
    const code = joinCode.trim();
    const userId = user?.userId;
    if (!userId) return;

    if (!code) {
      setFormError('Enter the access code you were given.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      await addLeagueUser(code, { userId, role: 'player' });
      await refreshLeagues(userId);
      success('Joined league');
      closeJoin();
    } catch (err: any) {
      console.error('Failed to join league', err);
      setFormError(
        err?.status === 404
          ? "That access code doesn't match any league."
          : (err?.message ?? 'Failed to join league'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title="Dashboard" breadcrumbs={[{ label: 'Dashboard' }]} />
        <LoadingSpinner message="Loading your leagues..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <PageHeader title="Dashboard" breadcrumbs={[{ label: 'Dashboard' }]} />
        <ErrorDisplay
          message={error}
          action={{ label: 'Return to sign in', onClick: () => navigate('/') }}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Your leagues"
        description={user?.email ?? undefined}
        breadcrumbs={[{ label: 'Dashboard' }]}
        actions={
          <>
            <Button variant="secondary" onClick={() => setJoinOpen(true)}>
              Join league
            </Button>
            <Button onClick={() => setCreateOpen(true)}>Create league</Button>
          </>
        }
      />

      {leagues.length === 0 ? (
        <EmptyState
          title="No leagues yet"
          description="Create a league and invite your friends with its access code, or join one you've already been given a code for."
          action={
            <>
              <Button onClick={() => setCreateOpen(true)}>Create league</Button>
              <Button variant="secondary" onClick={() => setJoinOpen(true)}>
                Join league
              </Button>
            </>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {leagues.map((league) => (
            <Card key={league.leagueId} className="flex flex-col">
              <CardBody className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 break-words text-base font-semibold text-text-strong">
                    {league.name || 'Unnamed league'}
                  </h2>
                  {roleBadge(league.role)}
                </div>

                {league.sportLeague && (
                  <div className="mt-2">
                    <Badge variant="neutral" size="sm">
                      {league.sportLeague}
                    </Badge>
                  </div>
                )}

                <div className="mt-5 flex-1" />

                <Link
                  to={`/league/${league.leagueId}`}
                  className={buttonVariants({ variant: 'secondary', fullWidth: true })}
                >
                  Open league
                </Link>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create ───────────────────────────────────────────────────────── */}
      <Modal
        open={createOpen}
        onClose={closeCreate}
        title="Create a league"
        description="You'll be its admin, and can invite players with the access code afterwards."
        footer={
          <>
            <Button variant="ghost" onClick={closeCreate}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={submitting}>
              Create league
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="League name" required>
            {(field) => (
              <Input
                {...field}
                value={newLeagueName}
                onChange={(event) => setNewLeagueName(event.target.value)}
                placeholder="Sunday Money League"
              />
            )}
          </Field>

          <Field label="Sport" hint="This decides the positions your lineup is drafted from.">
            {(field) => (
              <Select
                {...field}
                value={sportLeague}
                onChange={(event) => setSportLeague(event.target.value as SportLeague)}
              >
                {sports.map((sport) => (
                  <option key={sport.key} value={sport.key}>
                    {sport.displayName}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          {formError && <p className="text-sm text-danger">{formError}</p>}
        </div>
      </Modal>

      {/* ── Join ─────────────────────────────────────────────────────────── */}
      <Modal
        open={joinOpen}
        onClose={closeJoin}
        title="Join a league"
        description="Ask the league admin for its access code."
        footer={
          <>
            <Button variant="ghost" onClick={closeJoin}>
              Cancel
            </Button>
            <Button onClick={handleJoin} loading={submitting}>
              Join league
            </Button>
          </>
        }
      >
        <Field label="Access code" required>
          {(field) => (
            <Input
              {...field}
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              placeholder="Paste the code you were given"
            />
          )}
        </Field>

        {formError && <p className="mt-3 text-sm text-danger">{formError}</p>}
      </Modal>
    </PageContainer>
  );
};

export default Dashboard;
