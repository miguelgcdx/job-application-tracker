/**
 * Shared MongoDB connection bootstrap for server-side callers; keep database
 * credentials and connection management out of browser code.
 * Domain transactions require a replica set or sharded deployment; reusing a
 * connection does not itself make operations transactional.
 */
import mongoose from "mongoose";

// Required server environment variable identifying the MongoDB deployment.
const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

// Development hot reload can re-evaluate this module. Keeping both the resolved
// connection and in-flight attempt on global avoids opening duplicate connections
// across reloads and lets concurrent callers share the same connection attempt.
const cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

/**
 * Reuses the established connection or awaits the shared connection attempt.
 * @returns The connected Mongoose instance, not an individual database session.
 */
async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error(
      "Please define the MONGODB_URI environment variable inside .env"
    );
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    // Discard the rejected attempt so later calls can retry instead of inheriting
    // the same failure indefinitely.
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
