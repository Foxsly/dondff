jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
}));

jest.mock('../../firebase-config', () => ({
  auth: { currentUser: { uid: 'uid-123', displayName: 'Test User' } },
  db: {},
}));

jest.mock('react-router-dom', () => ({
  useLocation: () => ({ state: { leagueId: 'league1', season: '2023', week: '1' } }),
  useNavigate: () => jest.fn(),
}));

jest.mock('../util', () => ({
  getPlayers: jest.fn(),
  generateCases: jest.fn(),
}));

const { render, screen } = require('@testing-library/react');
const userEvent = require('@testing-library/user-event').default;
const React = require('react');
const { doc, setDoc, getDoc } = require('firebase/firestore');

const useStateSpy = jest.spyOn(React, 'useState');
const Game = require('../game').default;

afterEach(() => {
  useStateSpy.mockReset();
});

afterAll(() => {
  useStateSpy.mockRestore();
});

test('submits lineup with current user display name', async () => {
  const dummyLineUp = {
    RB: { name: 'rb-player' },
    WR: { name: 'wr-player' },
  };

  doc.mockClear();
  setDoc.mockClear();
  getDoc.mockClear();
  doc.mockReturnValue('docRef');
  setDoc.mockResolvedValue();
  getDoc.mockResolvedValue({ data: () => ({}) });

  let call = 0;
  useStateSpy.mockImplementation((initial) => {
    call++;
    if (call === 1) return ['Test User', jest.fn()]; // currentName
    if (call === 12) return [true, jest.fn()]; // finished
    if (call === 13) return [true, jest.fn()]; // midway
    if (call === 17) return [dummyLineUp, jest.fn()]; // lineUp
    return [initial, jest.fn()];
  });

  render(<Game />);

  await screen.findByText('Current User: Test User');
  await userEvent.click(screen.getAllByText('Submit Lineup')[0]);

  expect(setDoc).toHaveBeenCalledWith('docRef', {
    name: 'Test User',
    lineUp: dummyLineUp,
  });

});

test('submits lineup with provided uid display name', async () => {
  const dummyLineUp = {
    RB: { name: 'rb-player' },
    WR: { name: 'wr-player' },
  };

  doc.mockClear();
  setDoc.mockClear();
  getDoc.mockClear();
  doc.mockReturnValue('docRef');
  setDoc.mockResolvedValue();
  getDoc.mockResolvedValue({ data: () => ({ displayName: 'Custom User' }) });

  let call = 0;
  useStateSpy.mockImplementation((initial) => {
    call++;
    if (call === 1) return ['Custom User', jest.fn()]; // currentName
    if (call === 12) return [true, jest.fn()]; // finished
    if (call === 13) return [true, jest.fn()]; // midway
    if (call === 17) return [dummyLineUp, jest.fn()]; // lineUp
    return [initial, jest.fn()];
  });

  render(<Game uid="custom-uid" />);

  await screen.findByText('Current User: Custom User');
  await userEvent.click(screen.getAllByText('Submit Lineup')[0]);

  expect(setDoc).toHaveBeenCalledWith('docRef', {
    name: 'Custom User',
    lineUp: dummyLineUp,
  });

});

