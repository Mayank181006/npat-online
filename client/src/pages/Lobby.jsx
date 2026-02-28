import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import bgImage from '../assets/bg_npat.png';
import { 
  Copy, Check, Info, // UI Icons
  // ✅ IMPORT ALL AVATARS
  Cat, Dog, Bird, Rabbit, Turtle, 
  Fish, Snail, Ghost, Skull, Zap, 
  Crown, Rocket, Smile, Panda 
} from 'lucide-react';

// --- OUTSIDE the function Lobby() ---
const AVATAR_MAP = {
  Cat, Dog, Bird, Rabbit, Turtle, 
  Fish, Snail, Ghost, Skull, Zap, 
  Crown, Rocket, Smile, Panda
};
function Lobby({ socket }) {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [players, setPlayers] = useState([]);
  const [copied, setCopied] = useState(false);
  const [selectedRounds, setSelectedRounds] = useState(10);

  // Check if current user is the Host based on navigation state
  const isHost = location.state?.isHost || false;

  useEffect(() => {
    // 1. Sync Room State
    socket.emit("check_room_state", roomId);

    // 2. Listen for Player Updates
    socket.on("update_lobby", (data) => {
      setPlayers(data);
    });

    // 3. Listen for Game Start
    socket.on("round_start", (data) => {
      navigate(`/game/${roomId}`);
    });

    return () => {
      socket.off("update_lobby");
      socket.off("round_start");
    };
  }, [socket, roomId, navigate]);

  const copyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startGame = () => {
    // ✅ Send both the ID and the state of the rounds
    socket.emit("force_start_game", { 
        roomId: roomId, 
        rounds: selectedRounds 
    });
  };

  return (
    <div
      className="h-screen w-full flex flex-col items-center relative overflow-hidden font-['Delicious_Handrawn']"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: '750px',
        backgroundRepeat: 'repeat',
        backgroundPosition: 'center',
        fontFamily: "'Delicious Handrawn', cursive"
      }}
    >
      {/* White Overlay */}
      <div className="absolute inset-0 bg-white/70"></div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-4xl px-4 py-15 flex flex-col items-center h-full justify-center">

        {/* --- HEADER SECTION --- */}
        <div className="text-center mb-8 animate-fade-in-down">
          <p className="text-2xl text-gray-600 mb-2 font-bold">Your game code is :</p>

          {/* Room Code Badge */}
          <div
            onClick={copyCode}
            className="bg-[#009688] hover:bg-[#00796B] text-white text-4xl px-8 py-3 rounded-2xl shadow-lg border-4 border-transparent hover:border-white cursor-pointer transition-all active:scale-95 flex items-center gap-3 mx-auto w-fit"
          >
            <span className="tracking-widest font-bold">{roomId}</span>
            {copied ? <Check size={28} /> : <Copy size={28} />}
          </div>

          <p className="text-xl text-gray-500 mt-3 font-bold">
            Share it with friends to play the game
          </p>
        </div>

        {/* --- ROUNDS SELECTOR (HOST ONLY) --- */}
        {isHost && (
          <div className="mb-8 flex flex-col items-center animate-fade-in">
            <p className="text-2xl text-gray-700 mb-3 font-bold">Select no. of rounds:</p>
            <div className="flex gap-6">
              {[10, 15, 25].map((num) => (
                <button
                  key={num}
                  onClick={() => setSelectedRounds(num)}
                  className={`w-16 h-16 rounded-xl border-4 text-2xl font-bold flex items-center justify-center transition-all ${selectedRounds === num
                    ? "bg-white border-[#009688] text-[#009688] shadow-md scale-110"
                    : "border-gray-400 text-gray-400 hover:border-gray-500"
                    }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* --- PLAYERS GRID --- */}
        <div className="w-full mb-8">
          <h2 className="text-5xl text-center text-[#FF5722] mb-6 font-bold underline decoration-wavy decoration-blue-300 transform -rotate-2">
            Players
          </h2>

          {/* Players Grid */}
          {/* Players Grid */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-8">
            {[0, 1, 2, 3].map((i) => {
              const player = players[i];

              // ✅ NEW LOGIC: Use the player's actual avatar from the backend!
              // Fallback to Dog only if the avatar string is somehow missing.
              const AvatarIcon = player ? (AVATAR_MAP[player.avatar] || Dog) : null;

              return (
                <div key={i} className="flex flex-col items-center">

                  {/* Avatar Circle */}
                  <div className={`w-12 h-12 md:w-28 md:h-28 rounded-full border-[6px] flex items-center justify-center bg-white shadow-xl transition-all duration-500  ${
                   player
                      ? "border-black animate-bounce-in"
                      : "border-gray-300 border-dashed opacity-40 bg-transparent"
                    }`}>
                    {player ? (
                      // ✅ Render the real icon
                      <AvatarIcon
                        size={60}
                        strokeWidth={1.5}
                        className="text-gray-800 w-12 h-12 md:w-16 md:h-16"
                      />
                    ) : (
                      // Empty slot placeholder
                      <span className="text-gray-300 text-6xl font-sans font-light select-none">+</span>
                    )}
                  </div>

                  {/* Name Tag */}
                  {player && (
                    <div className="mt-3 bg-white border-2 border-black px-4 py-1 rounded-lg shadow-sm transform -rotate-1">
                      <p className="text-xl md:text-2xl font-bold truncate max-w-[120px]">
                        {player.name}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* --- WAITING MESSAGE / START BUTTON --- */}
        <div className="mt-4">
          {isHost ? (
            <button
              onClick={startGame}
              className="bg-[#ff3bd1] hover:bg-[#ff00c3] text-white text-3xl px-12 py-4 rounded-full shadow-xl border-4 border-white hover:scale-105 transition-all active:scale-95 "
            >
              Start Game 
            </button>
          ) : (
            <div className="text-center bg-white/90 p-4 rounded-xl border-2 border-blue-200 shadow-sm">
              <p className="text-2xl text-blue-600 font-bold animate-pulse">
                Waiting for host to start...
              </p>
              <p className="text-gray-400 text-lg">
                ({players.length}/4 Players Ready)
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Lobby;