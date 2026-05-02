import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import admin from "firebase-admin";

dotenv.config();

// 🔐 Firebase Admin init (use your service account JSON file)
import serviceAccount from "./firebase-service-account.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
app.use(cors());

const upload = multer({ storage: multer.memoryStorage() });

// 🔐 Supabase client (SERVER ONLY)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 🚀 Upload endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    // 1. Get Firebase token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    const token = authHeader.replace("Bearer ", "");

    // 2. Verify Firebase token
    const decoded = await admin.auth().verifyIdToken(token);
    const userId = decoded.uid;

    // 3. Prepare file
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileName = `${userId}/${Date.now()}_${file.originalname}`;

    // 4. Upload to Supabase
    const { data, error } = await supabase.storage
      .from("uploads") // your bucket name
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
      });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // 5. Get public URL (optional)
    const { data: urlData } = supabase.storage
      .from("uploads")
      .getPublicUrl(fileName);

    return res.json({
      path: data.path,
      url: urlData.publicUrl,
    });

  } catch (err) {
    return res.status(401).json({ error: "Invalid Firebase token" });
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});