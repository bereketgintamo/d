// ============================================================
// ANDROID: FileUploadHelper.java
// Complete utility class for file picking and uploading
// ============================================================

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Log;
import android.webkit.MimeTypeMap;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.google.android.gms.tasks.Task;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class FileUploadHelper {
    
    private static final String TAG = "FileUploadHelper";
    private static final int PICK_FILE_REQUEST_CODE = 1001;
    
    private Activity activity;
    private ApiService apiService;
    private UploadCallback uploadCallback;
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    public FileUploadHelper(Activity activity, ApiService apiService) {
        this.activity = activity;
        this.apiService = apiService;
    }
    
    // ============================================================
    // FILE PICKER
    // ============================================================
    public void openFilePicker() {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.setType("*/*");  // Allow all file types
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        
        try {
            activity.startActivityForResult(
                Intent.createChooser(intent, "Select File"),
                PICK_FILE_REQUEST_CODE
            );
        } catch (Exception e) {
            Log.e(TAG, "Error opening file picker: " + e.getMessage());
        }
    }
    
    // ============================================================
    // HANDLE FILE PICKER RESULT
    // Call this from Activity.onActivityResult()
    // ============================================================
    public boolean handleFilePickerResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != PICK_FILE_REQUEST_CODE || resultCode != Activity.RESULT_OK || data == null) {
            return false;
        }
        
        Uri fileUri = data.getData();
        if (fileUri == null) {
            return false;
        }
        
        uploadFile(fileUri);
        return true;
    }
    
    // ============================================================
    // UPLOAD FILE
    // ============================================================
    public void uploadFile(Uri fileUri) {
        try {
            // Get Firebase token
            FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
            if (user == null) {
                if (uploadCallback != null) {
                    uploadCallback.onError("User not authenticated");
                }
                return;
            }
            
            // Get ID token
            user.getIdToken(true)
                .addOnCompleteListener(task -> {
                    if (task.isSuccessful() && task.getResult() != null) {
                        String idToken = task.getResult().getToken();
                        String authToken = "Bearer " + idToken;
                        
                        // Create multipart body part from URI
                        MultipartBody.Part filePart = createFilePart(fileUri);
                        if (filePart == null) {
                            if (uploadCallback != null) {
                                uploadCallback.onError("Failed to create file part");
                            }
                            return;
                        }
                        
                        // Upload to server
                        uploadToServer(authToken, filePart);
                    } else {
                        if (uploadCallback != null) {
                            uploadCallback.onError("Failed to get auth token: " + 
                                (task.getException() != null ? task.getException().getMessage() : "Unknown error"));
                        }
                    }
                });
                
        } catch (Exception e) {
            Log.e(TAG, "Upload error: " + e.getMessage());
            if (uploadCallback != null) {
                uploadCallback.onError(e.getMessage());
            }
        }
    }
    
    // ============================================================
    // CREATE MULTIPART FILE PART
    // ============================================================
    private MultipartBody.Part createFilePart(Uri fileUri) {
        try {
            // Get file name and MIME type
            String fileName = getFileName(fileUri);
            String mimeType = getMimeType(fileUri);
            
            // Create temporary file from URI
            File tempFile = createTempFile(fileUri);
            if (tempFile == null) {
                return null;
            }
            
            // Create RequestBody
            MediaType mediaType = mimeType != null ? 
                MediaType.parse(mimeType) : 
                MediaType.parse("application/octet-stream");
                
            RequestBody requestFile = RequestBody.create(mediaType, tempFile);
            
            // Create MultipartBody.Part
            return MultipartBody.Part.createFormData("file", fileName, requestFile);
            
        } catch (Exception e) {
            Log.e(TAG, "Error creating file part: " + e.getMessage());
            return null;
        }
    }
    
    // ============================================================
    // CREATE TEMP FILE FROM URI
    // ============================================================
    private File createTempFile(Uri fileUri) throws IOException {
        // Create temp file in cache directory
        File cacheDir = new File(activity.getCacheDir(), "uploads");
        if (!cacheDir.exists()) {
            cacheDir.mkdirs();
        }
        
        String fileName = getFileName(fileUri);
        if (fileName == null) {
            fileName = "upload_" + System.currentTimeMillis();
        }
        
        File tempFile = new File(cacheDir, fileName);
        
        // Copy content from URI to temp file
        try (InputStream inputStream = activity.getContentResolver().openInputStream(fileUri);
             FileOutputStream outputStream = new FileOutputStream(tempFile)) {
            
            if (inputStream == null) {
                return null;
            }
            
            byte[] buffer = new byte[4096];
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, bytesRead);
            }
        }
        
        return tempFile;
    }
    
    // ============================================================
    // GET FILE NAME FROM URI
    // ============================================================
    private String getFileName(Uri fileUri) {
        String result = null;
        
        if (fileUri.getScheme().equals("content")) {
            Cursor cursor = activity.getContentResolver().query(fileUri, null, null, null, null);
            if (cursor != null) {
                try {
                    if (cursor.moveToFirst()) {
                        int columnIndex = cursor.getColumnIndexOrThrow(OpenableColumns.DISPLAY_NAME);
                        result = cursor.getString(columnIndex);
                    }
                } finally {
                    cursor.close();
                }
            }
        }
        
        if (result == null) {
            result = fileUri.getPath();
            int cut = result.lastIndexOf('/');
            if (cut != -1) {
                result = result.substring(cut + 1);
            }
        }
        
        return result;
    }
    
    // ============================================================
    // GET MIME TYPE FROM URI
    // ============================================================
    private String getMimeType(Uri fileUri) {
        String mimeType = null;
        
        if (fileUri.getScheme().equals("content")) {
            mimeType = activity.getContentResolver().getType(fileUri);
        } else {
            String fileExtension = MimeTypeMap.getFileExtensionFromUrl(fileUri.toString());
            if (fileExtension != null) {
                mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(fileExtension);
            }
        }
        
        return mimeType;
    }
    
    // ============================================================
    // UPLOAD TO SERVER
    // ============================================================
    private void uploadToServer(String authToken, MultipartBody.Part filePart) {
        apiService.uploadFile(authToken, filePart).enqueue(new Callback<ApiService.UploadResponse>() {
            @Override
            public void onResponse(Call<ApiService.UploadResponse> call, Response<ApiService.UploadResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    if (uploadCallback != null) {
                        uploadCallback.onSuccess(response.body().getFileUrl());
                    }
                } else {
                    String errorMsg = "Upload failed: " + response.code();
                    try {
                        if (response.errorBody() != null) {
                            errorMsg += " " + response.errorBody().string();
                        }
                    } catch (IOException e) {
                        // ignore
                    }
                    if (uploadCallback != null) {
                        uploadCallback.onError(errorMsg);
                    }
                }
            }
            
            @Override
            public void onFailure(Call<ApiService.UploadResponse> call, Throwable t) {
                Log.e(TAG, "Upload failure: " + t.getMessage());
                if (uploadCallback != null) {
                    uploadCallback.onError(t.getMessage());
                }
            }
        });
    }
    
    // ============================================================
    // UPDATE PROFILE IMAGE
    // ============================================================
    public void updateProfileImage(String imageUrl) {
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        if (user == null) {
            if (uploadCallback != null) {
                uploadCallback.onError("User not authenticated");
            }
            return;
        }
        
        user.getIdToken(true)
            .addOnCompleteListener(task -> {
                if (task.isSuccessful() && task.getResult() != null) {
                    String idToken = task.getResult().getToken();
                    String authToken = "Bearer " + idToken;
                    
                    Map<String, String> body = new HashMap<>();
                    body.put("profile_image_url", imageUrl);
                    
                    apiService.updateProfileImage(authToken, body).enqueue(new Callback<ApiService.ProfileResponse>() {
                        @Override
                        public void onResponse(Call<ApiService.ProfileResponse> call, Response<ApiService.ProfileResponse> response) {
                            if (response.isSuccessful()) {
                                if (uploadCallback != null) {
                                    uploadCallback.onSuccess(imageUrl);
                                }
                            } else {
                                if (uploadCallback != null) {
                                    uploadCallback.onError("Profile update failed: " + response.code());
                                }
                            }
                        }
                        
                        @Override
                        public void onFailure(Call<ApiService.ProfileResponse> call, Throwable t) {
                            if (uploadCallback != null) {
                                uploadCallback.onError(t.getMessage());
                            }
                        }
                    });
                } else {
                    if (uploadCallback != null) {
                        uploadCallback.onError("Failed to get auth token");
                    }
                }
            });
    }
    
    // ============================================================
    // GET USER FILES
    // ============================================================
    public void getUserFiles() {
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        if (user == null) {
            if (filesCallback != null) {
                filesCallback.onError("User not authenticated");
            }
            return;
        }
        
        user.getIdToken(true)
            .addOnCompleteListener(task -> {
                if (task.isSuccessful() && task.getResult() != null) {
                    String idToken = task.getResult().getToken();
                    String authToken = "Bearer " + idToken;
                    
                    apiService.getUserFiles(authToken).enqueue(new Callback<java.util.List<ApiService.FileInfo>>() {
                        @Override
                        public void onResponse(Call<java.util.List<ApiService.FileInfo>> call, Response<java.util.List<ApiService.FileInfo>> response) {
                            if (response.isSuccessful() && response.body() != null) {
                                if (filesCallback != null) {
                                    filesCallback.onSuccess(response.body());
                                }
                            } else {
                                if (filesCallback != null) {
                                    filesCallback.onError("Failed to get files: " + response.code());
                                }
                            }
                        }
                        
                        @Override
                        public void onFailure(Call<java.util.List<ApiService.FileInfo>> call, Throwable t) {
                            if (filesCallback != null) {
                                filesCallback.onError(t.getMessage());
                            }
                        }
                    });
                } else {
                    if (filesCallback != null) {
                        filesCallback.onError("Failed to get auth token");
                    }
                }
            });
    }
    
    // ============================================================
    // CALLBACKS
    // ============================================================
    public interface UploadCallback {
        void onSuccess(String fileUrl);
        void onError(String error);
    }
    
    public interface FilesCallback {
        void onSuccess(java.util.List<ApiService.FileInfo> files);
        void onError(String error);
    }
    
    private UploadCallback uploadCallback;
    private FilesCallback filesCallback;
    
    public void setUploadCallback(UploadCallback callback) {
        this.uploadCallback = callback;
    }
    
    public void setFilesCallback(FilesCallback callback) {
        this.filesCallback = callback;
    }
}
