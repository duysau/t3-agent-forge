/** Hai giọng đã chốt với backend (IMPLEMENTATION_PLAN §6.6). */
export const VOICES = [
  { id: "std_kimngan", label: "Nữ, miền Nam" },
  { id: "std_minhquang", label: "Nam" },
] as const;

export type VoiceId = (typeof VOICES)[number]["id"];

export const DEFAULT_VOICE_ID: VoiceId = VOICES[0].id;
