# Integration Guide - Chat File Upload System

Complete step-by-step guide to integrate file upload and profile image functionality into your Android chat app.

---

## Step 1: Supabase Setup

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign in
2. Create a new project (free tier is fine)
3. Wait for project to be ready (~2 minutes)

### 1.2 Run SQL Schema
1. Go to **SQL Editor** in Supabase dashboard
2. Copy and paste the contents of `SUPABASE_SCHEMA.sql`
3. Click **Run** to execute

### 1.3 Create Storage Bucket
1. Go to **Storage** in Supabase dashboard
2. Click **New bucket**
3. Name: `uploads`
4. Check **Public bucket**
5. Click **Create bucket**

### 1.4 Get API Keys
1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **service_role key** (keep this secret!)

---

## Step 2: Backend Setup

### 2.1 Install Dependencies
```bash
cd chat-backend
npm install express multer cors firebase-admin @supabase/supabase-js dotenv
```

### 2.2 Configure Environment Variables
Create a `.env` file in the backend root:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Firebase Admin (choose ONE method):
# Option 1: Paste service account JSON (recommended for deployment)
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}

# Option 2: Path to service account file (recommended for local dev)
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# Server Port
PORT=3000
```

### 2.3 Get Firebase Service Account Key
1. Go to **Firebase Console** → Your Project → **Project Settings**
2. Go to **Service accounts** tab
3. Click **Generate new private key**
4. Save the JSON file as `firebase-service-account.json` in the backend directory
5. OR copy the JSON content and paste into `FIREBASE_SERVICE_ACCOUNT_JSON`

### 2.4 Deploy Backend (Choose One)

#### Option A: Render (Free)
1. Push your code to GitHub
2. Go to [render.com](https://render.com) and sign in
3. Create new **Web Service**
4. Connect your GitHub repository
5. Set environment variables (from `.env`)
6. Deploy

#### Option B: Railway (Free)
1. Push your code to GitHub
2. Go to [railway.app](https://railway.app) and sign in
3. Click **New Project** → **Deploy from GitHub repo**
4. Set environment variables
5. Deploy

#### Option C: Local Development
```bash
node server.js
```

---

## Step 3: Android Integration

### 3.1 Add ApiService Methods
Add these methods to your existing `RetrofitClient.java` interface (or create a new one):

```java
// See ANDROID_API_SERVICE.java for complete code
// Add these 3 methods to your interface:
@Multipart
@POST("upload")
Call<UploadResponse> uploadFile(@Header("Authorization") String authToken, @Part MultipartBody.Part file);

@GET("files")
Call<List<FileInfo>> getUserFiles(@Header("Authorization") String authToken);

@PUT("user/profile-image")
Call<ProfileResponse> updateProfileImage(@Header("Authorization") String authToken, @Body Map<String, String> body);
```

### 3.2 Add Response Model Classes
Add these classes to your project (can be in separate files or inner classes):

```java
// UploadResponse.java
public class UploadResponse {
    public String message;
    public String file_url;
    public String url;
    public String error;
    
    public String getFileUrl() {
        return file_url != null ? file_url : url;
    }
}

// FileInfo.java
public class FileInfo {
    public String id;
    public String user_id;
    public String file_url;
    public String file_name;
    public String file_type;
    public String created_at;
}

// ProfileResponse.java
public class ProfileResponse {
    public String message;
    public String error;
}
```

### 3.3 Add FileUploadHelper
Copy `FileUploadHelper.java` to your project.

### 3.4 Initialize in Your Activity

```java
public class ChatActivity extends AppCompatActivity {
    
    private FileUploadHelper fileUploadHelper;
    private ApiService apiService;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_chat);
        
        // Initialize Retrofit (assuming you have RetrofitClient.java)
        apiService = RetrofitClient.getClient().create(ApiService.class);
        
        // Initialize FileUploadHelper
        fileUploadHelper = new FileUploadHelper(this, apiService);
        
        // Set callbacks
        fileUploadHelper.setUploadCallback(new FileUploadHelper.UploadCallback() {
            @Override
            public void onSuccess(String fileUrl) {
                // File uploaded successfully
                Toast.makeText(ChatActivity.this, "Upload successful!", Toast.LENGTH_SHORT).show();
                
                // Load image with Glide
                ImageView imageView = findViewById(R.id.imageView);
                Glide.with(ChatActivity.this)
                    .load(fileUrl)
                    .placeholder(R.drawable.placeholder)
                    .into(imageView);
                    
                // If this is a profile image, update user profile
                updateProfileInDatabase(fileUrl);
            }
            
            @Override
            public void onError(String error) {
                Toast.makeText(ChatActivity.this, "Upload failed: " + error, Toast.LENGTH_SHORT).show();
            }
        });
    }
    
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        
        // Handle file picker result
        if (fileUploadHelper.handleFilePickerResult(requestCode, resultCode, data)) {
            return; // File was handled
        }
    }
    
    // Call this to open file picker
    private void pickFile() {
        fileUploadHelper.openFilePicker();
    }
    
    // Call this to update profile image directly
    private void updateProfileImage(String imageUrl) {
        fileUploadHelper.updateProfileImage(imageUrl);
    }
    
    // Call this to get all user files
    private void loadUserFiles() {
        fileUploadHelper.setFilesCallback(new FileUploadHelper.FilesCallback() {
            @Override
            public void onSuccess(List<FileInfo> files) {
                // Display files in RecyclerView or ListView
                displayFiles(files);
            }
            
            @Override
            public void onError(String error) {
                Toast.makeText(ChatActivity.this, "Error: " + error, Toast.LENGTH_SHORT).show();
            }
        });
        fileUploadHelper.getUserFiles();
    }
    
    private void displayFiles(List<FileInfo> files) {
        // Implement your UI logic here
    }
    
    private void updateProfileInDatabase(String imageUrl) {
        // Update your local database or Firebase Realtime Database if needed
    }
}
```

### 3.5 Add Permissions to AndroidManifest.xml

```xml
<!-- Required for file access -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" 
    android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />

<!-- Required for internet -->
<uses-permission android:name="android.permission.INTERNET" />
```

### 3.6 Update build.gradle (if needed)

Make sure you have these dependencies:

```gradle
dependencies {
    // Retrofit
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
    
    // OkHttp
    implementation 'com.squareup.okhttp3:okhttp:4.11.0'
    implementation 'com.squareup.okhttp3:logging-interceptor:4.11.0'
    
    // Firebase
    implementation 'com.google.firebase:firebase-auth:22.1.1'
    
    // Glide
    implementation 'com.github.bumptech.glide:glide:4.15.1'
    annotationProcessor 'com.github.bumptech.glide:compiler:4.15.1'
}
```

---

## Step 4: Testing

### 4.1 Test File Upload
1. Run your backend server
2. Launch your Android app
3. Sign in with Firebase Authentication
4. Click the file picker button
5. Select an image or document
6. Verify the file uploads and displays

### 4.2 Test Profile Image Update
1. After uploading an image, get the URL
2. Call `updateProfileImage(url)`
3. Verify the profile updates

### 4.3 Test Get Files
1. Upload multiple files
2. Call `getUserFiles()`
3. Verify all files are listed

---

## Troubleshooting

### Common Issues

**1. "Unauthorized" errors**
- Make sure Firebase user is signed in
- Verify Firebase Admin SDK is configured correctly
- Check that the token is being sent as `Bearer <token>`

**2. File upload fails**
- Verify Supabase bucket is public
- Check Supabase URL and service role key
- Ensure file size is within limits (default 50MB)

**3. CORS errors**
- Backend already has CORS enabled
- If deploying, ensure your server URL is correct

**4. "User not authenticated"**
- Check `FirebaseAuth.getInstance().getCurrentUser()` is not null
- User must be signed in before uploading

---

## Production Checklist

- [ ] Backend deployed to Render/Railway
- [ ] Environment variables set correctly
- [ ] Supabase bucket is public
- [ ] Firebase Admin SDK configured
- [ ] Android app has internet permission
- [ ] Error handling implemented
- [ ] Loading states shown to user
- [ ] File size limits enforced
- [ ] User feedback on upload success/failure

---

## Notes

- **Free Tier Limits**: 
  - Supabase: 500MB storage, 50,000 monthly active users
  - Render: 750 hours/month (free instance sleeps after 15 min inactivity)
  - Railway: $5 credit/month (enough for small apps)

- **Security**: Firebase tokens are verified server-side, ensuring only authenticated users can upload

- **Scalability**: This setup can handle thousands of users on free tiers. Upgrade as needed.