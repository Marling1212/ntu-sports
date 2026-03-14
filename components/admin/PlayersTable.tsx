"use client";

import { useState, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import toast, { Toaster } from "react-hot-toast";
import { Player, TeamMember, EventSlotTemplate, TeamBlackoutTemplate, EventDivision } from "@/types/database";
import BulkPlayerImport from "./BulkPlayerImport";
import BulkTeamMemberImport from "./BulkTeamMemberImport";
import { getEnabledFields, getFieldConfig, getCustomFields, getDefaultFieldConfig, type FieldConfig } from "@/lib/utils/fieldConfig";
import { useI18n } from "@/lib/i18n/context";


interface PlayersTableProps {
  eventId: string;
  initialPlayers: Player[];
  registrationType?: 'player' | 'team';
  initialBlackoutLimit?: number | null;
  initialCaptainBlackoutsOpen?: boolean;
  initialSlotTemplates?: EventSlotTemplate[];
  initialBlackoutTemplates?: TeamBlackoutTemplate[];
  divisions?: EventDivision[];
  defaultDivisionId?: string | null;
}

export default function PlayersTable({
  eventId,
  initialPlayers,
  registrationType = 'player',
  initialBlackoutLimit = null,
  initialCaptainBlackoutsOpen = false,
  initialSlotTemplates = [],
  initialBlackoutTemplates = [],
  divisions = [],
  defaultDivisionId = null,
}: PlayersTableProps) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [isAdding, setIsAdding] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [newPlayer, setNewPlayer] = useState<any>({ name: "", department: "", email: "", seed: "" });
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>(() => (defaultDivisionId || divisions[0]?.id) ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeed, setFilterSeed] = useState<string>("all");
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMember[]>>({});
  const [editingMember, setEditingMember] = useState<{ teamId: string; memberId?: string; name: string; jerseyNumber: string } | null>(null);
  const [showBulkMemberImport, setShowBulkMemberImport] = useState<Record<string, boolean>>({});
  const [enabledFields, setEnabledFields] = useState<FieldConfig[]>([]);
  const [blackoutLimit, setBlackoutLimit] = useState<string>(
    initialBlackoutLimit != null ? String(initialBlackoutLimit) : ""
  );
  const [captainBlackoutsOpen, setCaptainBlackoutsOpen] = useState<boolean>(initialCaptainBlackoutsOpen);
  const [blackoutTemplates, setBlackoutTemplates] = useState<TeamBlackoutTemplate[]>(initialBlackoutTemplates);
  const [expandedBlackout, setExpandedBlackout] = useState<string | null>(null);
  const [savingBlackoutLimit, setSavingBlackoutLimit] = useState(false);
  const [addingBlackoutForPlayer, setAddingBlackoutForPlayer] = useState<string | null>(null);
  const supabase = createClient();
  const { t } = useI18n();
  const WEEKDAY_LABELS = [t("admin.weekday0"), t("admin.weekday1"), t("admin.weekday2"), t("admin.weekday3"), t("admin.weekday4"), t("admin.weekday5"), t("admin.weekday6")];

  // Load field configuration
  useEffect(() => {
    const updateFields = () => {
      const fields = getEnabledFields(eventId);
      // Ensure at least name field is always included
      if (fields.length === 0 || !fields.some(f => f.key === 'name')) {
        const defaultConfig = getDefaultFieldConfig();
        const nameField = defaultConfig.find(f => f.key === 'name');
        if (nameField) {
          setEnabledFields([nameField]);
          return;
        }
      }
      setEnabledFields(fields);
    };
    
    updateFields();
    
    // Listen for storage changes (when bulk import updates config in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('player_field_config_') && e.key.includes(eventId)) {
        updateFields();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for custom event (when bulk import updates config in same tab)
    const handleConfigUpdate = () => updateFields();
    window.addEventListener('fieldConfigUpdated', handleConfigUpdate);
    
    // Also check periodically as fallback
    const interval = setInterval(updateFields, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('fieldConfigUpdated', handleConfigUpdate);
      clearInterval(interval);
    };
  }, [eventId]);

  useEffect(() => {
    setBlackoutLimit(initialBlackoutLimit != null ? String(initialBlackoutLimit) : "");
    setBlackoutTemplates(initialBlackoutTemplates);
    setCaptainBlackoutsOpen(initialCaptainBlackoutsOpen);
  }, [initialBlackoutLimit, initialBlackoutTemplates, initialCaptainBlackoutsOpen]);

  useEffect(() => {
    const id = (defaultDivisionId || divisions[0]?.id) ?? "";
    if (id) setSelectedDivisionId(id);
  }, [defaultDivisionId, divisions]);

  const handleSaveBlackoutLimit = async () => {
    setSavingBlackoutLimit(true);
    try {
      const parsed = blackoutLimit.trim() ? parseInt(blackoutLimit, 10) : null;
      if (parsed !== null && (isNaN(parsed) || parsed < 0)) {
        toast.error("請輸入有效數字");
        return;
      }
      const { error } = await supabase
        .from("events")
        .update({ blackout_limit: parsed, captain_blackouts_open: captainBlackoutsOpen })
        .eq("id", eventId);
      if (error) throw error;
      toast.success("已更新不可出賽設定");
    } catch (e: any) {
      toast.error(e?.message || "儲存失敗");
    } finally {
      setSavingBlackoutLimit(false);
    }
  };

  const handleAddBlackoutTemplate = async (playerId: string, slotTemplateId: string) => {
    const template = initialSlotTemplates.find((t) => t.id === slotTemplateId);
    if (!template) {
      toast.error("請選擇時段");
      return;
    }
    setAddingBlackoutForPlayer(playerId);
    try {
      const { data, error } = await supabase
        .from("team_blackout_templates")
        .insert({
          event_id: eventId,
          player_id: playerId,
          day_of_week: template.day_of_week,
          start_time: template.start_time,
          end_time: template.end_time,
        })
        .select()
        .single();
      if (error) throw error;
      setBlackoutTemplates((prev) => [...prev, data]);
      toast.success("已新增不可出賽時段");
    } catch (e: any) {
      toast.error(e?.message || "新增失敗");
    } finally {
      setAddingBlackoutForPlayer(null);
    }
  };

  const handleDeleteBlackoutTemplate = async (templateId: string) => {
    if (!confirm("確定要刪除此不可出賽時段嗎？")) return;
    try {
      const { error } = await supabase
        .from("team_blackout_templates")
        .delete()
        .eq("id", templateId);
      if (error) throw error;
      setBlackoutTemplates((prev) => prev.filter((t) => t.id !== templateId));
      toast.success("已刪除");
    } catch (e: any) {
      toast.error(e?.message || "刪除失敗");
    }
  };

  const blackoutsByPlayer = useMemo(() => {
    const map: Record<string, TeamBlackoutTemplate[]> = {};
    blackoutTemplates.forEach((t) => {
      if (!map[t.player_id]) map[t.player_id] = [];
      map[t.player_id].push(t);
    });
    return map;
  }, [blackoutTemplates]);

  /** 不可出賽下拉：同一「星期+時段」只顯示一項（不依場地分開），選一次即涵蓋該時段所有場地 */
  const uniqueSlotTemplatesForBlackout = useMemo(() => {
    const seen = new Set<string>();
    return initialSlotTemplates.filter((st) => {
      const key = `${st.day_of_week},${st.start_time},${st.end_time}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [initialSlotTemplates]);

  // Load team members for all teams
  useEffect(() => {
    if (registrationType === 'team') {
      loadTeamMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrationType, players]);

  const loadTeamMembers = async () => {
    const teamIds = players.filter(p => p.type === 'team').map(p => p.id);
    if (teamIds.length === 0) return;

    const { data } = await supabase
      .from("team_members")
      .select("*")
      .in("player_id", teamIds)
      .order("jersey_number", { ascending: true, nullsFirst: true })
      .order("name", { ascending: true });

    if (data) {
      const membersByTeam: Record<string, TeamMember[]> = {};
      data.forEach((member) => {
        if (!membersByTeam[member.player_id]) {
          membersByTeam[member.player_id] = [];
        }
        membersByTeam[member.player_id].push(member);
      });
      setTeamMembers(membersByTeam);
    }
  };

  // Filter players based on search and filters
  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      // Search query filter (name, department, email)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const name = player.name?.toLowerCase() || "";
        const department = player.department?.toLowerCase() || "";
        const email = player.email?.toLowerCase() || "";
        if (!name.includes(query) && !department.includes(query) && !email.includes(query)) {
          return false;
        }
      }

      // Seed filter
      if (filterSeed !== "all") {
        if (filterSeed === "seeded" && !player.seed) return false;
        if (filterSeed === "unseeded" && player.seed) return false;
      }

      return true;
    });
  }, [players, searchQuery, filterSeed]);

  const refreshPlayers = async () => {
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("event_id", eventId)
      .order("seed", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });
    
    if (data) {
      // Ensure custom_fields is always an object (not null)
      const normalizedData = data.map(player => ({
        ...player,
        custom_fields: player.custom_fields || {}
      }));
      setPlayers(normalizedData);
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const divisionId = defaultDivisionId ?? (divisions.length > 1 ? selectedDivisionId : divisions[0]?.id) ?? null;
    const playerData: any = {
      event_id: eventId,
      ...(divisionId ? { division_id: divisionId } : {}),
      name: newPlayer.name,
      email_opt_in: true,
      type: registrationType,
      custom_fields: {},
    };

    // Only add enabled fields - explicitly set each field
    enabledFields.forEach(field => {
      if (field.key === 'name') return; // Already set
      if (field.key === 'department') {
        // Only set if there's a value, otherwise explicitly set to null
        playerData.department = newPlayer.department?.trim() || null;
      } else if (field.key === 'email') {
        playerData.email = newPlayer.email?.trim() || null;
      } else if (field.key === 'seed') {
        // Handle seed: "0" means no seed (null), empty string also means null
        const seedValue = newPlayer.seed?.trim();
        if (seedValue && seedValue !== "0") {
          const parsed = parseInt(seedValue);
          playerData.seed = !isNaN(parsed) ? parsed : null;
        } else {
          playerData.seed = null;
        }
      } else {
        // Custom field - store in custom_fields JSON object
        const customValue = newPlayer[field.key];
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
    
    const { data, error } = await supabase
      .from("players")
      .insert(playerData)
      .select("*")
      .single();

    if (error) {
      toast.error(`Error: ${error.message}`);
    } else if (data) {
      // Ensure the returned data has all fields properly set
      const newPlayerData: Player = {
        ...data,
        department: data.department || null,
        email: data.email || null,
        seed: data.seed || null,
        custom_fields: data.custom_fields || {},
      };
      setPlayers([...players, newPlayerData]);
      // Reset form based on enabled fields
      const resetPlayer: any = { name: "", department: "", email: "", seed: "" };
      enabledFields.forEach(field => {
        if (field.key !== 'name') {
          resetPlayer[field.key] = "";
        }
      });
      setNewPlayer(resetPlayer);
      setIsAdding(false);
      const entityName = registrationType === 'team' ? 'Team' : 'Player';
      toast.success(`${entityName} added successfully!`);
    } else {
      toast.error("Failed to add player - no data returned");
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    const entityName = registrationType === 'team' ? 'team' : 'player';
    if (!confirm(`確定要刪除此${registrationType === 'team' ? '隊伍' : '選手'}嗎？`)) return;

    const { error } = await supabase
      .from("players")
      .delete()
      .eq("id", playerId);

    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      setPlayers(players.filter(p => p.id !== playerId));
      toast.success(`${registrationType === 'team' ? '隊伍' : '選手'}刪除成功！`);
    }
  };

  const handleAddTeamMember = async (teamId: string) => {
    if (!editingMember || !editingMember.name.trim()) {
      toast.error("請輸入球員名稱");
      return;
    }

    const memberData: any = {
      player_id: teamId,
      name: editingMember.name.trim(),
    };

    // Allow jersey number to be 0 - check if field has a value (including "0")
    if (editingMember.jerseyNumber !== undefined && editingMember.jerseyNumber !== null && editingMember.jerseyNumber !== '') {
      const jerseyNum = parseInt(editingMember.jerseyNumber);
      if (!isNaN(jerseyNum)) {
        memberData.jersey_number = jerseyNum;
      }
    }

    if (editingMember.memberId) {
      // Update existing member
      const { error } = await supabase
        .from("team_members")
        .update(memberData)
        .eq("id", editingMember.memberId);

      if (error) {
        toast.error(`Error: ${error.message}`);
      } else {
        await loadTeamMembers();
        setEditingMember(null);
        toast.success("球員更新成功！");
      }
    } else {
      // Add new member
      const { error } = await supabase
        .from("team_members")
        .insert(memberData)
        .select()
        .single();

      if (error) {
        toast.error(`Error: ${error.message}`);
      } else {
        await loadTeamMembers();
        setEditingMember(null);
        toast.success("球員添加成功！");
      }
    }
  };

  const handleDeleteTeamMember = async (memberId: string) => {
    if (!confirm("確定要刪除此球員嗎？")) return;

    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", memberId);

    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      await loadTeamMembers();
      toast.success("球員刪除成功！");
    }
  };

  const handleCaptainLink = async (player: Player) => {
    const cf = player.custom_fields ?? {};
    let token = typeof cf.captain_token === "string" ? cf.captain_token : null;
    if (!token) {
      token = crypto.randomUUID();
      const { error } = await supabase
        .from("players")
        .update({ custom_fields: { ...cf, captain_token: token } })
        .eq("id", player.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === player.id
            ? { ...p, custom_fields: { ...(p.custom_fields ?? {}), captain_token: token } }
            : p
        )
      );
    }
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/captain/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(!cf.captain_token ? t("admin.captainLink.generated") : t("admin.captainLink.copied"));
    } catch {
      toast.error(t("admin.captainLink.copyFailed"));
    }
  };

  const handleDeleteAll = async () => {
    const entityName = registrationType === 'team' ? '隊伍' : '選手';
    const confirmText = `⚠️ 確定要刪除所有 ${players.length} 個${entityName}嗎？\n\n這也會重置所有比賽和籤表資料！\n\n此操作無法復原！`;
    
    if (!confirm(confirmText)) return;
    
    // Double confirmation for safety
    if (!confirm(`⚠️ 最終確認：刪除所有${entityName}並重置所有比賽？`)) return;

    // First, delete round completion tracking
    await supabase
      .from("round_completion_announcements")
      .delete()
      .eq("event_id", eventId);

    // Second, delete all matches for this event
    const { error: matchesError } = await supabase
      .from("matches")
      .delete()
      .eq("event_id", eventId);

    if (matchesError) {
      toast.error(`Error deleting matches: ${matchesError.message}`);
      return;
    }

    // Then, delete all players
    const { error: playersError } = await supabase
      .from("players")
      .delete()
      .eq("event_id", eventId);

    if (playersError) {
      toast.error(`Error deleting players: ${playersError.message}`);
    } else {
      setPlayers([]);
      toast.success(`✅ 所有${entityName}和比賽已刪除！重新開始...`);
      
      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      
      {showBulkImport && (
        <div className="mb-6">
          <BulkPlayerImport 
            eventId={eventId} 
            registrationType={registrationType}
            onImportComplete={() => {
              setShowBulkImport(false);
              refreshPlayers();
            }}
          />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        {/* 不可出賽時段上限 + 開放隊長填寫 */}
        <div className="px-6 py-4 bg-amber-50 border-b border-amber-100">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="text-sm font-medium text-gray-800">{t('admin.registration.blackoutLimit')}</span>
            <input
              type="number"
              min={0}
              value={blackoutLimit}
              onChange={(e) => setBlackoutLimit(e.target.value)}
              className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green text-sm"
              placeholder="不限"
            />
            <button
              onClick={handleSaveBlackoutLimit}
              disabled={savingBlackoutLimit}
              className="bg-ntu-green text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {savingBlackoutLimit ? t('admin.registration.saving') : t('admin.registration.save')}
            </button>
            <span className="text-xs text-gray-500">{t('admin.registration.unlimited')}</span>
          </div>
          {registrationType === 'team' && (
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={captainBlackoutsOpen}
                  onChange={(e) => setCaptainBlackoutsOpen(e.target.checked)}
                  className="w-4 h-4 text-ntu-green border-gray-300 rounded focus:ring-ntu-green"
                />
                <span className="text-sm text-gray-800">{t('admin.captainBlackoutsOpen')}</span>
              </label>
              <span className={`text-xs px-2 py-0.5 rounded ${captainBlackoutsOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {captainBlackoutsOpen ? t('admin.captainBlackoutsOpenLabelOn') : t('admin.captainBlackoutsOpenLabelOff')}
              </span>
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
          {t('admin.registration.setBlackoutHint')}{" "}
          <a href={`/admin/${eventId}/scheduling#slot-templates`} className="text-ntu-green hover:underline">{t('admin.schedule')}</a>
          {" · "}
          <a href={`/admin/${eventId}/scheduling#auto-schedule`} className="text-ntu-green hover:underline">{t('admin.scheduling.autoSchedule')}</a>
        </div>

        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-ntu-green">
              {registrationType === 'team' ? t('admin.registration.titleTeam') : t('admin.registration.titlePlayer')}
            </h2>
            <div className="text-sm text-gray-500">
              {t('admin.registration.showingCount')} {filteredPlayers.length} / {players.length} {registrationType === 'team' ? t('admin.registration.teamsCount') : t('admin.registration.playersCount')}
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Search */}
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder={registrationType === 'team' ? t('admin.registration.searchTeam') : t('admin.registration.searchPlayer')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green text-sm"
              />
            </div>

            {/* Seed Filter */}
            <div>
              <select
                value={filterSeed}
                onChange={(e) => setFilterSeed(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green text-sm"
              >
                <option value="all">{registrationType === 'team' ? t('admin.registration.allTeams') : t('admin.registration.allPlayers')}</option>
                <option value="seeded">{t('admin.registration.seeded')}</option>
                <option value="unseeded">{t('admin.registration.unseeded')}</option>
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(searchQuery || filterSeed !== "all") && (
            <div className="mb-4">
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterSeed("all");
                }}
                className="text-sm text-ntu-green hover:underline"
              >
                ✕ {t('admin.registration.clearFilters')}
              </button>
            </div>
          )}

          <div className="flex justify-end items-center gap-3">
            {players.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-medium border-2 border-red-200 hover:bg-red-600 hover:text-white transition-colors"
              >
                🗑️ {t('admin.registration.deleteAll')}
              </button>
            )}
            <button
              onClick={() => setShowBulkImport(!showBulkImport)}
              className="bg-white text-ntu-green px-4 py-2 rounded-lg font-medium border-2 border-ntu-green hover:bg-ntu-green hover:text-white transition-colors"
            >
              {showBulkImport ? t('admin.registration.hide') : `📋 ${t('admin.registration.bulkImport')}`}
            </button>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="bg-ntu-green text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              {isAdding ? t('admin.cancel') : `+ ${registrationType === 'team' ? t('admin.registration.addTeam') : t('admin.registration.addPlayer')}`}
            </button>
          </div>
        </div>

        {isAdding && (
          <form onSubmit={handleAddPlayer} className="p-6 bg-gray-50 border-b border-gray-200">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-800 mb-3">
                {registrationType === 'team' ? t('admin.registration.addTeam') : t('admin.registration.addPlayer')}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {t('admin.registration.nameRequired')}
              </p>
              {divisions.length > 1 && (
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.registration.divisionLabel')}</label>
                  <select
                    value={selectedDivisionId}
                    onChange={(e) => setSelectedDivisionId(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ntu-green"
                  >
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name ? `${d.sport} – ${d.name}` : d.sport}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(enabledFields.length + 1, 5)} gap-4`}>
              {enabledFields.map((field) => {
                if (field.key === 'name') {
                  return (
                    <input
                      key={field.key}
                      type="text"
                      placeholder={registrationType === 'team' ? t('admin.registration.teamNamePlaceholder') : t('admin.registration.playerNamePlaceholder')}
                      value={newPlayer.name}
                      onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                      className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green focus:border-ntu-green"
                      required
                    />
                  );
                } else if (field.key === 'department') {
                  return (
                    <input
                      key={field.key}
                      type="text"
                      placeholder={t('admin.registration.departmentPlaceholder')}
                      value={newPlayer.department}
                      onChange={(e) => setNewPlayer({ ...newPlayer, department: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                    />
                  );
                } else if (field.key === 'email') {
                  return (
                    <input
                      key={field.key}
                      type="email"
                      placeholder={t('admin.registration.emailPlaceholder')}
                      value={newPlayer.email}
                      onChange={(e) => setNewPlayer({ ...newPlayer, email: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                    />
                  );
                } else if (field.key === 'seed') {
                  return (
                    <input
                      key={field.key}
                      type="number"
                      placeholder={t('admin.registration.seedPlaceholder')}
                      value={newPlayer.seed}
                      onChange={(e) => setNewPlayer({ ...newPlayer, seed: e.target.value })}
                      min="0"
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                    />
                  );
                } else {
                  // Custom field
                  return (
                    <input
                      key={field.key}
                      type="text"
                      placeholder={`${field.name}（選填）`}
                      value={newPlayer[field.key] || ""}
                      onChange={(e) => setNewPlayer({ ...newPlayer, [field.key]: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                    />
                  );
                }
              })}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-ntu-green text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity flex-1"
                >
                  {t('admin.registration.addButton')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setNewPlayer({ name: "", department: "", email: "", seed: "" });
                  }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  {t('admin.cancel')}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {enabledFields.map((field) => (
                  <th key={field.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {field.name}
                  </th>
                ))}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.registration.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.registration.blackouts')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {                filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={enabledFields.length + 3} className="px-6 py-12 text-center text-gray-500">
                    {players.length === 0 
                      ? t('admin.registration.noPlayersYet')
                      : t('admin.registration.noMatchSearch')}
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player) => {
                  const isTeam = player.type === 'team';
                  const isExpanded = expandedTeam === player.id;
                  const members = teamMembers[player.id] || [];
                  
                  return (
                    <>
                      <tr key={player.id} className="hover:bg-gray-50">
                        {enabledFields.length > 0 ? enabledFields.map((field) => {
                          if (field.key === 'name') {
                            return (
                              <td key={field.key} className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                <div className="flex items-center gap-2">
                                  {isTeam && (
                                    <button
                                      onClick={() => setExpandedTeam(isExpanded ? null : player.id)}
                                      className="text-ntu-green hover:text-ntu-green-dark"
                                    >
                                      {isExpanded ? '▼' : '▶'}
                                    </button>
                                  )}
                                  {player.name || "—"}
                                  {isTeam && (
                                    <span className="text-xs text-gray-500">
                                      ({members.length} 位球員)
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          } else if (field.key === 'department') {
                            const deptValue = player.department?.trim();
                            return (
                              <td key={field.key} className="px-6 py-4 whitespace-nowrap text-gray-600">
                                {deptValue ? deptValue : "—"}
                              </td>
                            );
                          } else if (field.key === 'email') {
                            const emailValue = player.email?.trim();
                            return (
                              <td key={field.key} className="px-6 py-4 whitespace-nowrap text-gray-600">
                                {emailValue ? emailValue : "—"}
                              </td>
                            );
                          } else if (field.key === 'seed') {
                            const seedValue = player.seed;
                            return (
                              <td key={field.key} className="px-6 py-4 whitespace-nowrap">
                                {seedValue !== null && seedValue !== undefined ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-ntu-green text-white">
                                    {seedValue}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                            );
                          } else {
                            // Custom field - read from custom_fields JSON object
                            const customValue = player.custom_fields?.[field.key];
                            const displayValue = customValue !== null && customValue !== undefined && customValue !== '' 
                              ? String(customValue) 
                              : null;
                            return (
                              <td key={field.key} className="px-6 py-4 whitespace-nowrap text-gray-600">
                                {displayValue ? displayValue : "—"}
                              </td>
                            );
                          }
                        }) : (
                          // Fallback: show at least name if no fields configured
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                            {player.name || "—"}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {player.eliminated_round ? (
                            <span className="text-red-600 text-sm">
                              Eliminated (R{player.eliminated_round})
                            </span>
                          ) : (
                            <span className="text-green-600 text-sm">Active</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setExpandedBlackout(expandedBlackout === player.id ? null : player.id)}
                            className="text-ntu-green hover:underline text-sm font-medium"
                          >
                            {t('admin.registration.setBlackoutShort')} ({(blackoutsByPlayer[player.id] || []).length})
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {isTeam && (
                              <button
                                type="button"
                                onClick={() => handleCaptainLink(player)}
                                className="text-ntu-green hover:text-ntu-green-dark hover:underline"
                              >
                                {(player.custom_fields as Record<string, unknown>)?.captain_token
                                  ? t("admin.captainLink.copy")
                                  : t("admin.captainLink.generate")}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeletePlayer(player.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              {t('admin.delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedBlackout === player.id && (
                        <tr>
                          <td colSpan={enabledFields.length + 3} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-3">
                              <h4 className="font-semibold text-gray-800 text-sm">{t('admin.registration.weeklyBlackouts')}</h4>
                              <ul className="space-y-2">
                                {(blackoutsByPlayer[player.id] || []).map((bt) => (
                                  <li key={bt.id} className="flex items-center justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
                                    <span className="text-sm text-gray-700">
                                      {WEEKDAY_LABELS[bt.day_of_week]} {bt.start_time.slice(0, 5)}–{bt.end_time.slice(0, 5)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteBlackoutTemplate(bt.id)}
                                      className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                      {t('admin.delete')}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                              {initialSlotTemplates.length > 0 ? (
                                <div className="flex flex-wrap items-center gap-2 pt-2">
                                  <select
                                    id={`blackout-slot-${player.id}`}
                                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ntu-green"
                                  >
                                    <option value="">{t('admin.registration.selectSlot')}</option>
                                    {uniqueSlotTemplatesForBlackout.map((st) => (
                                      <option key={st.id} value={st.id}>
                                        {WEEKDAY_LABELS[st.day_of_week]} {st.start_time.slice(0, 5)}–{st.end_time.slice(0, 5)}
                                        {st.code ? ` (${st.code})` : ""}
                                      </option>
                                    ))}
                                  </select>
                                  <span className="text-xs text-gray-500">同一時段選一次即涵蓋所有場地</span>
                                  <button
                                    type="button"
                                    disabled={addingBlackoutForPlayer === player.id}
                                    onClick={() => {
                                      const sel = document.getElementById(`blackout-slot-${player.id}`) as HTMLSelectElement;
                                      const v = sel?.value;
                                      if (v) {
                                        handleAddBlackoutTemplate(player.id, v);
                                        sel.value = "";
                                      } else {
                                        toast.error("請選擇時段");
                                      }
                                    }}
                                    className="bg-ntu-green text-white px-3 py-1.5 rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
                                  >
                                    {addingBlackoutForPlayer === player.id ? t('admin.registration.addButtonLoading') : t('admin.add')}
                                  </button>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-500 space-y-1">
                                  <p>{t('admin.registration.createTemplatesFirst')}</p>
                                  <a href={`/admin/${eventId}/scheduling#slot-templates`} className="text-ntu-green hover:underline block mt-1">前往排程頁建立時段模板 →</a>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      {isTeam && isExpanded && (
                        <tr>
                          <td colSpan={enabledFields.length + 3} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-gray-700">{t('admin.registration.teamMembers')}</h3>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setShowBulkMemberImport({ ...showBulkMemberImport, [player.id]: !showBulkMemberImport[player.id] })}
                                    className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:opacity-90"
                                  >
                                    {showBulkMemberImport[player.id] ? t('admin.registration.hide') : `📋 ${t('admin.registration.bulkImportMembers')}`}
                                  </button>
                                  <button
                                    onClick={() => setEditingMember({ teamId: player.id, name: "", jerseyNumber: "" })}
                                    className="text-sm bg-ntu-green text-white px-3 py-1 rounded hover:opacity-90"
                                  >
                                    + {t('admin.registration.addMember')}
                                  </button>
                                </div>
                              </div>
                              
                              {showBulkMemberImport[player.id] && (
                                <BulkTeamMemberImport
                                  teamId={player.id}
                                  onImportComplete={() => {
                                    loadTeamMembers();
                                    setShowBulkMemberImport({ ...showBulkMemberImport, [player.id]: false });
                                  }}
                                />
                              )}
                              
                              {editingMember && editingMember.teamId === player.id && (
                                <div className="bg-white p-4 rounded border border-gray-200">
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <input
                                      type="text"
                                      placeholder="球員名稱"
                                      value={editingMember.name}
                                      onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                                      className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-ntu-green"
                                    />
                                    <input
                                      type="number"
                                      placeholder={`${t('admin.registration.jerseyNumber')} (optional)`}
                                      min="0"
                                      value={editingMember.jerseyNumber}
                                      onChange={(e) => setEditingMember({ ...editingMember, jerseyNumber: e.target.value })}
                                      className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-ntu-green"
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleAddTeamMember(player.id)}
                                        className="flex-1 bg-ntu-green text-white px-3 py-2 rounded hover:opacity-90 text-sm"
                                      >
                                        {editingMember.memberId ? t('admin.edit') : t('admin.registration.addButton')}
                                      </button>
                                      <button
                                        onClick={() => setEditingMember(null)}
                                        className="flex-1 bg-gray-200 text-gray-700 px-3 py-2 rounded hover:bg-gray-300 text-sm"
                                      >
                                        {t('admin.cancel')}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {members.length === 0 ? (
                                <p className="text-gray-500 text-sm">{t('admin.registration.noMembersYet')}</p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        <th className="px-3 py-2 text-left">{t('admin.registration.jerseyNumber')}</th>
                                        <th className="px-3 py-2 text-left">{t('admin.scheduling.name')}</th>
                                        <th className="px-3 py-2 text-right">{t('admin.scheduling.actions')}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {members.map((member) => (
                                        <tr key={member.id} className="border-b border-gray-200">
                                          <td className="px-3 py-2">{member.jersey_number !== null && member.jersey_number !== undefined ? member.jersey_number : '—'}</td>
                                          <td className="px-3 py-2">{member.name}</td>
                                          <td className="px-3 py-2 text-right">
                                            <button
                                              onClick={() => setEditingMember({
                                                teamId: player.id,
                                                memberId: member.id,
                                                name: member.name,
                                                jerseyNumber: member.jersey_number?.toString() || ""
                                              })}
                                              className="text-blue-600 hover:text-blue-800 mr-3"
                                            >
                                              {t('admin.registration.edit')}
                                            </button>
                                            <button
                                              onClick={() => handleDeleteTeamMember(member.id)}
                                              className="text-red-600 hover:text-red-800"
                                            >
                                              {t('admin.delete')}
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {filteredPlayers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {players.length === 0 
                ? t('admin.registration.noPlayersYet')
                : t('admin.registration.noMatchSearch')}
            </div>
          ) : (
            filteredPlayers.map((player) => {
              const isTeam = player.type === 'team';
              const isExpanded = expandedTeam === player.id;
              const members = teamMembers[player.id] || [];
              
              return (
                <div key={player.id}>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {isTeam && (
                            <button
                              onClick={() => setExpandedTeam(isExpanded ? null : player.id)}
                              className="text-ntu-green hover:text-ntu-green-dark"
                            >
                              {isExpanded ? '▼' : '▶'}
                            </button>
                          )}
                          {enabledFields.find(f => f.key === 'seed' && f.enabled) && player.seed && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-ntu-green text-white">
                              Seed {player.seed}
                            </span>
                          )}
                          <span className="font-semibold text-gray-900">{player.name}</span>
                          {isTeam && (
                            <span className="text-xs text-gray-500">
                              ({members.length} 位球員)
                            </span>
                          )}
                        </div>
                        {enabledFields.find(f => f.key === 'department' && f.enabled) && player.department && (
                          <div className="text-sm text-gray-600">{player.department}</div>
                        )}
                        {enabledFields.find(f => f.key === 'email' && f.enabled) && player.email && (
                          <div className="text-xs text-gray-500 mt-1">{player.email}</div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {player.eliminated_round ? (
                          <span className="text-red-600 text-xs">
                            Eliminated (R{player.eliminated_round})
                          </span>
                        ) : (
                          <span className="text-green-600 text-xs">{t('admin.registration.active')}</span>
                        )}
                        <div className="flex gap-2">
                          {isTeam && (
                            <button
                              type="button"
                              onClick={() => handleCaptainLink(player)}
                              className="text-ntu-green hover:underline text-sm font-medium"
                            >
                              {(player.custom_fields as Record<string, unknown>)?.captain_token
                                ? t("admin.captainLink.copy")
                                : t("admin.captainLink.generate")}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeletePlayer(player.id)}
                            className="text-red-600 hover:text-red-900 text-sm font-medium"
                          >
                            {t('admin.delete')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {isTeam && isExpanded && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-2">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-semibold text-gray-700">{t('admin.registration.teamMembers')}</h3>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowBulkMemberImport({ ...showBulkMemberImport, [player.id]: !showBulkMemberImport[player.id] })}
                              className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:opacity-90"
                            >
                              {showBulkMemberImport[player.id] ? t('admin.registration.hide') : `📋 ${t('admin.registration.bulkImportMembers')}`}
                            </button>
                            <button
                              onClick={() => setEditingMember({ teamId: player.id, name: "", jerseyNumber: "" })}
                              className="text-sm bg-ntu-green text-white px-3 py-1 rounded hover:opacity-90"
                            >
                              + {t('admin.registration.addMember')}
                            </button>
                          </div>
                        </div>
                        
                        {showBulkMemberImport[player.id] && (
                          <BulkTeamMemberImport
                            teamId={player.id}
                            onImportComplete={() => {
                              loadTeamMembers();
                              setShowBulkMemberImport({ ...showBulkMemberImport, [player.id]: false });
                            }}
                          />
                        )}
                        
                        {editingMember && editingMember.teamId === player.id && (
                          <div className="bg-white p-3 rounded border border-gray-200">
                            <div className="space-y-2">
                              <input
                                type="text"
                                placeholder={t('admin.registration.playerNamePlaceholder')}
                                value={editingMember.name}
                                onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-ntu-green"
                              />
                              <input
                                type="number"
                                placeholder={`${t('admin.registration.jerseyNumber')} (optional)`}
                                min="0"
                                value={editingMember.jerseyNumber}
                                onChange={(e) => setEditingMember({ ...editingMember, jerseyNumber: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-ntu-green"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAddTeamMember(player.id)}
                                  className="flex-1 bg-ntu-green text-white px-3 py-2 rounded hover:opacity-90 text-sm"
                                >
                                  {editingMember.memberId ? '更新' : '添加'}
                                </button>
                                <button
                                  onClick={() => setEditingMember(null)}
                                  className="flex-1 bg-gray-200 text-gray-700 px-3 py-2 rounded hover:bg-gray-300 text-sm"
                                >
                                  取消
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {members.length === 0 ? (
                          <p className="text-gray-500 text-sm">尚無球員，點擊「添加球員」開始添加</p>
                        ) : (
                          <div className="space-y-2">
                            {members.map((member) => (
                              <div key={member.id} className="bg-white p-3 rounded border border-gray-200 flex justify-between items-center">
                                <div>
                                  <span className="font-medium">{member.name}</span>
                                  {member.jersey_number !== null && member.jersey_number !== undefined && (
                                    <span className="text-gray-500 ml-2">#{member.jersey_number}</span>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setEditingMember({
                                      teamId: player.id,
                                      memberId: member.id,
                                      name: member.name,
                                      jerseyNumber: member.jersey_number?.toString() || ""
                                    })}
                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                  >
                                    編輯
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTeamMember(member.id)}
                                    className="text-red-600 hover:text-red-800 text-sm"
                                  >
                                    刪除
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

