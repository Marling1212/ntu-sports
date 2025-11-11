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
  blackout_limit?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Organizer {
  id: string;
  user_id: string;
  event_id: string;
  role: 'owner' | 'organizer' | 'editor';
  created_at: string;
}

export interface Player {
  id: string;
  event_id: string;
  name: string;
  department?: string;
  seed?: number;
  eliminated_round?: number;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  event_id: string;
  round: number;
  match_number: number;
  player1_id?: string;
  player2_id?: string;
  score1?: string;
  score2?: string;
  winner_id?: string;
  court?: string;
  scheduled_time?: string;
  slot_id?: string;
  status: 'upcoming' | 'live' | 'completed';
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

