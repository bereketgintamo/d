// ============================================================
// FIX 1: Update ProfileImageRequest.java
// ============================================================

package com.example.joyitchatapp;

import com.google.gson.annotations.SerializedName;

public class ProfileImageRequest {
    @SerializedName("profile_image_url")  // FIXED: Match backend field name
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

// ============================================================
// FIX 2: Update ApiService.java interface
// ============================================================

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
