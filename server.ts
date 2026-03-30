import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { initializeApp, cert, getApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Firebase Admin
const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));
if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}
const db = getFirestore();
// Use the specific database ID if provided
if (firebaseConfig.firestoreDatabaseId) {
  // Note: For firebase-admin, you might need to specify the databaseId in the getFirestore call
  // but in many cases, it's already handled by the environment or the default.
  // We'll try to use it if possible.
}

// SignalWire Client (Lazy Initialization)
let signalwireClient: any = null;

async function getSignalWireClient() {
  if (!signalwireClient) {
    const { RestClient } = await import("@signalwire/node");
    const projectId = process.env.SIGNALWIRE_PROJECT_ID;
    const apiToken = process.env.SIGNALWIRE_API_TOKEN;
    const spaceUrl = process.env.SIGNALWIRE_SPACE_URL;
    
    if (!projectId || !apiToken || !spaceUrl) {
      throw new Error("SIGNALWIRE_PROJECT_ID, SIGNALWIRE_API_TOKEN, and SIGNALWIRE_SPACE_URL are required");
    }
    
    signalwireClient = new RestClient(projectId, apiToken, { signalwireSpaceUrl: spaceUrl });
  }
  return signalwireClient;
}

// API Routes
app.post("/api/send-sms", async (req, res) => {
  const { to, message, organizationId } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: "To and message are required" });
  }

  try {
    const client = await getSignalWireClient();
    let from = process.env.SIGNALWIRE_PHONE_NUMBER;

    // Fetch organization phone number if organizationId is provided
    if (organizationId) {
      try {
        const orgDoc = await db.collection("organizations").doc(organizationId).get();
        if (orgDoc.exists) {
          const orgData = orgDoc.data();
          if (orgData?.assignedPhoneNumber) {
            from = orgData.assignedPhoneNumber;
          }
        }
      } catch (e) {
        console.error("Failed to fetch organization phone number", e);
      }
    }
    
    if (!from) {
      return res.status(500).json({ error: "SIGNALWIRE_PHONE_NUMBER is not configured and no organization phone found" });
    }

    const result = await client.messages.create({
      body: message,
      from: from,
      to: to,
    });

    res.json({ success: true, sid: result.sid });
  } catch (error: any) {
    console.error("SignalWire Error:", error);
    res.status(500).json({ error: error.message || "Failed to send SMS" });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
