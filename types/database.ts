export interface Event {
  id: string;
  sport: string;
  name: string;
  start_date: string;
  end_date: string;
  venue: string;
  owner_id: string;
  description?: string;
  tournament_type?: 'single_elimination' | 'season_play';
  registration_type?: 'player' | 'team';
  blackout_limit?: number | null;
  bracket_generation_method?: 'auto' | 'manual' | 'imported' | null;
  bracket_generated_at?: string | null;
  bracket_locked?: boolean;
  tiebreaker_config?: TiebreakerConfig | null;
  created_at: string;
  updated_at: string;
}

/** Season play ranking: order of criteria + final tiebreaker. */
export interface TiebreakerConfig {
  /** Order of criteria (first to last). */
  order: TiebreakerCriteria[];
  /** When all criteria are tied. */
  final_tiebreaker: 'admin_decide' | 'alphabetical';
  points_win?: number;
  points_draw?: number;
  points_loss?: number;
}

/** 單一排名依據。Admin 可從「可用選項」中勾選要使用的項目並排順序。 */
export type TiebreakerCriteria =
  | 'points'
  | 'wins'
  | 'losses'
  | 'draws'
  | 'head_to_head'
  | 'goal_difference'
  | 'goals_for'
  | 'goals_against'
  | 'fair_play'
  | 'final';

export interface Organizer {
  id: string;
  user_id: string;
  event_id: string;
  role: 'owner' | 'organizer' | 'editor';
  created_at: string;
}

/** A sport/division within an event. One event can have multiple (multi-sport events). */
export interface EventDivision {
  id: string;
  event_id: string;
  sport: string;
  name?: string | null;
  display_order: number;
  tournament_type?: 'single_elimination' | 'season_play';
  registration_type?: 'player' | 'team';
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  event_id: string;
  division_id?: string | null;
  name: string;
  department?: string;
  seed?: number;
  eliminated_round?: number;
  email?: string;
  email_opt_in?: boolean;
  type?: 'player' | 'team';
  custom_fields?: Record<string, unknown>; // JSON object for custom field values
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  player_id: string;
  name: string;
  jersey_number?: number;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  event_id: string;
  division_id?: string | null;
  round: number;
  match_number: number;
  group_number?: number | null;
  player1_id?: string;
  player2_id?: string;
  score1?: string;
  score2?: string;
  winner_id?: string;
  court?: string;
  scheduled_time?: string;
  slot_id?: string;
  status: 'upcoming' | 'live' | 'completed' | 'bye' | 'delayed';
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  event_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_pinned?: boolean;
  pinned_order?: number | null;
}

export interface EventCourt {
  id: string;
  event_id: string;
  name: string;
  surface?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface EventSlot {
  id: string;
  event_id: string;
  court_id?: string;
  slot_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  capacity?: number;
  notes?: string;
  code?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamBlackout {
  id: string;
  event_id: string;
  player_id?: string;
  start_time: string;
  end_time: string;
  reason?: string;
  created_at: string;
  updated_at: string;
}

export interface EventSlotTemplate {
  id: string;
  event_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  court_id?: string;
  capacity?: number;
  notes?: string;
  code?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamBlackoutTemplate {
  id: string;
  event_id: string;
  player_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  reason?: string;
  created_at: string;
  updated_at: string;
}

export interface SportStatDefinition {
  id: string;
  sport: string;
  stat_name: string;
  stat_label: string;
  stat_type: 'number' | 'text' | 'boolean';
  stat_level?: 'team' | 'player';
  default_value?: string;
  display_order: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface MatchPlayerStat {
  id: string;
  match_id: string;
  player_id: string;
  team_member_id?: string;
  stat_name: string;
  stat_value?: string;
  created_at: string;
  updated_at: string;
}

export interface BracketEditHistory {
  id: string;
  event_id: string;
  admin_id: string;
  action: 'generate' | 'edit' | 'lock' | 'unlock' | 'save';
  changes?: Record<string, unknown>;
  reason?: string;
  created_at: string;
}

export type SponsorTier = 'Gold' | 'Silver' | 'Bronze';

export interface Sponsor {
  id: string;
  event_id: string;
  name: string;
  logo_url?: string | null;
  website_url?: string | null;
  tier: SponsorTier;
  created_at: string;
  updated_at: string;
}

