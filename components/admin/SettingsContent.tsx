"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast, { Toaster } from "react-hot-toast";

interface TournamentRule {
  id: string;
  event_id: string;
  order_number: number;
  content: string;
}

interface ScheduleItem {
  id: string;
  event_id: string;
  day_number: number;
  day_title: string;
  location: string;
  order_number: number;
  group_name: string;
  round_name: string;
  match_count: number;
  scheduled_time: string;
}

interface SettingsContentProps {
  eventId: string;
  eventName: string;
  initialRules: TournamentRule[];
  initialScheduleItems: ScheduleItem[];
  scheduleNotes: string;
  scheduleUpdatedAt: string;
  contactInfo: string;
}

export default function SettingsContent({ 
  eventId, 
  eventName,
  initialRules, 
  initialScheduleItems,
  scheduleNotes: initialScheduleNotes,
  scheduleUpdatedAt: initialScheduleUpdatedAt,
  contactInfo: initialContactInfo
}: SettingsContentProps) {
  const [rules, setRules] = useState<TournamentRule[]>(initialRules);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>(initialScheduleItems);
  const [scheduleNotes, setScheduleNotes] = useState<string>(initialScheduleNotes);
  const [scheduleUpdatedAt, setScheduleUpdatedAt] = useState<string>(initialScheduleUpdatedAt);
  const [contactInfo, setContactInfo] = useState<string>(initialContactInfo);
  const [activeTab, setActiveTab] = useState<"rules" | "schedule">("rules");
  const supabase = createClient();

  // Rules Management
  const addRule = () => {
    const newOrder = rules.length > 0 ? Math.max(...rules.map(r => r.order_number)) + 1 : 1;
    setRules([...rules, {
      id: `temp-${Date.now()}`,
      event_id: eventId,
      order_number: newOrder,
      content: ""
    }]);
  };

  const updateRule = (id: string, content: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, content } : r));
  };

  const deleteRule = async (id: string) => {
    if (!id.startsWith('temp-')) {
      const { error } = await supabase
        .from("tournament_rules")
        .delete()
        .eq("id", id);
      
      if (error) {
        toast.error(`Error: ${error.message}`);
        return;
      }
    }
    setRules(rules.filter(r => r.id !== id));
    toast.success("規則已刪除");
  };

  const saveRules = async () => {
    try {
      // Delete all existing rules
      await supabase
        .from("tournament_rules")
        .delete()
        .eq("event_id", eventId);

      // Insert new rules
      const rulesToInsert = rules
        .filter(r => r.content.trim() !== "")
        .map(r => ({
          event_id: eventId,
          order_number: r.order_number,
          content: r.content
        }));

      if (rulesToInsert.length > 0) {
        const { error } = await supabase
          .from("tournament_rules")
          .insert(rulesToInsert);

        if (error) throw error;
      }

      toast.success("賽事規則已保存！");
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  };

  // Get unique days
  const uniqueDays = [...new Set(scheduleItems.map(s => s.day_number))].sort();
  const maxDay = uniqueDays.length > 0 ? Math.max(...uniqueDays) : 0;

  // Schedule Management
  const addDay = () => {
    const newDayNumber = maxDay + 1;
    
    // Get the most recent group_name to use as default
    const recentGroupName = scheduleItems.length > 0 
      ? scheduleItems[scheduleItems.length - 1].group_name 
      : "";
    
    // Get the most recent location to use as default
    const recentLocation = scheduleItems.length > 0 
      ? scheduleItems[scheduleItems.length - 1].location 
      : "國立台灣大學新生網球場（5-8場）";
    
    setScheduleItems([...scheduleItems, {
      id: `temp-${Date.now()}`,
      event_id: eventId,
      day_number: newDayNumber,
      day_title: `第 ${newDayNumber} 天`,
      location: recentLocation,
      order_number: 1,
      group_name: recentGroupName,
      round_name: "",
      match_count: 0,
      scheduled_time: ""
    }]);
  };

  const removeDay = async (dayNumber: number) => {
    if (!confirm(`確定要刪除第 ${dayNumber} 天的所有賽程嗎？`)) return;
    
    // Delete from database
    const itemsToDelete = scheduleItems.filter(s => s.day_number === dayNumber && !s.id.startsWith('temp-'));
    for (const item of itemsToDelete) {
      await supabase
        .from("schedule_items")
        .delete()
        .eq("id", item.id);
    }
    
    // Remove from state
    setScheduleItems(scheduleItems.filter(s => s.day_number !== dayNumber));
    toast.success(`第 ${dayNumber} 天已刪除`);
  };

  const updateDayInfo = (dayNumber: number, field: 'day_title' | 'location', value: string) => {
    setScheduleItems(scheduleItems.map(s => 
      s.day_number === dayNumber ? { ...s, [field]: value } : s
    ));
  };

  const addScheduleItem = (dayNumber: number) => {
    const dayItems = scheduleItems.filter(s => s.day_number === dayNumber);
    const newOrder = dayItems.length > 0 ? Math.max(...dayItems.map(s => s.order_number)) + 1 : 1;
    const dayInfo = dayItems[0] || { day_title: `第 ${dayNumber} 天`, location: "國立台灣大學新生網球場（5-8場）" };
    
    // Get the most recent group_name to use as default
    const recentGroupName = dayItems.length > 0 
      ? dayItems[dayItems.length - 1].group_name 
      : (scheduleItems.length > 0 ? scheduleItems[scheduleItems.length - 1].group_name : "");
    
    setScheduleItems([...scheduleItems, {
      id: `temp-${Date.now()}`,
      event_id: eventId,
      day_number: dayNumber,
      day_title: dayInfo.day_title,
      location: dayInfo.location,
      order_number: newOrder,
      group_name: recentGroupName,
      round_name: "",
      match_count: 0,
      scheduled_time: ""
    }]);
  };

  const updateScheduleItem = (id: string, field: string, value: any) => {
    setScheduleItems(scheduleItems.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const deleteScheduleItem = async (id: string) => {
    if (!id.startsWith('temp-')) {
      const { error } = await supabase
        .from("schedule_items")
        .delete()
        .eq("id", id);
      
      if (error) {
        toast.error(`Error: ${error.message}`);
        return;
      }
    }
    setScheduleItems(scheduleItems.filter(s => s.id !== id));
    toast.success("賽程項目已刪除");
  };

  const saveSchedule = async () => {
    try {
      // Delete all existing schedule items
      await supabase
        .from("schedule_items")
        .delete()
        .eq("event_id", eventId);

      // Insert new schedule items
      const itemsToInsert = scheduleItems
        .filter(s => s.round_name.trim() !== "")
        .map(s => ({
          event_id: eventId,
          day_number: s.day_number,
          day_title: s.day_title,
          location: s.location,
          order_number: s.order_number,
          group_name: s.group_name,
          round_name: s.round_name,
          match_count: s.match_count,
          scheduled_time: s.scheduled_time
        }));

      if (itemsToInsert.length > 0) {
        const { error } = await supabase
          .from("schedule_items")
          .insert(itemsToInsert);

        if (error) throw error;
      }

      // Update schedule notes and contact info in events table
      const { error: notesError } = await supabase
        .from("events")
        .update({
          schedule_notes: scheduleNotes,
          schedule_updated_at: scheduleUpdatedAt,
          contact_info: contactInfo
        })
        .eq("id", eventId);

      if (notesError) throw notesError;

      toast.success("比賽行程已保存！");
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  };

  // Danger zone state for deleting event
  const [showDanger, setShowDanger] = useState(false);
  const [confirmAck, setConfirmAck] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [confirmId, setConfirmId] = useState(""); // will be used as 'DELETE' keyword
  const [deleting, setDeleting] = useState(false);

  const handleDeleteEvent = async () => {
    if (!confirmAck || confirmName !== eventName || confirmId !== "DELETE") {
      toast.error("請完成三項確認後再嘗試刪除");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmAck: true, confirmName, confirmPhrase: confirmId }),
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await res.text().catch(() => "");
        if (res.status === 401 || res.redirected) {
          throw new Error("未授權或登入已過期，請重新登入後再嘗試刪除。");
        }
        throw new Error(text || `刪除失敗（狀態碼 ${res.status}）`);
      }
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "刪除失敗");
      }
      toast.success("賽事已刪除，將返回控制台…");
      setTimeout(() => { window.location.href = "/admin/dashboard"; }, 1200);
    } catch (e: any) {
      toast.error(e?.message || "刪除失敗");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("rules")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "rules"
                ? "border-ntu-green text-ntu-green"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            📋 賽事規則
          </button>
          <button
            onClick={() => setActiveTab("schedule")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "schedule"
                ? "border-ntu-green text-ntu-green"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            📅 比賽行程
          </button>
        </nav>
      </div>

      {/* Rules Tab */}
      {activeTab === "rules" && (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-ntu-green">重要賽事規則</h2>
            <button
              onClick={addRule}
              className="bg-ntu-green text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              ➕ 新增規則
            </button>
          </div>

          <div className="space-y-4">
            {rules.map((rule, index) => (
              <div key={rule.id} className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-ntu-green text-white rounded-full flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <textarea
                  value={rule.content}
                  onChange={(e) => updateRule(rule.id, e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ntu-green focus:border-transparent"
                  rows={3}
                  placeholder="輸入規則內容... (支援 Markdown 連結：[文字](網址))"
                />
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={saveRules}
              className="bg-ntu-green text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              💾 保存規則
            </button>
          </div>
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === "schedule" && (
        <div className="space-y-6">
          {/* Top Action Buttons */}
          <div className="flex justify-between items-center">
            <button
              onClick={saveSchedule}
              className="bg-ntu-green text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              💾 保存行程與說明
            </button>
            <button
              onClick={addDay}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              ➕ 新增比賽日
            </button>
          </div>

          {/* Days */}
          {uniqueDays.map((dayNumber) => {
            const dayItems = scheduleItems.filter(s => s.day_number === dayNumber);
            const dayInfo = dayItems[0] || { day_title: `第 ${dayNumber} 天`, location: "" };
            
            return (
              <div key={dayNumber} className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold text-ntu-green">第 {dayNumber} 天</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => addScheduleItem(dayNumber)}
                        className="bg-ntu-green text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                      >
                        ➕ 新增賽程
                      </button>
                      <button
                        onClick={() => removeDay(dayNumber)}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                      >
                        🗑️ 刪除此天
                      </button>
                    </div>
                  </div>
                  
                  {/* Day Info */}
                  <div className="grid md:grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        日期標題
                      </label>
                      <input
                        type="text"
                        value={dayInfo.day_title}
                        onChange={(e) => updateDayInfo(dayNumber, 'day_title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        placeholder="例如：2025/11/8 (六)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        比賽地點
                      </label>
                      <input
                        type="text"
                        value={dayInfo.location}
                        onChange={(e) => updateDayInfo(dayNumber, 'location', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        placeholder="例如：國立台灣大學新生網球場（5-8場）"
                      />
                    </div>
                  </div>
                </div>

                {/* Schedule Items */}
                <div className="space-y-4">
                  {dayItems.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                          <input
                            type="text"
                            value={item.group_name}
                            onChange={(e) => updateScheduleItem(item.id, "group_name", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded"
                            placeholder="例如：1-64籤"
                          />
                          <p className="text-xs text-gray-500 mt-1">組別/籤號</p>
                        </div>
                        <div>
                          <input
                            type="text"
                            value={item.round_name}
                            onChange={(e) => updateScheduleItem(item.id, "round_name", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded"
                            placeholder="例如：八強 QF"
                          />
                          <p className="text-xs text-gray-500 mt-1">輪次（可寫文字）</p>
                        </div>
                        <div>
                          <input
                            type="number"
                            value={item.match_count}
                            onChange={(e) => updateScheduleItem(item.id, "match_count", parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded"
                            placeholder="場數"
                          />
                          <p className="text-xs text-gray-500 mt-1">比賽場數</p>
                        </div>
                        <div>
                          <input
                            type="text"
                            value={item.scheduled_time}
                            onChange={(e) => updateScheduleItem(item.id, "scheduled_time", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded"
                            placeholder="例如：NB 14:00"
                          />
                          <p className="text-xs text-gray-500 mt-1">賽程時間</p>
                        </div>
                        <button
                          onClick={() => deleteScheduleItem(item.id)}
                          className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 h-fit"
                        >
                          🗑️ 刪除
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {dayItems.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      尚無賽程，請點擊「新增賽程」按鈕
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {uniqueDays.length === 0 && (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-12 text-center">
              <p className="text-gray-500 text-lg mb-4">尚未建立任何比賽日</p>
              <p className="text-gray-400 text-sm">請點擊上方「新增比賽日」按鈕開始建立賽程</p>
            </div>
          )}

          {/* Schedule Notes */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <h2 className="text-2xl font-semibold text-ntu-green mb-6">賽程說明 Notes</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  說明內容
                </label>
                <textarea
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ntu-green focus:border-transparent"
                  rows={3}
                  placeholder="例如：NB = 不早於 (Not Before)"
                />
                <p className="mt-1 text-sm text-gray-500">
                  💡 支援 Markdown 語法：連結 [文字](網址)、粗體 **文字**
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  最後更新時間
                </label>
                <input
                  type="text"
                  value={scheduleUpdatedAt}
                  onChange={(e) => setScheduleUpdatedAt(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ntu-green focus:border-transparent"
                  placeholder="例如：2025/11/04"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  聯繫資訊
                </label>
                <textarea
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ntu-green focus:border-transparent"
                  rows={2}
                  placeholder="例如：如有任何疑問，請[聯繫大會](mailto:contact@example.com)或關注 [FB 粉專](https://facebook.com/ntutennis)。"
                />
                <p className="mt-1 text-sm text-gray-500">
                  💡 支援 Markdown 語法：連結 [文字](網址)、粗體 **文字**
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={saveSchedule}
              className="bg-ntu-green text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              💾 保存行程與說明
            </button>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="mt-10">
        <div className="bg-white rounded-xl border-2 border-red-300 p-6">
          <h3 className="text-xl font-semibold text-red-600 mb-2">Danger Zone</h3>
          <p className="text-sm text-red-600 mb-4">
            刪除此賽事將永久移除所有相關資料（選手、比賽、時段、場地、公告、賽程、黑名單等），且無法復原。請謹慎操作。
          </p>
          {!showDanger ? (
            <button
              onClick={() => setShowDanger(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              🗑️ 刪除整個賽事
            </button>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-700">
                <p className="mb-2 font-medium">請完成以下 3 項確認：</p>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={confirmAck} onChange={(e) => setConfirmAck(e.target.checked)} />
                  <span>我已了解此操作不可逆，且會永久刪除所有與本賽事相關的資料。</span>
                </label>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">輸入賽事名稱以確認（{eventName}）</label>
                <input
                  className="w-full max-w-[28rem] border rounded px-3 py-2"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder="請輸入完整賽事名稱"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">請輸入大寫 <strong>DELETE</strong> 以確認</label>
                <input
                  className="w-full max-w-[28rem] border rounded px-3 py-2 font-mono"
                  value={confirmId}
                  onChange={(e) => setConfirmId(e.target.value)}
                  placeholder="輸入 DELETE"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteEvent}
                  disabled={!confirmAck || deleting || confirmName !== eventName || confirmId !== "DELETE"}
                  className="bg-red-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
                >
                  {deleting ? "刪除中…" : "永久刪除此賽事"}
                </button>
                <button
                  onClick={() => { setShowDanger(false); setConfirmAck(false); setConfirmName(""); setConfirmId(""); }}
                  className="px-4 py-2 border rounded-md"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

