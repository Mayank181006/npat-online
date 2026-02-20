import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';

function GlobalAudio() {
  const [isOpen, setIsOpen] = useState(false);
  
  // ✅ TWO SEPARATE VOLUME STATES
  const [musicVolume, setMusicVolume] = useState(0.5); 
  const [sfxVolume, setSfxVolume] = useState(0.5); 
  
  const [isMuted, setIsMuted] = useState(false);
  
  // Audio references
  const bgAudioRef = useRef(null);
  const clickAudioRef = useRef(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  // ✅ APPLY SEPARATE VOLUMES TO EACH AUDIO ELEMENT
  useEffect(() => {
    if (bgAudioRef.current) {
      bgAudioRef.current.volume = isMuted ? 0 : musicVolume;
    }
    if (clickAudioRef.current) {
      clickAudioRef.current.volume = isMuted ? 0 : sfxVolume;
    }
  }, [musicVolume, sfxVolume, isMuted]);

  // BYPASS BROWSER AUTOPLAY BLOCK FOR MUSIC
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (bgAudioRef.current && !hasInteracted) {
        bgAudioRef.current.play().catch(e => console.log("BG audio waiting for interaction"));
        setHasInteracted(true);
      }
    };
    
    document.addEventListener("click", handleFirstInteraction, { once: true });
    return () => document.removeEventListener("click", handleFirstInteraction);
  }, [hasInteracted]);

  // GLOBAL CLICK SOUND FOR ALL BUTTONS
  useEffect(() => {
    const playClickSound = (e) => {
      if (e.target.closest('button') && clickAudioRef.current && !isMuted && sfxVolume > 0) {
        clickAudioRef.current.currentTime = 0; 
        clickAudioRef.current.play().catch(err => console.log("Click audio blocked"));
      }
    };

    document.addEventListener('click', playClickSound);
    return () => document.removeEventListener('click', playClickSound);
  }, [isMuted, sfxVolume]); // Re-run if mute or sfxVolume changes

  // Determine icon based on the highest volume currently active
  const maxVolume = Math.max(musicVolume, sfxVolume);
  const VolumeIcon = isMuted || maxVolume === 0 
    ? VolumeX 
    : maxVolume < 0.5 ? Volume1 : Volume2;

  const toggleMute = (e) => {
    e.stopPropagation(); 
    setIsMuted(!isMuted);
  };

  return (
    <div className="fixed top-4 left-4 z-[9999] font-['Delicious_Handrawn']">
      
      {/* Hidden Audio Elements */}
      <audio ref={bgAudioRef} src="/sounds/bg-music.mp3" loop />
      <audio ref={clickAudioRef} src="/sounds/click.mp3" preload="auto" />

      {/* The Chunky Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-white border-4 border-black rounded-full flex items-center justify-center text-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all relative group"
      >
        <VolumeIcon size={28} />
      </button>

      {/* The Dropdown Slider Menu */}
      {isOpen && (
        <div className="absolute top-16 left-0 bg-[#FFCA28] border-4 border-black p-4 rounded-2xl shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col items-center gap-2 animate-fade-in-down w-56">
          
          {/* ✅ SLIDER 1: MUSIC VOLUME */}
          <div className="w-full flex flex-col items-center mb-2">
            <span className="text-xl font-bold tracking-wider mb-1">Music</span>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05"
              value={isMuted ? 0 : musicVolume}
              onChange={(e) => {
                setMusicVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="w-full h-3 bg-white border-2 border-black rounded-lg appearance-none cursor-pointer accent-[#FF5722]"
            />
          </div>

          {/* ✅ SLIDER 2: CLICK / SFX VOLUME */}
          <div className="w-full flex flex-col items-center mb-2">
            <span className="text-xl font-bold tracking-wider mb-1">Sound FX</span>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05"
              value={isMuted ? 0 : sfxVolume}
              onChange={(e) => {
                setSfxVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="w-full h-3 bg-white border-2 border-black rounded-lg appearance-none cursor-pointer accent-[#009688]"
            />
          </div>

          <button 
            onClick={toggleMute}
            className="mt-2 w-full bg-white border-2 border-black px-4 py-1 rounded-full text-lg font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
          >
            {isMuted ? "Unmute All" : "Mute All"}
          </button>
        </div>
      )}
    </div>
  );
}

export default GlobalAudio;