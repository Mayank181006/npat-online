import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Hourglass, Loader2, Volume2, VolumeX } from 'lucide-react';
import bgImage from '../assets/bg_npat.png';

// ✅ IMPORT ALL AVATAR ICONS
import {
    Cat, Dog, Bird, Rabbit, Turtle,
    Fish, Snail, Ghost, Skull, Zap,
    Crown, Rocket, Smile, Panda
} from 'lucide-react';

// ✅ MAP STRINGS TO COMPONENTS
const AVATAR_MAP = {
    Cat, Dog, Bird, Rabbit, Turtle,
    Fish, Snail, Ghost, Skull, Zap,
    Crown, Rocket, Smile, Panda
};
function GameRoom({ socket }) {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const scrollRef = useRef(null);
    const [isMuted, setIsMuted] = useState(false);
    const tickAudioRef = useRef(null);

    // Game State
    const [gameData, setGameData] = useState({
        round: 1,
        letter: '?',
        totalRounds: 10
    });

    const [inputs, setInputs] = useState({ name: '', place: '', animal: '', thing: '' });
    const [history, setHistory] = useState([]);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [lastRoundData, setLastRoundData] = useState(null);

    // UI State
    const [showTransition, setShowTransition] = useState(false);
    const [countdown, setCountdown] = useState(3);
    const [timeLeft, setTimeLeft] = useState(60);
    const [myScore, setMyScore] = useState(0);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history, gameData.round]);

    // ✅ NEW: Always pause the ticking sound when a round ends or is submitted
    useEffect(() => {
        if ((showTransition || isSubmitted) && tickAudioRef.current) {
            tickAudioRef.current.pause();
            tickAudioRef.current.currentTime = 0;
        }
    }, [showTransition, isSubmitted]);

    // ✅ FIXED TIMER LOGIC
    useEffect(() => {
        if (timeLeft > 0 && !showTransition && !isSubmitted) {
            const timer = setTimeout(() => {
                setTimeLeft(timeLeft - 1);

                // Trigger play ONLY EXACTLY at 8 seconds (so it doesn't loop/stutter)
                if (timeLeft === 9 && !isMuted && tickAudioRef.current) {
                    // Note: it checks 9, because it is about to change to 8
                    tickAudioRef.current.currentTime = 0;
                    tickAudioRef.current.play().catch(e => console.log("Audio blocked", e));
                }
            }, 1000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0 && !isSubmitted) {
            handleFinish();
        }
    }, [timeLeft, showTransition, isSubmitted, isMuted]);

    const handleChange = (category, value) => {
        if (isSubmitted) return;
        setInputs(prev => ({ ...prev, [category]: value }));
        socket.emit('submit_input', {
            roomId,
            round: gameData.round,
            category,
            value
        });
    };

    const handleFinish = () => {
        setIsSubmitted(true);
        socket.emit("player_finished_round", { roomId });
    };

    useEffect(() => {
        socket.emit("get_game_data", roomId);

        socket.on("sync_game_data", (data) => {
            setGameData({
                round: data.round,
                letter: data.letter,
                totalRounds: data.totalRounds
            });
            const me = data.players.find(p => p.id === socket.id);
            if (me) setMyScore(me.scores);
        });

        socket.on("round_start", (data) => {
            setGameData({
                round: data.round,
                letter: data.letter,
                totalRounds: data.totalRounds
            });
            setInputs({ name: '', place: '', animal: '', thing: '' });
            setIsSubmitted(false);
            setShowTransition(false);
            setTimeLeft(60);
        });

        socket.on("round_end", (data) => {
            const myResult = data.results[socket.id] || {};
            const myRoundScore = myResult.roundScore || 0;

            setHistory(prev => [...prev, {
                round: gameData.round,
                ...inputs,
                marks: myRoundScore,
                validation: myResult.validation
            }]);

            const myProfile = data.players.find(p => p.id === socket.id);
            if (myProfile) setMyScore(myProfile.scores);

            // ✅ NEW: Save the data so the modal can read it
            setLastRoundData({
                players: data.players,
                results: data.results
            });

            setShowTransition(true);

            let count = 5;
            setCountdown(5);
            const timer = setInterval(() => {
                count--;
                setCountdown(count);
                if (count <= 0) clearInterval(timer);
            }, 1000);
        });

        socket.on("game_over", (players) => {
            const winner = players.sort((a, b) => b.scores - a.scores)[0];
            alert(`Game Over! Winner: ${winner.name}`);
            navigate('/');
        });

        return () => {
            socket.off("sync_game_data");
            socket.off("round_start");
            socket.off("round_end");
            socket.off("game_over");
        };
    }, [socket, inputs, gameData, roomId, navigate]);

    useEffect(() => {
        if (timeLeft > 0 && !showTransition && !isSubmitted) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0 && !isSubmitted) {
            handleFinish();
        }
    }, [timeLeft, showTransition, isSubmitted]);

    return (
        <div
            className="h-screen w-full flex flex-col items-center relative font-['Delicious_Handrawn'] text-gray-800"
            style={{
                backgroundImage: `url(${bgImage})`,
                backgroundSize: '750px',
                backgroundRepeat: 'repeat',
                fontFamily: "'Delicious Handrawn', cursive"
            }}
        >
            {/* ✅ INVISIBLE AUDIO TAG FOR TICK SOUND */}
            <audio ref={tickAudioRef} src="/sounds/tick.mp3" preload="auto" />

            <div className="absolute inset-0 bg-white/70 z-0"></div>

            {/* --- HEADER --- */}
            <div className="relative z-10 w-full max-w-6xl p-3 md:p-4 flex justify-between items-center border-b-2 border-gray-300 bg-white/50 backdrop-blur-sm shadow-sm">
                <div className="flex flex-col items-center md:items-start ml-20 md:ml-0 mt-2 md:mt-0">
                    <span className="text-sm md:text-xl text-gray-500 font-bold">Round:</span>
                    <span className="text-3xl md:text-5xl font-black leading-none">
                        {gameData.round}<span className="text-lg md:text-2xl text-gray-400">/{gameData.totalRounds}</span>
                    </span>
                </div>

                <div className="flex flex-col items-center">
                    <span className="text-sm md:text-xl text-gray-500 font-bold mb-1">Current alphabet is:</span>
                    <div className="text-5xl md:text-7xl font-black text-black leading-none transform -rotate-3 filter drop-shadow-md">
                        {gameData.letter}
                    </div>
                </div>

                <div className="flex flex-col items-center md:items-end">
                    <div className="flex items-center gap-1 md:gap-2 mb-1">
                        {/* ✅ MUTE BUTTON FOR TIMER TICK */}
                        <button onClick={() => setIsMuted(!isMuted)} className="text-gray-400 hover:text-black mr-2">
                            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>

                        <Hourglass size={24} className="text-black animate-pulse md:w-8 md:h-8" />
                        <span className="text-2xl md:text-4xl font-bold leading-none">{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
                    </div>
                    <span className="text-sm md:text-xl font-bold text-green-700">Score: {myScore}</span>
                </div>
            </div>

            {/* --- TABLE CONTAINER --- */}
            <div className="relative z-10 w-full max-w-6xl flex-1 overflow-hidden p-2 md:p-6 flex flex-col">
                <div className="w-full flex-1 flex flex-col overflow-x-auto bg-white/90 border-4 border-black rounded-xl shadow-2xl relative">
                    <div className="min-w-[650px] md:min-w-full flex flex-col h-full">

                        <div className="w-full bg-[#009688] text-white border-b-4 border-black text-lg md:text-2xl font-bold flex flex-shrink-0">
                            <div className="w-12 md:w-16 p-2 md:p-3 text-center border-r-2 border-white/30">#</div>
                            <div className="flex-1 p-2 md:p-3 text-center border-r-2 border-white/30">Name</div>
                            <div className="flex-1 p-2 md:p-3 text-center border-r-2 border-white/30">Place</div>
                            <div className="flex-1 p-2 md:p-3 text-center border-r-2 border-white/30">Animal</div>
                            <div className="flex-1 p-2 md:p-3 text-center border-r-2 border-white/30">Thing</div>
                            <div className="w-28 md:w-40 p-2 md:p-3 text-center">Score</div>
                        </div>

                        <div ref={scrollRef} className="w-full flex-1 overflow-y-auto">

                            {/* ✅ RENDER HISTORY WITH RED STRIKETHROUGH FOR WRONG ANSWERS */}
                            {history.map((row, idx) => (
                                <div key={idx} className="flex text-lg md:text-xl border-b-2 border-gray-300 hover:bg-gray-50 transition-colors">
                                    <div className="w-12 md:w-16 p-2 md:p-4 flex items-center justify-center font-bold text-gray-400 border-r-2 border-gray-200">
                                        {row.round}
                                    </div>

                                    {/* Map through categories dynamically to check validation */}
                                    {['name', 'place', 'animal', 'thing'].map((cat) => {
                                        // Check if AI said it was wrong
                                        const isWrong = row.validation && row.validation[cat] === false;

                                        return (
                                            <div key={cat} className={`flex-1 p-2 md:p-4 flex items-center justify-center border-r-2 border-gray-200 break-all ${isWrong ? 'text-red-500 line-through decoration-2 font-bold opacity-80' : 'text-gray-800'}`}>
                                                {row[cat] || '-'}
                                            </div>
                                        );
                                    })}

                                    <div className="w-28 md:w-40 p-2 md:p-4 flex items-center justify-center font-bold text-green-600 text-xl md:text-2xl">
                                        +{row.marks}
                                    </div>
                                </div>
                            ))}

                            {/* ... Current Active Round Inputs remain exactly the same ... */}

                            {/* 2. Render Current Active Round */}
                            <div className="flex text-lg md:text-2xl bg-yellow-50/50">

                                <div className="w-12 md:w-16 p-2 md:p-4 flex items-center justify-center font-bold text-gray-600 border-r-2 border-gray-300">
                                    {gameData.round}
                                </div>

                                {/* Inputs */}
                                {['name', 'place', 'animal', 'thing'].map((field) => (
                                    <div key={field} className="flex-1 p-1 md:p-2 border-r-2 border-gray-300 flex items-center">
                                        <input
                                            disabled={isSubmitted}
                                            className="w-full bg-transparent border-b-2 border-gray-400 focus:border-blue-500 focus:outline-none text-center font-bold text-gray-800 placeholder-gray-400 disabled:opacity-50 text-base md:text-xl"
                                            placeholder={gameData.letter + "..."}
                                            value={inputs[field]}
                                            onChange={e => handleChange(field, e.target.value)}
                                            autoComplete="off"
                                        />
                                    </div>
                                ))}

                                {/* Submit Button / Loader Column */}
                                <div className="w-28 md:w-40 p-1 md:p-2 flex items-center justify-center">
                                    {!isSubmitted ? (
                                        <button
                                            onClick={handleFinish}
                                            className="w-full bg-[#FF5722] hover:bg-[#E64A19] text-white font-bold py-1.5 md:py-2 rounded-full shadow-md text-sm md:text-lg transition-transform active:scale-95 border-2 border-white"
                                        >
                                            Submit
                                        </button>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-gray-400">
                                            <Loader2 className="animate-spin text-[#FF5722]" size={24} />
                                            <span className="text-xs md:text-sm font-bold mt-1">Wait...</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="h-4"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- ROUND END OVERLAY --- */}
            {/* --- ROUND END OVERLAY WITH SCOREBOARD --- */}
            {showTransition && lastRoundData && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-50 p-4">

                    <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 drop-shadow-lg transform -rotate-2">
                        Round {gameData.round} Ended!
                    </h2>

                    {/* The Drawn Scoreboard Paper */}
                    <div className="bg-white rounded-[2rem] p-6 md:p-8 border-8 border-[#009688] shadow-[10px_10px_0px_rgba(0,0,0,1)] w-full max-w-md mb-8 transform rotate-1">
                        <h3 className="text-4xl font-bold text-center text-gray-800 mb-6 underline decoration-wavy decoration-[#FF5722]">
                            Round Scores
                        </h3>

                        <div className="flex flex-col gap-4">
                            {/* Map through players and sort by who got the highest score this round */}
                            {lastRoundData.players
                                .sort((a, b) => {
                                    const scoreA = lastRoundData.results[a.id]?.roundScore || 0;
                                    const scoreB = lastRoundData.results[b.id]?.roundScore || 0;
                                    return scoreB - scoreA;
                                })
                                .map(player => {
                                    const roundScore = lastRoundData.results[player.id]?.roundScore || 0;
                                    const PlayerIcon = AVATAR_MAP[player.avatar] || Dog;

                                    return (
                                        <div key={player.id} className="flex justify-between items-center text-2xl md:text-3xl border-b-4 border-gray-200 pb-3 border-dashed">
                                            <div className="flex items-center gap-3">
                                                <div className="text-gray-800 filter drop-shadow-sm">
                                                    <PlayerIcon size={36} strokeWidth={2} />
                                                </div>
                                                <span className="font-bold text-gray-700 truncate max-w-[150px] md:max-w-[200px]">
                                                    {player.name}
                                                </span>
                                            </div>
                                            <span className={`font-black ${roundScore > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                                +{roundScore}
                                            </span>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                    {/* The Countdown Timer */}
                    <div className="flex items-center gap-4 text-white bg-black/50 px-6 py-3 rounded-full border-4 border-white border-dashed">
                        <p className="text-2xl md:text-3xl font-bold tracking-wider">Next round in</p>
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-[#FF5722] rounded-full flex items-center justify-center border-4 border-white shadow-lg animate-pulse">
                            <span className="text-3xl md:text-4xl font-black text-white">{countdown}</span>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}

export default GameRoom;