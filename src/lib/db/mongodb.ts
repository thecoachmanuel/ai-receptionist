import { Db, MongoClient, MongoClientOptions } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/ai-receptionist";

const options: MongoClientOptions = {
  maxPoolSize: 10, // Max 10 connections per serverless instance to prevent exceeding M0 cluster limits
  minPoolSize: 1,
  maxIdleTimeMS: 30000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var _mongoIndexesEnsured: boolean | undefined;
}

if (!global._mongoClientPromise) {
  const client = new MongoClient(uri, options);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

let indexesPromise: Promise<void> | null = null;

async function ensureIndexes(db: Db): Promise<void> {
  if (global._mongoIndexesEnsured) return;
  global._mongoIndexesEnsured = true;

  try {
    await Promise.allSettled([
      db.collection("publicSites").createIndex({ siteSlug: 1 }, { background: true }),
      db.collection("publicSites").createIndex({ organizationId: 1 }, { background: true }),
      db.collection("organizations").createIndex({ slug: 1 }, { background: true }),
      db.collection("organizations").createIndex({ clerkOrgId: 1 }, { background: true }),
      db.collection("users").createIndex({ email: 1 }, { background: true, sparse: true }),
      db.collection("sessions").createIndex({ token: 1 }, { background: true }),
      db.collection("sessions").createIndex({ expiresAt: 1 }, { background: true }),
      db.collection("orgMembers").createIndex({ organizationId: 1, userId: 1 }, { background: true }),
      db.collection("orgMembers").createIndex({ userId: 1 }, { background: true }),
      db.collection("offerings").createIndex({ organizationId: 1, active: 1 }, { background: true }),
      db.collection("teamMembers").createIndex({ organizationId: 1, active: 1 }, { background: true }),
      db.collection("knowledgeItems").createIndex({ organizationId: 1, published: 1 }, { background: true }),
      db.collection("bookings").createIndex({ organizationId: 1, startAt: -1 }, { background: true }),
      db.collection("conversations").createIndex({ organizationId: 1, createdAt: -1 }, { background: true }),
      db.collection("agentIntegrations").createIndex({ organizationId: 1, provider: 1 }, { background: true }),
    ]);
  } catch (err) {
    console.warn("Index initialization non-critical warning:", err);
  }
}

export async function getDb(): Promise<Db> {
  const connectedClient = await clientPromise;
  const db = connectedClient.db();

  if (!global._mongoIndexesEnsured && !indexesPromise) {
    indexesPromise = ensureIndexes(db);
  }

  return db;
}

export default clientPromise;

