/**
 * MongoDB Connection Test Script
 * Run: node test-mongo.js
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testConnection() {
  console.log('🔍 Testing MongoDB Connection...\n');
  console.log('URI:', process.env.MONGO_URI);
  console.log('DB Name:', process.env.MONGO_DB_NAME || 'payment_app');
  console.log();
  
  try {
    const client = new MongoClient(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    });
    
    await client.connect();
    console.log('✅ Connected to MongoDB!');
    
    const db = client.db(process.env.MONGO_DB_NAME || 'payment_app');
    const collections = await db.listCollections().toArray();
    
    console.log('\n📊 Collections found:', collections.length);
    collections.forEach(c => console.log(`  - ${c.name}`));
    
    // Test read/write
    const testCollection = db.collection('test_connection');
    await testCollection.insertOne({ test: true, timestamp: new Date() });
    const count = await testCollection.countDocuments();
    await testCollection.deleteOne({ test: true });
    
    console.log('\n✅ Read/Write test: PASSED');
    console.log(`   Documents inserted: 1`);
    console.log(`   Documents deleted: 1`);
    
    await client.close();
    console.log('\n✅ Connection closed successfully');
    console.log('\n🎉 MongoDB is working perfectly!\n');
    
  } catch (error) {
    console.error('\n❌ Connection Error:\n');
    console.error('Error:', error.message);
    console.error('\n💡 Troubleshooting:\n');
    console.error('1. Make sure MongoDB is running:');
    console.error('   Windows: net start MongoDB');
    console.error('   Or check MongoDB Atlas connection string\n');
    console.error('2. Check your MONGO_URI in .env.local');
    console.error('3. Verify MongoDB is accessible on localhost:27017\n');
    process.exit(1);
  }
}

testConnection();
