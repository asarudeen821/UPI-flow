import { ObjectId } from 'mongodb';
import { getDatabase } from '../../db/mongo.js';

function normalize(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return {
    ...rest,
    id: _id.toString(),
    created_date: rest.created_date instanceof Date ? rest.created_date.toISOString() : rest.created_date,
    updated_date: rest.updated_date instanceof Date ? rest.updated_date.toISOString() : rest.updated_date,
  };
}

async function col() {
  const db = await getDatabase();
  const c = db.collection('users');
  await c.createIndex({ email: 1 }, { unique: true });
  await c.createIndex({ reset_token: 1 });
  return c;
}

export const UserModel = {
  async create({ email, name, password_hash, phone = null }) {
    const collection = await col();
    const doc = {
      email,
      name: name || email.split('@')[0],
      password_hash,
      phone,
      role: 'user',
      is_verified: false,
      created_date: new Date(),
      updated_date: new Date(),
    };
    const result = await collection.insertOne(doc);
    return normalize({ ...doc, _id: result.insertedId });
  },

  async findById(id, includePassword = false) {
    const collection = await col();
    const user = await collection.findOne({ _id: new ObjectId(id) });
    if (user && !includePassword) {
      delete user.password_hash;
    }
    return normalize(user);
  },

  async findByEmail(email, includePassword = false) {
    const collection = await col();
    const user = await collection.findOne({ email });
    if (user && !includePassword) {
      delete user.password_hash;
    }
    return normalize(user);
  },

  async findByResetToken(token) {
    const collection = await col();
    const user = await collection.findOne({ reset_token: token });
    if (user) {
      delete user.password_hash;
    }
    return normalize(user);
  },

  async update(id, updates) {
    const collection = await col();
    const updateDoc = {
      ...updates,
      updated_date: new Date(),
    };
    await collection.updateOne({ _id: new ObjectId(id) }, { $set: updateDoc });
    const updated = await collection.findOne({ _id: new ObjectId(id) });
    if (updated) {
      delete updated.password_hash;
    }
    return normalize(updated);
  },

  async updatePassword(id, passwordHash) {
    const collection = await col();
    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          password_hash: passwordHash,
          updated_date: new Date(),
        },
      }
    );
  },

  async setResetToken(email, token, expiresAt) {
    const collection = await col();
    await collection.updateOne(
      { email },
      {
        $set: {
          reset_token: token,
          reset_token_expires: expiresAt,
          updated_date: new Date(),
        },
      }
    );
  },

  async clearResetToken(token) {
    const collection = await col();
    await collection.updateOne(
      { reset_token: token },
      {
        $unset: {
          reset_token: 1,
          reset_token_expires: 1,
        },
        $set: {
          updated_date: new Date(),
        },
      }
    );
  },

  async delete(id) {
    const collection = await col();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  },

  async exists(email) {
    const collection = await col();
    const user = await collection.findOne({ email });
    return user !== null;
  },
};

export default UserModel;
