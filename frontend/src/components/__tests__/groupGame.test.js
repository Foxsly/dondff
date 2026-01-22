jest.mock('firebase/firestore', () => ({
  setDoc: jest.fn(),
}));

const participants = ['uid-1', 'uid-2', 'uid-3'];
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useLocation: () => ({
    state: { leagueId: 'league1', season: '2023', week: '1', participants },
  }),
  useNavigate: () => mockNavigate,
}));

jest.mock('../game', () => {
  const React = require('react');
  const { setDoc } = require('firebase/firestore');
  return {
    __esModule: true,
    default: ({ uid, onComplete }) => {
      React.useEffect(() => {
        setDoc(uid, {});
        onComplete();
      }, [uid, onComplete]);
      return null;
    },
  };
});

const React = require('react');
const { render, waitFor } = require('@testing-library/react');
const { setDoc } = require('firebase/firestore');
const GroupGame = require('../groupGame').default;

test('submits lineup for each participant and navigates after completion', async () => {
  render(<GroupGame />);

  await waitFor(() => expect(setDoc).toHaveBeenCalledTimes(participants.length));
  expect(setDoc.mock.calls.map((call) => call[0])).toEqual(participants);
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(-1));
});
