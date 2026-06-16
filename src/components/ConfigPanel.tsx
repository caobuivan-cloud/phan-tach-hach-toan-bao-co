import React, { useState, useEffect } from 'react';
import { ETLConfig } from '../types';
import { Settings, Plus, Trash2, RotateCcw, AlertCircle, Database } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'accounting_etl_config_v1';

const DEFAULT_CONFIG: ETLConfig = {
  dvcs: 'HANOI',
  tkCo: '13102',
  bophan: 'ADMICRO',
  suffixHopDong: 'AD',
  maGiaoDich: '2',
  maNgoaiTe: 'VND',
  tyGia: 1,
  tienToMaQuyen: 'BC',
  soChungTuBatDau: '000001',
  bankMappings: {
    'BIDV': '112130',
    'VCB': '112130',
    'TCB': '112150',
    'ACB': '112120',
    'MB': '112140',
  }
};

interface ConfigPanelProps {
  onConfigChange: (config: ETLConfig) => void;
}

export default function ConfigPanel({ onConfigChange }: ConfigPanelProps) {
  const [config, setConfig] = useState<ETLConfig>(DEFAULT_CONFIG);
  const [newBank, setNewBank] = useState('');
  const [newAccount, setNewAccount] = useState('');
  const [expanded, setExpanded] = useState(true);

  // Load configuration from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Deep merge defaults to prevent empty fields
        const merged: ETLConfig = {
          ...DEFAULT_CONFIG,
          ...parsed,
          bankMappings: {
            ...DEFAULT_CONFIG.bankMappings,
            ...(parsed.bankMappings || {})
          }
        };
        setConfig(merged);
        onConfigChange(merged);
      } catch (e) {
        // Safe fallback
        setConfig(DEFAULT_CONFIG);
        onConfigChange(DEFAULT_CONFIG);
      }
    } else {
      onConfigChange(DEFAULT_CONFIG);
    }
  }, []);

  // Sync to parent and save to local storage when config changes
  const saveConfig = (updated: ETLConfig) => {
    setConfig(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    onConfigChange(updated);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updated = {
      ...config,
      [name]: name === 'tyGia' ? (parseFloat(value) || 0) : value
    };
    saveConfig(updated);
  };

  const handleAddBankMapping = () => {
    if (!newBank.trim() || !newAccount.trim()) return;
    const updatedMappings = {
      ...config.bankMappings,
      [newBank.trim().toUpperCase()]: newAccount.trim()
    };
    const updated = {
      ...config,
      bankMappings: updatedMappings
    };
    saveConfig(updated);
    setNewBank('');
    setNewAccount('');
  };

  const handleRemoveBankMapping = (key: string) => {
    const updatedMappings = { ...config.bankMappings };
    delete updatedMappings[key];
    const updated = {
      ...config,
      bankMappings: updatedMappings
    };
    saveConfig(updated);
  };

  const handleReset = () => {
    if (window.confirm('Bạn có chắc chắn muốn đặt lại toàn bộ cấu hình về mặc định không?')) {
      saveConfig(DEFAULT_CONFIG);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-800 overflow-hidden">
      {/* Sidebar Top Title Header */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Settings className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-blue-600 leading-none">VCC Accounting Tools</h1>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mt-1 block">Xử lý báo có V2.0</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-5 space-y-5 overflow-y-auto custom-scrollbar text-sm">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Thông số nghiệp vụ</p>
          <div className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Đơn vị cơ sở (ĐVCS)</label>
              <input
                id="input-cf-dvcs"
                type="text"
                name="dvcs"
                value={config.dvcs}
                onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all"
                placeholder="Ví dụ: HANOI"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Tài khoản Có</label>
                <input
                   id="input-cf-tkco"
                   type="text"
                   name="tkCo"
                   value={config.tkCo}
                   onChange={handleInputChange}
                   className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all"
                   placeholder="13102"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Bộ phận</label>
                <input
                  id="input-cf-bophan"
                  type="text"
                  name="bophan"
                  value={config.bophan}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all"
                  placeholder="Ví dụ: ADMICRO"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Hậu tố HĐ</label>
                <input
                  id="input-cf-suffix"
                  type="text"
                  name="suffixHopDong"
                  value={config.suffixHopDong}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all"
                  placeholder="AD"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Mã Giao dịch</label>
                <input
                  id="input-cf-giao-dich"
                  type="text"
                  name="maGiaoDich"
                  value={config.maGiaoDich}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all"
                  placeholder="2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Mã ngoại tệ</label>
                <input
                  id="input-cf-ngoai-te"
                  type="text"
                  name="maNgoaiTe"
                  value={config.maNgoaiTe}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all"
                  placeholder="VND"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Tỷ giá</label>
                <input
                  id="input-cf-ty-gia"
                  type="number"
                  name="tyGia"
                  step="any"
                  value={config.tyGia}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Tiền tố Mã quyển</label>
              <input
                id="input-cf-ma-quyen"
                type="text"
                name="tienToMaQuyen"
                value={config.tienToMaQuyen}
                onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all"
                placeholder="Ví dụ: BC"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider flex items-center justify-between">
                <span>Số CT bắt đầu</span>
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
              </label>
              <input
                id="input-cf-so-ct"
                type="text"
                name="soChungTuBatDau"
                value={config.soChungTuBatDau}
                onChange={handleInputChange}
                className="w-full bg-slate-50 border-l-4 border-l-blue-500 border border-slate-200 rounded-r-lg rounded-l-xs px-3 py-2 text-slate-800 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all"
                placeholder="Ví dụ: 000001"
              />
            </div>
          </div>
        </div>

        {/* Bank Mappings block in sidebar */}
        <div className="border-t border-slate-100 pt-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Bản đồ cấu hình</p>
            <button
              id="btn-config-reset"
              type="button"
              onClick={handleReset}
              className="text-[10px] font-bold text-red-500 hover:text-red-650 flex items-center gap-1 cursor-pointer transition-colors"
              title="Khôi phục mặc định"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 flex flex-col space-y-3 transition-all shadow-3xs">
            {/* Header of the Card */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 flex items-center justify-center text-emerald-650">
                  <Database className="w-4.5 h-4.5 text-emerald-600 fill-emerald-100/40" />
                </div>
                <span className="text-[11px] font-extrabold text-slate-700 tracking-wider">TÀI KHOẢN NỢ</span>
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">CHI TIẾT</span>
            </div>

            {/* Description */}
            <p className="text-[11px] text-slate-400 leading-relaxed font-normal">
              Ánh xạ từ viết tắt (Nhóm 2) sang Mã Tài khoản nợ tương ứng trên phiếu báo có.
            </p>

            {/* List of Mappings */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {Object.entries(config.bankMappings).map(([bank, account]) => (
                <div 
                  key={bank} 
                  className="flex items-center justify-between bg-white hover:bg-slate-100/55 border border-slate-200/60 rounded-xl px-2.5 py-1.5 transition-colors group"
                >
                  <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wide">{bank}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono text-[11px] font-extrabold px-2 py-0.5 rounded-lg">
                      {account}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBankMapping(bank)}
                      className="text-slate-400 hover:text-red-500 p-0.5 rounded hover:bg-red-50 transition-colors cursor-pointer"
                      title={`Xóa ${bank}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Side-by-side Inputs */}
            <div className="border-t border-slate-200 pt-2.5">
              <div className="flex gap-1.5 items-center">
                <input
                  id="input-new-bank"
                  type="text"
                  value={newBank}
                  onChange={(e) => setNewBank(e.target.value)}
                  placeholder="VCB"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddBankMapping(); }}
                  className="w-1/2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 font-bold uppercase placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-center"
                />
                <input
                  id="input-new-account"
                  type="text"
                  value={newAccount}
                  onChange={(e) => setNewAccount(e.target.value)}
                  placeholder="112130"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddBankMapping(); }}
                  className="w-1/2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 font-mono font-bold placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-center"
                />
                <button
                  id="btn-add-mapping"
                  type="button"
                  onClick={handleAddBankMapping}
                  className="h-7 w-7 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center cursor-pointer transition-colors shrink-0"
                  title="Thêm"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 bg-slate-50 shrink-0 border-t border-slate-100 text-[10px] text-center text-slate-400 select-none">
        <p>Enterprise Edition • Accounting ETL</p>
      </div>
    </div>
  );
}
