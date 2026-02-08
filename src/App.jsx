import { useState, useEffect, useCallback } from 'react';
import './App.css';
import { addPrediction, subscribeToPredictions, registerUser, loginUser, updateUserWallet, getUserData } from './firebase';

const INITIAL_POINTS = 100;
const CRICKET_API_KEY = 'e2d16976-9771-48a6-b970-3dc2c5a8b566';
const T20_WC_SERIES_ID = '0cdf6736-ad9b-4e95-a647-5ee3a99c5510';

// Hardcoded fallback matches in case API limit is reached
const FALLBACK_MATCHES = [
  {
    id: 'fallback_sl_ire',
    team1: { name: 'Sri Lanka', shortName: 'SL', flag: '🇱🇰', color: '#004B87' },
    team2: { name: 'Ireland', shortName: 'IRE', flag: '🇮🇪', color: '#169B62' },
    venue: 'R.Premadasa Stadium, Colombo',
    date: '2026-02-08',
    dateTimeGMT: '2026-02-08T13:30:00', // 7:00 PM IST
    status: 'upcoming'
  },
  {
    id: 'fallback_sco_ita',
    team1: { name: 'Scotland', shortName: 'SCO', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', color: '#005EB8' },
    team2: { name: 'Italy', shortName: 'ITA', flag: '🇮🇹', color: '#009246' },
    venue: 'Eden Gardens, Kolkata',
    date: '2026-02-09',
    dateTimeGMT: '2026-02-09T05:30:00', // 11:00 AM IST
    status: 'upcoming'
  },
  {
    id: 'fallback_zim_oman',
    team1: { name: 'Zimbabwe', shortName: 'ZIM', flag: '🇿🇼', color: '#EFB509' },
    team2: { name: 'Oman', shortName: 'OMAN', flag: '🇴🇲', color: '#C8102E' },
    venue: 'Sinhalese Sports Club, Colombo',
    date: '2026-02-09',
    dateTimeGMT: '2026-02-09T09:30:00', // 3:00 PM IST
    status: 'upcoming'
  }
];

// Fetch upcoming T20 World Cup matches with Caching
const fetchUpcomingMatches = async () => {
  const CACHE_KEY = 'cricket_matches_cache';
  const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

  try {
    // 1. Try to get valid cache first
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      const { timestamp, matches } = JSON.parse(cachedData);
      const age = Date.now() - timestamp;

      if (age < CACHE_DURATION) {
        console.log('Using cached matches');
        return matches;
      }
    }

    console.log('Fetching from API...');
    const response = await fetch(`https://api.cricapi.com/v1/series_info?apikey=${CRICKET_API_KEY}&id=${T20_WC_SERIES_ID}`);
    const data = await response.json();

    if (data.status === 'success' && data.data?.matchList) {
      // Filter and format matches
      const upcomingMatches = data.data.matchList
        .filter(match => {
          const hasValidTeams = match.teams &&
            match.teams.length === 2 &&
            match.teams[0] !== 'Tbc' &&
            match.teams[1] !== 'Tbc';
          return !match.matchStarted && !match.matchEnded && hasValidTeams;
        })
        .map(match => formatMatch(match))
        .filter(match => match !== null)
        .sort((a, b) => new Date(a.dateTimeGMT) - new Date(b.dateTimeGMT));

      // Save to cache
      if (upcomingMatches.length > 0) {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          timestamp: Date.now(),
          matches: upcomingMatches
        }));
        return upcomingMatches;
      }
    }

    // If API returns no matches or error status, try to use old cache even if expired
    if (cachedData) {
      console.log('API failed, using expired cache');
      const { matches } = JSON.parse(cachedData);
      return matches;
    }

    // If no cache, return fallback
    console.log('Using fallback matches');
    return FALLBACK_MATCHES;

  } catch (error) {
    console.error('Error fetching matches:', error);
    // Try cache on error
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      return JSON.parse(cachedData).matches;
    }
    return FALLBACK_MATCHES;
  }
};

// Format match from API
const formatMatch = (apiMatch) => {
  if (!apiMatch.teams || apiMatch.teams.length < 2) return null;

  const teamFlags = {
    'India': '🇮🇳', 'Pakistan': '🇵🇰', 'Australia': '🇦🇺', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'South Africa': '🇿🇦', 'New Zealand': '🇳🇿', 'Sri Lanka': '🇱🇰', 'Bangladesh': '🇧🇩',
    'Afghanistan': '🇦🇫', 'West Indies': '🌴', 'Ireland': '🇮🇪', 'Netherlands': '🇳🇱',
    'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Nepal': '🇳🇵', 'Oman': '🇴🇲', 'United States of America': '🇺🇸',
    'United States Of America': '🇺🇸', 'Namibia': '🇳🇦', 'Zimbabwe': '🇿🇼',
    'United Arab Emirates': '🇦🇪', 'Canada': '🇨🇦', 'Italy': '🇮🇹'
  };

  const teamColors = {
    'India': '#FF9933', 'Pakistan': '#01411C', 'Australia': '#FFD700', 'England': '#C8102E',
    'South Africa': '#007749', 'New Zealand': '#000000', 'Sri Lanka': '#004B87', 'Bangladesh': '#006A4E',
    'Afghanistan': '#0066B3', 'West Indies': '#7B0041', 'Ireland': '#169B62', 'Netherlands': '#FF6B00',
    'Scotland': '#005EB8', 'Nepal': '#DC143C', 'Oman': '#C8102E', 'United States of America': '#3C3B6E',
    'United States Of America': '#3C3B6E', 'Namibia': '#003580', 'Zimbabwe': '#EFB509',
    'United Arab Emirates': '#00732F', 'Canada': '#FF0000', 'Italy': '#009246'
  };

  const team1Info = apiMatch.teamInfo?.[0] || {};
  const team2Info = apiMatch.teamInfo?.[1] || {};

  return {
    id: apiMatch.id,
    team1: {
      name: apiMatch.teams[0],
      shortName: team1Info.shortname || apiMatch.teams[0].substring(0, 3).toUpperCase(),
      flag: teamFlags[apiMatch.teams[0]] || '🏏',
      color: teamColors[apiMatch.teams[0]] || '#667eea'
    },
    team2: {
      name: apiMatch.teams[1],
      shortName: team2Info.shortname || apiMatch.teams[1].substring(0, 3).toUpperCase(),
      flag: teamFlags[apiMatch.teams[1]] || '🏏',
      color: teamColors[apiMatch.teams[1]] || '#764ba2'
    },
    venue: apiMatch.venue,
    matchName: apiMatch.name,
    date: apiMatch.date,
    dateTimeGMT: apiMatch.dateTimeGMT,
    status: apiMatch.status
  };
};

// Check if betting is open (before match starts)
const isBettingOpen = (match) => {
  const now = new Date();
  // Ensure we treat the date as UTC by appending 'Z' if it's missing
  const dateStr = match.dateTimeGMT.endsWith('Z') ? match.dateTimeGMT : `${match.dateTimeGMT}Z`;
  const matchDateTime = new Date(dateStr);
  return now < matchDateTime;
};

// Get time until match
const getTimeUntilMatch = (match) => {
  const now = new Date();
  // Ensure we treat the date as UTC by appending 'Z' if it's missing
  const dateStr = match.dateTimeGMT.endsWith('Z') ? match.dateTimeGMT : `${match.dateTimeGMT}Z`;
  const matchDateTime = new Date(dateStr);
  const diff = matchDateTime - now;

  if (diff <= 0) return 'Starting soon!';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

// Format time for display
const formatMatchTime = (match) => {
  const dateStr = match.dateTimeGMT.endsWith('Z') ? match.dateTimeGMT : `${match.dateTimeGMT}Z`;
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) + ' IST';
};

// Format date for display
const formatMatchDate = (match) => {
  const dateStr = match.dateTimeGMT.endsWith('Z') ? match.dateTimeGMT : `${match.dateTimeGMT}Z`;
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

// Group matches by date
const groupMatchesByDate = (matches) => {
  const groups = {};
  matches.forEach(match => {
    // Determine sort key from UTC date
    const dateStr = match.dateTimeGMT.endsWith('Z') ? match.dateTimeGMT : `${match.dateTimeGMT}Z`;
    const dateObj = new Date(dateStr);
    const dateKey = dateObj.toISOString().split('T')[0];

    if (!groups[dateKey]) {
      groups[dateKey] = {
        date: dateKey,
        displayDate: formatMatchDate(match),
        matches: []
      };
    }
    groups[dateKey].matches.push(match);
  });
  return Object.values(groups).sort((a, b) => new Date(a.date) - new Date(b.date));
};

// Get relative time
const getRelativeTime = (dateString) => {
  if (!dateString) return 'Just now';
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  return `${Math.floor(diffMs / 3600000)}h ago`;
};

// Random avatar
const getRandomAvatar = () => {
  const avatars = ['👨‍💼', '👩‍💻', '👨‍🎓', '👩‍🎨', '👨‍🔬', '👩‍⚕️', '👨‍🚀', '👩‍🍳', '🧑‍💼', '🦸', '🥷'];
  return avatars[Math.floor(Math.random() * avatars.length)];
};

// Welcome Screen
function WelcomeScreen({ onStart }) {
  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="game-icon">🏏</div>
        <h1 className="welcome-title">T20 World Cup 2026</h1>
        <h2 className="gang-name">Noida Gang Predictor! 🔥</h2>
        <p className="welcome-desc">Predict match winners & compete with friends!</p>
        <div className="welcome-features">
          <div className="feature">💰 Start with {INITIAL_POINTS} points</div>
          <div className="feature">✅ Correct = Double your points!</div>
          <div className="feature">❌ Wrong = Lose invested points</div>
          <div className="feature">📡 Live data from CricAPI</div>
        </div>
        <button className="play-btn" onClick={onStart}>Let's Play! 🚀</button>
      </div>
    </div>
  );
}

// Auth Screen
function AuthScreen({ onAuth, onBack }) {
  const [isLogin, setIsLogin] = useState(true);
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nickname.trim() || !password.trim()) {
      setError('Please enter nickname and password');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      if (isLogin) {
        const userData = await loginUser(nickname.trim().toLowerCase(), password);
        if (userData) onAuth(userData);
        else setError('Invalid nickname or password');
      } else {
        const result = await registerUser(nickname.trim(), password, INITIAL_POINTS);
        if (result.success) onAuth(result.userData);
        else setError(result.error || 'Registration failed');
      }
    } catch (err) {
      setError('Something went wrong');
    }
    setIsLoading(false);
  };

  return (
    <div className="auth-screen">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="auth-card">
        <div className="auth-tabs">
          <button className={`auth-tab ${isLogin ? 'active' : ''}`} onClick={() => setIsLogin(true)}>Login</button>
          <button className={`auth-tab ${!isLogin ? 'active' : ''}`} onClick={() => setIsLogin(false)}>New Player</button>
        </div>
        <h2>{isLogin ? '👋 Welcome Back!' : '🏏 Join the Game!'}</h2>
        <p className="auth-desc">{isLogin ? 'Enter your credentials' : `Get ${INITIAL_POINTS} points free!`}</p>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Nickname</label>
            <input type="text" placeholder="Enter nickname..." value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={15} autoFocus />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input type="password" placeholder="Enter password..." value={password} onChange={(e) => setPassword(e.target.value)} maxLength={20} />
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="auth-submit-btn" disabled={isLoading}>
            {isLoading ? 'Please wait...' : (isLogin ? 'Login 🚀' : 'Create Account 🎯')}
          </button>
        </form>
      </div>
    </div>
  );
}

// Match Analytics Screen
function MatchAnalyticsScreen({ match, predictions, onBack }) {
  // Filter predictions for this match
  const matchPredictions = predictions.filter(p => p.matchId === match.id);
  const totalVotes = matchPredictions.length;
  const team1Votes = matchPredictions.filter(p => p.team === match.team1.name).length;
  const team2Votes = matchPredictions.filter(p => p.team === match.team2.name).length;

  const team1Percent = totalVotes ? Math.round((team1Votes / totalVotes) * 100) : 0;
  const team2Percent = totalVotes ? Math.round((team2Votes / totalVotes) * 100) : 0;

  return (
    <div className="dashboard-screen">
      <div className="dashboard-header">
        <button className="back-btn-inline" onClick={onBack}>← Back</button>
        <span className="screen-title-small">Match Analytics</span>
      </div>

      <div className="match-banner-small">
        <div className="banner-team-small">
          <span className="team-flag-small">{match.team1.flag}</span>
          <span>{match.team1.shortName}</span>
        </div>
        <span className="vs-text">VS</span>
        <div className="banner-team-small">
          <span className="team-flag-small">{match.team2.flag}</span>
          <span>{match.team2.shortName}</span>
        </div>
      </div>

      <h2 className="section-title">📊 Vote Distribution</h2>

      {totalVotes === 0 ? (
        <div className="no-stats">No votes yet!</div>
      ) : (
        <div className="vote-bar-container">
          <div className="vote-bar">
            <div
              className="vote-bar-fill team1"
              style={{ width: `${team1Percent}%`, background: match.team1.color }}
              title={`${match.team1.name}: ${team1Votes} votes`}
            >
              <span className="vote-percent">{team1Percent > 10 && `${team1Percent}%`}</span>
            </div>
            <div
              className="vote-bar-fill team2"
              style={{ width: `${team2Percent}%`, background: match.team2.color }}
              title={`${match.team2.name}: ${team2Votes} votes`}
            >
              <span className="vote-percent">{team2Percent > 10 && `${team2Percent}%`}</span>
            </div>
          </div>
          <div className="vote-labels">
            <span style={{ color: match.team1.color }}>{match.team1.name} ({team1Votes})</span>
            <span style={{ color: match.team2.color }}>{match.team2.name} ({team2Votes})</span>
          </div>
        </div>
      )}

      <div className="predictions-section">
        <h3 className="predictions-title">👥 Who bet on this match?</h3>
        <div className="predictions-list">
          {matchPredictions.length === 0 ? (
            <p className="no-predictions">Be the first to predict!</p>
          ) : (
            matchPredictions.map((prediction) => (
              <PredictionItem
                key={prediction.id}
                prediction={prediction}
                matches={[match]} // Pass only this match to context
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Match Card
function MatchCard({ match, userBet, onSelect, onShowAnalytics }) {
  const canBet = isBettingOpen(match) && !userBet;
  const isVoted = !!userBet;

  const handleClick = () => {
    if (canBet) {
      onSelect(match);
    } else if (isVoted && onShowAnalytics) {
      onShowAnalytics(match);
    }
  };

  return (
    <div
      className={`match-card ${canBet ? 'can-bet' : ''} ${isVoted ? 'has-bet clickable' : ''}`}
      onClick={handleClick}
    >
      <div className="match-teams-row">
        <div className="match-team" title={match.team1.name}>
          <span className="team-flag-small">{match.team1.flag}</span>
          <span className="team-name-small">{match.team1.shortName}</span>
        </div>
        <div className="match-vs">VS</div>
        <div className="match-team" title={match.team2.name}>
          <span className="team-flag-small">{match.team2.flag}</span>
          <span className="team-name-small">{match.team2.shortName}</span>
        </div>
      </div>

      <div className="match-venue">{match.venue}</div>
      <div className="match-time-row">
        <span>⏰ {formatMatchTime(match)}</span>
        <span className="countdown">⏱️ {getTimeUntilMatch(match)}</span>
      </div>

      {canBet ? (
        <div className="betting-status open">
          <span className="status-dot"></span>
          Tap to Predict
        </div>
      ) : userBet ? (
        <div className="user-bet-badge">
          ✅ {userBet.points} pts on {userBet.team} {match.team1.name === userBet.team ? match.team1.flag : match.team2.flag}
          <div className="tap-hint">(Tap for analytics)</div>
        </div>
      ) : (
        <div className="betting-status closed">🔒 Betting Closed</div>
      )}
    </div>
  );
}

// Match Selection Screen
function MatchSelectionScreen({ matches, userBets, onSelectMatch, wallet, userName, onRefresh, isLoading, onViewPredictions, onShowAnalytics, onLogout }) {
  const groupedMatches = groupMatchesByDate(matches);

  return (
    <div className="match-selection-screen">
      <div className="user-header">
        <div className="user-info-group">
          <span className="user-greeting">Hey {userName}! 👋</span>
          <button className="logout-btn-small" onClick={onLogout} title="Logout">🚪</button>
        </div>
        <div className="wallet-badge">💰 {wallet} pts</div>
      </div>

      <div className="title-row">
        <h2 className="section-title">🏏 Upcoming Matches</h2>
        <button className="refresh-btn" onClick={onRefresh} disabled={isLoading}>
          {isLoading ? '⏳' : '🔄'}
        </button>
      </div>
      <p className="section-subtitle">T20 World Cup 2026 • Tap to predict</p>

      {matches.length === 0 ? (
        <div className="no-matches">
          <p>⏳ Loading matches...</p>
        </div>
      ) : (
        <div className="matches-by-date">
          {groupedMatches.map(group => (
            <div key={group.date} className="date-group">
              <h3 className="date-header">{group.displayDate}</h3>
              <div className="matches-list">
                {group.matches.map(match => {
                  const userBet = userBets.find(b => b.matchId === match.id);
                  return (
                    <MatchCard
                      key={match.id}
                      match={match}
                      userBet={userBet}
                      onSelect={onSelectMatch}
                      onShowAnalytics={onShowAnalytics}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="view-all-btn" onClick={onViewPredictions}>
        View All Predictions 📊
      </button>
    </div>
  );
}

// Team Selection Screen
function TeamSelectionScreen({ match, wallet, onConfirm, onBack }) {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [points, setPoints] = useState(Math.min(50, wallet));

  if (!isBettingOpen(match)) {
    return (
      <div className="selection-screen">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="betting-closed-card">
          <h2>⏰ Betting Closed!</h2>
          <p>Match has started or is about to start.</p>
          <button className="view-dashboard-btn" onClick={onBack}>Go Back</button>
        </div>
      </div>
    );
  }

  const handleConfirm = () => {
    if (selectedTeam && points > 0 && points <= wallet) {
      onConfirm(match, selectedTeam, points);
    }
  };

  return (
    <div className="selection-screen">
      <button className="back-btn" onClick={onBack}>← Back</button>

      <div className="match-banner">
        <div className="match-badge">T20 World Cup 2026</div>
        <div className="match-teams">
          <div className="banner-team">
            <span className="banner-flag">{match.team1.flag}</span>
            <span className="banner-name">{match.team1.name}</span>
          </div>
          <div className="vs-badge">VS</div>
          <div className="banner-team">
            <span className="banner-flag">{match.team2.flag}</span>
            <span className="banner-name">{match.team2.name}</span>
          </div>
        </div>
        <div className="match-info">{match.venue}</div>
        <div className="betting-timer">⏰ Starts in: {getTimeUntilMatch(match)}</div>
      </div>

      <h2 className="section-title">🎯 Who will win?</h2>

      <div className="teams-container">
        <div
          className={`team-card ${selectedTeam === match.team1.name ? 'selected' : ''}`}
          onClick={() => setSelectedTeam(match.team1.name)}
          style={{ '--team-color': match.team1.color }}
        >
          <div className="team-flag">{match.team1.flag}</div>
          <h3 className="team-name">{match.team1.name}</h3>
          {selectedTeam === match.team1.name && <div className="selected-badge">✓</div>}
        </div>

        <div className="vs-divider">VS</div>

        <div
          className={`team-card ${selectedTeam === match.team2.name ? 'selected' : ''}`}
          onClick={() => setSelectedTeam(match.team2.name)}
          style={{ '--team-color': match.team2.color }}
        >
          <div className="team-flag">{match.team2.flag}</div>
          <h3 className="team-name">{match.team2.name}</h3>
          {selectedTeam === match.team2.name && <div className="selected-badge">✓</div>}
        </div>
      </div>

      {selectedTeam && (
        <div className="points-section">
          <h3>💰 Points to invest (Wallet: {wallet})</h3>
          <p className="points-info">✅ Win = +{points} | ❌ Lose = -{points}</p>

          <div className="points-slider-container">
            <input
              type="range"
              min="10"
              max={wallet}
              step="5"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="points-slider"
            />
            <div className="points-display">
              <span className="points-value">{points}</span>
              <span className="points-label">points</span>
            </div>
          </div>

          <div className="points-quick-btns">
            {[25, 50, 75].filter(v => v <= wallet).map(v => (
              <button key={v} onClick={() => setPoints(v)}>{v}</button>
            ))}
            <button onClick={() => setPoints(wallet)}>All In!</button>
          </div>

          <button className="confirm-btn" onClick={handleConfirm}>
            Bet {points} pts on {selectedTeam} {selectedTeam === match.team1.name ? match.team1.flag : match.team2.flag}
          </button>
        </div>
      )}
    </div>
  );
}

// Prediction Item
function PredictionItem({ prediction, matches }) {
  const match = matches.find(m => m.id === prediction.matchId);
  const team = match?.team1?.name === prediction.team ? match?.team1 : match?.team2;

  return (
    <div className="prediction-item" style={{ '--team-color': team?.color || '#667eea' }}>
      <div className="prediction-avatar">{prediction.avatar || getRandomAvatar()}</div>
      <div className="prediction-info">
        <span className="prediction-name">{prediction.name}</span>
        <span className="prediction-time">{getRelativeTime(prediction.createdAt)}</span>
      </div>
      <div className="prediction-bet">
        <span className="bet-amount">💰 {prediction.points}</span>
      </div>
      <div className="prediction-team">
        <span className="team-badge-flag">{team?.flag || '🏏'}</span>
      </div>
    </div>
  );
}

// Dashboard Screen
function DashboardScreen({ predictions, matches, userName, wallet, onBack, onLogout }) {
  const totalVotes = predictions.length;
  const totalPool = predictions.reduce((sum, p) => sum + (p.points || 0), 0);

  return (
    <div className="dashboard-screen">
      <div className="dashboard-header">
        <button className="back-btn-inline" onClick={onBack}>← Matches</button>
        <div className="user-info">
          <span className="user-name">👋 {userName}</span>
          <div className="wallet-badge">💰 {wallet} pts</div>
        </div>
      </div>

      <h2 className="section-title">📊 Noida Gang Dashboard</h2>

      <div className="stats-grid">
        <div className="stats-card" style={{ '--stat-color': '#667eea' }}>
          <div className="stats-icon">👥</div>
          <div className="stats-value">{totalVotes}</div>
          <div className="stats-label">Total Bets</div>
        </div>
        <div className="stats-card" style={{ '--stat-color': '#10b981' }}>
          <div className="stats-icon">💰</div>
          <div className="stats-value">{totalPool}</div>
          <div className="stats-label">Total Pool</div>
        </div>
      </div>

      <div className="predictions-section">
        <h3 className="predictions-title">🏆 All Predictions ({predictions.length})</h3>
        <div className="predictions-list">
          {predictions.length === 0 ? (
            <p className="no-predictions">No predictions yet! Be the first.</p>
          ) : (
            predictions.map((prediction) => (
              <PredictionItem key={prediction.id} prediction={prediction} matches={matches} />
            ))
          )}
        </div>
      </div>

      <button className="logout-btn" onClick={onLogout}>🚪 Logout</button>
    </div>
  );
}

// Main App
function App() {
  const [gameState, setGameState] = useState('welcome');
  const [user, setUser] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

  // Fetch matches
  const refreshMatches = useCallback(async () => {
    setIsRefreshing(true);
    const upcomingMatches = await fetchUpcomingMatches();
    if (upcomingMatches.length > 0) {
      setMatches(upcomingMatches);
    }
    setIsRefreshing(false);
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      await refreshMatches();
      setIsLoading(false);
    };
    init();

    // Refresh every 5 minutes
    const interval = setInterval(refreshMatches, 300000);
    return () => clearInterval(interval);
  }, [refreshMatches]);

  // Subscribe to predictions
  useEffect(() => {
    const unsubscribe = subscribeToPredictions((data) => {
      setPredictions(data);
    });

    const savedUser = localStorage.getItem('noidaGangUser');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      getUserData(userData.id).then((latestData) => {
        if (latestData) {
          setUser(latestData);
          setGameState('matches');
        }
      });
    }

    return () => unsubscribe();
  }, []);

  const handleSelectMatch = (match) => {
    setSelectedMatch(match);
    setGameState('selection');
  };

  const handleShowAnalytics = (match) => {
    setSelectedMatch(match);
    setGameState('analytics');
  };

  const handleConfirmBet = async (match, team, points) => {
    const success = await addPrediction(user.nickname, team, points, match.id);

    if (success) {
      const newWallet = user.wallet - points;
      const newBets = [...(user.bets || []), { matchId: match.id, team, points }];

      await updateUserWallet(user.id, newWallet, newBets);

      const updatedUser = { ...user, wallet: newWallet, bets: newBets };
      setUser(updatedUser);
      localStorage.setItem('noidaGangUser', JSON.stringify(updatedUser));

      setSelectedMatch(null);
      setGameState('matches');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('noidaGangUser');
    setUser(null);
    setGameState('welcome');
  };

  if (isLoading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="spinner">🏏</div>
          <p>Loading T20 World Cup 2026...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="cricket-bg">
        <div className="ball ball-1">🏏</div>
        <div className="ball ball-2">🏆</div>
        <div className="ball ball-3">💰</div>
      </div>

      {gameState === 'welcome' && <WelcomeScreen onStart={() => setGameState('auth')} />}

      {gameState === 'auth' && (
        <AuthScreen
          onAuth={(data) => { setUser(data); localStorage.setItem('noidaGangUser', JSON.stringify(data)); setGameState('matches'); }}
          onBack={() => setGameState('welcome')}
        />
      )}

      {gameState === 'matches' && user && (
        <MatchSelectionScreen
          matches={matches}
          userBets={user.bets || []}
          onSelectMatch={handleSelectMatch}
          wallet={user.wallet}
          userName={user.nickname}
          onRefresh={refreshMatches}
          isLoading={isRefreshing}
          onViewPredictions={() => setGameState('dashboard')}
          onShowAnalytics={handleShowAnalytics}
          onLogout={handleLogout}
        />
      )}

      {gameState === 'selection' && selectedMatch && (
        <TeamSelectionScreen
          match={selectedMatch}
          wallet={user.wallet}
          onConfirm={handleConfirmBet}
          onBack={() => setGameState('matches')}
        />
      )}

      {gameState === 'analytics' && selectedMatch && (
        <MatchAnalyticsScreen
          match={selectedMatch}
          predictions={predictions}
          onBack={() => setGameState('matches')}
        />
      )}

      {gameState === 'dashboard' && user && (
        <DashboardScreen
          predictions={predictions}
          matches={matches}
          userName={user.nickname}
          wallet={user.wallet}
          onBack={() => setGameState('matches')}
          onLogout={handleLogout}
        />
      )}

      <footer className="footer">
        <p>🏏 T20 World Cup 2026 | Noida Gang Edition 🏆</p>
        <p className="built-by">Built with ❤️ by <strong>Nalin</strong></p>
      </footer>
    </div>
  );
}

export default App;
