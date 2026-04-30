// src/config/db.js — re-exports MongoDB connection for use across the app
export { getDatabase, getMongoClient, pingDatabase } from '../db/mongo.js';
