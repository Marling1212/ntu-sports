"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

interface BulkPlayerImportProps {
  eventId: string;
  onImportComplete: () => void;
  registrationType?: 'player' | 'team';
}

export default function BulkPlayerImport({ eventId, onImportComplete, registrationType = 'player' }: BulkPlayerImportProps) {
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

        // Detect email pattern
        const isEmail = (v?: string) => !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

        // Flexible mapping supports (examples):
        // - [name]
        // - [name, email]
        // - [name, department]
        // - [name, department, seed]
        // - [name, department, email]
        // - [name, department, email, seed] or [name, department, seed, email]
        const name = parts[0];
        let department: string | null = null;
        let email: string | null = null;
        let seed: number | null = null;

        for (let i = 1; i < parts.length; i++) {
          const token = parts[i];
          if (!token) continue;
          if (email === null && isEmail(token)) {
            email = token;
            continue;
          }
          if (seed === null && !isNaN(Number(token))) {
            seed = parseInt(token);
            continue;
          }
          if (department === null) {
            department = token;
            continue;
          }
        }

        const player = {
          event_id: eventId,
          name,
          department,
          seed,
          email,
          email_opt_in: true,
          type: registrationType, // Set type based on registration type
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
      <h3 className="text-lg font-semibold text-ntu-green mb-4">
        Bulk Import {registrationType === 'team' ? 'Teams' : 'Players'}
      </h3>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          <strong>從 Excel 直接複製貼上即可！</strong> 或手動輸入：
        </p>
        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mb-3">
          <li><strong>格式 0:</strong> 姓名</li>
          <li><strong>格式 1:</strong> 姓名 [Tab] Email</li>
          <li><strong>格式 2:</strong> 姓名 [Tab] 科系</li>
          <li><strong>格式 3:</strong> 姓名 [Tab] 科系 [Tab] 種子序號</li>
          <li><strong>格式 4:</strong> 姓名 [Tab] 科系 [Tab] Email</li>
          <li><strong>格式 5:</strong> 姓名 [Tab] 科系 [Tab] Email [Tab] 種子序號</li>
          <li><strong>格式 6:</strong> 姓名, 科系, 種子序號（逗號分隔）</li>
          <li className="text-xs text-gray-500">Email 自動辨識（包含 @ 即視為 Email）。未提供則可稍後於管理介面補上。</li>
        </ul>
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer hover:text-ntu-green">顯示範例</summary>
          <pre className="bg-white p-2 rounded border border-gray-200 mt-2">
FC KimchiSushi	B09701140@ntu.edu.tw
管院聯隊	B12702080@ntu.edu.tw
凌晨前早去滾死蛋	r13525101@ntu.edu.tw
文學院足球隊	R14124002@ntu.edu.tw
工海	B13505021@ntu.edu.tw
電機一隊	B12901094@ntu.edu.tw
電機二隊	B12901088@ntu.edu.tw
          </pre>
        </details>
      </div>

      <textarea
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        rows={10}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green font-mono text-sm"
        placeholder={`直接從 Excel 複製貼上，或輸入：\n張一鳴\t資訊系\tzhangyi@example.com\t1\n李二虎\t電機系\tli2@example.com\n王三強\t機械系\t3\n...`}
      />

      <div className="mt-4 flex gap-3">
        <button
          onClick={handleImport}
          disabled={loading || !textInput.trim()}
          className="bg-ntu-green text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Importing..." : `Import ${registrationType === 'team' ? 'Teams' : 'Players'}`}
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

