import React from "react";
import {render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter} from "react-router-dom";
import {onAuthStateChanged} from "firebase/auth";
import {addDoc, doc, getDocs, onSnapshot, query, setDoc} from "firebase/firestore";
import {v4 as uuidv4} from "uuid";
import userEvent from "@testing-library/user-event";
import Dashboard from "../dashboard";

jest.mock('uuid');

jest.mock('firebase/firestore');

jest.mock('firebase/auth');

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

onSnapshot.mockReturnValue(() => {});
doc.mockReturnValue('memberRef');

test('creates league and adds owner as admin', async () => {
  const mockUser = { uid: 'user123', displayName: 'User One', email: 'user1@example.com' };
  uuidv4.mockReturnValue('access-code');
  addDoc.mockResolvedValue({ id: 'league123' });
  setDoc.mockResolvedValue();
// @ts-expect-error -- TODO: Parameter 'auth' implicitly has an 'any' type.
  onAuthStateChanged.mockImplementation((auth, callback: (arg0: { uid: string; displayName: string; email: string; }) => void) => {
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
// @ts-expect-error -- TODO: Parameter 'auth' implicitly has an 'any' type.
  onAuthStateChanged.mockImplementation((auth, callback: (arg0: { uid: string; displayName: string; email: string; }) => void) => {
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

