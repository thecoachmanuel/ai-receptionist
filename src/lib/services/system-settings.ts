import { getDb } from "@/lib/db/mongodb";

export interface SystemSettings {
  googleAuthEnabled: boolean;
  updatedAt: number;
  updatedBy?: string;
}

const SETTINGS_DOC_ID = "global_system_settings";

export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const db = await getDb();
    const doc = await db.collection("system_settings").findOne({ _id: SETTINGS_DOC_ID as any });

    if (!doc) {
      return {
        googleAuthEnabled: true,
        updatedAt: Date.now(),
      };
    }

    return {
      googleAuthEnabled: doc.googleAuthEnabled !== false,
      updatedAt: doc.updatedAt || Date.now(),
      updatedBy: doc.updatedBy,
    };
  } catch (err) {
    console.error("Failed to fetch system settings:", err);
    return {
      googleAuthEnabled: true,
      updatedAt: Date.now(),
    };
  }
}

export async function updateSystemSettings(
  updates: Partial<Pick<SystemSettings, "googleAuthEnabled">>,
  userId?: string
): Promise<SystemSettings> {
  const db = await getDb();
  const now = Date.now();

  const current = await getSystemSettings();
  const newSettings: SystemSettings = {
    ...current,
    ...updates,
    updatedAt: now,
    updatedBy: userId || current.updatedBy,
  };

  await db.collection("system_settings").updateOne(
    { _id: SETTINGS_DOC_ID as any },
    {
      $set: {
        googleAuthEnabled: newSettings.googleAuthEnabled,
        updatedAt: now,
        updatedBy: newSettings.updatedBy,
      },
    },
    { upsert: true }
  );

  return newSettings;
}
