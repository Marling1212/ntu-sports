"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

interface BulkPlayerImportProps {
  eventId: string;
  onImportComplete: () => void;
}

export default function BulkPlayerImport({ eventId, onImportComplete }: BulkPlayerImportProps) {
  const [textInput, setTextInput] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleImport = async () => {
    setLoading(true);

    try {
      // Parse the input
      const lines = textInput.trim().split('\n');
      const players = [];

      for (const line of lines) {
        if (!line.trim()) continue;

        // Support both comma and tab separators
        const separator = line.includes('\t') ? '\t' : ',';
        const parts = line.split(separator).map(p => p.trim());
        
        const player = {
          event_id: eventId,
          name: parts[0],
          department: parts[1] || null,
          seed: parts[2] ? parseInt(parts[2]) : null,
        };

        if (player.name) {
          players.push(player);
        }
      }

      if (players.length === 0) {
        toast.error("No valid players found in input");
        setLoading(false);
        return;
      }

      // Insert all players
      const { data, error } = await supabase
        .from("players")
        .insert(players)
        .select();

      if (error) {
        toast.error(`Error: ${error.message}`);
        setLoading(false);
      } else {
        toast.success(`Successfully imported ${data.length} players!`);
        setTextInput("");
        setLoading(false);
        onImportComplete();
      }
    } catch (err) {
      console.error(err);
      toast.error("Error parsing input");
      setLoading(false);
    }
  };

  const exampleText = `張一鳴, NTU CE, 1
許九安, NTU CSIE
謝十全, NTU EE, 2
何十一, NTU ME`;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-ntu-green mb-4">Bulk Import Players</h3>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          <strong>從 Excel 直接複製貼上即可！</strong> 或手動輸入：
        </p>
        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mb-3">
          <li><strong>格式 1:</strong> 姓名 [Tab] 科系 [Tab] 種子序號</li>
          <li><strong>格式 2:</strong> 姓名 [Tab] 科系</li>
          <li><strong>格式 3:</strong> 姓名, 科系, 種子序號 (逗號分隔)</li>
        </ul>
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer hover:text-ntu-green">顯示範例</summary>
          <pre className="bg-white p-2 rounded border border-gray-200 mt-2">
楊子頤	生醫電資所碩一
陳柏禎	資訊碩二
張一鳴	資訊系	1
          </pre>
        </details>
      </div>

      <textarea
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        rows={10}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green font-mono text-sm"
        placeholder={`直接從 Excel 複製貼上，或輸入：\n張一鳴	資訊系	1\n李二虎	電機系	2\n王三強	機械系\n...`}
      />

      <div className="mt-4 flex gap-3">
        <button
          onClick={handleImport}
          disabled={loading || !textInput.trim()}
          className="bg-ntu-green text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Importing..." : "Import Players"}
        </button>
        
        <button
          onClick={() => setTextInput("")}
          className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
        >
          Clear
        </button>

        <div className="flex-1 text-right text-sm text-gray-500 self-center">
          {textInput.trim() && `${textInput.trim().split('\n').filter(l => l.trim()).length} lines`}
        </div>
      </div>
    </div>
  );
}

