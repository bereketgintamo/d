// ============================================================
// ANDROID: ApiService.java ADDITIONS
// Add these methods to your existing RetrofitClient.java interface
// ============================================================

import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import retrofit2.Call;
import retrofit2.http.*;
import java.util.List;
import java.util.Map;

public interface ApiService {
    
    // ============================================================
    // EXISTING METHODS (keep your current endpoints)
    // ============================================================
    // ... your existing Retrofit methods ...
    
    // ============================================================
    // NEW: FILE UPLOAD ENDPOINT
    // ============================================================
    @Multipart
    @POST("upload")
    Call<UploadResponse> uploadFile(
        @Header("Authorization") String authToken,
        @Part MultipartBody.Part file
    );
    
    // ============================================================
    // NEW: GET USER FILES ENDPOINT
    // ============================================================
    @GET("files")
    Call<List<FileInfo>> getUserFiles(
        @Header("Authorization") String authToken
    );
    
    // ============================================================
    // NEW: UPDATE PROFILE IMAGE ENDPOINT
    // ============================================================
    @PUT("user/profile-image")
    Call<ProfileResponse> updateProfileImage(
        @Header("Authorization") String authToken,
        @Body Map<String, String> body
    );
    
    // ============================================================
    // RESPONSE MODEL CLASSES
    // ============================================================
    
    // Upload response model
    public class UploadResponse {
        public String message;
        public String file_url;
        public String url;  // backward compatibility
        public String error;
        
        public String getFileUrl() {
            return file_url != null ? file_url : url;
        }
    }
    
    // File info model (for listing files)
    public class FileInfo {
        public String id;
        public String user_id;
        public String file_url;
        public String file_name;
        public String file_type;
        public String created_at;
    }
    
    // Profile update response model
    public class ProfileResponse {
        public String message;
        public String error;
    }
}