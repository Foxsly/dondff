import React from "react";
import {render, waitFor} from "@testing-library/react";

import {setDoc} from "firebase/firestore";
import GroupGame from "../groupGame";

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
// @ts-expect-error -- TODO: Binding element 'uid' implicitly has an 'any' type. Binding element 'onComplete' implicitly has an 'any' type.
    default: ({ uid, onComplete }) => {
      React.useEffect(() => {
        setDoc(uid, {});
        onComplete();
      }, [uid, onComplete]);
      return null;
    },
  };
});

test('submits lineup for each participant and navigates after completion', async () => {
  render(<GroupGame />);

  await waitFor(() => expect(setDoc).toHaveBeenCalledTimes(participants.length));
  expect(setDoc.mock.calls.map((call: any[]) => call[0])).toEqual(participants);
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(-1));
});
