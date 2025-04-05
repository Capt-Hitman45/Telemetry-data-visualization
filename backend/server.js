const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Schema
const telemetrySchema = new mongoose.Schema({
    "tm received time": { type: Number, required: true },  // Changed to Number
    "tm_id": Number,
    "parameter": String,
    "value": mongoose.Schema.Types.Mixed,  // Can be String or Number
    "timestamp": Number
}, { collection: 'telemetry_data' });

// Store connected SSE clients
const sseClients = new Map();

// API Endpoints
app.get('/api/collections', async (req, res) => {
    try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        res.json({ collections: collections.map(col => col.name) });
    } catch (error) {
        console.error('❌ Error fetching collections:', error);
        res.status(500).json({ error: 'Failed to fetch collections' });
    }
});

app.get('/api/telemetry', async (req, res) => {
    try {
      const { collection } = req.query;
      const Model = mongoose.model(collection, telemetrySchema, collection);
      
      // Get raw documents without transformation
      const data = await Model.find().sort({ "tm_received_time": 1 }).limit(1000);
      
      // Send the raw data exactly as stored in MongoDB
      res.json(data);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Failed to fetch telemetry data' });
    }
  });

// SSE Endpoint
app.get('/api/telemetry/updates', (req, res) => {
    const { collection } = req.query;
    if (!collection) return res.status(400).end();

    console.log(`👋 New SSE client connected for collection: ${collection}`);

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send a ping every 30 seconds to keep connection alive
    const pingInterval = setInterval(() => {
        res.write(':ping\n\n');
    }, 30000);

    // Store the client response object
    if (!sseClients.has(collection)) {
        sseClients.set(collection, new Set());
    }
    sseClients.get(collection).add(res);

    // Remove client when connection closes
    req.on('close', () => {
        clearInterval(pingInterval);
        if (sseClients.has(collection)) {
            sseClients.get(collection).delete(res);
            if (sseClients.get(collection).size === 0) {
                sseClients.delete(collection);
            }
        }
        console.log(`👋 SSE client disconnected for collection: ${collection}`);
    });
});

// Function to broadcast updates to SSE clients
function broadcastUpdate(collection, data) {
    if (sseClients.has(collection)) {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        sseClients.get(collection).forEach(client => {
            try {
                client.write(message);
            } catch (err) {
                console.error('Error sending SSE message:', err);
            }
        });
    }
}

// MongoDB Connection
const connectWithRetry = () => {
    mongoose.connect('mongodb://localhost:27017/telemetry_db', {
        serverSelectionTimeoutMS: 5000
    })
    .then(() => {
        console.log('✅ Connected to MongoDB');
        setupChangeStream();
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        setTimeout(connectWithRetry, 5000);
    });
};

// Change Stream Setup
const setupChangeStream = async () => {
    try {
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        
        collections.forEach(async (collectionInfo) => {
            const collection = db.collection(collectionInfo.name);
            
            const changeStream = collection.watch(
                [{
                    $match: {
                        operationType: 'insert'
                    }
                }],
                { fullDocument: 'updateLookup' }
            );
            
            changeStream.on('change', change => {
                const doc = change.fullDocument;
                // Broadcast the raw document exactly as stored
                broadcastUpdate(collectionInfo.name, doc);
            });
            
            changeStream.on('error', err => {
                console.error('Change stream error:', err);
                setTimeout(setupChangeStream, 5000);
            });
        });
        
        console.log('👂 Listening for changes on all collections');
    } catch (err) {
        console.error('Change stream setup failed:', err);
        setTimeout(setupChangeStream, 5000);
    }
};

// Add this new endpoint for the Python processor to notify about updates
app.post('/api/notify-update', (req, res) => {
    const { collection, data } = req.body;
    if (!collection || !data) {
        return res.status(400).json({ error: 'Missing collection or data' });
    }
    
    // Broadcast each new document to SSE clients
    data.forEach(doc => {
        broadcastUpdate(collection, doc);
    });
    
    res.json({ success: true });
});

// Start server
const PORT = 4000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    connectWithRetry();
});