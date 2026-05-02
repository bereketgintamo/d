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
const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./firebase-adminsdk.json";
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Accept either SUPABASE_SERVICE_KEY (preferred) or SUPABASE_KEY (current .env)
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY)?.trim();

if (!supabaseUrl) throw new Error("SUPABASE_URL is required.");
if (!supabaseServiceKey) throw new Error("Supabase service key is required (set SUPABASE_SERVICE_KEY or SUPABASE_KEY).");

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

/* ---------------- Start Server ---------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
