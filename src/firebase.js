// Firebase configuration for Cricket Predictor
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, onValue, serverTimestamp, set, get, child, update } from 'firebase/database';

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCaoFQmLuW3ZZmbNAWo3cp1E0iZa8h5C9U",
    authDomain: "cricket-predictor-6fc88.firebaseapp.com",
    databaseURL: "https://cricket-predictor-6fc88-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "cricket-predictor-6fc88",
    storageBucket: "cricket-predictor-6fc88.firebasestorage.app",
    messagingSenderId: "321018700945",
    appId: "1:321018700945:web:67b76fb84c24b431a74b30"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Database references
export const predictionsRef = ref(database, 'predictions');
export const usersRef = ref(database, 'users');

// Simple hash function for password (not cryptographically secure, but works for demo)
const simpleHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
};

// Register a new user
export const registerUser = async (nickname, password, initialPoints) => {
    try {
        const nicknameKey = nickname.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const userRef = ref(database, `users/${nicknameKey}`);

        // Check if user already exists
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            return { success: false, error: 'Nickname already taken!' };
        }

        // Create new user
        const userData = {
            id: nicknameKey,
            nickname: nickname,
            passwordHash: simpleHash(password),
            wallet: initialPoints,
            bets: [],
            createdAt: new Date().toISOString()
        };

        await set(userRef, userData);

        return { success: true, userData };
    } catch (error) {
        console.error('Error registering user:', error);
        return { success: false, error: 'Registration failed. Try again.' };
    }
};

// Login user
export const loginUser = async (nickname, password) => {
    try {
        const nicknameKey = nickname.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const userRef = ref(database, `users/${nicknameKey}`);

        const snapshot = await get(userRef);
        if (!snapshot.exists()) {
            return null;
        }

        const userData = snapshot.val();

        // Verify password
        if (userData.passwordHash !== simpleHash(password)) {
            return null;
        }

        return userData;
    } catch (error) {
        console.error('Error logging in:', error);
        return null;
    }
};

// Get user data
export const getUserData = async (userId) => {
    try {
        const userRef = ref(database, `users/${userId}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            return snapshot.val();
        }
        return null;
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
};

// Update user wallet and bets
export const updateUserWallet = async (userId, newWallet, newBets) => {
    try {
        const userRef = ref(database, `users/${userId}`);
        await update(userRef, {
            wallet: newWallet,
            bets: newBets
        });
        return true;
    } catch (error) {
        console.error('Error updating wallet:', error);
        return false;
    }
};

// Add prediction
export const addPrediction = async (name, team, points, matchId = 'match1') => {
    try {
        await push(predictionsRef, {
            name,
            team,
            points,
            matchId,
            timestamp: serverTimestamp(),
            createdAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error('Error adding prediction:', error);
        return false;
    }
};

// Subscribe to predictions
export const subscribeToPredictions = (callback) => {
    console.log('Subscribing to Firebase predictions...');

    return onValue(predictionsRef, (snapshot) => {
        console.log('Firebase data received');
        const data = snapshot.val();
        if (data) {
            const predictions = Object.entries(data).map(([id, value]) => ({
                id,
                ...value
            })).sort((a, b) => {
                const timeA = new Date(a.createdAt || 0).getTime();
                const timeB = new Date(b.createdAt || 0).getTime();
                return timeB - timeA;
            });
            callback(predictions);
        } else {
            callback([]);
        }
    }, (error) => {
        console.error('Firebase subscription error:', error);
        callback([]);
    });
};

export { database };
