"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import toast, { Toaster } from "react-hot-toast";
import TiebreakerConfigEditor from "./TiebreakerConfigEditor";

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

interface EventData {
  name: string;
  sport: string;
  startDate: string;
  endDate: string;
  venue: string;
  description: string;
  tournamentType: string;
}

interface Game {
  id: string;
  name: string;
  code: string;
  icon: string | null;
  color: string | null;
  description: string | null;
  is_active: boolean;
  is_system: boolean;
}

export type SponsorTier = 'Gold' | 'Silver' | 'Bronze';

interface SponsorRow {
  id: string;
  event_id: string;
  name: string;
  logo_url?: string | null;
  website_url?: string | null;
  tier: SponsorTier;
}

interface EventDivisionRow {
  id: string;
  event_id: string;
  sport: string;
  name?: string | null;
  display_order: number;
  tournament_type?: string;
  registration_type?: string;
}

interface SettingsContentProps {
  eventId: string;
  eventName: string;
  initialEventData: EventData;
  initialRules: TournamentRule[];
  initialScheduleItems: ScheduleItem[];
  initialSponsors?: SponsorRow[];
  initialDivisions?: EventDivisionRow[];
  scheduleNotes: string;
  scheduleUpdatedAt: string;
  contactInfo: string;
  initialRegistrationType?: 'player' | 'team';
  initialIsVisible?: boolean;
  initialTiebreakerConfig?: unknown;
  tournamentType?: string;
}

export default function SettingsContent({ 
  eventId, 
  eventName,
  initialEventData,
  initialRules, 
  initialScheduleItems,
  initialSponsors = [],
  initialDivisions = [],
  scheduleNotes: initialScheduleNotes,
  scheduleUpdatedAt: initialScheduleUpdatedAt,
  contactInfo: initialContactInfo,
  initialRegistrationType = 'player',
  initialIsVisible = false,
  initialTiebreakerConfig,
  tournamentType: tournamentTypeProp,
}: SettingsContentProps) {
  const [rules, setRules] = useState<TournamentRule[]>(initialRules);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>(initialScheduleItems);
  const [sponsors, setSponsors] = useState<SponsorRow[]>(initialSponsors);
  const [scheduleNotes, setScheduleNotes] = useState<string>(initialScheduleNotes);
  const [scheduleUpdatedAt, setScheduleUpdatedAt] = useState<string>(initialScheduleUpdatedAt);
  const [contactInfo, setContactInfo] = useState<string>(initialContactInfo);
  const [registrationType, setRegistrationType] = useState<'player' | 'team'>(initialRegistrationType);
  const [isVisible, setIsVisible] = useState<boolean>(initialIsVisible);
  
  // Event metadata state
  const [eventData, setEventData] = useState<EventData>(initialEventData);
  
  // Sponsors modal state
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [editingSponsorId, setEditingSponsorId] = useState<string | null>(null);
  const [sponsorForm, setSponsorForm] = useState({ name: "", logoUrl: "", websiteUrl: "", tier: "Bronze" as SponsorTier });
  
  // Games management state
  const [games, setGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [newGame, setNewGame] = useState({ name: "", code: "", icon: "", color: "", description: "" });

  // Event divisions (multi-sport) state
  const [divisions, setDivisions] = useState<EventDivisionRow[]>(initialDivisions);
  const [editingDivisionId, setEditingDivisionId] = useState<string | null>(null);
  const [divisionForm, setDivisionForm] = useState({ name: "", tournamentType: "single_elimination", registrationType: "player" });
  const [showAddDivision, setShowAddDivision] = useState(false);
  const [newDivisionSport, setNewDivisionSport] = useState("");
  const [newDivisionSportOther, setNewDivisionSportOther] = useState("");
  const [newDivisionName, setNewDivisionName] = useState("");
  const [newDivisionTournamentType, setNewDivisionTournamentType] = useState("single_elimination");
  const [newDivisionRegistrationType, setNewDivisionRegistrationType] = useState("player");

  const COMMON_SPORTS = [
    { value: "tennis", label: "Tennis (網球)" },
    { value: "basketball", label: "Basketball (籃球)" },
    { value: "volleyball", label: "Volleyball (排球)" },
    { value: "badminton", label: "Badminton (羽球)" },
    { value: "soccer", label: "Soccer (足球)" },
    { value: "tabletennis", label: "Table Tennis (桌球)" },
    { value: "baseball", label: "Baseball (棒球)" },
    { value: "softball", label: "Softball (壘球)" },
    { value: "other", label: "Other (其他)" },
  ];

  const supabase = createClient();

  // Load games on mount (all sections are on one page)
  useEffect(() => {
    loadGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadGames = async () => {
    setLoadingGames(true);
    try {
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .order("is_system", { ascending: false })
        .order("name", { ascending: true });
      
      if (error) {
        // If table doesn't exist yet, just show empty list
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.warn("Games table not found - migration may not have been run yet");
          setGames([]);
          return;
        }
        throw error;
      }
      setGames(data || []);
    } catch (error: any) {
      console.error("Error loading games:", error);
      // Don't show error toast if table doesn't exist - just set empty array
      if (error.code !== '42P01' && !error.message?.includes('does not exist')) {
        toast.error(`Error loading games: ${error.message}`);
      }
      setGames([]);
    } finally {
      setLoadingGames(false);
    }
  };

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

  // Event Sponsors management
  const openAddSponsor = () => {
    setEditingSponsorId(null);
    setSponsorForm({ name: "", logoUrl: "", websiteUrl: "", tier: "Bronze" });
    setShowSponsorModal(true);
  };

  const openEditSponsor = (sponsor: SponsorRow) => {
    setEditingSponsorId(sponsor.id);
    setSponsorForm({
      name: sponsor.name,
      logoUrl: sponsor.logo_url || "",
      websiteUrl: sponsor.website_url || "",
      tier: sponsor.tier,
    });
    setShowSponsorModal(true);
  };

  const closeSponsorModal = () => {
    setShowSponsorModal(false);
    setEditingSponsorId(null);
    setSponsorForm({ name: "", logoUrl: "", websiteUrl: "", tier: "Bronze" });
  };

  const submitSponsorForm = () => {
    const name = sponsorForm.name.trim();
    if (!name) {
      toast.error("請填寫贊助商名稱");
      return;
    }
    const tier = sponsorForm.tier as SponsorTier;
    if (editingSponsorId) {
      setSponsors(sponsors.map((s) =>
        s.id === editingSponsorId
          ? { ...s, name, logo_url: sponsorForm.logoUrl || null, website_url: sponsorForm.websiteUrl || null, tier }
          : s
      ));
      toast.success("贊助商已更新");
    } else {
      setSponsors([
        ...sponsors,
        {
          id: `temp-${Date.now()}`,
          event_id: eventId,
          name,
          logo_url: sponsorForm.logoUrl || null,
          website_url: sponsorForm.websiteUrl || null,
          tier,
        },
      ]);
      toast.success("贊助商已加入列表");
    }
    closeSponsorModal();
  };

  const deleteSponsor = (id: string) => {
    setSponsors(sponsors.filter((s) => s.id !== id));
    toast.success("已從列表中移除");
  };

  const saveSponsors = async () => {
    try {
      await supabase.from("sponsors").delete().eq("event_id", eventId);

      const toInsert = sponsors.map((s) => ({
        event_id: eventId,
        name: s.name,
        logo_url: s.logo_url || null,
        website_url: s.website_url || null,
        tier: s.tier,
      }));

      if (toInsert.length > 0) {
        const { error } = await supabase.from("sponsors").insert(toInsert);
        if (error) throw error;
      }

      toast.success("Event sponsors saved!");
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

  const saveBasicInfo = async () => {
    try {
      // Check if there are existing players/teams
      const { data: existingPlayers, count } = await supabase
        .from("players")
        .select("*", { count: 'exact', head: true })
        .eq("event_id", eventId);

      if (count && count > 0 && registrationType !== initialRegistrationType) {
        const confirmMessage = `⚠️ 警告：您正在更改報名類型從「${initialRegistrationType === 'player' ? '選手' : '隊伍'}」改為「${registrationType === 'player' ? '選手' : '隊伍'}」。\n\n` +
          `目前已有 ${count} 個${initialRegistrationType === 'player' ? '選手' : '隊伍'}記錄。\n\n` +
          `此操作將：\n` +
          `- 更新所有現有記錄的類型\n` +
          `- 如果改為「隊伍」，現有選手將變為隊伍（需要手動添加成員）\n` +
          `- 如果改為「選手」，現有隊伍將變為選手（團隊成員資料將保留但不再顯示）\n\n` +
          `確定要繼續嗎？`;
        
        if (!confirm(confirmMessage)) {
          setRegistrationType(initialRegistrationType);
          return;
        }
      }

      // Format dates properly
      const startDate = eventData.startDate.includes('T') 
        ? eventData.startDate 
        : `${eventData.startDate}T08:00:00`;
      const endDate = eventData.endDate.includes('T')
        ? eventData.endDate
        : `${eventData.endDate}T18:00:00`;

      const { error } = await supabase
        .from("events")
        .update({
          name: eventData.name,
          sport: eventData.sport,
          start_date: startDate,
          end_date: endDate,
          venue: eventData.venue,
          description: eventData.description || null,
          tournament_type: eventData.tournamentType,
          registration_type: registrationType,
          is_visible: isVisible
        })
        .eq("id", eventId);

      if (error) throw error;

      // If registration type changed, update all players' type
      if (registrationType !== initialRegistrationType) {
        const { error: updateError } = await supabase
          .from("players")
          .update({ type: registrationType })
          .eq("event_id", eventId);

        if (updateError) {
          console.error("Error updating players type:", updateError);
          toast.error("已更新事件類型，但更新現有記錄時發生錯誤。請手動檢查。");
        }
      }

      toast.success("基本資訊已保存！");
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  };

  const createGame = async () => {
    if (!newGame.name || !newGame.code) {
      toast.error("請填寫遊戲名稱和代碼");
      return;
    }

    try {
      const { error } = await supabase
        .from("games")
        .insert({
          name: newGame.name,
          code: newGame.code.toLowerCase(),
          icon: newGame.icon || null,
          color: newGame.color || null,
          description: newGame.description || null,
          is_system: false,
          is_active: true
        });

      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          toast.error("Games 表格尚未建立，請先執行資料庫遷移");
          return;
        }
        throw error;
      }

      toast.success("遊戲已創建！");
      setShowCreateGame(false);
      setNewGame({ name: "", code: "", icon: "", color: "", description: "" });
      loadGames();
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  };

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

  // Event divisions: edit
  const openEditDivision = (d: EventDivisionRow) => {
    setEditingDivisionId(d.id);
    setDivisionForm({
      name: d.name ?? "",
      tournamentType: d.tournament_type ?? "single_elimination",
      registrationType: d.registration_type ?? "player",
    });
  };
  const saveDivisionEdit = async () => {
    if (!editingDivisionId) return;
    try {
      const { error } = await supabase
        .from("event_divisions")
        .update({
          name: divisionForm.name || null,
          tournament_type: divisionForm.tournamentType,
          registration_type: divisionForm.registrationType,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingDivisionId);
      if (error) throw error;
      setDivisions(divisions.map((d) =>
        d.id === editingDivisionId
          ? { ...d, name: divisionForm.name || null, tournament_type: divisionForm.tournamentType, registration_type: divisionForm.registrationType }
          : d
      ));
      setEditingDivisionId(null);
      toast.success("已更新項目");
    } catch (e: any) {
      toast.error(e?.message ?? "更新失敗");
    }
  };
  const addDivision = async () => {
    const sport = (newDivisionSport === "other" ? newDivisionSportOther.trim() : newDivisionSport).toLowerCase();
    if (!sport) {
      toast.error("請選擇運動或輸入運動代碼");
      return;
    }
    if (divisions.some((d) => d.sport.toLowerCase() === sport)) {
      toast.error("此賽事已包含該運動項目，請選擇其他項目");
      return;
    }
    try {
      const maxOrder = divisions.length === 0 ? 0 : Math.max(...divisions.map((d) => d.display_order), 0);
      const { data: inserted, error } = await supabase
        .from("event_divisions")
        .insert({
          event_id: eventId,
          sport,
          name: newDivisionName.trim() || null,
          display_order: maxOrder + 1,
          tournament_type: newDivisionTournamentType,
          registration_type: newDivisionRegistrationType,
        })
        .select("id, event_id, sport, name, display_order, tournament_type, registration_type")
        .single();
      if (error) throw error;
      setDivisions([...divisions, inserted as EventDivisionRow]);
      setShowAddDivision(false);
      setNewDivisionSport("");
      setNewDivisionSportOther("");
      setNewDivisionName("");
      setNewDivisionTournamentType("single_elimination");
      setNewDivisionRegistrationType("player");
      toast.success("已新增項目");
    } catch (e: any) {
      toast.error(e?.message ?? "新增失敗");
    }
  };
  const deleteDivision = async (d: EventDivisionRow) => {
    if (!confirm(`確定要刪除此項目「${d.sport}${d.name ? " – " + d.name : ""}」？若有選手或比賽屬於此項目，將改為未分類。`)) return;
    try {
      await supabase.from("event_divisions").delete().eq("id", d.id);
      setDivisions(divisions.filter((x) => x.id !== d.id));
      toast.success("已刪除項目");
    } catch (e: any) {
      toast.error(e?.message ?? "刪除失敗");
    }
  };

  return (
    <>
      <Toaster position="top-right" />

      <div className="space-y-8">
      {/* 基本資訊 */}
      <div id="settings-basic" className="scroll-mt-24 bg-white rounded-xl shadow-md border border-gray-100 p-6">
          <h2 className="text-2xl font-semibold text-ntu-green mb-6">基本資訊設定</h2>
          
          <div className="space-y-6">
            {/* Event Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                賽事名稱 (Event Name) *
              </label>
              <input
                type="text"
                value={eventData.name}
                onChange={(e) => setEventData({ ...eventData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                placeholder="例如：NTU Tennis – 114 Freshman Cup"
              />
            </div>

            {/* Sport Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                運動類型 (Sport/Game) *
              </label>
              <select
                value={eventData.sport}
                onChange={(e) => setEventData({ ...eventData, sport: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              >
                <option value="tennis">Tennis (網球)</option>
                <option value="basketball">Basketball (籃球)</option>
                <option value="volleyball">Volleyball (排球)</option>
                <option value="badminton">Badminton (羽球)</option>
                <option value="soccer">Soccer (足球)</option>
                <option value="tabletennis">Table Tennis (桌球)</option>
                <option value="baseball">Baseball (棒球)</option>
                <option value="softball">Softball (壘球)</option>
                <option value="other">Other (其他)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                可在「運動/遊戲管理」標籤中查看和創建自訂運動類型
              </p>
            </div>

            {/* Tournament Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                賽事模式 (Tournament Type) *
              </label>
              <select
                value={eventData.tournamentType}
                onChange={(e) => setEventData({ ...eventData, tournamentType: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              >
                <option value="single_elimination">Single Elimination (單淘汰賽)</option>
                <option value="season_play">Season Play (賽季模式)</option>
              </select>
            </div>

            {/* Dates */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  開始日期 (Start Date) *
                </label>
                <input
                  type="date"
                  value={eventData.startDate.split('T')[0] || ''}
                  onChange={(e) => {
                    const time = eventData.startDate.includes('T') ? eventData.startDate.split('T')[1] : '08:00';
                    setEventData({ ...eventData, startDate: `${e.target.value}T${time}` });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  結束日期 (End Date) *
                </label>
                <input
                  type="date"
                  value={eventData.endDate.split('T')[0] || ''}
                  onChange={(e) => {
                    const time = eventData.endDate.includes('T') ? eventData.endDate.split('T')[1] : '18:00';
                    setEventData({ ...eventData, endDate: `${e.target.value}T${time}` });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                />
              </div>
            </div>

            {/* Venue */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                比賽場地 (Venue) *
              </label>
              <input
                type="text"
                value={eventData.venue}
                onChange={(e) => setEventData({ ...eventData, venue: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                placeholder="例如：國立台灣大學新生網球場（5-8場）"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                賽事描述 (Description)
              </label>
              <textarea
                value={eventData.description}
                onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                placeholder="賽事描述、規則或額外資訊..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                公開顯示 (Public Visibility)
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={(e) => setIsVisible(e.target.checked)}
                    className="w-5 h-5 text-ntu-green border-gray-300 rounded focus:ring-ntu-green"
                  />
                  <span className="text-sm text-gray-700">
                    {isVisible ? '顯示在公開網站上' : '隱藏在公開網站上'}
                  </span>
                </label>
                <span className={`text-xs px-2 py-1 rounded ${
                  isVisible 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {isVisible ? '✓ 可見' : '✗ 隱藏'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                隱藏的賽事不會在公開網站上顯示，但仍可在管理後台進行編輯和管理。
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                報名類型 (Registration Type) *
              </label>
              <select
                value={registrationType}
                onChange={(e) => setRegistrationType(e.target.value as 'player' | 'team')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              >
                <option value="player">選手 (Player) - 個人報名</option>
                <option value="team">隊伍 (Team) - 團隊報名</option>
              </select>
              <p className="text-xs text-gray-500 mt-2">
                {registrationType === 'team' 
                  ? '選擇「隊伍」時，您可以為每個隊伍添加個別球員的名稱與背號。'
                  : '選擇「選手」時，每個報名單位為個人。'}
              </p>
              {registrationType !== initialRegistrationType && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ 您已更改報名類型。保存後，所有現有記錄的類型也會相應更新。
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={saveBasicInfo}
                className="bg-ntu-green text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
              >
                💾 保存基本資訊
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <TiebreakerConfigEditor
            eventId={eventId}
            initialConfig={initialTiebreakerConfig as any}
            tournamentType={eventData.tournamentType || tournamentTypeProp}
          />
        </div>

      {/* 賽事項目／分組 (multi-sport event divisions) */}
      <div id="settings-divisions" className="scroll-mt-24 space-y-6">
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-ntu-green">賽事項目／分組</h2>
              <p className="text-sm text-gray-600 mt-1">建立賽事後可在此新增或刪除單一運動項目，並編輯名稱與賽制</p>
            </div>
            <button
              onClick={() => setShowAddDivision(true)}
              className="bg-ntu-green text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              ➕ 新增運動項目
            </button>
          </div>
          {divisions.length === 0 ? (
            <p className="text-gray-500">尚無項目，請點「新增運動項目」加入第一個運動。</p>
          ) : (
            <ul className="space-y-3">
              {divisions.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-4 py-2 px-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div>
                    <span className="font-medium text-gray-900">{d.sport}</span>
                    {d.name && <span className="text-gray-600 ml-2">– {d.name}</span>}
                    <span className="ml-2 text-xs text-gray-500">
                      {d.tournament_type === "season_play" ? "賽季" : "單淘汰"} · {d.registration_type === "team" ? "隊伍" : "個人"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditDivision(d)}
                      className="text-ntu-green text-sm font-medium hover:underline"
                    >
                      編輯
                    </button>
                    {divisions.length > 1 && (
                      <button
                        onClick={() => deleteDivision(d)}
                        className="text-red-600 text-sm font-medium hover:underline"
                        title="移除此運動項目"
                      >
                        刪除此項目
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Edit division modal */}
        {editingDivisionId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-ntu-green mb-4">編輯項目</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">顯示名稱（選填）</label>
                  <input
                    type="text"
                    value={divisionForm.name}
                    onChange={(e) => setDivisionForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="例：男子組"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">賽制</label>
                  <select
                    value={divisionForm.tournamentType}
                    onChange={(e) => setDivisionForm((f) => ({ ...f, tournamentType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="single_elimination">單淘汰</option>
                    <option value="season_play">賽季（分組＋季後賽）</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">報名類型</label>
                  <select
                    value={divisionForm.registrationType}
                    onChange={(e) => setDivisionForm((f) => ({ ...f, registrationType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="player">個人</option>
                    <option value="team">隊伍</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button onClick={() => setEditingDivisionId(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
                <button onClick={saveDivisionEdit} className="bg-ntu-green text-white px-4 py-2 rounded-lg hover:opacity-90">儲存</button>
              </div>
            </div>
          </div>
        )}

        {/* Add division modal */}
        {showAddDivision && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-ntu-green mb-4">新增運動項目</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">運動類型 *</label>
                  <select
                    value={newDivisionSport}
                    onChange={(e) => { setNewDivisionSport(e.target.value); setNewDivisionSportOther(""); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">請選擇</option>
                    {COMMON_SPORTS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                    {games.length > 0 && (
                      <>
                        <option disabled>── 運動／遊戲管理 ──</option>
                        {games.map((g) => (
                          <option key={g.id} value={g.code}>{g.name} ({g.code})</option>
                        ))}
                      </>
                    )}
                  </select>
                  {newDivisionSport === "other" && (
                    <input
                      type="text"
                      value={newDivisionSportOther}
                      onChange={(e) => setNewDivisionSportOther(e.target.value)}
                      placeholder="輸入運動代碼（英文小寫）"
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">顯示名稱（選填）</label>
                  <input
                    type="text"
                    value={newDivisionName}
                    onChange={(e) => setNewDivisionName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="例：女子組"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">賽制</label>
                  <select
                    value={newDivisionTournamentType}
                    onChange={(e) => setNewDivisionTournamentType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="single_elimination">單淘汰</option>
                    <option value="season_play">賽季（分組＋季後賽）</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">報名類型</label>
                  <select
                    value={newDivisionRegistrationType}
                    onChange={(e) => setNewDivisionRegistrationType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="player">個人</option>
                    <option value="team">隊伍</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button onClick={() => { setShowAddDivision(false); setNewDivisionSport(""); setNewDivisionSportOther(""); setNewDivisionName(""); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
                <button onClick={addDivision} className="bg-ntu-green text-white px-4 py-2 rounded-lg hover:opacity-90">新增</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 賽事規則 */}
      <div id="settings-rules" className="scroll-mt-24 bg-white rounded-xl shadow-md border border-gray-100 p-6">
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

      {/* Event Sponsors */}
      <div id="settings-sponsors" className="scroll-mt-24 bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-ntu-green">Event Sponsors</h2>
          <button
            onClick={openAddSponsor}
            className="bg-ntu-green text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            ➕ Add New Sponsor
          </button>
        </div>

        <div className="space-y-4 mb-6">
          {sponsors.length === 0 ? (
            <p className="text-gray-500">No sponsors yet. Click &quot;Add New Sponsor&quot; to add one.</p>
          ) : (
            sponsors.map((sponsor) => (
              <div
                key={sponsor.id}
                className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50"
              >
                {sponsor.logo_url ? (
                  <img
                    src={sponsor.logo_url}
                    alt={sponsor.name}
                    className="w-12 h-12 object-contain rounded"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-500 text-sm">
                    No logo
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{sponsor.name}</p>
                  <p className="text-sm text-gray-500">
                    Tier: {sponsor.tier}
                    {sponsor.website_url && (
                      <> · <a href={sponsor.website_url} target="_blank" rel="noopener noreferrer" className="text-ntu-green hover:underline">Website</a></>
                    )}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEditSponsor(sponsor)}
                    className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteSponsor(sponsor.id)}
                    className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={saveSponsors}
            className="bg-ntu-green text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            💾 Save Sponsors
          </button>
        </div>
      </div>

      {/* Sponsor modal */}
      {showSponsorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full my-8 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-xl font-semibold text-ntu-green">
                {editingSponsorId ? "Edit Sponsor" : "Add New Sponsor"}
              </h3>
              <button onClick={closeSponsorModal} className="text-gray-500 hover:text-gray-700 text-2xl">
                ×
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={sponsorForm.name}
                  onChange={(e) => setSponsorForm({ ...sponsorForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ntu-green"
                  placeholder="Sponsor name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo Link</label>
                <input
                  type="url"
                  value={sponsorForm.logoUrl}
                  onChange={(e) => setSponsorForm({ ...sponsorForm, logoUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ntu-green"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website Link</label>
                <input
                  type="url"
                  value={sponsorForm.websiteUrl}
                  onChange={(e) => setSponsorForm({ ...sponsorForm, websiteUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ntu-green"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tier</label>
                <select
                  value={sponsorForm.tier}
                  onChange={(e) => setSponsorForm({ ...sponsorForm, tier: e.target.value as SponsorTier })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ntu-green"
                >
                  <option value="Gold">Gold</option>
                  <option value="Silver">Silver</option>
                  <option value="Bronze">Bronze</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3 flex-shrink-0">
              <button
                onClick={closeSponsorModal}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={submitSponsorForm}
                className="flex-1 bg-ntu-green text-white py-2 rounded-lg font-semibold hover:opacity-90"
              >
                {editingSponsorId ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 比賽行程 */}
      <div id="settings-schedule" className="scroll-mt-24 space-y-6">
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

      {/* 運動/遊戲管理 */}
      <div id="settings-games" className="scroll-mt-24 space-y-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-ntu-green">運動/遊戲管理</h2>
                <p className="text-sm text-gray-600 mt-1">管理可用的運動類型，可創建自訂運動供賽事使用</p>
              </div>
              <button
                onClick={() => setShowCreateGame(true)}
                className="bg-ntu-green text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                ➕ 創建新運動
              </button>
            </div>

            {loadingGames ? (
              <div className="text-center py-8 text-gray-500">載入中...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {games.map((game) => (
                  <div
                    key={game.id}
                    className={`border rounded-lg p-4 ${
                      game.is_system ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{game.icon || '🎮'}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{game.name}</h3>
                        <p className="text-xs text-gray-500">代碼: {game.code}</p>
                      </div>
                      {game.is_system && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">系統</span>
                      )}
                    </div>
                    {game.description && (
                      <p className="text-sm text-gray-600 mb-2">{game.description}</p>
                    )}
                    {game.color && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">顏色:</span>
                        <div className={`w-6 h-6 rounded ${game.color}`}></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create Game Modal */}
          {showCreateGame && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full my-8 max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0 sticky top-0 bg-white rounded-t-xl">
                  <h3 className="text-xl font-semibold text-ntu-green">創建新運動</h3>
                  <button
                    onClick={() => {
                      setShowCreateGame(false);
                      setNewGame({ name: "", code: "", icon: "", color: "", description: "" });
                    }}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      名稱 (Name) *
                    </label>
                    <input
                      type="text"
                      value={newGame.name}
                      onChange={(e) => setNewGame({ ...newGame, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="例如：籃球"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      代碼 (Code) *
                    </label>
                    <input
                      type="text"
                      value={newGame.code}
                      onChange={(e) => setNewGame({ ...newGame, code: e.target.value.toLowerCase() })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
                      placeholder="例如：basketball"
                    />
                    <p className="text-xs text-gray-500 mt-1">小寫英文字母，用於內部識別</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      圖示 (Icon)
                    </label>
                    <input
                      type="text"
                      value={newGame.icon}
                      onChange={(e) => setNewGame({ ...newGame, icon: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="例如：🏀 (emoji)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      顏色 (Color Class)
                    </label>
                    <input
                      type="text"
                      value={newGame.color}
                      onChange={(e) => setNewGame({ ...newGame, color: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="例如：bg-orange-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Tailwind CSS 顏色類別</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      描述 (Description)
                    </label>
                    <textarea
                      value={newGame.description}
                      onChange={(e) => setNewGame({ ...newGame, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="運動描述..."
                    />
                  </div>

                </div>

                <div className="p-6 border-t border-gray-200 flex gap-3 flex-shrink-0 sticky bottom-0 bg-white rounded-b-xl">
                  <button
                    onClick={() => {
                      setShowCreateGame(false);
                      setNewGame({ name: "", code: "", icon: "", color: "", description: "" });
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300"
                  >
                    取消
                  </button>
                  <button
                    onClick={createGame}
                    className="flex-1 bg-ntu-green text-white py-2 rounded-lg font-semibold hover:opacity-90"
                  >
                    創建
                  </button>
                </div>
            </div>
          </div>
          )}
        </div>

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
      </div>
    </>
  );
}

