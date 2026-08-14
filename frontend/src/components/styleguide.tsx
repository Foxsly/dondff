import React, { useState } from 'react';
import {
  Accordion,
  Alert,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  EmptyState,
  ErrorDisplay,
  Field,
  Input,
  LoadingSpinner,
  Modal,
  PageContainer,
  PageHeader,
  Select,
  Skeleton,
  Spinner,
  StatTile,
  TabPanel,
  Tabs,
  useToast,
} from './ui';
import type { ButtonVariant } from './ui';

/**
 * Development-only styleguide at /ui.
 *
 * Exists so the primitives can be reviewed together — every variant, size and
 * state on one page — rather than by hunting for them across the app. It is
 * excluded from production builds by the NODE_ENV check on its route in App.tsx.
 */

const Section: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({
  title,
  description,
  children,
}) => (
  <section className="border-t border-border py-8">
    <h2 className="text-lg font-semibold text-text-strong">{title}</h2>
    {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
    <div className="mt-5">{children}</div>
  </section>
);

const Row: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-wrap items-center gap-3">{children}</div>
);

const Styleguide: React.FC = () => {
  const { success, error, toast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tab, setTab] = useState('overview');
  const [checked, setChecked] = useState(true);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const buttonVariantList: ButtonVariant[] = [
    'primary',
    'secondary',
    'outline',
    'ghost',
    'danger',
  ];

  const handleLoadingDemo = () => {
    setLoading(true);
    window.setTimeout(() => setLoading(false), 1600);
  };

  return (
    <PageContainer width="wide">
      <PageHeader
        title="UI Primitives"
        description="Phase 2 component library. Development-only route."
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Styleguide' }]}
        meta={<Badge variant="brand">v1</Badge>}
        actions={<Button variant="secondary" onClick={() => toast({ message: 'Hello from a toast' })}>Fire toast</Button>}
      />

      <Section title="Colour tokens" description="Every surface, text and status value in the system.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {[
            ['bg', 'bg-bg'],
            ['surface-sunken', 'bg-surface-sunken'],
            ['surface', 'bg-surface'],
            ['surface-raised', 'bg-surface-raised'],
            ['surface-overlay', 'bg-surface-overlay'],
            ['border', 'bg-border'],
            ['border-strong', 'bg-border-strong'],
            ['brand', 'bg-brand'],
            ['gold', 'bg-gold'],
            ['success', 'bg-success'],
            ['warn', 'bg-warn'],
            ['danger', 'bg-danger'],
          ].map(([label, className]) => (
            <div key={label}>
              <div className={`h-14 rounded border border-border ${className}`} />
              <p className="mt-1.5 font-mono text-xs text-text-subtle">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-1">
          <p className="text-text-strong">text-strong — headings and names</p>
          <p className="text-text">text — body copy and player names</p>
          <p className="text-text-muted">text-muted — secondary figures</p>
          <p className="text-text-subtle">text-subtle — micro labels</p>
          <p className="text-text-faint">text-faint — placeholders and empty slots</p>
        </div>
      </Section>

      <Section title="Typography" description="Archivo for display, Inter for UI, tabular figures for scores.">
        <h1 className="text-3xl font-bold">Deal or No Deal</h1>
        <h2 className="mt-2 text-2xl font-semibold">Week 14 standings</h2>
        <p className="mt-3 max-w-prose text-sm text-text-muted">
          Body copy runs on Inter at a comfortable measure. Headings use Archivo at 88% width,
          which is where the broadcast feel comes from without a second font file.
        </p>
        <p className="tnum mt-3 font-mono text-2xl">128.40 · 96.75 · 104.02</p>
      </Section>

      <Section title="Button" description="Five variants, three sizes, plus loading and icon states.">
        <div className="space-y-3">
          {buttonVariantList.map((variant) => (
            <Row key={variant}>
              <span className="w-20 font-mono text-xs text-text-subtle">{variant}</span>
              <Button variant={variant} size="sm">Small</Button>
              <Button variant={variant} size="md">Medium</Button>
              <Button variant={variant} size="lg">Large</Button>
              <Button variant={variant} disabled>Disabled</Button>
              <Button variant={variant} loading>Loading</Button>
            </Row>
          ))}
          <Row>
            <span className="w-20 font-mono text-xs text-text-subtle">async</span>
            <Button loading={loading} onClick={handleLoadingDemo}>
              {loading ? 'Saving' : 'Click to load'}
            </Button>
            <Button fullWidth className="mt-3">Full width</Button>
          </Row>
        </div>
      </Section>

      <Section title="Badge">
        <Row>
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="brand">NFL</Badge>
          <Badge variant="success">Finished</Badge>
          <Badge variant="warn">Playing</Badge>
          <Badge variant="danger">Out</Badge>
          <Badge variant="info">Pending</Badge>
          <Badge variant="gold">1st</Badge>
          <Badge variant="brand" size="sm">Small</Badge>
        </Row>
      </Section>

      <Section title="Card">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader actions={<Badge variant="brand">NFL</Badge>}>
              <CardTitle>Sunday Money League</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-text-muted">
                Standard card with a header, body and footer.
              </p>
            </CardBody>
            <CardFooter>
              <Button size="sm">Open</Button>
              <Button size="sm" variant="ghost">Settings</Button>
            </CardFooter>
          </Card>

          <Card interactive>
            <CardBody>
              <CardTitle>Interactive card</CardTitle>
              <p className="mt-1.5 text-sm text-text-muted">Hover me — the whole card is a target.</p>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex gap-6">
              <StatTile label="Proj Total" value="32.60" tone="muted" />
              <StatTile label="Final Score" value="40.70" tone="success" size="lg" align="right" />
            </CardBody>
          </Card>
        </div>
      </Section>

      <Section title="Form controls" description="Field supplies the label, hint, error text and ARIA wiring.">
        <div className="grid max-w-3xl gap-5 sm:grid-cols-2">
          <Field label="League name" hint="Shown to everyone you invite." required>
            {(field) => (
              <Input
                {...field}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sunday Money League"
              />
            )}
          </Field>

          <Field label="Access code" error="That code doesn't match any league.">
            {(field) => <Input {...field} defaultValue="XY7-99Q" />}
          </Field>

          <Field label="Sport">
            {(field) => (
              <Select {...field} defaultValue="">
                <option value="" disabled>Choose a sport</option>
                <option value="NFL">NFL</option>
                <option value="GOLF">Golf</option>
                <option value="WORLDCUP">World Cup</option>
              </Select>
            )}
          </Field>

          <Field label="Disabled input">
            {(field) => <Input {...field} disabled placeholder="Not editable" />}
          </Field>
        </div>

        <div className="mt-5 space-y-2">
          <Checkbox
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            label="Include this player in the group game"
            description="They'll be prompted to pick a case."
          />
          <Checkbox label="Unchecked option" />
          <Checkbox label="Disabled option" disabled />
        </div>
      </Section>

      <Section title="Alert">
        <div className="max-w-2xl space-y-3">
          <Alert variant="info" title="Week 14 opens Thursday">Entries lock at kickoff.</Alert>
          <Alert variant="success" title="Lineup submitted" />
          <Alert variant="warn" title="Two players still unset">You can still play the remaining positions.</Alert>
          <Alert variant="danger" title="Couldn't join league" onDismiss={() => undefined}>
            That access code doesn't match any league.
          </Alert>
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs
          items={[
            { value: 'overview', label: 'Overview' },
            { value: 'members', label: 'Members', badge: <Badge size="sm">8</Badge> },
            { value: 'settings', label: 'Settings' },
            { value: 'archive', label: 'Archive', disabled: true },
          ]}
          value={tab}
          onChange={setTab}
        >
          <TabPanel value="overview">
            <p className="text-sm text-text-muted">
              Arrow keys move between tabs; only the selected tab is in the tab order.
            </p>
          </TabPanel>
          <TabPanel value="members"><p className="text-sm text-text-muted">Member list goes here.</p></TabPanel>
          <TabPanel value="settings"><p className="text-sm text-text-muted">League settings go here.</p></TabPanel>
        </Tabs>
      </Section>

      <Section title="Accordion">
        <div className="space-y-3">
          <Accordion title="Week 14" meta={<Badge variant="warn">Playing</Badge>} defaultOpen>
            <p className="text-sm text-text-muted">Entries for this week.</p>
          </Accordion>
          <Accordion title="Week 13" meta={<Badge variant="success">Finished</Badge>}>
            <p className="text-sm text-text-muted">Results for this week.</p>
          </Accordion>
        </div>
      </Section>

      <Section title="Modal" description="Focus is trapped, Escape closes, and focus returns to the trigger.">
        <Row>
          <Button onClick={() => setModalOpen(true)}>Open form dialog</Button>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>Open confirmation</Button>
        </Row>

        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Create a league"
          description="You'll be its admin and can invite players with the access code."
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={() => { setModalOpen(false); success('League created'); }}>Create</Button>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="League name" required>
              {(field) => <Input {...field} placeholder="Sunday Money League" />}
            </Field>
            <Field label="Sport">
              {(field) => (
                <Select {...field}>
                  <option>NFL</option>
                  <option>Golf</option>
                </Select>
              )}
            </Field>
          </div>
        </Modal>

        <Modal
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          title="Delete this league?"
          size="sm"
          dismissOnBackdrop={false}
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={() => { setConfirmOpen(false); error('League deleted'); }}>
                Delete
              </Button>
            </>
          }
        >
          <p className="text-sm text-text-muted">
            This removes every entry and result. It can't be undone.
          </p>
        </Modal>
      </Section>

      <Section title="Toast">
        <Row>
          <Button variant="secondary" onClick={() => success('Lineup submitted')}>Success</Button>
          <Button variant="secondary" onClick={() => error('Failed to load entries')}>Error</Button>
          <Button variant="secondary" onClick={() => toast({ message: 'Access code copied' })}>Info</Button>
          <Button variant="secondary" onClick={() => toast({ message: 'This one stays until dismissed', variant: 'warn', duration: 0 })}>
            Persistent
          </Button>
        </Row>
      </Section>

      <Section title="Loading and empty states">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card><CardBody><LoadingSpinner message="Loading your dashboard..." /></CardBody></Card>

          <Card>
            <CardBody className="space-y-4">
              <Row><Spinner size="sm" /><Spinner size="md" /><Spinner size="lg" /></Row>
              <Skeleton lines={4} />
            </CardBody>
          </Card>

          <EmptyState
            title="No leagues yet"
            description="Create one to start drafting, or join an existing league with an access code."
            action={
              <>
                <Button>Create league</Button>
                <Button variant="secondary">Join league</Button>
              </>
            }
          />
        </div>

        <div className="mt-4 max-w-2xl">
          <ErrorDisplay
            message="Failed to load league: request failed with status 500"
            action={{ label: 'Return to dashboard', onClick: () => undefined }}
          />
        </div>
      </Section>

      <Section title="Breadcrumbs">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', to: '/dashboard' },
            { label: 'Sunday Money League', to: '/' },
            { label: 'Season 2025' },
          ]}
        />
      </Section>
    </PageContainer>
  );
};

export default Styleguide;
