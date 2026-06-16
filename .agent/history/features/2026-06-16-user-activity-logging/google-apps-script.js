/**
 * Google Apps Script - Web App để ghi nhận nhật ký hoạt động
 * 
 * Hướng dẫn deploy:
 * 1. Vào Google Drive -> Tạo/Mở file Google Sheets (Bảng tính) để lưu log.
 * 2. Chọn Tiện ích mở rộng (Extensions) -> Apps Script.
 * 3. Dán toàn bộ mã nguồn này vào trình biên tập mã.
 * 4. Nhấp Lưu (Save).
 * 5. Chọn Triển khai (Deploy) -> Triển khai mới (New deployment).
 * 6. Chọn Loại triển khai (Select type) là "Ứng dụng web" (Web app).
 * 7. Cấu hình:
 *    - Mô tả: "ETL Activity Logging"
 *    - Thực thi dưới danh nghĩa (Execute as): "Tôi" (Me - tài khoản của bạn)
 *    - Ai có quyền truy cập (Who has access): "Mọi người" (Anyone - để ứng dụng client có thể gọi ghi nhận log mà không cần login lại tài khoản Google)
 * 8. Chọn Deploy, cấp quyền truy cập nếu được yêu cầu, sau đó copy lấy URL Web App hiển thị.
 * 9. Dán URL Web App này vào ô cấu hình Google Sheets ở Sidebar VCC Accounting Tools.
 */

function doPost(e) {
  try {
    var jsonString = e.postData.contents;
    var data = JSON.parse(jsonString);
    
    if (data.action === "log") {
      var user = typeof data.user === "string" && data.user.trim().length > 0 ? data.user.trim() : "Kế toán viên";
      var actionName = typeof data.actionName === "string" ? data.actionName.trim() : "";
      var actionDetails = typeof data.actionDetails === "string" ? data.actionDetails.trim() : "";
      
      // Định dạng thời gian GMT+7
      var formattedTimestamp = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
      
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheetName = "ActivityLogs";
      var sheet = ss.getSheetByName(sheetName);
      
      // Tạo sheet mới nếu chưa có
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow(["Thời gian", "Người dùng", "Hành động", "Chi tiết hoạt động"]);
        // Format header
        sheet.getRange("A1:D1").setFontWeight("bold").setBackground("#F1F5F9");
        sheet.setFrozenRows(1);
      }
      
      // Append dòng nhật ký mới
      sheet.appendRow([
        formattedTimestamp,
        user,
        actionName,
        actionDetails
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        rowInserted: sheet.getLastRow(),
        message: "Log recorded successfully"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: "Yêu cầu hành động không hợp lệ" 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Thêm hàm doGet để hỗ trợ test nhanh trên browser khi deploy
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: "Google Apps Script Web App ghi nhật ký đang hoạt động bình thường!"
  })).setMimeType(ContentService.MimeType.JSON);
}
