import { useState, useEffect, useRef } from 'react';
import './App.css';

// Timeline data - CUSTOMIZE THIS WITH YOUR MEMORIES
const timelineEvents = [
  {
    id: 1,
    emoji: '💬',
    title: 'First Chat',
    date: 'The Day Everything Started',
    text: "A simple 'hi' that unknowingly became the best conversation of my life. Little did I know, this would change everything.",
    image: null, // Add your image URL here: '/memories/first-chat.jpg'
    caption: null
  },
  {
    id: 2,
    emoji: '☕',
    title: 'First Date',
    date: 'When Butterflies Became Real',
    text: "It was a movie date ..Do You Remember the name huhhh??",
    image: null, // Add your image URL here
    caption: 'Us, before we knew how much we\'d mean to each other.'
  },
  {
    id: 3,
    emoji: '🌟',
    title: 'First "I Love You"',
    date: 'When Words Found Their Way',
    text: "Three words that felt so heavy to say, but so light once they were out. The moment I knew this was real.",
    image: null,
    caption: null
  },
  {
    id: 4,
    emoji: '😄',
    title: 'First Fight & Patch-up',
    date: 'When We Chose Us',
    text: "We argued, we learned, we talked… and chose each other again. Because some things are worth fighting for, not against.",
    image: null,
    caption: 'This smile still makes my day.'
  },
  {
    id: 5,
    emoji: '💖',
    title: 'Every Day Since',
    date: 'Our Beautiful Journey',
    text: "Every moment with you has been a gift. The laughs, the adventures, the quiet times—all of it with you.",
    image: null,
    caption: null
  }
];

// Floating Hearts Background Component
function FloatingHearts() {
  const hearts = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 15,
    duration: 15 + Math.random() * 10,
    size: 15 + Math.random() * 20
  }));

  return (
    <div className="floating-hearts">
      {hearts.map(heart => (
        <div
          key={heart.id}
          className="heart"
          style={{
            left: `${heart.left}%`,
            animationDelay: `${heart.delay}s`,
            animationDuration: `${heart.duration}s`,
            fontSize: `${heart.size}px`
          }}
        >
          💕
        </div>
      ))}
    </div>
  );
}

// Timeline Card Component
function TimelineCard({ event, index }) {
  const cardRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className={`timeline-card ${isVisible ? 'visible' : ''}`}
      style={{ transitionDelay: `${index * 0.1}s` }}
    >
      <div className="timeline-dot"></div>
      <div className="card-content">
        <div className="card-emoji">{event.emoji}</div>
        <h3 className="card-title">{event.title}</h3>
        <p className="card-date">{event.date}</p>
        <p className="card-text">{event.text}</p>
        {event.image && (
          <>
            <img src={event.image} alt={event.title} className="card-image" />
            {event.caption && <p className="image-caption">{event.caption}</p>}
          </>
        )}
      </div>
    </div>
  );
}

// Confetti Component
function Confetti() {
  const colors = ['#ff4d6d', '#ff758f', '#ffb3c1', '#ffd700', '#ff6b6b', '#fff'];
  const pieces = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
    scale: 0.5 + Math.random() * 1
  }));

  return (
    <div className="confetti">
      {pieces.map(piece => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            left: `${piece.left}%`,
            animationDelay: `${piece.delay}s`,
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotation}deg) scale(${piece.scale})`
          }}
        />
      ))}
    </div>
  );
}

// Music Player Component
function MusicPlayer({ isPlaying, toggleMusic }) {
  return (
    <div className="music-player" onClick={toggleMusic}>
      <span className={`music-icon ${isPlaying ? 'playing' : ''}`}>
        {isPlaying ? '🎵' : '🔇'}
      </span>
      <span>{isPlaying ? 'Music On' : 'Music Off'}</span>
    </div>
  );
}

// Main App Component
function App() {
  const [showSurprise, setShowSurprise] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const audioRef = useRef(null);

  // WhatsApp number - CUSTOMIZE THIS
  const whatsappNumber = '1234567890'; // Replace with her number
  const whatsappMessage = encodeURIComponent('Yes, of course ❤️ I loved our story!');

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.log('Audio play failed:', e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleStart = () => {
    setHasStarted(true);
    // Try to auto-play music
    if (audioRef.current) {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(e => console.log('Auto-play blocked:', e));
    }
  };

  const handleSurprise = () => {
    setShowSurprise(true);
  };

  const handleYes = () => {
    setShowConfetti(true);
    setTimeout(() => {
      window.open(`https://wa.me/${7219910782}?text=${whatsappMessage}`, '_blank');
    }, 2000);
  };

  return (
    <div className="app">
      <FloatingHearts />

      {/* Background Music */}
      <audio
        ref={audioRef}
        loop
        preload="auto"
        src={`${import.meta.env.BASE_URL}music/romantic-music.mp3`}
      />

      {/* Welcome Screen */}
      <section className="welcome-screen">
        <div className="welcome-content">
          <div className="main-heart">💖</div>
          <h1 className="welcome-title">Our Story</h1>
          <p className="welcome-subtitle">
            Happy Propose Day ....BUBA
          </p>

          <button className="music-toggle" onClick={toggleMusic}>
            <span>{isPlaying ? '🎵' : '🎶'}</span>
            Tap to {isPlaying ? 'pause' : 'play'} music
          </button>

          {!hasStarted && (
            <button className="start-journey" onClick={handleStart}>
              Begin Our Journey ❤️
            </button>
          )}
        </div>
        <div className="scroll-indicator">↓</div>
      </section>

      {/* Timeline Section */}
      <section className="timeline-section">
        <h2 className="section-title">Our Beautiful Moments</h2>
        <div className="timeline">
          {timelineEvents.map((event, index) => (
            <TimelineCard key={event.id} event={event} index={index} />
          ))}
        </div>
      </section>

      {/* Surprise Section */}
      <section className="surprise-section">
        <div className="surprise-content">
          {!showSurprise ? (
            <button className="surprise-button" onClick={handleSurprise}>
              Click for a Surprise 💝
            </button>
          ) : (
            <div className="valentine-question">
              <div className="big-heart">❤️</div>
              <h2 className="valentine-title">
                Will You Be My Valentine?
              </h2>
              <p className="valentine-text">
                After all this journey together... I just want to ask you one thing ❤️
              </p>
              <button className="yes-button" onClick={handleYes}>
                Yes! 💕
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Confetti on Yes */}
      {showConfetti && <Confetti />}

      {/* Floating Music Player */}
      {hasStarted && (
        <MusicPlayer isPlaying={isPlaying} toggleMusic={toggleMusic} />
      )}
    </div>
  );
}

export default App;
