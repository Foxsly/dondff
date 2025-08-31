import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase-config";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import Breadcrumbs from "./breadcrumbs";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  query,
  where,
  collectionGroup,
  getDoc,
} from "firebase/firestore";
// @ts-expect-error -- TODO: Could not find a declaration file for module 'uuid'. '<rootDir>/node_modules/uuid/dist/index.js' implicitly has an 'any' type.
import { v4 as uuidv4 } from "uuid";

const Dashboard = () => {
  const [user, setUser] = useState({});
  const [leagues, setLeagues] = useState([]);
  const [newLeague, setNewLeague] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);

  const navigate = useNavigate();
  const leaguesRef = collection(db, "leagues");

  const addLeague = async () => {
    try {
      const accessCode = uuidv4();
      const newLeagueRef = await addDoc(leaguesRef, {
        name: newLeague,
// @ts-expect-error -- TODO: Property 'uid' does not exist on type '{}'.
        uid: user.uid,
        accessCode: accessCode,
      });

// @ts-expect-error -- TODO: Property 'uid' does not exist on type '{}'.
      const memberRef = doc(db, "leagues", newLeagueRef.id, "members", user.uid);
      await setDoc(memberRef, {
// @ts-expect-error -- TODO: Property 'uid' does not exist on type '{}'.
        uid: user.uid,
        role: "admin",
// @ts-expect-error -- TODO: Property 'displayName' does not exist on type '{}'.
        displayName: user.displayName,
// @ts-expect-error -- TODO: Property 'email' does not exist on type '{}'.
        email: user.email,
      });

      navigate(`/league/${newLeagueRef.id}`);
    } catch (error) {
// @ts-expect-error -- TODO: 'error' is of type 'unknown'.
      console.log(error.message);
    }
  };

  const joinLeague = async () => {
    try {
      const q = query(leaguesRef, where("accessCode", "==", joinCode));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const leagueDoc = querySnapshot.docs[0];
// @ts-expect-error -- TODO: Property 'uid' does not exist on type '{}'.
        const memberRef = doc(db, "leagues", leagueDoc.id, "members", user.uid);
        await setDoc(memberRef, {
// @ts-expect-error -- TODO: Property 'uid' does not exist on type '{}'.
          uid: user.uid,
          role: "player",
// @ts-expect-error -- TODO: Property 'displayName' does not exist on type '{}'.
          displayName: user.displayName,
// @ts-expect-error -- TODO: Property 'email' does not exist on type '{}'.
          email: user.email,
        });
      }
    } catch (error) {
// @ts-expect-error -- TODO: 'error' is of type 'unknown'.
      console.log(error.message);
    }
  };

  useEffect(() => {
    const authUnsub = onAuthStateChanged(auth, (currentUser) => {
// @ts-expect-error -- TODO: Argument of type 'User | null' is not assignable to parameter of type 'SetStateAction<{}>'.
      setUser(currentUser);
    });

    return () => authUnsub();
  }, []);

  useEffect(() => {
// @ts-expect-error -- TODO: Property 'uid' does not exist on type '{}'.
    if (!user?.uid) return;

    const membersQuery = query(
      collectionGroup(db, "members"),
// @ts-expect-error -- TODO: Property 'uid' does not exist on type '{}'.
      where("uid", "==", user.uid)
    );
    const unsub = onSnapshot(
      membersQuery,
      async (snapShot) => {
        const leaguePromises = snapShot.docs.map(async (memberDoc) => {
          const leagueRef = memberDoc.ref.parent.parent;
// @ts-expect-error -- TODO: Argument of type 'DocumentReference<DocumentData> | null' is not assignable to parameter of type 'DocumentReference<DocumentData>'.
          const leagueSnap = await getDoc(leagueRef);
          return {
            id: leagueSnap.id,
            role: memberDoc.data().role,
            ...leagueSnap.data(),
          };
        });
        const leagueList = await Promise.all(leaguePromises);
// @ts-expect-error -- TODO: Argument of type '{ id: string; role: any; }[]' is not assignable to parameter of type 'SetStateAction<never[]>'.
        setLeagues(leagueList);
      },
      (error) => {
        console.log(error);
      }
    );

    return () => unsub && unsub();
  }, [user]);

  const logout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
// @ts-expect-error -- TODO: 'error' is of type 'unknown'.
      console.log(error.message);
    }
  };

  return (
    <div className="mx-auto p-4 space-y-4 text-left bg-[#3a465b]/50 rounded">
      <Breadcrumbs items={[{ label: "Dashboard" }]} />
      <h2 className="text-2xl font-bold">Welcome to Your Dashboard</h2>
// @ts-expect-error -- TODO: Property 'email' does not exist on type '{}'.
      <h3 className="text-xl">{user.email}</h3>
      <button
        className="px-4 py-2 font-bold text-[#102131] bg-[#00ceb8] rounded hover:bg-[#00ceb8]/80"
        onClick={logout}
      >
        Sign Out
      </button>
      <h4 className="text-lg font-semibold">Leagues:</h4>
      {leagues.map((league) => (
        <div
// @ts-expect-error -- TODO: Property 'id' does not exist on type 'never'.
          key={league.id}
          className="flex items-center justify-between p-4 mb-2 rounded bg-[#3a465b]/50"
        >
// @ts-expect-error -- TODO: Property 'name' does not exist on type 'never'.
          <p className="font-semibold">{league.name}</p>
// @ts-expect-error -- TODO: Property 'role' does not exist on type 'never'.
          <p>{league.role === "admin" ? "Admin" : "Player"}</p>
          <button
            className="px-3 py-1 font-bold text-[#102131] bg-[#00ceb8] rounded hover:bg-[#00ceb8]/80"
// @ts-expect-error -- TODO: Property 'id' does not exist on type 'never'.
            onClick={() => navigate(`/league/${league.id}`)}
          >
            View
          </button>
        </div>
      ))}

      <div className="flex gap-4">
        <button
          className="px-4 py-2 font-bold text-[#102131] bg-[#00ceb8] rounded hover:bg-[#00ceb8]/80"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          Create League
        </button>
        <button
          className="px-4 py-2 font-bold text-[#102131] bg-[#00ceb8] rounded hover:bg-[#00ceb8]/80"
          onClick={() => setShowJoinForm(!showJoinForm)}
        >
          Join League
        </button>
      </div>

      {showCreateForm && (
        <div className="flex mt-4 space-x-2">
          <input
            className="flex-1 p-2 bg-transparent border rounded border-[#3a465b]"
            placeholder="Enter League Name..."
            value={newLeague}
            onChange={(e) => setNewLeague(e.target.value)}
          />
          <button
            className="px-4 py-2 font-bold text-[#102131] bg-[#00ceb8] rounded hover:bg-[#00ceb8]/80"
            onClick={addLeague}
          >
            Submit
          </button>
        </div>
      )}

      {showJoinForm && (
        <div className="flex mt-4 space-x-2">
          <input
            className="flex-1 p-2 bg-transparent border rounded border-[#3a465b]"
            placeholder="Enter Access Code..."
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />
          <button
            className="px-4 py-2 font-bold text-[#102131] bg-[#00ceb8] rounded hover:bg-[#00ceb8]/80"
            onClick={joinLeague}
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
