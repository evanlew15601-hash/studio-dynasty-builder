import type { FilmContentRating, ScriptCharacteristics } from "@/types/game";

export type ContentKnobs = NonNullable<ScriptCharacteristics["content"]>;

export function normalizeContentKnobs(content?: ScriptCharacteristics["content"]): Required<ContentKnobs> {
  return {
    violence: Math.max(0, Math.min(10, content?.violence ?? 0)),
    nudity: Math.max(0, Math.min(10, content?.nudity ?? 0)),
    language: Math.max(0, Math.min(10, content?.language ?? 0)),
    substance: Math.max(0, Math.min(10, content?.substance ?? 0)),
  };
}

export function computeFilmContentRating(content?: ScriptCharacteristics["content"]): {
  label: FilmContentRating;
  score: number;
} {
  const c = normalizeContentKnobs(content);

  // Weights are tuned for gameplay readability, not MPAA accuracy.
  const scoreRaw =
    c.violence * 2.5 +
    c.nudity * 3.0 +
    c.language * 1.5 +
    c.substance * 1.5;

  const score = Math.max(0, Math.min(100, Math.round(scoreRaw * 2))); // ~0-100

  let label: FilmContentRating = "G";
  if (score > 7) label = "PG";
  if (score > 25) label = "PG-13";
  if (score > 55) label = "R";
  if (score > 80) label = "NC-17";

  return { label, score };
}

export function contentRatingToSliderValue(label: FilmContentRating): number {
  switch (label) {
    case "G":
      return 0;
    case "PG":
      return 1;
    case "PG-13":
      return 2;
    case "R":
      return 3;
    case "NC-17":
      return 4;
  }
}
