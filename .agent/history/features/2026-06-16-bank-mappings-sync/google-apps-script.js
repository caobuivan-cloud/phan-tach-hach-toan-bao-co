/**
 * Google Apps Script - Web App để ghi nhận nhật ký hoạt động và đồng bộ cấu hình
 * 
 * Hướng dẫn deploy:
 * 1. Vào Google Drive -> Tạo/Mở file Google Sheets (Bảng tính) để lưu log.
 * 2. Chọn Tiện ích mở rộng (Extensions) -> Apps Script.
 * 3. Dán toàn bộ mã nguồn này vào trình biên tập mã.
 * 4. Nhấp Lưu (Save).
 * 5. Chọn Triển khai (Deploy) -> Triển khai mới (New deployment).
 * 6. Chọn Loại triển khai (Select type) là "Ứng dụng web" (Web app).
 * 7. Cấu hình:
 *    - Mô tả: "ETL Activity Logging and Config Sync"
 *    - Thực thi dưới danh nghĩa (Execute as): "Tôi" (Me - tài khoản của bạn)
 *    - Ai có quyền truy cập (Who has access): "Mọi người" (Anyone - để ứng dụng client có thể gọi ghi nhận log mà không cần login lại tài khoản Google)
 * 8. Chọn Deploy, cấp quyền truy cập nếu được yêu cầu, sau đó copy lấy URL Web App hiển thị.
 * 9. Dán URL Web App này vào ô cấu hình Google Sheets ở Sidebar VCC Accounting Tools.
 */

function doPost(e) {
  try {
    var jsonString = e.postData.contents;
    var data = JSON.parse(jsonString);
    
    // 1. Ghi nhận nhật ký hoạt động
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
    
    // 2. Đồng bộ lưu Bản đồ tài khoản nợ (save_bank_mappings)
    if (data.action === "save_bank_mappings") {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheetName = "BankMappings";
      var sheet = ss.getSheetByName(sheetName);
      
      // Tạo sheet mới nếu chưa có
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow(["Ngân Hàng", "Tài Khoản"]);
        sheet.getRange("A1:B1").setFontWeight("bold").setBackground("#F1F5F9");
        sheet.setFrozenRows(1);
      }
      
      // Xóa dữ liệu cũ (từ dòng 2 trở đi)
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, 2).clearContent();
      }
      
      // Ghi dữ liệu ánh xạ mới
      var mappings = data.mappings || {};
      var keys = Object.keys(mappings);
      
      if (keys.length > 0) {
        var rowsToWrite = [];
        for (var i = 0; i < keys.length; i++) {
          var bank = keys[i].trim().toUpperCase();
          var account = String(mappings[keys[i]]).trim();
          if (bank) {
            rowsToWrite.push([bank, account]);
          }
        }
        if (rowsToWrite.length > 0) {
          sheet.getRange(2, 1, rowsToWrite.length, 2).setValues(rowsToWrite);
        }
      }
      
      // Tự động ghi nhận một dòng log hệ thống
      var userEmail = data.user || "Kế toán viên";
      var logSheet = ss.getSheetByName("ActivityLogs");
      if (!logSheet) {
        logSheet = ss.insertSheet("ActivityLogs");
        logSheet.appendRow(["Thời gian", "Người dùng", "Hành động", "Chi tiết hoạt động"]);
        logSheet.getRange("A1:D1").setFontWeight("bold").setBackground("#F1F5F9");
        logSheet.setFrozenRows(1);
      }
      var formattedTimestamp = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
      logSheet.appendRow([
        formattedTimestamp,
        userEmail,
        "Đồng bộ Bản đồ tài khoản nợ",
        "Lưu đè cấu hình " + keys.length + " ánh xạ ngân hàng trên Google Sheet"
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Bank mappings updated successfully"
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
  try {
    var action = e.parameter.action;
    
    // Đọc cấu hình Bản đồ tài khoản nợ
    if (action === "get_bank_mappings") {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheetName = "BankMappings";
      var sheet = ss.getSheetByName(sheetName);
      
      // Tạo sheet mới và điền cấu hình mặc định nếu chưa tồn tại
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow(["Ngân Hàng", "Tài Khoản"]);
        sheet.getRange("A1:B1").setFontWeight("bold").setBackground("#F1F5F9");
        sheet.setFrozenRows(1);
        
        var defaults = [
          ["BIDV", "112130"],
          ["VCB", "112130"],
          ["TCB", "112150"],
          ["ACB", "112120"],
          ["MB", "112140"]
        ];
        for (var i = 0; i < defaults.length; i++) {
          sheet.appendRow(defaults[i]);
        }
      }
      
      var data = sheet.getDataRange().getValues();
      var mappings = {};
      
      // Bắt đầu đọc từ dòng thứ 2 (bỏ qua dòng tiêu đề)
      for (var i = 1; i < data.length; i++) {
        var bank = String(data[i][0]).trim().toUpperCase();
        var account = String(data[i][1]).trim();
        if (bank) {
          mappings[bank] = account;
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        mappings: mappings
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Google Apps Script Web App ghi nhật ký đang hoạt động bình thường!"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
