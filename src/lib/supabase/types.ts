export type RoomStatus = "lobby" | "active" | "finished";

export interface RoomRow {
  id: string;
  code: string;
  host_token: string;
  status: RoomStatus;
  category: string;
  num_questions: number;
  seconds_per_question: number;
  current_question_index: number;
  question_started_at: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface PlayerRow {
  id: string;
  room_id: string;
  name: string;
  avatar: string;
  client_token: string;
  score: number;
  is_host: boolean;
  connected: boolean;
  joined_at: string;
}

export interface QuestionRow {
  id: string;
  room_id: string;
  idx: number;
  question: string;
  choices: string[];
  correct_index: number;
  category: string | null;
  topic: string;
  created_at: string;
}

export interface AnswerRow {
  id: string;
  room_id: string;
  question_id: string;
  player_id: string;
  choice_index: number;
  is_correct: boolean;
  time_ms: number;
  points_awarded: number;
  answered_at: string;
}

/**
 * Question shape sent to clients during active play — correct_index and
 * topic are both stripped server-side (topic doubles as a search term for
 * the correct answer, e.g. "Trolley problem", so it would spoil the
 * question if shown before it's answered).
 */
export type PublicQuestion = Omit<QuestionRow, "correct_index" | "topic">;
