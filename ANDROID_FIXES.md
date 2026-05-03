# Android Code Fixes - Upload & Profile Image Issues

## 🔍 Issues Found in Your Code

### Issue 1: Wrong JSON Field Name in ProfileImageRequest

**Your code sends:**
```json
{"imageUrl": "https://..."}
```

**Backend expects:**
```json
{"profile_image_url": "https://..."}
```

**Fix:**
```java
// CHANGE THIS:
@SerializedName("imageUrl")
private String imageUrl;

// TO THIS:
@SerializedName("profile_image_url")
private String profile_image_url;

public ProfileImageRequest(String profile_image_url) {
    this.profile_image_url = profile_image_url;
}
```

---

### Issue 2: updateProfileImage Returns Void

Your backend returns `{"message": "Profile updated"}` but your Android code expects `Void`.

**Fix in ApiService.java:**
```java
// CHANGE THIS:
@PUT("/user/profile-image")
Call<Void> updateProfileImage(...);

// TO THIS:
@PUT("/user/profile-image")
Call<ProfileUpdateResponse> updateProfileImage(...);
```

**Create ProfileUpdateResponse.java:**
```java
package com.example.joyitchatapp;

import com.google.gson.annotations.SerializedName;

public class ProfileUpdateResponse {
    @SerializedName("message")
    private String message;
    
    @SerializedName("error")
    private String error;

    public String getMessage() { return message; }
    public String getError() { return error; }
}
```

---

### Issue 3: Missing Error Details in Upload

Add better error logging to see what's actually failing:

```java
@Override
public void onResponse(Call<FileUploadResponse> call, Response<FileUploadResponse> response) {
    pd.dismiss();
    
    if (response.isSuccessful() && response.body() != null) {
        String fileUrl = response.body().getUrl();
        Toast.makeText(ProfileActivity.this, "Upload Success!", Toast.LENGTH_SHORT).show();
        updateProfileOnBackend(bearerToken, fileUrl);
        updateDatabase(binding.etUsername.getText().toString(), 
                      binding.etBio.getText().toString(), fileUrl);
    } else {
        // GET THE ACTUAL ERROR MESSAGE
        String errorBody = "";
        try {
            if (response.errorBody() != null) {
                errorBody = response.errorBody().string();
            }
        } catch (Exception e) {
            errorBody = e.getMessage();
        }
        
        Log.e(TAG, "Server Error: " + response.code() + " - " + errorBody);
        Toast.makeText(ProfileActivity.this, 
            "Upload failed: " + response.code() + " " + errorBody, 
            Toast.LENGTH_LONG).show();
    }
}
```

---

## 📝 Complete Fixed Files

### 1. ProfileImageRequest.java (FIXED)
```java
package com.example.joyitchatapp;

import com.google.gson.annotations.SerializedName;

public class ProfileImageRequest {
    @SerializedName("profile_image_url")  // FIXED: Match backend field
    private String profile_image_url;

    public ProfileImageRequest(String profile_image_url) {
        this.profile_image_url = profile_image_url;
    }

    public String getProfile_image_url() {
        return profile_image_url;
    }

    public void setProfile_image_url(String profile_image_url) {
        this.profile_image_url = profile_image_url;
    }
}
```

### 2. ProfileUpdateResponse.java (NEW FILE)
```java
package com.example.joyitchatapp;

import com.google.gson.annotations.SerializedName;

public class ProfileUpdateResponse {
    @SerializedName("message")
    private String message;
    
    @SerializedName("error")
    private String error;

    public String getMessage() { return message; }
    public String getError() { return error; }
}
```

### 3. ApiService.java (FIXED)
```java
public interface ApiService {

    @Multipart
    @POST("/upload")
    Call<FileUploadResponse> uploadFile(
            @Header("Authorization") String token,
            @Part MultipartBody.Part file
    );

    @GET("/files")
    Call<List<FileModel>> getFiles(
            @Header("Authorization") String token
    );

    @PUT("/user/profile-image")
    Call<ProfileUpdateResponse> updateProfileImage(  // FIXED: Changed from Void
            @Header("Authorization") String token,
            @Body ProfileImageRequest request
    );
}
```

---

## 🧪 Testing After Fixes

1. **Clean and rebuild your project**
2. **Run the app and try uploading an image**
3. **Check Logcat for these tags:**
   - `ProfileActivity` - See the actual error messages
   - Look for "Server Error:" or "Network Error:"

---

## 🔧 If Upload Still Fails

Check these common issues:

### 1. Verify Backend URL
In `AppConfig.java`, make sure your BASE_URL is correct:
```java
public static final String BASE_URL = "https://your-app.onrender.com";  // No trailing slash!
```

### 2. Test Backend Manually
Use this curl command to test:
```bash
curl -X POST https://your-app.onrender.com/upload \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -F "file=@/path/to/image.jpg"
```

### 3. Check Render Environment Variables
Make sure these are set in Render dashboard:
- `SUPABASE_URL` = `https://vunxmcytadofasyzegoo.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = (your service role key)
- `FIREBASE_SERVICE_ACCOUNT_JSON` = (your Firebase service account JSON)

### 4. Check Supabase Storage Bucket
- Bucket name must be exactly `uploads`
- Bucket must be **Public**

---

## 📱 Quick Debug Checklist

- [ ] Firebase user is logged in
- [ ] `AppConfig.BASE_URL` points to your Render backend
- [ ] Render backend is deployed and running (not showing errors)
- [ ] Environment variables are set correctly on Render
- [ ] Supabase bucket `uploads` exists and is public
- [ ] `profile_image_url` field name matches in both Android and backend
- [ ] Internet permission is in AndroidManifest.xml

If you've made these changes and it still doesn't work, share the Logcat output and I'll help you further!