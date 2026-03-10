import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Game from "./game";
import type { TeamUser } from "../types";

interface GroupGameLocationState {
  participants: TeamUser[];
}

const GroupGame: React.FC = () => {
  const navigate = useNavigate();
  const { participants } = useLocation().state as GroupGameLocationState;
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleComplete = () => {
    if (currentIndex < participants.length - 1) {
      setCurrentIndex((idx) => idx + 1);
    } else {
      navigate(-1);
    }
  };

  return (
    <Game
      key={participants[currentIndex].user.userId}
      teamUser={participants[currentIndex]}
      onComplete={handleComplete}
    />
  );
};

export default GroupGame;
