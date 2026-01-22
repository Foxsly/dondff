jest.mock('uuid', () => ({ v4: jest.fn() }));

jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(),
  setDoc: jest.fn(),
  collection: jest.fn(() => 'leaguesRef'),
  doc: jest.fn(() => 'memberRef'),
  getDocs: jest.fn(),
  onSnapshot: jest.fn(() => () => {}),
  query: jest.fn(() => 'query'),
  where: jest.fn(() => 'where'),
  collectionGroup: jest.fn(() => 'membersQuery'),
  getDoc: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => jest.fn(),
  };
});

jest.mock('../../firebase-config', () => ({
  auth: {},
  db: {},
}));

const { render, screen, waitFor } = require('@testing-library/react');
const userEvent = require('@testing-library/user-event').default;
const { MemoryRouter } = require('react-router-dom');
const { v4: uuidv4 } = require('uuid');
const {
  addDoc,
  setDoc,
  onSnapshot,
  doc,
  getDocs,
  query,
} = require('firebase/firestore');
const { onAuthStateChanged } = require('firebase/auth');
const Dashboard = require('../dashboard').default;

onSnapshot.mockReturnValue(() => {});
doc.mockReturnValue('memberRef');

test('creates league and adds owner as admin', async () => {
  const mockUser = { uid: 'user123', displayName: 'User One', email: 'user1@example.com' };
  uuidv4.mockReturnValue('access-code');
  addDoc.mockResolvedValue({ id: 'league123' });
  setDoc.mockResolvedValue();
  onAuthStateChanged.mockImplementation((auth, callback) => {
    callback(mockUser);
    return () => {};
  });

  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );

  await userEvent.click(screen.getByText('Create League'));
  await userEvent.type(
    screen.getByPlaceholderText('Enter League Name...'),
    'Test League'
  );
  await userEvent.click(screen.getByText('Submit'));

  await waitFor(() => {
    expect(addDoc).toHaveBeenCalled();
    expect(setDoc).toHaveBeenCalled();
  });

  expect(addDoc.mock.calls[0][1]).toEqual({
    name: 'Test League',
    uid: mockUser.uid,
    accessCode: 'access-code',
  });

  expect(setDoc.mock.calls[0][1]).toEqual({
    uid: mockUser.uid,
    role: 'admin',
    displayName: mockUser.displayName,
    email: mockUser.email,
  });
});

test('joins league and adds user as player when access code matches', async () => {
  jest.clearAllMocks();
  doc.mockReturnValue('memberRef');
  const mockUser = { uid: 'user123', displayName: 'User One', email: 'user1@example.com' };
  onAuthStateChanged.mockImplementation((auth, callback) => {
    callback(mockUser);
    return () => {};
  });

  query.mockReturnValue('query');
  getDocs.mockResolvedValue({ empty: false, docs: [{ id: 'league123' }] });
  setDoc.mockResolvedValue();

  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );

  await userEvent.click(screen.getByText('Join League'));
  await userEvent.type(
    screen.getByPlaceholderText('Enter Access Code...'),
    'join-code'
  );
  await userEvent.click(screen.getByText('Submit'));

  await waitFor(() => {
    expect(query).toHaveBeenCalled();
    expect(getDocs).toHaveBeenCalled();
    expect(setDoc).toHaveBeenCalledWith('memberRef', {
      uid: mockUser.uid,
      role: 'player',
      displayName: mockUser.displayName,
      email: mockUser.email,
    });
  });
});

