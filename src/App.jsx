
import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import './App.css';

const LANES = [-2, 0, 2];

function Robot({ lane }) {
  const { scene } = useGLTF('/models/robot.glb');
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        console.log('Robot part:', child.name);
      }
    });
  }, [scene]);

  const robotRef = useRef();
  const previousLane = useRef(lane);
  const leanDirection = useRef(0);

  useFrame((state, delta) => {
    if (!robotRef.current) return;

    const targetX = LANES[lane];

    // Detect lane changes
    if (previousLane.current !== lane) {
      leanDirection.current =
        lane > previousLane.current ? -1 : 1;

      previousLane.current = lane;
    }

    // Smooth lane movement
    robotRef.current.position.x = THREE.MathUtils.damp(
      robotRef.current.position.x,
      targetX,
      10,
      delta
    );

    // Running bounce
    const bounce = Math.abs(
      Math.sin(state.clock.elapsedTime * 11)
    );

    robotRef.current.position.y = bounce * 0.16;

    // Lean while changing lanes, then return upright
    const targetLean = leanDirection.current * 0.18;

    robotRef.current.rotation.z = THREE.MathUtils.damp(
      robotRef.current.rotation.z,
      targetLean,
      8,
      delta
    );

    if (Math.abs(robotRef.current.rotation.z) < 0.01) {
      leanDirection.current = 0;
    }
  });

  return (
     <group ref={robotRef} position={[0, 0, 2.5]}>
        <primitive
          object={scene}
          scale={1.2}
          rotation={[0, Math.PI, 0]}
          position={[0, 0.9, 0]}
        />
      </group>
  );
}

function Coin({ position, onCollect, speed, running, lane, resetKey }) {
  const ref = useRef();
  const collected = useRef(false);
  const initialPosition = useRef(position);

  useEffect(() => {
    if (!ref.current) return;

    ref.current.position.set(...initialPosition.current);
    ref.current.visible = true;
    collected.current = false;
  }, [resetKey]);

  useFrame((state, delta) => {
    if (!ref.current || !running) return;

    ref.current.rotation.y += delta * 3;
    ref.current.position.z += speed * delta;

    if (
      ref.current.position.z > 1.8 &&
      ref.current.position.z < 3.2 &&
      !collected.current
    ) {
      if (Math.abs(ref.current.position.x - LANES[lane]) < 0.65) {
        collected.current = true;
        ref.current.visible = false;
        onCollect();
      }
    }

    if (ref.current.position.z > 5) {
      ref.current.position.z = -25;

      ref.current.position.x =
        LANES[Math.floor(Math.random() * LANES.length)];

      ref.current.visible = true;
      collected.current = false;
    }
  });

  return (
    <mesh ref={ref} position={position}>
      <cylinderGeometry args={[0.4, 0.4, 0.12, 32]} />

      <meshStandardMaterial
        color="#FFD700"
        metalness={0.8}
        roughness={0.2}
        emissive="#8B6508"
      />
    </mesh>
  );
}

function Obstacle({ position, onHit, speed, running, lane, resetKey }) {
  const ref = useRef();
  const hit = useRef(false);
  const initialPosition = useRef(position);

  useEffect(() => {
    if (!ref.current) return;

    ref.current.position.set(...initialPosition.current);
    hit.current = false;
  }, [resetKey]);

  useFrame((state, delta) => {
    if (!ref.current || !running) return;

    ref.current.position.z += speed * delta;

    if (
      !hit.current &&
      ref.current.position.z > 1.8 &&
      ref.current.position.z < 3.2 &&
      Math.abs(ref.current.position.x - LANES[lane]) < 0.85
    ) {
      hit.current = true;
      onHit();
    }

    if (ref.current.position.z > 5) {
      ref.current.position.z = -30;

      ref.current.position.x =
        LANES[Math.floor(Math.random() * LANES.length)];

      hit.current = false;
    }
  });

  return (
    <mesh ref={ref} position={position} castShadow>
      <boxGeometry args={[1.2, 1.5, 1]} />

      <meshStandardMaterial
        color="#E63946"
        roughness={0.6}
      />
    </mesh>
  );
}

function MovingEnvironment({ running, speed }) {
  const laneMarkers = useRef([]);
  const neonLights = useRef([]);

  useFrame((state, delta) => {
    if (!running) return;

    // Move lane markings towards the robot
    laneMarkers.current.forEach((marker) => {
      if (!marker) return;

      marker.position.z += speed * delta;

      if (marker.position.z > 5) {
        marker.position.z -= 64;
      }
    });

    // Move neon roadside lights
    neonLights.current.forEach((light) => {
      if (!light) return;

      light.position.z += speed * delta;

      if (light.position.z > 5) {
        light.position.z -= 64;
      }
    });
  });

  return (
    <>
      {/* Moving lane markings */}
      {[-1, 1].map((x) =>
        Array.from({ length: 8 }).map((_, index) => {
          const markerIndex = (x === -1 ? 0 : 8) + index;

          return (
            <mesh
              key={`${x}-${index}`}
              ref={(element) => {
                laneMarkers.current[markerIndex] = element;
              }}
              position={[x, 0.02, -4 - index * 8]}
            >
              <boxGeometry args={[0.06, 0.04, 3]} />

              <meshStandardMaterial
                color="#FFFFFF"
                emissive="#FFFFFF"
                emissiveIntensity={0.35}
              />
            </mesh>
          );
        })
      )}

      {/* Futuristic neon roadside lights */}
      {[-1, 1].map((side) =>
        Array.from({ length: 8 }).map((_, index) => {
          const lightIndex = (side === -1 ? 0 : 8) + index;

          return (
            <group
              key={`${side}-${index}`}
              ref={(element) => {
                neonLights.current[lightIndex] = element;
              }}
              position={[side * 4.7, 0, -4 - index * 8]}
            >
              {/* Light pole */}
              <mesh position={[0, 1.5, 0]}>
                <boxGeometry args={[0.12, 3, 0.12]} />

                <meshStandardMaterial
                  color="#00D9FF"
                  emissive="#00D9FF"
                  emissiveIntensity={2}
                />
              </mesh>

              {/* Glowing light */}
              <mesh position={[0, 3.1, 0]}>
                <sphereGeometry args={[0.3, 16, 16]} />

                <meshStandardMaterial
                  color="#00FFFF"
                  emissive="#00FFFF"
                  emissiveIntensity={3}
                />
              </mesh>

              {/* Light base */}
              <mesh position={[0, 0.1, 0]}>
                <boxGeometry args={[0.7, 0.2, 0.7]} />

                <meshStandardMaterial
                  color="#172B45"
                  metalness={0.8}
                  roughness={0.2}
                />
              </mesh>
            </group>
          );
        })
      )}
    </>
  );
}
function NeonSign({ position, color }) {
  const materialRef = useRef();

  useFrame((state) => {
    if (!materialRef.current) return;

    materialRef.current.emissiveIntensity =
      1.5 + Math.sin(state.clock.elapsedTime * 3) * 0.8;
  });

  return (
    <group position={position}>
      {/* Main neon sign */}
      <mesh>
        <boxGeometry args={[1.2, 0.65, 0.08]} />

        <meshStandardMaterial
          ref={materialRef}
          color={color}
          emissive={color}
          emissiveIntensity={2}
          metalness={0.5}
          roughness={0.2}
        />
      </mesh>

      {/* Decorative sign lines */}
      <mesh position={[0, 0.12, 0.06]}>
        <boxGeometry args={[0.75, 0.06, 0.03]} />
        <meshBasicMaterial color="white" />
      </mesh>

      <mesh position={[0, -0.12, 0.06]}>
        <boxGeometry args={[0.45, 0.04, 0.03]} />
        <meshBasicMaterial color="white" />
      </mesh>
    </group>
  );
}
function CityBuildings({ running, speed }) {
  const buildings = useRef([]);

  const buildingData = [
    { x: -7, z: -8, h: 5, w: 2 },
    { x: 7, z: -12, h: 7, w: 2.5 },
    { x: -8, z: -18, h: 8, w: 2 },
    { x: 8, z: -24, h: 5, w: 2 },
    { x: -7, z: -30, h: 6, w: 2.5 },
    { x: 7, z: -36, h: 9, w: 2 },
    { x: -8, z: -42, h: 7, w: 2 },
    { x: 8, z: -48, h: 6, w: 2.5 },
  ];

  useFrame((state, delta) => {
    if (!running) return;

    buildings.current.forEach((building) => {
      if (!building) return;

      building.position.z += speed * delta;

      if (building.position.z > 8) {
        building.position.z -= 56;
      }
    });
  });

  return (
    <>
      {buildingData.map((building, index) => (
        <group
          key={index}
          ref={(element) => {
            buildings.current[index] = element;
          }}
          position={[building.x, building.h / 2 - 0.1, building.z]}
        >
          {/* Building body */}
          <mesh>
            <boxGeometry
              args={[building.w, building.h, 2.5]}
            />

            <meshStandardMaterial
              color="#101C38"
              metalness={0.8}
              roughness={0.3}
            />
          </mesh>

          {/* Glowing rooftop */}
          <mesh position={[0, building.h / 2 + 0.05, 0]}>
            <boxGeometry args={[building.w + 0.15, 0.12, 2.6]} />

            <meshStandardMaterial
              color="#00D9FF"
              emissive="#00D9FF"
              emissiveIntensity={2}
            />
          </mesh>
          {/* Animated neon sign */}

          <NeonSign
            position={[
              0,
              0,
              1.32
            ]}
            color={index % 2 === 0 ? '#00D9FF' : '#B026FF'}
          />

          {/* Neon windows */}
          {Array.from({ length: Math.floor(building.h / 1.2) }).map(
            (_, windowIndex) => (
              <group key={windowIndex}>
                {[-0.5, 0.5].map((windowX) => (
                  <mesh
                    key={windowX}
                    position={[
                      windowX * building.w * 0.65,
                      -building.h / 2 + 0.8 + windowIndex * 1.1,
                      1.26,
                    ]}
                  >
                    <boxGeometry args={[0.22, 0.35, 0.04]} />

                    <meshStandardMaterial
                      color="#00E5FF"
                      emissive="#00E5FF"
                      emissiveIntensity={2}
                    />
                  </mesh>
                ))}
              </group>
            )
          )}
        </group>
      ))}
    </>
  );
}
function GameWorld({ lane, onCollect, onHit, running, resetKey }) {
  const speed = 8;

  return (
    <>
      {/* Main road */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.1, -10]}
      >
        <planeGeometry args={[8, 100]} />

        <meshStandardMaterial
          color="#151D30"
          roughness={0.85}
          metalness={0.3}
        />
      </mesh>

      {/* Neon road boundaries */}
      {[-3.5, 3.5].map((x) => (
        <mesh key={x} position={[x, 0.05, -10]}>
          <boxGeometry args={[0.12, 0.1, 100]} />

          <meshStandardMaterial
            color="#00D9FF"
            emissive="#00D9FF"
            emissiveIntensity={2}
          />
        </mesh>
      ))}

      {/* Moving environment */}
      <MovingEnvironment
        running={running}
        speed={speed}
      />

      {/* Futuristic city buildings */}
      <CityBuildings
        running={running}
        speed={speed}
      />

      {/* Robot */}
      <Robot lane={lane} />

      {/* Coins */}
      <Coin
        position={[-2, 1, -10]}
        onCollect={onCollect}
        speed={speed}
        running={running}
        lane={lane}
        resetKey={resetKey}
      />

      <Coin
        position={[0, 1, -17]}
        onCollect={onCollect}
        speed={speed}
        running={running}
        lane={lane}
        resetKey={resetKey}
      />

      <Coin
        position={[2, 1, -24]}
        onCollect={onCollect}
        speed={speed}
        running={running}
        lane={lane}
        resetKey={resetKey}
      />

      <Coin
        position={[0, 1, -31]}
        onCollect={onCollect}
        speed={speed}
        running={running}
        lane={lane}
        resetKey={resetKey}
      />

      {/* Obstacles */}
      <Obstacle
        position={[2, 0.75, -14]}
        onHit={onHit}
        speed={speed}
        running={running}
        lane={lane}
        resetKey={resetKey}
      />

      <Obstacle
        position={[-2, 0.75, -21]}
        onHit={onHit}
        speed={speed}
        running={running}
        lane={lane}
        resetKey={resetKey}
      />

      <Obstacle
        position={[0, 0.75, -28]}
        onHit={onHit}
        speed={speed}
        running={running}
        lane={lane}
        resetKey={resetKey}
      />
    </>
  );
}
function App() {
  const [lane, setLane] = useState(1);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const audioContextRef = useRef(null);

    const playSound = (sound) => {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      const audio = audioContextRef.current;

      if (audio.state === 'suspended') {
        audio.resume();
      }

      const oscillator = audio.createOscillator();
      const gain = audio.createGain();

      oscillator.connect(gain);
      gain.connect(audio.destination);

      const now = audio.currentTime;

      if (sound === 'coin') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, now);
        oscillator.frequency.exponentialRampToValueAtTime(1320, now + 0.12);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        oscillator.start(now);
        oscillator.stop(now + 0.2);
      }

      if (sound === 'move') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(350, now);
        oscillator.frequency.exponentialRampToValueAtTime(520, now + 0.08);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        oscillator.start(now);
        oscillator.stop(now + 0.1);
      }

      if (sound === 'hit') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(180, now);
        oscillator.frequency.exponentialRampToValueAtTime(45, now + 0.4);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        oscillator.start(now);
        oscillator.stop(now + 0.4);
      }
    };

  // Touch swipe references
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Restart game
  const resetGame = () => {
    setLane(1);
    setScore(0);
    setCoins(0);
    setResetKey((current) => current + 1);
    setStarted(true);
    setPaused(false);
    setRunning(true);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!running || paused) return;

      if (
        event.key === 'ArrowLeft' ||
        event.key.toLowerCase() === 'a'
      ) {
        event.preventDefault();
        setLane((current) => Math.max(0, current - 1));
      }

      if (
        event.key === 'ArrowRight' ||
        event.key.toLowerCase() === 'd'
      ) {
        event.preventDefault();
        setLane((current) => Math.min(2, current + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [running]);

  // Mobile swipe start
  const handleTouchStart = (event) => {
    if (!running || paused) return;

    touchStartX.current = event.touches[0].clientX;
    touchStartY.current = event.touches[0].clientY;
  };

  // Mobile swipe end
  
  const handleTouchEnd = (event) => {
    if (!running || paused) return;

    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;

    const differenceX = touchEndX - touchStartX.current;
    const differenceY = touchEndY - touchStartY.current;

    if (
      Math.abs(differenceX) > 40 &&
      Math.abs(differenceX) > Math.abs(differenceY)
    ) {
      if (differenceX < 0) {
        playSound('move');
        setLane((current) => Math.max(0, current - 1));
      } else {
        playSound('move');
        setLane((current) => Math.min(2, current + 1));
      }
    }
  };

  
  // Touch button controls
  const moveLeft = () => {
    if (!running || paused) return;

    playSound('move');
    setLane((current) => Math.max(0, current - 1));
  };

  const moveRight = () => {
    if (!running || paused) return;

    playSound('move');
    setLane((current) => Math.min(2, current + 1));
  };
  
  // Score timer

  useEffect(() => {
      if (!running || paused) return;

      const timer = setInterval(() => {
        setScore((current) => current + 1);
      }, 500);

      return () => clearInterval(timer);
    }, [running, paused]);

  // Collect coin
 
  const collectCoin = () => {
    playSound('coin');

    setCoins((current) => current + 1);
    setScore((current) => current + 10);
  };

  // Hit obstacle
  const hitObstacle = () => {
    playSound('hit');
    setRunning(false);
  };

  return (
    <div className="game-container">

      {/* Header */}
      <header className="game-header">
        <div>
          <h1>COIN QUEST</h1>
          <p>Run. Dodge. Collect. Win.</p>
        </div>

        <div className="game-stats">
          <div className="score-box">
            <span>🏆 SCORE</span>
            <strong>{score}</strong>
          </div>

          <div className="coin-box">
            <span>🪙 COINS</span>
            <strong>{coins}</strong>
          </div>
        </div>
      </header>

      {/* Game Screen */}
      <div
        className="game-screen"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >

        
        <Canvas
      camera={{ position: [0, 5, 9], fov: 55 }}
      shadows
    >
      <color attach="background" args={['#080F20']} />

      <fog attach="fog" args={['#080F20', 18, 65]} />

      <ambientLight intensity={0.8} />

      <directionalLight
        position={[5, 10, 5]}
        intensity={2}
        castShadow
      />

      <pointLight
        position={[0, 5, 0]}
        intensity={2}
        color="#00D9FF"
      />

      <pointLight
        position={[-5, 3, -10]}
        intensity={1.5}
        color="#7B2CFF"
      />

      <GameWorld
        lane={lane}
        onCollect={collectCoin}
        onHit={hitObstacle}
        running={running && !paused}
        resetKey={resetKey}
      />
    </Canvas>

    {/* Pause Button */}
        {started && running && !paused && (
          <button
            className="pause-button"
            onClick={() => setPaused(true)}
          >
            ⏸ PAUSE
          </button>
        )}

        {/* Paused Screen */}
        {started && running && paused && (
          <div className="game-overlay">
            <h2>GAME PAUSED</h2>
            <p>Your score: {score}</p>
            <p>Coins collected: {coins}</p>

            <button onClick={() => setPaused(false)}>
              ▶ RESUME GAME
            </button>
          </div>
        )}

        {/* Touch Controls */}
        {running && (
          <div className="touch-controls">
            <button
              type="button"
              onClick={moveLeft}
              aria-label="Move left"
            >
              ◀
            </button>

            <button
              type="button"
              onClick={moveRight}
              aria-label="Move right"
            >
              ▶
            </button>
          </div>
        )}

                {/* Main Menu */}
        {!started && (
          <div className="main-menu">
            <div className="menu-content">

              <p className="menu-subtitle">WELCOME TO</p>

              <h1 className="menu-title">
                COIN <span>QUEST</span>
              </h1>

              <p className="menu-description">
                Run through the futuristic city, collect coins
                and avoid dangerous obstacles!
              </p>

              <div className="menu-instructions">
                <h3>HOW TO PLAY</h3>

                <p>⬅️ Move left: A / Left Arrow</p>
                <p>➡️ Move right: D / Right Arrow</p>
                <p>🪙 Collect coins to earn points</p>
                <p>🚧 Avoid red obstacles</p>
              </div>

              <button
                className="play-button"
                onClick={resetGame}
              >
                ▶ PLAY GAME
              </button>

              <p className="menu-footer">
                RUN. DODGE. COLLECT. WIN.
              </p>

            </div>
          </div>
        )}

       
        

        {/* Game Over Screen */}
        
        {/* Game Over Screen */}
        {started && !running && (
            <div className="game-overlay game-over-screen">
              <div className="game-over-content">
                <div className="game-over-icon">🏆</div>

                <p className="game-over-subtitle">QUEST COMPLETED</p>

                <h2>GAME OVER!</h2>

                <p className="game-over-message">
                  Great effort! Ready for another run?
                </p>

                <div className="final-stats">
                  <div className="final-stat">
                    <span>🏆 FINAL SCORE</span>
                    <strong>{score}</strong>
                  </div>

                  <div className="final-stat">
                    <span>🪙 COINS COLLECTED</span>
                    <strong>{coins}</strong>
                  </div>
                </div>

                <button onClick={resetGame}>
                  ↻ PLAY AGAIN
                </button>
              </div>
            </div>
          )}


      </div>

      {/* Controls */}
      <footer className="game-controls">
        <span>⬅️ A / LEFT</span>
        <span>MOVE ROBOT</span>
        <span>RIGHT / D ➡️</span>
      </footer>

    </div>
  );
}

useGLTF.preload('/models/robot.glb');

export default App;
