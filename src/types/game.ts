import { PlayerRow, PublicQuestion, QuestionRow, RoomRow, RoomStatus } from "@/lib/supabase/types";

export interface PublicRoom {
  code: string;
  status: RoomStatus;
  category: string;
  numQuestions: number;
  secondsPerQuestion: number;
  currentQuestionIndex: number;
  questionStartedAt: string | null;
}

export interface PublicPlayer {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  connected: boolean;
}

export const CATEGORIES = [
  "General Knowledge",
  "History",
  "Politics",
  "Philosophy",
  "Geography",
  "Science",
  "Pop Culture",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** Broadcast event payloads sent over the room's realtime channel. */
export type RoomEvent =
  | { type: "player_joined"; player: PublicPlayer }
  | { type: "player_left"; playerId: string }
  | { type: "question"; room: PublicRoom; question: PublicQuestion }
  | { type: "scores"; players: PublicPlayer[] }
  | { type: "question_ended"; questionIndex: number; correctIndex: number; players: PublicPlayer[] }
  | { type: "game_finished"; players: PublicPlayer[] };

export function toPublicPlayer(p: PlayerRow): PublicPlayer {
  return {
    id: p.id,
    name: p.name,
    score: p.score,
    isHost: p.is_host,
    connected: p.connected,
  };
}

export function toPublicRoom(r: RoomRow): PublicRoom {
  return {
    code: r.code,
    status: r.status,
    category: r.category,
    numQuestions: r.num_questions,
    secondsPerQuestion: r.seconds_per_question,
    currentQuestionIndex: r.current_question_index,
    questionStartedAt: r.question_started_at,
  };
}

export function toPublicQuestion(q: QuestionRow): PublicQuestion {
  return {
    id: q.id,
    room_id: q.room_id,
    idx: q.idx,
    question: q.question,
    choices: q.choices,
    category: q.category,
    created_at: q.created_at,
  };
}
