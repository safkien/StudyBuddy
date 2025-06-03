const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || "mongodb+srv://alialsafkouny31:EAvF3iEJnB3KejbJ@cluster0.ee01jhi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const client = new MongoClient(uri);

async function connectDB() {
    try {
        await client.connect();
        console.log("Connected successfully to MongoDB Atlas");
        
        return client; 
    } catch (err) {
        console.error("Failed to connect to MongoDB", err);
        process.exit(1); 
    }
}

async function closeDB() {
    try {
        await client.close();
        console.log("MongoDB connection closed.");
    } catch (err) {
        console.error("Error closing MongoDB connection", err);
    }
}


async function getUserByZermeloId(zermeloId) {
    const db = client.db("zermeloUserData"); // Using "zermeloUserData" as the database name
    const usersCollection = db.collection("users");
    try {
        return await usersCollection.findOne({ zermeloUserId: zermeloId });
    } catch (err) {
        console.error(`Error finding user by Zermelo ID ${zermeloId}:`, err);
        throw err;
    }
}

async function createUser(zermeloId) {
    const db = client.db("zermeloUserData"); 
    const usersCollection = db.collection("users");
    const newUser = {
        zermeloUserId: zermeloId,
        customEvents: [],
        flashcards: [],
        pomodoroToday: {
            date: new Date().toISOString().split('T')[0], // Store today's date in YYYY-MM-DD
            completedPomodoros: 0,
            studySeconds: 0
        }
    };
    try {
        const result = await usersCollection.insertOne(newUser);
        console.log(`New user created with id: ${result.insertedId} for Zermelo ID: ${zermeloId}`);
        return newUser;
    } catch (err) {
        console.error(`Error creating user for Zermelo ID ${zermeloId}:`, err);
        throw err;
    }
}

async function addCustomEventToUser(zermeloId, newEvent) {
    const db = client.db("zermeloUserData"); 
    const usersCollection = db.collection("users");
    try {
        const result = await usersCollection.updateOne(
            { zermeloUserId: zermeloId },
            { $push: { customEvents: newEvent } }
        );
        console.log(`${result.modifiedCount} document(s) updated for Zermelo ID ${zermeloId} with new event.`);
        return result;
    } catch (err) {
        console.error(`Error adding custom event for Zermelo ID ${zermeloId}:`, err);
        throw err;
    }
}

async function getCustomEventsByZermeloId(zermeloId) {
    const user = await getUserByZermeloId(zermeloId);
    return user ? user.customEvents : [];
}

async function addFlashcardDeckToUser(zermeloId, newDeck) {
    const db = client.db("zermeloUserData"); 
    const usersCollection = db.collection("users");
    try {
        const result = await usersCollection.updateOne(
            { zermeloUserId: zermeloId },
            { $push: { flashcards: newDeck } }
        );
        console.log(`${result.modifiedCount} document(s) updated for Zermelo ID ${zermeloId} with new flashcard deck.`);
        return result;
    } catch (err) {
        console.error(`Error adding flashcard deck for Zermelo ID ${zermeloId}:`, err);
        throw err;
    }
}

async function getFlashcardDecksByZermeloId(zermeloId) {
    const user = await getUserByZermeloId(zermeloId);
    return user ? user.flashcards : [];
}

module.exports = {
    connectDB,
    closeDB,
    client, 
    getUserByZermeloId,
    createUser,
    addCustomEventToUser,
    getCustomEventsByZermeloId,
    addFlashcardDeckToUser,
    getFlashcardDecksByZermeloId
};
