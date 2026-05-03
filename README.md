# Chat Backend - File Upload & Profile Image System

Complete backend solution for Android chat applications with file upload, image sharing, and profile image management.

## 🚀 Features

- ✅ **File Upload**: Upload images and documents to Supabase Storage
- ✅ **Profile Image Management**: Update user profile images
- ✅ **Firebase Authentication**: Secure token-based authentication
- ✅ **Supabase Integration**: PostgreSQL database + file storage
- ✅ **Free Tier Ready**: Works with free tiers of Firebase, Supabase, and Render/Railway
- ✅ **Production Ready**: Error handling, validation, and security

## 📁 Project Structure

```
chat-backend/
├── server.js                 # Main Node.js Express server
├── package.json             # Node.js dependencies
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
├── SUPABASE_SCHEMA.sql     # Database schema for Supabase
├── API_DOCUMENTATION.md    # Complete API reference
├── INTEGRATION_GUIDE.md    # Step-by-step integration guide
├── ANDROID_API_SERVICE.java    # Android Retrofit interface additions
└── FileUploadHelper.java   # Android file upload utility class
```

## 🛠️ Tech Stack

### Backend
- **Node.js** + Express.js
- **Supabase** (PostgreSQL + Storage)
- **Firebase Admin SDK** (Authentication)
- **Multer** (File upload handling)

### Android (Java Only)
- **Retrofit** (HTTP client)
- **OkHttp** (HTTP library)
- **Firebase Auth** (User authentication)
- **Glide** (Image loading)

## 🚦 Quick Start

### 1. Backend Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# - Supabase URL and service role key
# - Firebase service account JSON

# Start server
npm start
```

Server runs on `http://localhost:3000`

### 2. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `SUPABASE_SCHEMA.sql`
3. Create a public storage bucket named `uploads`
4. Copy your project URL and service_role key to `.env`

### 3. Firebase Setup

1. Go to Firebase Console → Project Settings → Service Accounts
2. Generate new private key
3. Save as `firebase-service-account.json` OR paste JSON into `.env`

### 4. Android Integration

See `INTEGRATION_GUIDE.md` for detailed steps.

Quick version:
1. Add API methods from `ANDROID_API_SERVICE.java` to your Retrofit interface
2. Copy `FileUploadHelper.java` to your project
3. Initialize and use in your Activity

## 📖 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload` | Upload a file (image/document) |
| GET | `/files` | Get all files for current user |
| PUT | `/user/profile-image` | Update user profile image |

All endpoints require Firebase Authentication token in the Authorization header.

## 🔐 Authentication

The backend uses Firebase Admin SDK to verify Firebase ID tokens. Clients must include:

```
Authorization: Bearer <firebase_id_token>
```

## 📱 Android Usage Example

```java
// Initialize
FileUploadHelper fileUploadHelper = new FileUploadHelper(this, apiService);

// Set callback
fileUploadHelper.setUploadCallback(new FileUploadHelper.UploadCallback() {
    @Override
    public void onSuccess(String fileUrl) {
        // File uploaded successfully
        Glide.with(context).load(fileUrl).into(imageView);
    }
    
    @Override
    public void onError(String error) {
        Toast.makeText(context, "Error: " + error, Toast.LENGTH_SHORT).show();
    }
});

// Upload file
fileUploadHelper.uploadFile(fileUri);

// Update profile image
fileUploadHelper.updateProfileImage(imageUrl);
```

## 🌐 Deployment

### Render (Free)
1. Push to GitHub
2. Create new Web Service on Render
3. Connect repository and set environment variables
4. Deploy

### Railway (Free)
1. Push to GitHub
2. Deploy from GitHub on Railway
3. Set environment variables
4. Deploy

## 📚 Documentation

- **API Documentation**: See `API_DOCUMENTATION.md`
- **Integration Guide**: See `INTEGRATION_GUIDE.md`
- **Database Schema**: See `SUPABASE_SCHEMA.sql`

## 🔧 Environment Variables

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Firebase (choose one)
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
# OR
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# Server
PORT=3000
```

## 🆘 Troubleshooting

### Common Issues

**"Unauthorized" errors**
- Ensure user is signed in with Firebase
- Verify Firebase Admin SDK is configured
- Check token format: `Bearer <token>`

**File upload fails**
- Verify Supabase bucket is public
- Check Supabase credentials
- Ensure file size is under 50MB

**CORS errors**
- CORS is enabled in the backend
- Check your server URL in Android app

## 📄 License

MIT License

## 🤝 Support

For issues and questions:
1. Check `INTEGRATION_GUIDE.md` for detailed setup
2. Review `API_DOCUMENTATION.md` for API details
3. Check the troubleshooting section

---

**Built with:** Node.js, Express, Supabase, Firebase, Retrofit, Java