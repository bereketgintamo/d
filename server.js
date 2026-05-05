require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const admin = require("firebase-admin");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

/* ---------------- Firebase Admin ---------------- */
const fs = require("fs");

/**
 * Firebase Admin credential loading strategy (in order):
 * 1) FIREBASE_SERVICE_ACCOUNT_JSON (preferred): JSON string of the service account
 * 2) FIREBASE_SERVICE_ACCOUNT_PATH: explicit file path
 * 3) Try common local filenames (firebase-service-account.json / firebase-adminsdk.json)
 * 4) Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS, etc.)
 */
let credential = null;

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (serviceAccountJson && serviceAccountJson.trim()) {
  try {
    let parsedJson;
    try {
      parsedJson = JSON.parse(serviceAccountJson);
    } catch {
      // Fix escaped newlines commonly found in environment variables
      const fixedJson = serviceAccountJson.replace(/\\n/g, '\n');
      parsedJson = JSON.parse(fixedJson);
    }
    credential = admin.credential.cert(parsedJson);
    console.log("Firebase Admin initialized using FIREBASE_SERVICE_ACCOUNT_JSON");
  } catch (err) {
    console.error("Error parsing FIREBASE_SERVICE_ACCOUNT_JSON:", err.message);
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON: " + err.message);
  }
} else {
  const toResolvedPath = (p) => {
    if (!p) return null;
    return path.isAbsolute(p) ? p : path.resolve(__dirname, p);
  };

  const candidatePaths = [
    toResolvedPath(process.env.FIREBASE_SERVICE_ACCOUNT_PATH),
    toResolvedPath("./firebase-service-account.json"),
    toResolvedPath("./firebase-adminsdk.json"),
  ].filter(Boolean);

  const foundPath = candidatePaths.find((p) => fs.existsSync(p));
  if (foundPath) {
    console.log("Firebase Admin initialized using file:", foundPath);
    const serviceAccount = require(foundPath);
    credential = admin.credential.cert(serviceAccount);
  }
}

if (!credential) {
  try {
    console.log("Trying Application Default Credentials...");
    credential = admin.credential.applicationDefault();
  } catch (err) {
    throw new Error(
      "Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT_JSON (recommended) or FIREBASE_SERVICE_ACCOUNT_PATH, or provide Application Default Credentials (e.g., set GOOGLE_APPLICATION_CREDENTIALS)."
    );
  }
}

admin.initializeApp({ credential });

/* ---------------- Supabase ----------------
 Accept either:
 - SUPABASE_SERVICE_ROLE_KEY (preferred / standard)
 - SUPABASE_SERVICE_KEY
 - SUPABASE_KEY
*/
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseServiceKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_KEY
)?.trim();

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

function getSupabaseOrFail(res) {
  if (!supabase) {
    return res.status(500).json({
      error:
        "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY/SUPABASE_KEY).",
    });
  }
  return null;
}

/* ---------------- Multer ---------------- */
const storage = multer.memoryStorage();
const upload = multer({ storage });

/* ---------------- Auth Middleware ---------------- */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = await admin.auth().verifyIdToken(token);

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

/* ---------------- Upload File ---------------- */
app.post("/upload", authenticate, upload.single("file"), async (req, res) => {
  try {
    if (getSupabaseOrFail(res)) return;

    const file = req.file;
    const uid = req.user.uid;

    // Safety Sync: Ensure the user exists in the 'users' table before adding files.
    // This prevents foreign key violations if the initial registration sync was missed.
    // We use ignoreDuplicates: true to avoid overwriting existing profile data.
    const { error: syncError } = await supabase.from("users").upsert(
      {
        id: uid,
        email: req.user.email || null,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );

    if (syncError) {
      console.error("[Sync Error]", syncError);
      return res.status(500).json({ error: "User sync failed: " + syncError.message });
    }

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = `${uid}/${Date.now()}_${file.originalname}`;

    const { data, error } = await supabase.storage
      .from("uploads")
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
      });

    if (error) throw error;

    // Use the official SDK to generate the URL
    const { data: urlData } = supabase.storage
      .from("uploads")
      .getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    // Save metadata
    const { error: dbError } = await supabase.from("files").insert([
      {
        user_id: uid,
        file_url: publicUrl,
        file_name: file.originalname,
        file_type: file.mimetype,
      },
    ]);

    if (dbError) {
      console.error("[Upload] Database insert failed:", dbError.message);
      throw dbError;
    }

    res.json({
      message: "Upload successful",
      file_url: publicUrl,
      // Backward-compat for ChatActivity expecting "url"
      url: publicUrl,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- Get Files ---------------- */
app.get("/files", authenticate, async (req, res) => {
  try {
    if (getSupabaseOrFail(res)) return;

    const uid = req.user.uid;

    const { data, error } = await supabase
      .from("files")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- User Sync (Registration) ---------------- */
app.post("/user", authenticate, async (req, res) => {
  try {
    if (getSupabaseOrFail(res)) return;
    const uid = req.user.uid;
    const { username, email } = req.body;

    const { error } = await supabase
      .from("users")
      .upsert({
        id: uid,
        username: username,
        email: email || req.user.email,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) throw error;
    res.json({ message: "User synced" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- Update Profile ---------------- */
app.put("/user/profile-image", authenticate, async (req, res) => {
  try {
    if (getSupabaseOrFail(res)) return;

    const uid = req.user.uid;
    const { profile_image_url, imageUrl, username, bio, email } = req.body;
    const image_url = profile_image_url || imageUrl;

    const updates = { id: uid, updated_at: new Date().toISOString() };
    if (image_url) updates.profile_image_url = image_url;
    if (username) updates.username = username;
    if (bio) updates.bio = bio;
    if (email) updates.email = email;

    // Perform a selective update to prevent overwriting existing data with nulls
    const { error } = await supabase
      .from("users")
      .upsert(updates);

    if (error) throw error;

    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- Root Path ---------------- */
app.get("/", (req, res) => {
  res.status(200).send("JoyItChat API is running!");
});

/* ---------------- Health ---------------- */
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date() });
});

/* ---------------- Start Server ---------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
