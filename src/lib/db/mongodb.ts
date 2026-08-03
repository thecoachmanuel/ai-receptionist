import { Db, MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/ai-receptionist";
const options = {
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var _mongoIndexesEnsured: boolean | undefined;
}

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, options);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

async function ensureIndexes(db: Db) {
  if (global._mongoIndexesEnsured) return;
  global._mongoIndexesEnsured = true;

  try {
    await Promise.all([
      db.collection("sessions").createIndex({ token: 1 }, { unique: true }),
      db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      db.collection("users").createIndex({ email: 1 }, { unique: true }),
      db.collection("organizations").createIndex({ slug: 1 }),
      db.collection("organizations").createIndex({ clerkOrgId: 1 }),
      db.collection("publicSites").createIndex({ siteSlug: 1 }),
      db.collection("publicSites").createIndex({ organizationId: 1 }),
      db.collection("orgMembers").createIndex({ organizationId: 1, userId: 1 }),
      db.collection("bookings").createIndex({ organizationId: 1, confirmationCode: 1 }),
      db.collection("conversations").createIndex({ organizationId: 1, startedAt: -1 }),
      db.collection("conversations").createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 }), // 30-day auto cleanup
      db.collection("agentSessionRateLimits").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]);
  } catch (err) {
    console.warn("Index initialization warning:", err);
  }
}

export async function getDb(): Promise<Db> {
  const connectedClient = await clientPromise;
  const db = connectedClient.db();
  void ensureIndexes(db);
  return db;
}

export default clientPromise;
