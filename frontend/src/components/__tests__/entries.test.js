jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
}));

jest.mock('../../firebase-config', () => ({
  auth: { currentUser: { uid: 'admin1' } },
  db: {},
}));

jest.mock('react-firebase-hooks/firestore', () => ({
  useCollectionData: jest.fn(),
}));

const { render, screen, waitFor } = require('@testing-library/react');
require('@testing-library/jest-dom');
const userEvent = require('@testing-library/user-event').default;
const { MemoryRouter } = require('react-router-dom');
const { setDoc, doc } = require('firebase/firestore');
const { useCollectionData } = require('react-firebase-hooks/firestore');
const Entries = require('../entries').default;

test.skip('calculateScores sums player scores and persists finalScore', async () => {
  const dummyEntries = [
    {
      id: 'entry1',
      name: 'Entry One',
      lineUp: {
        RB: { playerId: 'rb1', pprScore: 0, name: 'RB1' },
        WR: { playerId: 'wr1', pprScore: 0, name: 'WR1' },
      },
    },
    {
      id: 'entry2',
      name: 'Entry Two',
      lineUp: {
        RB: { playerId: 'rb2', pprScore: 0, name: 'RB2' },
        WR: { playerId: 'wr2', pprScore: 0, name: 'WR2' },
      },
    },
  ];
  const members = [{ id: 'admin1', role: 'admin', uid: 'admin1' }];

  useCollectionData
    .mockReturnValueOnce([dummyEntries])
    .mockReturnValueOnce([members]);

  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      json: async () => [
        {player_id: 'rb1', stats: {pts_ppr: 10}},
        {player_id: 'rb2', stats: {pts_ppr: 11.1}}
      ],
    })
    .mockResolvedValueOnce({
      json: async () => [
        {player_id: 'wr1', stats: {pts_ppr: 20}},
        {player_id: 'wr2', stats: {pts_ppr: 19.06666}}
      ],
    });

  doc.mockImplementation(
    (db, l, leagueId, s, season, w, week, e, entryId) => entryId
  );
  setDoc.mockResolvedValue();

  render(
    <MemoryRouter>
      <Entries leagueId="league1" season="2023" week="1" actualWeek={2} />
    </MemoryRouter>
  );

  await userEvent.click(screen.getByText('Calculate Scores'));

  await waitFor(() => expect(setDoc).toHaveBeenCalledTimes(dummyEntries.length));

  expect(dummyEntries.length).toBe(2);
  expect(dummyEntries[0].id).toBe('entry1');
  expect(dummyEntries[0].finalScore).toBe(30);
  expect(dummyEntries[1].id).toBe('entry2');
  expect(dummyEntries[1].finalScore).toBe(30.16666); //Don't round on the backend, round on the display
});

/*TB - gotta be honest, I have no idea how this test passes the 'user3' expectation.*/
test.skip('memberLabel prioritizes displayName then email then id', () => {
  const entriesData = [
    { id: 'user1', lineUp: {}, name: 'one@example.com' },
    { id: 'user2', lineUp: {}, name: 'two@example.com' },
    { id: 'user3', lineUp: {} },
  ];
  const members = [
    { id: 'user1', uid: 'user1', displayName: 'Display One', email: 'one@example.com' },
    { id: 'user2', uid: 'user2', email: 'two@example.com' },
    { id: 'user3', uid: 'user3' },
  ];

  useCollectionData
    .mockReturnValueOnce([entriesData])
    .mockReturnValueOnce([members]);

  render(
    <MemoryRouter>
      <Entries leagueId="league1" season="2023" week="1" actualWeek={1} />
    </MemoryRouter>
  );

  expect(screen.getByText('Display One')).toBeInTheDocument();
  expect(screen.getByText('two@example.com')).toBeInTheDocument();
  expect(screen.getByText('user3')).toBeInTheDocument();
});

test.skip('renders projection columns and values', () => {
  const entriesData = [
    {
      id: 'user1',
      lineUp: {
        RB: { name: 'RB1', points: 12.001 },
        WR: { name: 'WR1', points: 8.002 },
      },
    },
  ];
  const members = [
    { id: 'user1', uid: 'user1', displayName: 'User One' },
    { id: 'admin1', uid: 'admin1', role: 'admin' },
  ];

  useCollectionData
    .mockReturnValueOnce([entriesData])
    .mockReturnValueOnce([members]);

  render(
    <MemoryRouter>
      <Entries leagueId="league1" season="2023" week="1" actualWeek={1} />
    </MemoryRouter>
  );

  expect(screen.getByText('RB Projection')).toBeInTheDocument();
  expect(screen.getByText('WR Projection')).toBeInTheDocument();
  expect(screen.getByText('Projected Total')).toBeInTheDocument();
  expect(screen.getByText('12')).toBeInTheDocument();
  expect(screen.getByText('8')).toBeInTheDocument();
  expect(screen.getByText('20')).toBeInTheDocument();
});
