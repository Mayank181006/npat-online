import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast'; // ✅ Import Toaster and toast
import bgImage from '../assets/bg_npat.png';
import logoImage from '../assets/logo.png';
import logoMobile from '../assets/logo_mobile.png';
import { Globe, Handshake , House } from 'lucide-react';

const AVATAR_OPTIONS = [
  "Cat", "Dog", "Bird", "Rabbit", "Turtle", 
  "Fish", "Snail", "Ghost", "Skull", "Zap", 
  "Crown", "Rocket", "Smile" , "Panda"
];

const getRandomAvatar = () => {
  const randomIndex = Math.floor(Math.random() * AVATAR_OPTIONS.length);
  return AVATAR_OPTIONS[randomIndex];
};

function Home({ socket }) {
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [joinId, setJoinId] = useState("");

  const [isMobile, setIsMobile] = useState(window.innerWidth < 500);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 500);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Server response listeners
  useEffect(() => {
    socket.on("room_joined", (id) => {
      navigate(`/lobby/${id}`, { state: { name, isHost: false } });
    });

    socket.on("error_message", (msg) => {
      // ✅ Themed Server Error Toast
      toast.error(msg, { icon: '🚫' }); 
    });

    return () => {
      socket.off("room_joined");
      socket.off("error_message");
    };
  }, [socket, navigate, name]);

  const createRoom = () => {
    // ✅ Specific, friendly error message
    if (!name.trim()) {
        return toast.error("Oops! Don't forget to enter your name! 📝");
    }

    socket.emit("create_room", { name, avatar: getRandomAvatar() });

    socket.once("room_created", (roomId) => {
      navigate(`/lobby/${roomId}`, { state: { name, isHost: true } });
    });
  };

  const joinRoom = () => {
    // ✅ Specific error messages based on what is missing
    if (!name.trim() && !joinId.trim()) {
        return toast.error("We need your Name and a Room Code! 🕵️‍♂️");
    }
    if (!name.trim()) {
        return toast.error("What should we call you? Enter a name! 📝");
    }
    if (!joinId.trim()) {
        return toast.error("Got a code? Enter it to join! 🎫");
    }

    socket.emit("join_room", { roomId: joinId, name});
  };

  return (
    <div
      className="h-screen w-full flex flex-col items-center justify-center relative"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: '750px',
        backgroundRepeat: 'repeat',
        backgroundPosition: 'center',
        fontFamily: "'Delicious Handrawn', cursive"
      }}
    >
      {/* ✅ Themed Toaster Component */}
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            fontFamily: "'Delicious Handrawn', cursive",
            fontSize: '1.5rem',
            border: '4px solid black',
            padding: '16px 24px',
            color: '#333',
            boxShadow: '4px 4px 0px rgba(0,0,0,1)', // Hard shadow for cartoon effect
            borderRadius: '1rem',
          },
          error: {
            style: {
              background: '#FFE0E0', 
              borderColor: '#FF5722',
            },
            iconTheme: {
              primary: '#FF5722',
              secondary: '#FFE0E0',
            },
          }
        }}
      />

      {/* White Overlay */}
      <div className="absolute inset-0 bg-white/70"></div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full px-6 md:px-10 max-w-5xl">
        <img
          src={isMobile ? logoMobile : logoImage}
          alt="Name Place Animal Thing"
          className="w-8/10 max-w-[400px] md:max-w-[1600px] mb-2 -mt-12"
        />

        {/* Buttons */}
        <div className="flex flex-col md:flex-row gap-2 justify-center items-center">
          <button
            disabled
            className="w-48 py-4 bg-[#00897B] flex justify-center items-center gap-2 text-white text-2xl rounded-full shadow-xl border-4 border-white opacity-70 cursor-not-allowed relative group"
          >
            <Globe /> Play Online
            <div
              className="absolute -top-4 -right-2 bg-yellow-400 text-black text-sm font-bold px-3 py-1 rounded-full transform rotate-12 border-2 border-white font-sans group-hover:scale-110 transition-transform">
              SOON
            </div>
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="w-48 py-4 bg-[#FF4081] hover:bg-[#F50057] flex items-center justify-center gap-2 text-2xl text-white rounded-full shadow-xl border-4 border-white hover:scale-105 transition-all active:scale-95"
          >
            <Handshake /> Play w/ Friends
          </button>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-md border-8 border-blue-200 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-5 text-gray-400 hover:text-red-500 text-5xl font-bold leading-none"
            >
              &times;
            </button>

            <h2 className="text-5xl font-bold text-center mb-8 text-gray-700 underline decoration-wavy decoration-[#FF4081]">
              Setup Profile
            </h2>

            {/* Name */}
            <div className="mb-8">
              <label className="block text-3xl text-gray-600 mb-2 ml-1">
                Your Name
              </label>

              <input
                className="w-full border-4 border-gray-200 p-3 rounded-xl text-3xl focus:border-blue-400 focus:outline-none bg-gray-50 placeholder-gray-300 text-center"
                placeholder="Ex. Player1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={12}
              />
            </div>

            <div className="flex flex-col gap-4">
              <button
                onClick={createRoom}
                className="w-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center gap-2 text-white text-3xl py-4 rounded-xl shadow-md transition-transform active:scale-95 border-b-8 border-blue-700 active:border-b-0 active:mt-2"
              >
                Create Room <House />
              </button>

              <div className="text-center text-gray-400 text-xl font-bold py-2">
                - OR -
              </div>

              <div className="flex gap-3">
                <input
                  className="w-full border-4 border-orange-200 p-2 rounded-lg text-2xl focus:outline-none uppercase text-center"
                  placeholder="CODE"
                  value={joinId}
                  onChange={(e) =>
                    setJoinId(e.target.value.toUpperCase())
                  }
                />

                <button
                  onClick={joinRoom}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 rounded-lg text-2xl shadow-md transition-transform active:scale-95 border-b-8 border-orange-700 active:border-b-0 active:mt-2"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;