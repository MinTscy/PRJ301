export const cefrBands = [
  {
    key: "PRE-A1",
    name: "Starters",
    range: "Levels 1-10",
    tone: "teal",
    outcome: "Safe first responses, picture talk, and simple self-introduction.",
    canDo: [
      "Answer simple questions about self and familiar objects.",
      "Describe pictures with short phrases.",
      "Understand very simple spoken prompts with visual support."
    ],
    activities: ["True / False", "Yes / No", "Picture words", "Short answers"]
  },
  {
    key: "A1",
    name: "Movers",
    range: "Levels 11-20",
    tone: "violet",
    outcome: "Everyday exchange, short stories, preferences, and simple reasons.",
    canDo: [
      "Ask and answer basic everyday questions.",
      "Talk about routines, people, places, and preferences.",
      "Connect short ideas with simple linking words."
    ],
    activities: ["Word matching", "Mini dialogues", "Listening choices", "Simple stories"]
  },
  {
    key: "A2",
    name: "Flyers",
    range: "Levels 21-30",
    tone: "coral",
    outcome: "Longer turns, choices, past events, and guided conversation.",
    canDo: [
      "Tell short simple stories using pictures or personal ideas.",
      "Talk briefly about activities done in the past.",
      "Understand simple conversations on everyday topics."
    ],
    activities: ["Fill blanks", "Conversations", "Listening pictures", "Storytelling"]
  }
] as const;

export const practiceToolkit = [
  {
    code: "RW",
    label: "Reading & Writing",
    description: "Matching, sentence completion, short text, spelling."
  },
  {
    code: "LS",
    label: "Listening",
    description: "Picture selection, instructions, simple dialogue."
  },
  {
    code: "SP",
    label: "Speaking",
    description: "Personal questions, picture stories, differences."
  },
  {
    code: "VB",
    label: "Vocabulary",
    description: "Topic banks, word matching, guided recall."
  }
] as const;

export function getCefrBand(levelNumber?: number | null) {
  if (!levelNumber || levelNumber > 30) return null;
  if (levelNumber <= 10) return cefrBands[0];
  if (levelNumber <= 20) return cefrBands[1];
  return cefrBands[2];
}
