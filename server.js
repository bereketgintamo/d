require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const admin = require("firebase-admin");
const { createClient } = require("@supabase/supabase-js");

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
    const serviceAccount = JSON.parse(serviceAccountJson);
    credential = admin.credential.cert(serviceAccount);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }
} else {
  const candidatePaths = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    "./firebase-service-account.json",
    "./firebase-adminsdk.json",
  ].filter(Boolean);

  const foundPath = candidatePaths.find((p) => fs.existsSync(p));
  if (foundPath) {
    const serviceAccount = require(foundPath);
    credential = admin.credential.cert(serviceAccount);
  }
}

if (!credential) {
  try {
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

    const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/uploads/${filePath}`;

    // Save metadata
    const { error: dbError } = await supabase.from("files").insert([
      {
        user_id: uid,
        file_url: publicUrl,
        file_name: file.originalname,
        file_type: file.mimetype,
      },
    ]);

    if (dbError) throw dbError;

    res.json({
      message: "Upload successful",
      file_url: publicUrl,
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

/* ---------------- Update Profile Image ---------------- */
app.put("/user/profile-image", authenticate, async (req, res) => {
  try {
    if (getSupabaseOrFail(res)) return;

    const uid = req.user.uid;
    const { profile_image_url } = req.body;

    if (!profile_image_url) {
      return res.status(400).json({ error: "Image URL required" });
    }

    const { error } = await supabase
      .from("users")
      .upsert({
        id: uid,
        profile_image_url,
      });

    if (error) throw error;

    res.json({ message: "Profile updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- Health ---------------- */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    supabaseConfigured: Boolean(supabase),
  });
});


app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    supabaseConfigured: !!process.env.SUPABASE_URL
  });
});

/* ---------------- Start Server ---------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
