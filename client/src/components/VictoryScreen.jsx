import React, { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Share2, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  Cat, Dog, Bird, Rabbit, Turtle, 
  Fish, Snail, Ghost, Skull, Zap, 
  Crown, Rocket, Smile, Panda 
} from 'lucide-react';
const AVATAR_MAP = {
  Cat, Dog, Bird, Rabbit, Turtle, 
  Fish, Snail, Ghost, Skull, Zap, 
  Crown, Rocket, Smile, Panda
};
function VictoryModal({ players, onPlayAgain }) {
  const sortedPlayers = [...players].sort((a, b) => b.scores - a.scores);
  const winner = sortedPlayers[0];
  const others = sortedPlayers.slice(1);
  const WinnerIcon = AVATAR_MAP[winner?.avatar] || Dog;

  // ✅ Add a reference for the victory audio
  const victoryAudioRef = useRef(null);

  // Auto-trigger side cannons AND music on mount
  useEffect(() => {
    // ✅ Play the victory music!
    if (victoryAudioRef.current) {
        victoryAudioRef.current.volume = 0.6; // Set volume to 60% so it's not too loud
        victoryAudioRef.current.play().catch(e => console.log("Audio blocked:", e));
    }

    const end = Date.now() + 3 * 1000; // 3 seconds
    const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1", "#009688", "#FF5722"];

    const frame = () => {
      if (Date.now() > end) return;

      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: 0, y: 0.5 },
        colors: colors,
        zIndex: 9999,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.5 },
        colors: colors,
        zIndex: 9999,
      });

      requestAnimationFrame(frame);
    };

    frame();

    // ✅ Cleanup: Stop the music if they click "Play Again" before it finishes
    return () => {
        if (victoryAudioRef.current) {
            victoryAudioRef.current.pause();
            victoryAudioRef.current.currentTime = 0;
        }
    };
  }, []);

  const handleShare = async () => {
    const shareText = `I just won Name Place Animal Thing with ${winner?.scores} points! Can you beat me? Play here: ${window.location.origin}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'NPAT Online',
          text: `I just won Name Place Animal Thing with ${winner?.scores} points! Can you beat me?`,
          url: window.location.origin,
        });
      } catch (err) {
        console.error("User cancelled share", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success("Copied to clipboard!", {
          style: {
            border: '4px solid black',
            padding: '12px 24px',
            color: '#333',
            background: '#fff',
            fontFamily: "'Delicious Handrawn', cursive",
            fontSize: '1.5rem',
            fontWeight: 'bold',
            boxShadow: '4px 4px 0px rgba(0,0,0,1)',
            borderRadius: '1rem'
          },
          iconTheme: {
            primary: '#009688',
            secondary: '#fff',
          },
        });
      } catch (err) {
        toast.error("Failed to copy link", {
          style: { fontFamily: "'Delicious Handrawn', cursive", fontSize: '1.2rem', border: '3px solid black' }
        });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm font-['Delicious_Handrawn'] p-4">
      
      {/* ✅ Hidden Audio Element */}
      <audio ref={victoryAudioRef} src="/sounds/victory.mp3" preload="auto" />

      <div className="bg-white rounded-[2.5rem] border-8 border-sky-100 p-6 md:p-8 flex flex-col items-center w-full max-w-md shadow-2xl relative animate-fade-in-up">
        
        {/* Header */}
        <div className="flex items-center gap-2 text-[#009688] mb-4">
          <Trophy size={32} />
          <h2 className="text-4xl font-bold tracking-widest">Victory!</h2>
          <Trophy size={32} />
        </div>

        {/* Winner Avatar */}
        <div className="border-4 border-black rounded-full p-6 mb-3 relative bg-white shadow-md">
           <WinnerIcon size={64} strokeWidth={2} className="text-gray-800" />
           <div className="absolute -z-10 w-24 h-4 bg-pink-400/30 -rotate-12 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>

        {/* Winner Name */}
        <div className="border-2 border-black rounded-lg px-6 py-1 mb-2 shadow-[2px_2px_0px_rgba(0,0,0,1)] bg-white">
          <span className="text-2xl font-bold text-gray-800">{winner?.name}</span>
        </div>

        <p className="text-xl text-gray-800 mt-2 font-bold">Congratulations, {winner?.name}!</p>
        <div className="flex items-baseline gap-2 mb-6">
            <span className="text-5xl font-black text-[#009688]">{winner?.scores}</span>
            <span className="text-xl text-pink-400 font-bold">Points</span>
        </div>

        {/* Leaderboard for others */}
        {others.length > 0 && (
            <div className="w-full flex flex-col items-center gap-2 mb-8">
                {others.map((player) => {
                    const PlayerIcon = AVATAR_MAP[player.avatar] || Rabbit;
                    return (
                        <div key={player.id} className="flex items-center gap-2 text-xl font-bold text-gray-800">
                            <PlayerIcon size={24} />
                            <span>{player.name}:</span>
                            <span className="text-orange-500">{player.scores}</span>
                            <span className="text-blue-500 text-lg">Points</span>
                        </div>
                    );
                })}
            </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 w-full justify-center">
          <button 
            onClick={onPlayAgain}
            className="flex items-center gap-2 bg-[#009688] hover:bg-teal-600 text-white px-5 py-2 rounded-full text-xl font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
          >
            <RotateCcw size={20} /> Play Again
          </button>
          
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white px-5 py-2 rounded-full text-xl font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
          >
            <Share2 size={20} /> Share Result
          </button>
        </div>

      </div>
    </div>
  );
}

export default VictoryModal;