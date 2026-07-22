const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity

/** Generates a room code like "TRIVQ7XK" — `suffixLength` random characters after the "TRIV" prefix. */
export function generateRoomCode(suffixLength = 4): string {
  let code = "TRIV";
  for (let i = 0; i < suffixLength; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}
