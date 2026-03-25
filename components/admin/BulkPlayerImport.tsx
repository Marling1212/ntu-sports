"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import LoadingButton from "@/components/LoadingButton";
import { getFieldConfig, saveFieldConfig, getCustomFields, saveCustomFields, getDefaultFieldConfig, type FieldConfig } from "@/lib/utils/fieldConfig";

interface BulkPlayerImportProps {
  eventId: string;
  onImportComplete: () => void;
  registrationType?: 'player' | 'team';
  divisionId?: string | null;
}

interface ParsedPlayer {
  name: string;
  department?: string | null;
  email?: string | null;
  seed?: number | null;
  [key: string]: any; // For custom fields
}

export default function BulkPlayerImport({
  eventId,
  onImportComplete,
  registrationType = 'player',
  divisionId = null,
}: BulkPlayerImportProps) {
  const [step, setStep] = useState<'config' | 'import'>('config');
  const [textInput, setTextInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsedPlayers, setParsedPlayers] = useState<ParsedPlayer[]>([]);
  const [customFieldName, setCustomFieldName] = useState("");
  const supabase = createClient();

  // Load field configuration from storage
  const [fieldConfig, setFieldConfig] = useState<FieldConfig[]>(getDefaultFieldConfig());
  const [customFields, setCustomFields] = useState<FieldConfig[]>([]);

  useEffect(() => {
    // Load saved configuration
    const savedConfig = getFieldConfig(eventId);
    const savedCustomFields = getCustomFields(eventId);
    setFieldConfig(savedConfig);
    setCustomFields(savedCustomFields);
  }, [eventId]);

  const handleFieldToggle = (key: string) => {
    if (key === 'name') return; // Name cannot be disabled
    const newConfig = fieldConfig.map(field => 
      field.key === key ? { ...field, enabled: !field.enabled } : field
    );
    setFieldConfig(newConfig);
    saveFieldConfig(eventId, newConfig);
    // Notify other components
    window.dispatchEvent(new CustomEvent('fieldConfigUpdated'));
  };

  const handleAddCustomField = () => {
    if (!customFieldName.trim()) {
      toast.error("請輸入自訂欄位名稱");
      return;
    }
    if (customFields.some(f => f.key === customFieldName.trim().toLowerCase().replace(/\s+/g, '_'))) {
      toast.error("此欄位已存在");
      return;
    }
    const newCustomFields = [...customFields, {
      name: customFieldName.trim(),
      key: customFieldName.trim().toLowerCase().replace(/\s+/g, '_'),
      required: false,
      enabled: true,
    }];
    setCustomFields(newCustomFields);
    saveCustomFields(eventId, newCustomFields);
    window.dispatchEvent(new CustomEvent('fieldConfigUpdated'));
    setCustomFieldName("");
  };

  const handleRemoveCustomField = (key: string) => {
    const newCustomFields = customFields.filter(f => f.key !== key);
    setCustomFields(newCustomFields);
    saveCustomFields(eventId, newCustomFields);
    window.dispatchEvent(new CustomEvent('fieldConfigUpdated'));
  };

  const parseInput = () => {
    if (!textInput.trim()) {
      toast.error("請輸入資料");
      return;
    }

    const lines = textInput.trim().split('\n');
    const parsed: ParsedPlayer[] = [];
    const enabledFields = [...fieldConfig.filter(f => f.enabled), ...customFields.filter(f => f.enabled)];
    const fieldOrder = enabledFields.map(f => f.key);

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex].trim();
      if (!line) continue;

      // Support both comma and tab separators
      const separator = line.includes('\t') ? '\t' : ',';
      const parts = line.split(separator).map(p => p.trim());

      if (parts.length === 0) continue;

      const player: ParsedPlayer = {
        name: parts[0] || '',
      };

      // Map parts to fields based on enabled field order
      for (let i = 1; i < fieldOrder.length && i < parts.length; i++) {
        const fieldKey = fieldOrder[i];
        const value = parts[i];

        if (fieldKey === 'name') continue; // Already set

        if (fieldKey === 'email') {
          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (value && emailRegex.test(value)) {
            player.email = value;
          } else if (value) {
            // If value doesn't match email pattern, might be in wrong position
            // Try to detect if it's actually an email elsewhere
            for (let j = i + 1; j < parts.length; j++) {
              if (emailRegex.test(parts[j])) {
                player.email = parts[j];
                break;
              }
            }
          }
        } else if (fieldKey === 'seed') {
          const seedNum = parseInt(value);
          if (!isNaN(seedNum) && seedNum >= 0) {
            // Allow 0 to represent "no seed", will be converted to null when saving
            player.seed = seedNum === 0 ? null : seedNum;
          }
        } else if (fieldKey === 'department') {
          player.department = value || null;
        } else {
          // Custom field
          player[fieldKey] = value || null;
        }
      }

      // Additional email detection if email field is enabled but not found in position
      if (fieldConfig.find(f => f.key === 'email' && f.enabled) && !player.email) {
        for (let i = 1; i < parts.length; i++) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (emailRegex.test(parts[i])) {
            player.email = parts[i];
            break;
          }
        }
      }

      // Additional seed detection if seed field is enabled but not found in position
      if (fieldConfig.find(f => f.key === 'seed' && f.enabled) && player.seed === undefined) {
        for (let i = 1; i < parts.length; i++) {
          const seedNum = parseInt(parts[i]);
          if (!isNaN(seedNum) && seedNum >= 0 && parts[i] !== player.email) {
            // Allow 0 to represent "no seed", will be converted to null when saving
            player.seed = seedNum === 0 ? null : seedNum;
            break;
          }
        }
      }

      if (player.name) {
        parsed.push(player);
      }
    }

    if (parsed.length === 0) {
      toast.error("無法解析任何資料，請檢查格式");
      return;
    }

    setParsedPlayers(parsed);
    setStep('import');
    // Trigger storage event to notify other components
    window.dispatchEvent(new Event('storage'));
    toast.success(`成功解析 ${parsed.length} 筆資料，請檢查預覽`);
  };

  const handleImport = async () => {
    setLoading(true);

    try {
      const enabledFields = [...fieldConfig.filter(f => f.enabled), ...customFields.filter(f => f.enabled)];
      const players = parsedPlayers.map(player => {
        const playerData: any = {
          event_id: eventId,
          ...(divisionId ? { division_id: divisionId } : {}),
          name: player.name,
          type: registrationType,
          email_opt_in: true,
        };

        // Initialize custom_fields object
        if (!playerData.custom_fields) {
          playerData.custom_fields = {};
        }

        // Add enabled fields
        enabledFields.forEach(field => {
          if (field.key === 'name') return; // Already set
          if (field.key === 'department') {
            playerData.department = player.department || null;
          } else if (field.key === 'email') {
            playerData.email = player.email || null;
          } else if (field.key === 'seed') {
            // Convert 0 or null to null (no seed), otherwise use the seed number
            playerData.seed = (player.seed === 0 || player.seed === null || player.seed === undefined) ? null : player.seed;
          } else {
            // Custom field - store in custom_fields JSON object
            const customValue = player[field.key];
            if (customValue !== null && customValue !== undefined && customValue !== '') {
              // Try to parse as number if it looks like a number
              const numValue = typeof customValue === 'string' ? parseFloat(customValue) : customValue;
              if (!isNaN(numValue) && isFinite(numValue)) {
                playerData.custom_fields[field.key] = numValue;
              } else {
                playerData.custom_fields[field.key] = customValue;
              }
            }
          }
        });

        return playerData;
      });

      // Insert all players
      const { data, error } = await supabase
        .from("players")
        .insert(players)
        .select();

      if (error) {
        toast.error(`匯入錯誤: ${error.message}`);
        setLoading(false);
      } else {
        toast.success(`成功匯入 ${data.length} 筆${registrationType === 'team' ? '隊伍' : '選手'}資料！`);
        setTextInput("");
        setParsedPlayers([]);
        setStep('config');
        setLoading(false);
        onImportComplete();
      }
    } catch (err) {
      console.error(err);
      toast.error("匯入時發生錯誤");
      setLoading(false);
    }
  };

  const generateExample = () => {
    const enabledFields = [...fieldConfig.filter(f => f.enabled), ...customFields.filter(f => f.enabled)];
    const fieldNames = enabledFields.map(f => f.name);
    
    let example = "";
    if (fieldNames.length === 1) {
      example = "張一鳴\n李二虎\n王三強";
    } else if (fieldNames.length === 2) {
      example = "張一鳴\t資訊系\n李二虎\t電機系\n王三強\t機械系";
    } else if (fieldNames.length === 3) {
      if (fieldConfig.find(f => f.key === 'email' && f.enabled)) {
        example = "張一鳴\t資訊系\tzhang@example.com\n李二虎\t電機系\tli@example.com";
      } else {
        example = "張一鳴\t資訊系\t1\n李二虎\t電機系\t2";
      }
    } else {
      example = "張一鳴\t資訊系\tzhang@example.com\t1\n李二虎\t電機系\tli@example.com\t2";
    }
    setTextInput(example);
  };

  return (
    <div className="bg-white border-2 border-ntu-green rounded-lg p-6 shadow-lg">
      <h3 className="text-xl font-semibold text-ntu-green mb-4">
        📋 批量匯入 {registrationType === 'team' ? '隊伍' : '選手'}
      </h3>

      {step === 'config' ? (
        <div className="space-y-6">
          {/* Step 1: Field Selection */}
          <div>
            <h4 className="text-lg font-medium text-gray-800 mb-3">
              步驟 1：選擇要匯入的欄位
            </h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              {fieldConfig.map((field) => (
                <label
                  key={field.key}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                    field.enabled
                      ? 'bg-ntu-green/10 border-ntu-green'
                      : 'bg-white border-gray-200'
                  } ${field.required ? 'cursor-not-allowed opacity-75' : 'cursor-pointer hover:bg-gray-100'}`}
                >
                  <input
                    type="checkbox"
                    checked={field.enabled}
                    onChange={() => handleFieldToggle(field.key)}
                    disabled={field.required}
                    className="w-5 h-5 text-ntu-green focus:ring-ntu-green rounded"
                  />
                  <span className="flex-1 font-medium">
                    {field.name}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </span>
                  {field.required && (
                    <span className="text-xs text-gray-500">必填</span>
                  )}
                </label>
              ))}

              {/* Custom Fields */}
                    {customFields.map((field) => (
                      <div
                        key={field.key}
                        className="flex items-center gap-3 p-3 rounded-lg border-2 bg-ntu-green/10 border-ntu-green"
                      >
                        <input
                          type="checkbox"
                          checked={field.enabled}
                          onChange={() => {
                            const newCustomFields = customFields.map(f =>
                              f.key === field.key ? { ...f, enabled: !f.enabled } : f
                            );
                            setCustomFields(newCustomFields);
                            saveCustomFields(eventId, newCustomFields);
                            window.dispatchEvent(new CustomEvent('fieldConfigUpdated'));
                          }}
                          className="w-5 h-5 text-ntu-green focus:ring-ntu-green rounded"
                        />
                        <span className="flex-1 font-medium">{field.name}</span>
                        <button
                          onClick={() => handleRemoveCustomField(field.key)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          移除
                        </button>
                      </div>
                    ))}

              {/* Add Custom Field */}
              <div className="flex gap-2 pt-2 border-t border-gray-200">
                <input
                  type="text"
                  value={customFieldName}
                  onChange={(e) => setCustomFieldName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomField()}
                  placeholder="新增自訂欄位名稱..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green text-sm"
                />
                <button
                  onClick={handleAddCustomField}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors text-sm"
                >
                  新增
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: Input Data */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-lg font-medium text-gray-800">
                步驟 2：輸入或貼上資料
              </h4>
              <button
                onClick={generateExample}
                className="text-sm text-ntu-green hover:underline"
              >
                產生範例
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <p className="text-sm text-gray-600">
                <strong>提示：</strong>可從 Excel 直接複製貼上，支援 Tab 或逗號分隔
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>• 欄位順序應與上方選擇的欄位順序一致</p>
                <p>• 名稱欄位為第一欄（必填）</p>
                <p>• 其他欄位按選擇順序排列</p>
              </div>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={10}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green font-mono text-sm"
                placeholder="貼上或輸入資料，每行一筆..."
              />
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>
                  {textInput.trim() && `${textInput.trim().split('\n').filter(l => l.trim()).length} 行資料`}
                </span>
                <button
                  onClick={() => setTextInput("")}
                  className="text-gray-600 hover:text-gray-800"
                >
                  清除
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <LoadingButton
              onClick={parseInput}
              disabled={!textInput.trim()}
              variant="primary"
              className="flex-1"
            >
              解析資料
            </LoadingButton>
            <button
              onClick={() => onImportComplete()}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Step 3: Preview and Import */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-lg font-medium text-gray-800">
                步驟 3：檢查預覽並匯入
              </h4>
              <button
                onClick={() => {
                  setStep('config');
                  setParsedPlayers([]);
                }}
                className="text-sm text-ntu-green hover:underline"
              >
                返回修改設定
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-3">
                共解析出 <strong>{parsedPlayers.length}</strong> 筆資料，請檢查以下預覽：
              </p>
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left border-b">名稱</th>
                      {fieldConfig.find(f => f.key === 'department' && f.enabled) && (
                        <th className="px-3 py-2 text-left border-b">系所</th>
                      )}
                      {fieldConfig.find(f => f.key === 'email' && f.enabled) && (
                        <th className="px-3 py-2 text-left border-b">Email</th>
                      )}
                      {fieldConfig.find(f => f.key === 'seed' && f.enabled) && (
                        <th className="px-3 py-2 text-left border-b">種子（0=無）</th>
                      )}
                      {customFields.filter(f => f.enabled).map(field => (
                        <th key={field.key} className="px-3 py-2 text-left border-b">{field.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedPlayers.slice(0, 20).map((player, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2">{player.name || <span className="text-red-500">(缺少名稱)</span>}</td>
                        {fieldConfig.find(f => f.key === 'department' && f.enabled) && (
                          <td className="px-3 py-2">{player.department || '-'}</td>
                        )}
                        {fieldConfig.find(f => f.key === 'email' && f.enabled) && (
                          <td className="px-3 py-2">{player.email || '-'}</td>
                        )}
                        {fieldConfig.find(f => f.key === 'seed' && f.enabled) && (
                          <td className="px-3 py-2">{player.seed === null || player.seed === undefined ? '-' : player.seed === 0 ? '0 (無種子)' : player.seed}</td>
                        )}
                        {customFields.filter(f => f.enabled).map(field => (
                          <td key={field.key} className="px-3 py-2">{player[field.key] || '-'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedPlayers.length > 20 && (
                  <div className="p-2 text-xs text-gray-500 text-center border-t">
                    僅顯示前 20 筆，共 {parsedPlayers.length} 筆
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <LoadingButton
              onClick={handleImport}
              isLoading={loading}
              loadingText="匯入中..."
              variant="primary"
              className="flex-1"
            >
              確認匯入 {parsedPlayers.length} 筆資料
            </LoadingButton>
            <button
              onClick={() => {
                setStep('config');
                setParsedPlayers([]);
              }}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
