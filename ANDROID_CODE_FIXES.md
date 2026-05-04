# Android Code Fixes - Complete Solution

## ✅ Good News
Your `AppConfig.java` is already correct with the Render backend URL!

## ❌ Issues to Fix

### 1. ApiService.java - Change updateProfileImage return type

**Current (wrong):**
```java
@PUT("/user/profile-image")
Call<Void> updateProfileImage(
        @Header("Authorization") String token,
        @Body ProfileImageRequest request
);
```

**Fixed:**
```java
@PUT("/user/profile-image")
Call<ProfileUpdateResponse> updateProfileImage(
        @Header("Authorization") String token,
        @Body ProfileImageRequest request
);
```

---

### 2. Create ProfileUpdateResponse.java (NEW FILE)

Create a new file called `ProfileUpdateResponse.java`:

```java
package com.example.joyitchatapp;

import com.google.gson.annotations.SerializedName;

public class ProfileUpdateResponse {
    @SerializedName("message")
    private String message;
    
    @SerializedName("error")
    private String error;

    public String getMessage() {
        return message;
    }

    public String getError() {
        return error;
    }
}
```

---

### 3. ProfileImageRequest.java - Fix field name

**Current (wrong):**
```java
public class ProfileImageRequest {
    @SerializedName("imageUrl")
    private String imageUrl;

    public ProfileImageRequest(String imageUrl) {
        this.imageUrl = imageUrl;
    }
    // ...
}
```

**Fixed:**
```java
public class ProfileImageRequest {
    @SerializedName("profile_image_url")  // Changed from "imageUrl"
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

---

### 4. Update ProfileActivity.java - Fix the callback

**Change the updateProfileOnBackend method:**

**Current (wrong):**
```java
private void updateProfileOnBackend(String token, String imageUrl) {
    ProfileImageRequest request = new ProfileImageRequest(imageUrl);

    RetrofitClient.getApiService().updateProfileImage(token, request).enqueue(new Callback<Void>() {
        @Override
        public void onResponse(Call<Void> call, Response<Void> response) {
            // ...
        }
        // ...
    });
}
```

**Fixed:**
```java
private void updateProfileOnBackend(String token, String imageUrl) {
    ProfileImageRequest request = new ProfileImageRequest(imageUrl);

    RetrofitClient.getApiService().updateProfileImage(token, request).enqueue(new Callback<ProfileUpdateResponse>() {
        @Override
        public void onResponse(Call<ProfileUpdateResponse> call, Response<ProfileUpdateResponse> response) {
            if (response.isSuccessful() && response.body() != null) {
                Log.d(TAG, "Backend users table updated: " + response.body().getMessage());
            } else {
                Log.e(TAG, "Backend update failed: " + response.code());
            }
        }
        
        @Override
        public void onFailure(Call<ProfileUpdateResponse> call, Throwable t) {
            Log.e(TAG, "Backend update error: " + t.getMessage());
        }
    });
}
```

---

## 📝 Summary of Changes

1. **ApiService.java** - Change `Call<Void>` to `Call<ProfileUpdateResponse>`
2. **ProfileUpdateResponse.java** - Create new file
3. **ProfileImageRequest.java** - Change `@SerializedName("imageUrl")` to `@SerializedName("profile_image_url")`
4. **ProfileActivity.java** - Update the callback to use `ProfileUpdateResponse`

## 🚀 After Making These Changes

1. **Clean and rebuild your project** (Build → Clean Project, then Build → Rebuild Project)
2. **Run your app**
3. **Test file upload** - Should work now!
4. **Test profile picture update** - Should work now!

## 🧪 Testing

After making these changes, your app should:
- ✅ Upload images to Supabase Storage
- ✅ Update profile picture in backend users table
- ✅ Update profile in Firebase Realtime Database

Let me know once you've made these changes and tested!