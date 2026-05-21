// Lijst van leesbare Nederlandse woorden (3-5 letters, geen verwarrende combinaties)
const WORDS = [
  "kat", "hond", "vis", "kip", "muis", "vogel", "paard", "geit", "konijn",
  "boom", "bloem", "gras", "blad", "tak",
  "zon", "maan", "ster", "wolk", "regen", "sneeuw",
  "huis", "deur", "raam", "tafel", "stoel", "bed", "kast",
  "rood", "blauw", "groen", "geel", "wit", "zwart", "paars",
  "auto", "fiets", "bal", "boek", "pen", "tas",
  "water", "zout", "brood", "kaas", "appel", "peer", "druif",
  "berg", "zee", "rivier", "strand", "bos", "veld",
] as const;

const MIN_LENGTH = 8;

/**
 * Generate a readable temporary password.
 * Format: word-word-word-NN (e.g. "kat-vis-boom-42")
 */
export function generateReadablePassword(): string {
  const w1 = WORDS[Math.floor(Math.random() * WORDS.length)];
  const w2 = WORDS[Math.floor(Math.random() * WORDS.length)];
  const w3 = WORDS[Math.floor(Math.random() * WORDS.length)];
  const number = Math.floor(Math.random() * 90) + 10; // 10-99
  return `${w1}-${w2}-${w3}-${number}`;
}

/**
 * Validate password meets minimum requirements.
 * Returns null if valid, error message string otherwise.
 */
export function validatePassword(password: string): string | null {
  if (!password) return "Wachtwoord is verplicht.";
  if (password.length < MIN_LENGTH) {
    return `Wachtwoord moet minstens ${MIN_LENGTH} karakters bevatten.`;
  }
  return null;
}
