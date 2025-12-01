"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

interface BulkTeamMemberImportProps {
  teamId: string;
  onImportComplete: () => void;
}

export default function BulkTeamMemberImport({ teamId, onImportComplete }: BulkTeamMemberImportProps) {
  const [textInput, setTextInput] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleImport = async () => {
    setLoading(true);

    try {
      // Parse the input
      const lines = textInput.trim().split('\n');
      const members = [];

      for (const line of lines) {
        if (!line.trim()) continue;

        // Support both comma and tab separators
        const separator = line.includes('\t') ? '\t' : ',';
        const parts = line.split(separator).map(p => p.trim());

        // Format: [name] or [name, jersey_number]
        const name = parts[0];
        let jerseyNumber: number | null = null;

        // Allow jersey number to be 0 - check if the field exists (not empty after trimming)
        if (parts.length > 1 && parts[1] !== undefined && parts[1] !== null && parts[1].trim() !== '') {
          const num = parseInt(parts[1]);
          if (!isNaN(num)) {
            jerseyNumber = num;
          }
        }

        if (name) {
          members.push({
            player_id: teamId,
            name: name,
            jersey_number: jerseyNumber,
          });
        }
      }

      if (members.length === 0) {
        toast.error("沒有找到有效的球員資料");
        setLoading(false);
        return;
      }

      // Insert all members
      const { data, error } = await supabase
        .from("team_members")
        .insert(members)
        .select();

      if (error) {
        toast.error(`錯誤: ${error.message}`);
        setLoading(false);
      } else {
        toast.success(`成功匯入 ${data.length} 位球員！`);
        setTextInput("");
        setLoading(false);
        onImportComplete();
      }
    } catch (err) {
      console.error(err);
      toast.error("解析輸入時發生錯誤");
      setLoading(false);
    }
  };

  const exampleText = `張一鳴\t10
李二虎\t11
王三強\t12`;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-ntu-green mb-3">批量匯入隊伍成員</h4>
      
      <div className="mb-3">
        <p className="text-xs text-gray-600 mb-2">
          <strong>從 Excel 直接複製貼上即可！</strong> 或手動輸入：
        </p>
        <ul className="text-xs text-gray-600 list-disc list-inside space-y-1 mb-2">
          <li><strong>格式 1:</strong> 球員名稱</li>
          <li><strong>格式 2:</strong> 球員名稱 [Tab] 背號</li>
          <li><strong>格式 3:</strong> 球員名稱, 背號（逗號分隔）</li>
        </ul>
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer hover:text-ntu-green">顯示範例</summary>
          <pre className="bg-white p-2 rounded border border-gray-200 mt-2 text-xs">
{exampleText}
          </pre>
        </details>
      </div>

      <textarea
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        rows={6}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green font-mono text-sm"
        placeholder={`直接從 Excel 複製貼上，或輸入：\n張一鳴\t10\n李二虎\t11\n王三強\t12\n...`}
      />

      <div className="mt-3 flex gap-2">
        <button
          onClick={handleImport}
          disabled={loading || !textInput.trim()}
          className="bg-ntu-green text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
        >
          {loading ? "匯入中..." : "匯入球員"}
        </button>
        
        <button
          onClick={() => setTextInput("")}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors text-sm"
        >
          清除
        </button>

        <div className="flex-1 text-right text-xs text-gray-500 self-center">
          {textInput.trim() && `${textInput.trim().split('\n').filter(l => l.trim()).length} 行`}
        </div>
      </div>
    </div>
  );
}

