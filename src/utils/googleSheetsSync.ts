/**
 * CONTRACT: src/utils/googleSheetsSync.ts
 *
 * Trách nhiệm:
 * 1. Quản lý việc lưu, tải cấu hình Google Sheets (`SheetsConfig`) từ LocalStorage.
 * 2. Gửi request POST ghi log hoạt động người dùng tới Google Sheets Web App.
 * 3. Truy vấn tự động email người dùng hiện tại từ Firebase IndexedDB.
 *
 * Ràng buộc kỹ thuật & Giới hạn:
 * 1. KHÔNG được hardcode địa chỉ URL Web App (ngoại trừ giá trị mặc định của người dùng).
 * 2. Gửi request POST ghi log hoạt động người dùng tới Google Sheets Web App bằng mode "no-cors" để tránh lỗi CORS. KHÔNG được ném ngoại lệ lên UI thread khi gặp lỗi kết nối hoặc HTTP error (4xx/5xx). Mọi lỗi phải được bẫy cục bộ và hiển thị qua console.error.
 * 3. Bắt buộc kiểm tra giao thức URL (phải bắt đầu bằng http:// hoặc https://) trước khi gọi fetch.
 * 4. Hàm `writeActionLogToSheet` phải chạy bất đồng bộ phi tuần tự (fire-and-forget) để không block UI chính.
 */

export const STORAGE_KEYS = {
  WEB_APP_URL: "google_sheets_web_app_url",
  USER_NAME: "google_sheets_user_name",
  LOGS_ENABLED: "google_sheets_sync_logs",
};

export interface SheetsConfig {
  webAppUrl: string;
  userName: string;
  logsEnabled: boolean;
}

export function loadSheetsConfig(): SheetsConfig {
  return {
    webAppUrl: localStorage.getItem(STORAGE_KEYS.WEB_APP_URL) || "https://script.google.com/macros/s/AKfycbzkcc7_pTYK2K8GmjDR720MKnjjUGP-OMh5rzAkcDGB-y3XI3LQ07hCF_0LG155ykyd/exec",
    userName: localStorage.getItem(STORAGE_KEYS.USER_NAME) || "Kế toán viên",
    logsEnabled: localStorage.getItem(STORAGE_KEYS.LOGS_ENABLED) !== "false",
  };
}

export function saveSheetsConfig(config: Partial<SheetsConfig>): void {
  if (config.webAppUrl !== undefined) localStorage.setItem(STORAGE_KEYS.WEB_APP_URL, config.webAppUrl.trim());
  if (config.userName !== undefined) localStorage.setItem(STORAGE_KEYS.USER_NAME, config.userName.trim());
  if (config.logsEnabled !== undefined) localStorage.setItem(STORAGE_KEYS.LOGS_ENABLED, String(config.logsEnabled));
}

export async function writeActionLogToSheet(
  webAppUrl: string,
  userStr: string,
  actionName: string,
  actionDetails: string
): Promise<void> {
  if (!webAppUrl || (!webAppUrl.startsWith("http://") && !webAppUrl.startsWith("https://"))) return;
  try {
    await fetch(webAppUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "log",
        user: userStr,
        actionName,
        actionDetails
      })
    });
  } catch (err) {
    console.error("Failed to append activity logs:", err);
  }
}

export function getPortalUserEmail(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      if (typeof window === "undefined" || !window.indexedDB) {
        resolve(null);
        return;
      }
      const request = window.indexedDB.open("firebaseLocalStorageDb");
      request.onerror = () => resolve(null);
      request.onsuccess = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("firebaseLocalStorage")) {
          db.close();
          resolve(null);
          return;
        }
        try {
          const transaction = db.transaction(["firebaseLocalStorage"], "readonly");
          const store = transaction.objectStore("firebaseLocalStorage");
          const getAllRequest = store.getAll();
          getAllRequest.onsuccess = () => {
            const results = getAllRequest.result;
            db.close();
            if (Array.isArray(results)) {
              for (const item of results) {
                let userObj = item;
                if (item && item.value) {
                  userObj = item.value;
                }
                if (typeof userObj === "string") {
                  try {
                    userObj = JSON.parse(userObj);
                  } catch (e) {
                    continue;
                  }
                }
                if (userObj && userObj.email) {
                  resolve(userObj.email);
                  return;
                }
              }
            }
            resolve(null);
          };
          getAllRequest.onerror = () => {
            db.close();
            resolve(null);
          };
        } catch (e) {
          db.close();
          resolve(null);
        }
      };
    } catch (e) {
      resolve(null);
    }
  });
}

export async function pullBankMappingsFromGoogleSheet(webAppUrl: string): Promise<Record<string, string> | null> {
  if (!webAppUrl || (!webAppUrl.startsWith("http://") && !webAppUrl.startsWith("https://"))) return null;
  try {
    const response = await fetch(`${webAppUrl}?action=get_bank_mappings`);
    if (response.ok) {
      const result = await response.json();
      if (result && result.success && result.mappings) {
        return result.mappings;
      }
    }
  } catch (err) {
    console.error("Lỗi khi nạp Bản đồ tài khoản nợ từ Google Sheets:", err);
  }
  return null;
}

export async function pushBankMappingsToGoogleSheet(
  webAppUrl: string,
  mappings: Record<string, string>,
  userEmail: string
): Promise<void> {
  if (!webAppUrl || (!webAppUrl.startsWith("http://") && !webAppUrl.startsWith("https://"))) return;
  try {
    await fetch(webAppUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "save_bank_mappings",
        mappings,
        user: userEmail
      })
    });
  } catch (err) {
    console.error("Lỗi khi đồng bộ Bản đồ tài khoản nợ lên Google Sheets:", err);
  }
}
