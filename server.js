const express = require('express');
const dbManager = require('./db'); // Imports connectDB, createUser, etc.

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory (e.g., index.html, login.html, auth.js, style.css)
app.use(express.static('public'));

// Middleware to parse JSON bodies. This is important for POST/PUT requests.
app.use(express.json());

// API Endpoint: Get user data or create user if not exists
app.get('/api/user/:zermeloId', async (req, res) => {
    const { zermeloId } = req.params;
    if (!zermeloId || !/^\d{7}$/.test(zermeloId)) {
        return res.status(400).json({ message: 'Valid 7-digit Zermelo ID is required.' });
    }

    try {
        let user = await dbManager.getUserByZermeloId(zermeloId);
        if (!user) {
            console.log(`User ${zermeloId} not found via API, creating new user.`);
            user = await dbManager.createUser(zermeloId);
        } else {
            // Check if pomodoroToday needs to be reset
            const todayStr = new Date().toISOString().split('T')[0];
            if (!user.pomodoroToday || user.pomodoroToday.date !== todayStr) {
                console.log(`Resetting pomodoroToday stats for user ${zermeloId} for date ${todayStr}`);
                user.pomodoroToday = {
                    date: todayStr,
                    completedPomodoros: 0,
                    studySeconds: 0
                };
                // Update in DB (fire and forget for this check, or await if critical)
                const db = dbManager.client.db("zermeloUserData");
                const usersCollection = db.collection("users");
                usersCollection.updateOne({ zermeloUserId: zermeloId }, { $set: { pomodoroToday: user.pomodoroToday } });
            }
        }
        // For simplicity, returning the whole user object.
        // You might want to fetch events/flashcards separately if they become very large.
        res.json(user);
    } catch (error) {
        console.error(`API Error getting/creating user ${zermeloId}:`, error);
        res.status(500).json({ message: 'Error processing user data.', error: error.message });
    }
});

// API Endpoint: Add a custom event for a user
app.post('/api/user/:zermeloId/events', async (req, res) => {
    const { zermeloId } = req.params;
    const eventData = req.body; // Expects event data in request body

    if (!zermeloId || !/^\d{7}$/.test(zermeloId)) {
        return res.status(400).json({ message: 'Valid 7-digit Zermelo ID is required.' });
    }
    if (!eventData || Object.keys(eventData).length === 0) {
        return res.status(400).json({ message: 'Event data is required in the request body.' });
    }

    try {
        // You might want to add a unique ID to eventData here if not done on client
        // e.g., if (!eventData.id) eventData.id = new require('mongodb').ObjectId().toHexString();
        
        const result = await dbManager.addCustomEventToUser(zermeloId, eventData);
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: `User with Zermelo ID ${zermeloId} not found.` });
        }
        res.status(201).json({ message: 'Event added successfully', data: eventData });
    } catch (error) {
        console.error(`API Error adding event for user ${zermeloId}:`, error);
        res.status(500).json({ message: 'Error adding event.', error: error.message });
    }
});

// API Endpoint: Add a flashcard deck for a user
app.post('/api/user/:zermeloId/flashcards/decks', async (req, res) => {
    const { zermeloId } = req.params;
    const deckData = req.body; // Expects deck data in request body

    if (!zermeloId || !/^\d{7}$/.test(zermeloId)) {
        return res.status(400).json({ message: 'Valid 7-digit Zermelo ID is required.' });
    }
    if (!deckData || Object.keys(deckData).length === 0) {
        return res.status(400).json({ message: 'Deck data is required in the request body.' });
    }

    try {
        // You might want to add a unique ID to deckData here if not done on client
        // e.g., if (!deckData.deckId) deckData.deckId = new require('mongodb').ObjectId().toHexString();
        
        const result = await dbManager.addFlashcardDeckToUser(zermeloId, deckData);
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: `User with Zermelo ID ${zermeloId} not found.` });
        }
        res.status(201).json({ message: 'Flashcard deck added successfully', data: deckData });
    } catch (error) {
        console.error(`API Error adding flashcard deck for user ${zermeloId}:`, error);
        res.status(500).json({ message: 'Error adding flashcard deck.', error: error.message });
    }
});


const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function exchangeZermeloAuthCode(schoolName, authCode) {
    const zermeloBaseUrl = `https://${schoolName.toLowerCase()}.zportal.nl`;
    const tokenUrl = `${zermeloBaseUrl}/api/v3/oauth/token`;
    const userInfoUrl = `${zermeloBaseUrl}/api/v3/users/~me`;

    console.log(`Attempting to get Zermelo token from: ${tokenUrl} for school: ${schoolName} with code: ${authCode}`);

    try {
       
        const tokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                
            },
            body: new URLSearchParams({
                'grant_type': 'authorization_code', 
                'code': authCode
            })
        });

        if (!tokenResponse.ok) {
            const errorBody = await tokenResponse.text();
            console.error(`Zermelo token request failed: ${tokenResponse.status}`, errorBody);
            return { success: false, error: `Zermelo token error (${tokenResponse.status}): ${errorBody}` };
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        if (!accessToken) {
            console.error('No access_token in Zermelo response:', tokenData);
            return { success: false, error: 'Failed to retrieve access token from Zermelo.' };
        }
        console.log('Successfully obtained Zermelo access token.');

        
        const userInfoResponse = await fetch(userInfoUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!userInfoResponse.ok) {
            const errorBody = await userInfoResponse.text();
            console.error(`Zermelo user info request failed: ${userInfoResponse.status}`, errorBody);
            return { success: false, error: `Zermelo user info error (${userInfoResponse.status}): ${errorBody}` };
        }

        const userInfoData = await userInfoResponse.json();
        
        if (userInfoData.response && userInfoData.response.data && userInfoData.response.data.length > 0 && userInfoData.response.data[0].code) {
            const zermeloUserId = userInfoData.response.data[0].code;
            console.log(`Successfully fetched Zermelo User ID: ${zermeloUserId}`);
            return { success: true, zermeloUserId: zermeloUserId.toString(), accessToken: accessToken, message: "Successfully authenticated with Zermelo." };
        } else {
            console.error('Could not find user ID in Zermelo user info response:', userInfoData);
            return { success: false, error: 'Could not extract user ID from Zermelo response.' };
        }

    } catch (error) {
        console.error('Error in exchangeZermeloAuthCode:', error);
        return { success: false, error: `Network or other error during Zermelo auth: ${error.message}` };
    }
}

app.post('/auth/login', async (req, res) => {
    const { schoolName, authCode } = req.body;

    if (!schoolName || !authCode) {
        return res.status(400).json({ error: "School name and authentication code are required." });
    }

    try {
        console.log(`Server received /auth/login for school: ${schoolName}, code: ${authCode}`);
        const zermeloAuthResult = await exchangeZermeloAuthCode(schoolName, authCode);

        if (!zermeloAuthResult.success) {
            return res.status(401).json({ error: zermeloAuthResult.error || "Zermelo authentication failed." });
        }

        const zermeloUserId = zermeloAuthResult.zermeloUserId;
        console.log(`Zermelo authentication successful. User ID: ${zermeloUserId}`);

        let user = await dbManager.getUserByZermeloId(zermeloUserId);
        if (!user) {
            console.log(`User ${zermeloUserId} not found in our DB, creating new user.`);
            user = await dbManager.createUser(zermeloUserId);
        } else {
            console.log(`User ${zermeloUserId} found in our DB.`);
        }

        const zermeloAccessToken = zermeloAuthResult.accessToken;


        res.json({ 
            success: true, 
            message: "Login successful. User linked/retrieved from DB.",
            userId: user.zermeloUserId, 
            accessToken: zermeloAccessToken 
            
        });

    } catch (error) {
        console.error("Server /auth/login error:", error);
        res.status(500).json({ error: "An internal server error occurred during login." });
    }
});

app.post('/api/user/:zermeloId/flashcards-sync', async (req, res) => {
    const { zermeloId } = req.params;
    const flashcardData = req.body; 

    if (!zermeloId || !/^\d{7}$/.test(zermeloId)) {
        return res.status(400).json({ message: 'Valid 7-digit Zermelo ID is required.' });
    }
    if (!Array.isArray(flashcardData)) {
        return res.status(400).json({ message: 'Flashcard data must be an array.' });
    }

    try {
        const db = dbManager.client.db("zermeloUserData");
        const usersCollection = db.collection("users");

        const result = await usersCollection.updateOne(
            { zermeloUserId: zermeloId },
            { $set: { flashcards: flashcardData } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: `User with Zermelo ID ${zermeloId} not found.` });
        }
        if (result.modifiedCount === 0 && result.upsertedCount === 0) {
            console.log(`Flashcard data for user ${zermeloId} was already in sync.`);
        } else {
            console.log(`Flashcard data synced successfully for user ${zermeloId}.`);
        }
        res.json({ success: true, message: 'Flashcards synced successfully.' });

    } catch (error) {
        console.error(`API Error syncing flashcards for user ${zermeloId}:`, error);
        res.status(500).json({ message: 'Error syncing flashcards.', error: error.message });
    }
});

// API Endpoint: User completed a pomodoro session
app.post('/api/user/:zermeloId/pomodoro/complete', async (req, res) => {
    const { zermeloId } = req.params;
    const { sessionStudySeconds } = req.body; 

    if (!zermeloId || !/^\d{7}$/.test(zermeloId)) {
        return res.status(400).json({ message: 'Valid 7-digit Zermelo ID is required.' });
    }
    if (typeof sessionStudySeconds !== 'number' || sessionStudySeconds <= 0) {
        return res.status(400).json({ message: 'Valid sessionStudySeconds (number > 0) is required.' });
    }

    try {
        const db = dbManager.client.db("zermeloUserData");
        const usersCollection = db.collection("users");
        const todayStr = new Date().toISOString().split('T')[0];

        const user = await usersCollection.findOne({ zermeloUserId: zermeloId });

        if (!user) {
            return res.status(404).json({ message: `User with Zermelo ID ${zermeloId} not found.` });
        }

        let currentPomodoroToday = user.pomodoroToday;

        // If no stats for today or date mismatch, reset for today
        if (!currentPomodoroToday || currentPomodoroToday.date !== todayStr) {
            console.log(`New day for pomodoro stats for user ${zermeloId}. Resetting for ${todayStr}`);
            currentPomodoroToday = {
                date: todayStr,
                completedPomodoros: 1, // This is the first for today
                studySeconds: sessionStudySeconds
            };
        } else {
            currentPomodoroToday.completedPomodoros += 1;
            currentPomodoroToday.studySeconds += sessionStudySeconds;
        }

        const updateResult = await usersCollection.updateOne(
            { zermeloUserId: zermeloId },
            { $set: { pomodoroToday: currentPomodoroToday } }
        );

        if (updateResult.matchedCount === 0) {
             // Should not happen if user was found earlier, but as a safeguard
            return res.status(404).json({ message: `User ${zermeloId} not found during pomodoro update.`});
        }

        console.log(`Pomodoro session recorded for user ${zermeloId}:`, currentPomodoroToday);
        res.json({ success: true, pomodoroToday: currentPomodoroToday });

    } catch (error) {
        console.error(`API Error recording pomodoro for user ${zermeloId}:`, error);
        res.status(500).json({ message: 'Error recording pomodoro session.', error: error.message });
    }
});


// Start the server and connect to DB
async function startServer() {
    try {
        await dbManager.connectDB(); // Connect to MongoDB
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            console.log(`Connected to database: zermeloUserData`); 
        });
    } catch (err) {
        console.error("Failed to start the server:", err);
        process.exit(1);
    }
}

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nSIGINT received. Shutting down gracefully...');
    await dbManager.closeDB();
    process.exit(0);
});
