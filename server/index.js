const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { processRoundResults } = require('./utils/gameEngine');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Update if your React port changes
    methods: ["GET", "POST"]
  }
});

// --- GAME STATE ---
const rooms = {}; 
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');

// --- UTILS ---
const generateRoomId = () => Math.random().toString(36).substring(2, 8).toUpperCase();
const getRandomLetter = () => LETTERS[Math.floor(Math.random() * LETTERS.length)];

io.on('connection', (socket) => {
  console.log("New Connection:", socket.id);

  // 1. CREATE ROOM
  socket.on('create_room', (data) => {
    const roomId = generateRoomId();
    const player = {
      id: socket.id,
      name: data.name,
      avatar: data.avatar || '👤',
      scores: 0,
      currentInput: {} 
    };
    
    // Inside socket.on('create_room', ...)
    rooms[roomId] = {
      id: roomId,
      players: [player],
      gameState: 'lobby', 
      config: { totalRounds: 10, roundTime: 150 },
      currentRound: 0,
      currentLetter: '?', 
      // ✅ ADD THIS: A fresh pool of letters for this specific game
      letterPool: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('') 
    };

    socket.join(roomId);
    socket.emit('room_created', roomId);
  });

  // 2. JOIN ROOM (✅ FIXED: Validates room and emits success/error)
  socket.on('join_room', ({ roomId, name, avatar }) => {
    if (rooms[roomId] && rooms[roomId].players.length < 4) {
      const player = { 
        id: socket.id, 
        name, 
        avatar: avatar || '👤', 
        scores: 0,
        currentInput: {}
      };
      
      rooms[roomId].players.push(player);
      socket.join(roomId);

      // Tell everyone in the room to update their lobby UI
      io.to(roomId).emit('update_lobby', rooms[roomId].players);
      
      // ✅ Emit a specific success event to the user who just joined
      socket.emit('room_joined', roomId); 
      
      // Auto-start ONLY if full (4 players)
      if (rooms[roomId].players.length === 4) {
        startGame(roomId);
      }
    } else {
      // ✅ Tell the frontend if the room is fake or full
      socket.emit('error_message', 'Room not found or is currently full!');
    }
  });

  // 3. LOBBY STATE (For late joiners / refresh)
  socket.on('check_room_state', (roomId) => {
      const room = rooms[roomId];
      if (room) {
          socket.emit('update_lobby', room.players);
          // If game is ALREADY playing, tell them to move to game
          if (room.gameState === 'playing') {
             socket.emit('round_start', {
                round: room.currentRound,
                letter: room.currentLetter,
                totalRounds: room.config.totalRounds
             });
          }
      }
  });

  // 4. FORCE START GAME (✅ FIXED: Now accepts custom rounds from host)
  socket.on('force_start_game', (data) => {
      const { roomId, rounds } = data; // Destructure object sent from frontend
      
      if(rooms[roomId]) {
          // Overwrite default rounds with host's selection (fallback to 10 if missing)
          rooms[roomId].config.totalRounds = rounds || 10; 
          startGame(roomId);
      }
  });

  // 5. GAME DATA SYNC (When player enters the game page)
  socket.on('get_game_data', (roomId) => {
      const room = rooms[roomId];
      if (room && room.gameState === 'playing') {
          // Send the current state immediately to the requesting player
          socket.emit('sync_game_data', {
              round: room.currentRound,
              letter: room.currentLetter,
              totalRounds: room.config.totalRounds,
              players: room.players // Also sync scores
          });
      }
  });

  // --- GAME LOGIC FUNCTIONS ---
  const startGame = (roomId) => {
    const room = rooms[roomId];
    if (!room) return;
    room.gameState = 'playing';
    room.currentRound = 1;
    startRound(roomId);
  };

  const startRound = (roomId) => {
    const room = rooms[roomId];
    if (!room) return;

    // ✅ PULL A RANDOM LETTER AND REMOVE IT FROM THE POOL
    if (room.letterPool.length === 0) {
        // Just in case they somehow play 27 rounds, reset the pool
        room.letterPool = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
    }
    const randomIndex = Math.floor(Math.random() * room.letterPool.length);
    room.currentLetter = room.letterPool[randomIndex];
    room.letterPool.splice(randomIndex, 1); // Removes the letter so it can't be picked again
    
    io.to(roomId).emit('round_start', {
      round: room.currentRound,
      letter: room.currentLetter,
      totalRounds: room.config.totalRounds
    });

    if (room.timer) clearTimeout(room.timer);
    room.timer = setTimeout(() => {
      endRound(roomId);
    }, room.config.roundTime * 1000); 
  };

  // Listen for individual key strokes / inputs from players
  socket.on('submit_input', ({ roomId, round, category, value }) => {
    const room = rooms[roomId];
    if(!room || room.gameState !== 'playing') return;

    const player = room.players.find(p => p.id === socket.id);
    if(player) {
        if(!player.currentInput) player.currentInput = {};
        player.currentInput[category] = value;
    }
  });

  // Listen for "I'm Done / Submit" button
  socket.on('player_finished_round', ({roomId}) => {
      if(rooms[roomId] && rooms[roomId].timer) {
          clearTimeout(rooms[roomId].timer);
          endRound(roomId); // Force end round early if someone clicks submit
      }
  });

  // Process scores and move to next round
  // Process scores and move to next round
  const endRound = async (roomId) => {
    const room = rooms[roomId];
    if (!room) return;
    
    console.log(`Calculating scores for Room ${roomId}...`);
    
    try {
        // Pass current inputs to AI Referee Engine
        const results = await processRoundResults(room.players, room.currentLetter);

        // Clear inputs for the next round
        room.players.forEach(p => p.currentInput = {});

        // Send results back to clients
        io.to(roomId).emit('round_end', {
            results: results,
            players: room.players
        });

    } catch (error) {
        // ✅ SAFETY NET: If the AI or scoring algorithm completely fails
        console.error(`🚨 Score calculation failed for room ${roomId}:`, error);
        
        // Let the players know there was a hiccup
        io.to(roomId).emit('error_message', 'The AI Referee had a hiccup! Moving to next round...');
        
        // Clear inputs and send an empty result so the game doesn't freeze
        room.players.forEach(p => p.currentInput = {});
        io.to(roomId).emit('round_end', {
            results: {}, // Empty results fallback
            players: room.players
        });
    }

    // Always attempt to move to the next round, regardless of AI success/failure
    setTimeout(() => {
        if (room.currentRound < room.config.totalRounds) {
            room.currentRound++;
            startRound(roomId);
        } else {
            io.to(roomId).emit('game_over', room.players);
        }
    }, 5000);
  };

  socket.on('disconnect', () => {
    console.log("User Disconnected", socket.id);
    // Optional: Add logic here to remove player from room or handle host disconnects
  });
});

const PORT = 3001;
// --- GLOBAL ERROR SAFETY NETS ---
process.on('uncaughtException', (err) => {
  console.error('🔥 CRITICAL ERROR (Uncaught Exception):', err);
  // The server will log the error but will NOT shut down immediately.
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ UNHANDLED PROMISE REJECTION:', reason);
  // Catches missing 'catch' blocks in async functions, preventing crashes.
});
server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});