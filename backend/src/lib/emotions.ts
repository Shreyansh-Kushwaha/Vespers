/**
 * Emotion catalog — primary → secondary → tertiary wheel + per-emotion
 * activity / meditation / exercise / tone directive. Sourced from the
 * "Emotional support AI database" spec.
 *
 * The catalog is the single source of truth for:
 *   - the Emotion Wheel UI (frontend)
 *   - the per-turn tone modulator the chat route injects into the system prompt
 *
 * Two primaries (Sad, Surprised) are fully seeded from the spec. The other
 * primaries are listed so the wheel renders all seven, but only carry top-level
 * definitions until the spec is expanded.
 */

export type PrimaryKey =
  | "sad"
  | "happy"
  | "angry"
  | "fearful"
  | "surprised"
  | "disgusted"
  | "overwhelmed";

export interface Tertiary {
  key: string;
  label: string;
  definition: string;
  /** Short tone directive injected into the system prompt for this emotion. */
  tone: string;
  /** Named in-app activity (from the spec). */
  activity?: { name: string; description: string };
  /** Named meditation (from the spec). */
  meditation?: { name: string; description: string };
  /** Physical exercise prompt (from the spec). */
  exercise?: string;
  /** Optional pointer to an existing Vespers quiet-object that complements this emotion. */
  quietObject?: "koi" | "wash" | "candle";
}

export interface Secondary {
  key: string;
  label: string;
  definition: string;
  tertiaries: Tertiary[];
}

export interface Primary {
  key: PrimaryKey;
  label: string;
  emoji: string;
  definition: string;
  /** Default tone if a user picks the primary without drilling further. */
  tone: string;
  secondaries: Secondary[];
}

const SAD: Primary = {
  key: "sad",
  label: "Sad",
  emoji: "🌧️",
  definition:
    "Feeling unhappy, hurt, low, or emotionally heavy because of loss, disappointment, loneliness, pain, or difficult experiences.",
  tone:
    "Soft, slow, validating. Sit beside the user. Do not rush to advice. Acknowledge heaviness before anything else.",
  secondaries: [
    {
      key: "lonely",
      label: "Lonely",
      definition:
        "Feeling alone or emotionally disconnected from others, even when people are around.",
      tertiaries: [
        {
          key: "isolated",
          label: "Isolated",
          definition:
            "Feeling cut off or separated from others emotionally or physically.",
          tone:
            "Warm, present, not pushy. Remind the user — gently — that being unseen for a while is not the same as being unworthy.",
          activity: {
            name: "Message in a Bottle",
            description:
              "Write or record a hidden message about how you feel, then release it into a calming animated ocean.",
          },
          meditation: {
            name: "Island Breath Meditation",
            description:
              "Imagine sitting safely on a quiet island, breathing slowly with ocean waves while repeating: \"I am alone right now, but I am still connected and worthy of care.\"",
          },
          exercise:
            "Take a 10–15 minute walk outside while noticing people, nature, and small signs of connection around you. 🌿",
          quietObject: "koi",
        },
        {
          key: "abandoned",
          label: "Abandoned",
          definition:
            "Feeling left behind, rejected, or unsupported by someone important.",
          tone:
            "Tender and steady. Name the hurt without minimising it. Avoid \"they didn't mean it\" framing.",
          activity: {
            name: "Empty Bench Letters",
            description:
              "Write a short letter to someone who left or hurt you, then place it on a virtual park bench as a symbolic act of release.",
          },
          meditation: {
            name: "Safe Arms Meditation",
            description:
              "Place a hand on your heart, take slow deep breaths, and visualize being surrounded by warm protective light while repeating: \"I am still worthy of love, even when someone leaves.\"",
          },
          exercise:
            "Take a slow walk in a park or busy street while noticing 5 things around you that make you feel connected to the world.",
        },
      ],
    },
    {
      key: "vulnerable",
      label: "Vulnerable",
      definition: "Feeling emotionally exposed, weak, or easy to hurt.",
      tertiaries: [
        {
          key: "victimised",
          label: "Victimised",
          definition: "Feeling unfairly treated, harmed, or blamed by others.",
          tone:
            "Gentle, validating, protective. Do not question the user's account. Reflect back the courage it took to name this.",
          activity: {
            name: "Strength Mirror",
            description:
              "List one difficult experience you survived — the AI reflects back the hidden courage, skills, or growth you showed.",
          },
          meditation: {
            name: "Inner Strength Meditation",
            description:
              "Focus on steady breathing while imagining yourself standing taller with each inhale, repeating: \"What happened to me does not define my power.\"",
          },
          exercise:
            "Do a power walk outdoors while repeating, \"I can make my own choices and protect my peace.\" 🚶‍♀️",
        },
        {
          key: "fragile",
          label: "Fragile",
          definition: "Feeling emotionally delicate or easily upset.",
          tone:
            "Quiet, careful, slow-paced. Short sentences. No reframing yet — just companionship.",
          activity: {
            name: "Glass Garden",
            description:
              "Nurture a tiny virtual glowing flower with calming breaths and gentle affirmations.",
          },
          meditation: {
            name: "Feather Breath Meditation",
            description:
              "Take soft gentle breaths while imagining a floating feather rising and falling, reminding yourself: \"It's okay to be delicate and still be strong.\"",
          },
          exercise:
            "Sit under sunlight or near a tree and practice deep breathing while gently stretching your body.",
          quietObject: "wash",
        },
      ],
    },
    {
      key: "despair",
      label: "Despair",
      definition: "Feeling like there is no hope or nothing will get better.",
      tertiaries: [
        {
          key: "grief",
          label: "Grief",
          definition:
            "Deep sadness caused by loss, especially losing someone or something important.",
          tone:
            "Reverent. Stay with the loss; do not rush to silver linings. Acknowledge that love remains alongside the loss.",
          activity: {
            name: "Memory Lantern",
            description:
              "Share a memory, photo, or message about what you've lost, then release a glowing lantern into the night sky as a moment of remembrance.",
          },
          meditation: {
            name: "Memory Light Meditation",
            description:
              "Breathe slowly while visualizing a warm glowing candle for what you've lost, repeating: \"Love remains, even through loss.\"",
          },
          exercise:
            "Meet a trusted friend or family member for a gentle walk outside and talk openly about what you've been carrying inside.",
          quietObject: "candle",
        },
        {
          key: "powerless",
          label: "Powerless",
          definition:
            "Feeling unable to control a situation or change what is happening.",
          tone:
            "Steady, grounding. Help the user notice one tiny thing within their control without dismissing what isn't.",
          activity: {
            name: "Tiny Wins Tower",
            description:
              "Complete small achievable actions like breathing exercises, affirmations, or mini goals to slowly build a glowing tower that represents regained control.",
          },
          meditation: {
            name: "Tiny Dawn Meditation",
            description:
              "Imagine a dark horizon slowly filling with morning light as you breathe deeply and repeat: \"Even the longest night changes.\"",
          },
          exercise:
            "Join a group outdoor activity like yoga, walking, or a sports class and have small conversations that remind you you're supported and capable. 🌱💪",
        },
      ],
    },
    {
      key: "guilty",
      label: "Guilty",
      definition: "Feeling bad because you think you did something wrong.",
      tertiaries: [
        {
          key: "ashamed",
          label: "Ashamed",
          definition:
            "Feeling bad about yourself or embarrassed about your actions.",
          tone:
            "Compassionate, non-judging. Separate the action from the self. Bring in the self-compassion break by name if it fits.",
          activity: {
            name: "Kindness Mirror",
            description:
              "Write a mistake or insecurity anonymously — the AI gently transforms it into compassionate self-talk and reminders of your worth.",
          },
          meditation: {
            name: "Self-Compassion Meditation",
            description:
              "Place a hand on your heart, breathe gently, and repeat: \"I am more than my mistakes, and I deserve kindness too.\"",
          },
          exercise:
            "Sit with a trusted person in a calm outdoor place and share one thing you've been hiding from yourself or others without judging it.",
        },
        {
          key: "remorseful",
          label: "Remorseful",
          definition:
            "Feeling deep regret and wishing you had acted differently.",
          tone:
            "Honest and warm. Acknowledge regret as a sign of values. Gently move toward repair, not punishment.",
          activity: {
            name: "Healing Ripple",
            description:
              "Reflect on something you regret and choose a small positive action or apology, creating calming ripples in water that symbolize growth and forgiveness.",
          },
          meditation: {
            name: "Forgiveness Breath Meditation",
            description:
              "Inhale deeply and exhale slowly while imagining releasing heavy stones, repeating: \"I can learn, repair, and still move forward.\"",
          },
          exercise:
            "Volunteer outdoors for a small community activity, like helping at an animal shelter or park cleanup, to reconnect with kindness and self-forgiveness.",
        },
      ],
    },
    {
      key: "depressed",
      label: "Depressed",
      definition:
        "Feeling deeply sad, empty, tired, or uninterested for a long time.",
      tertiaries: [
        {
          key: "empty",
          label: "Empty",
          definition:
            "Feeling numb inside, like something important is missing emotionally.",
          tone:
            "Quiet, low energy, very small steps. Avoid bright reframes. Behavioural activation by tiny increments only.",
          activity: {
            name: "Fill the Sky",
            description:
              "Add tiny stars to a dark virtual sky by sharing small things you still feel, notice, or appreciate.",
          },
          meditation: {
            name: "Rain Release Meditation",
            description:
              "Listen to soft rain sounds while taking slow breaths and imagining each exhale washing a little heaviness away.",
          },
          exercise:
            "Visit a café, park, or community space and start a light conversation with someone to slowly reconnect with warmth and presence.",
        },
        {
          key: "inferior",
          label: "Inferior",
          definition:
            "Feeling less important, capable, or valuable than others.",
          tone:
            "Steadying. Gently challenge comparison without dismissing the feeling. Name the negativity bias if useful.",
          activity: {
            name: "Own Your Peak",
            description:
              "Write down your strengths, efforts, or small achievements — each builds a unique mountain path showing your personal growth.",
          },
          meditation: {
            name: "Mountain Within Meditation",
            description:
              "Visualize a steady mountain inside yourself while breathing deeply and repeating: \"My worth does not shrink beside others.\"",
          },
          exercise:
            "Play a simple outdoor sport or activity with supportive people who encourage participation, not perfection.",
        },
      ],
    },
    {
      key: "hurt",
      label: "Hurt",
      definition:
        "Feeling emotional pain because of someone's words, actions, or situations.",
      tertiaries: [
        {
          key: "embarrassed",
          label: "Embarrassed",
          definition:
            "Feeling uncomfortable or awkward because of something you did or that happened to you.",
          tone:
            "Light, warm, slightly playful — but never at the user's expense. Normalise; help shame loosen.",
          activity: {
            name: "Laugh It Lightly",
            description:
              "Share an embarrassing moment — the AI turns it into a playful comic-style scene to reduce shame and make the memory feel lighter.",
          },
          meditation: {
            name: "Let It Float Meditation",
            description:
              "Imagine placing embarrassing memories into balloons and watching them gently drift away while repeating: \"One moment does not define me.\"",
          },
          exercise:
            "Take a walk with a close friend and laugh together about small awkward moments to remind yourself everyone has them.",
        },
        {
          key: "disappointed",
          label: "Disappointed",
          definition:
            "Feeling sad because something did not happen the way you hoped.",
          tone:
            "Honest, warm, hopeful but not glossy. Acknowledge the gap between hope and outcome before moving forward.",
          activity: {
            name: "Broken Kite Repair",
            description:
              "Reflect on something that didn't go as hoped, then slowly rebuild a colorful virtual kite with lessons, hopes, and new possibilities.",
          },
          meditation: {
            name: "Falling Leaves Meditation",
            description:
              "Imagine placing unmet expectations onto drifting leaves in a stream, breathing slowly and repeating: \"It's okay to begin again.\"",
          },
          exercise:
            "Play an outdoor game or physical activity with friends to release tension and reconnect with enjoyment in the present moment.",
        },
      ],
    },
  ],
};

const SURPRISED: Primary = {
  key: "surprised",
  label: "Surprised",
  emoji: "😲",
  definition:
    "Feeling suddenly amazed, shocked, confused, or curious because something unexpected happened.",
  tone:
    "Grounded and curious. Help the user steady their nervous system before making meaning.",
  secondaries: [
    {
      key: "startled",
      label: "Startled",
      definition: "Feeling suddenly alarmed or jumped by something unexpected.",
      tertiaries: [
        {
          key: "shocked",
          label: "Shocked",
          definition: "Feeling deeply surprised or disturbed by something sudden.",
          tone:
            "Slow and grounding. Lead with safety and breath. Do not interpret events yet.",
          activity: {
            name: "Pause Bubble",
            description:
              "Enter a calming slow-motion space with breathing cues, soft sounds, and grounding prompts to help process overwhelming shock safely.",
          },
          meditation: {
            name: "Still Water Meditation",
            description:
              "Focus on slow steady breaths while imagining ripples on water gradually becoming calm again, repeating: \"I am safe in this moment.\"",
          },
          exercise:
            "Take a slow barefoot walk on grass or sand to help your body feel grounded and safe again.",
          quietObject: "koi",
        },
        {
          key: "dismayed",
          label: "Dismayed",
          definition: "Feeling upset or disappointed because of an unexpected event.",
          tone:
            "Steady and forward-looking. Acknowledge the let-down; offer one small next step.",
          activity: {
            name: "Find the Next Step",
            description:
              "Choose one small action after a discouraging moment — the AI turns it into a glowing path forward instead of a dead end.",
          },
          meditation: {
            name: "Steady Path Meditation",
            description:
              "Breathe deeply while visualizing a lantern lighting one small step ahead at a time, repeating: \"I do not need all the answers right now.\"",
          },
          exercise:
            "Spend time volunteering or helping someone outdoors to reconnect with purpose and a sense of positive impact.",
        },
      ],
    },
    {
      key: "confused",
      label: "Confused",
      definition: "Feeling unsure or unable to understand something clearly.",
      tertiaries: [
        {
          key: "disillusioned",
          label: "Disillusioned",
          definition:
            "Feeling disappointed after realizing something is not as good as you believed.",
          tone:
            "Clear, structured, honest. Help separate fact from story without invalidating the disappointment.",
          activity: {
            name: "Ground & Reset",
            description:
              "Do a short grounding exercise by naming 5 things you can see, hear, and feel — helping you reconnect with reality and emotional balance.",
          },
          meditation: {
            name: "Clear Sky Meditation",
            description:
              "Imagine fog slowly lifting from your mind with each breath, repeating: \"I can let go of illusions and still find meaning ahead.\"",
          },
          exercise:
            "Visit a peaceful outdoor place and have an honest conversation with someone you trust about what changed and what you still believe in.",
        },
        {
          key: "perplexed",
          label: "Perplexed",
          definition: "Feeling puzzled or unable to understand something.",
          tone:
            "Clear and structured. Sort with the user. One question at a time.",
          activity: {
            name: "Thought Untangler",
            description:
              "Drag scattered thoughts into categories like \"facts,\" \"feelings,\" and \"questions\" to bring clarity to confusing situations.",
          },
          meditation: {
            name: "Center Point Meditation",
            description:
              "Focus on one steady breath at a time while imagining scattered thoughts gently settling into calm circles, repeating: \"Clarity can arrive slowly.\"",
          },
          exercise:
            "Visit a busy public place like a market or park and create funny stories about strangers around you to loosen the pressure of overthinking.",
        },
      ],
    },
    {
      key: "amazed",
      label: "Amazed",
      definition: "Feeling greatly impressed or filled with wonder.",
      tertiaries: [
        {
          key: "astonished",
          label: "Astonished",
          definition: "Feeling extremely surprised or amazed.",
          tone:
            "Bright, curious, savouring. Help the user stay with the good feeling a little longer.",
          activity: {
            name: "Wonder Capture",
            description:
              "Collect surprising or awe-inspiring moments in a digital scrapbook with voice notes, doodles, or photos to turn shock into curiosity and joy.",
          },
          meditation: {
            name: "Wonder Pause Meditation",
            description:
              "Take slow breaths while quietly observing sounds, sensations, and surroundings, repeating: \"I can stay present with this moment of wonder.\"",
          },
          exercise:
            "Explore a new street, museum, or hidden café and collect \"tiny wow moments\" by taking photos of things that surprise you.",
        },
        {
          key: "awe",
          label: "Awe",
          definition:
            "A feeling of wonder and deep respect caused by something powerful or beautiful.",
          tone:
            "Hushed and spacious. Match the bigness of the feeling with stillness, not analysis.",
          activity: {
            name: "Cosmic Zoom Out",
            description:
              "Explore calming visuals of stars, oceans, and nature while reflecting on moments that made you feel small, connected, and inspired.",
          },
          meditation: {
            name: "Universe Breath Meditation",
            description:
              "Imagine breathing in starlight and exhaling tension while reflecting on the vastness of life, repeating: \"I am part of something beautifully bigger.\"",
          },
          exercise:
            "Go on a \"wonder walk\" and take photos of 5 things that make the world feel beautiful, strange, or bigger than your worries.",
          quietObject: "wash",
        },
      ],
    },
    {
      key: "excited",
      label: "Excited",
      definition: "Feeling energetic and happy about something unexpected or upcoming.",
      tertiaries: [
        {
          key: "eager",
          label: "Eager",
          definition:
            "Feeling excited and strongly interested in something that is about to happen.",
          tone:
            "Warm, focused. Help channel excitement into clear first steps without dampening it.",
          activity: {
            name: "Dream Launch Pad",
            description:
              "Turn your excitement into action by creating a mini mission board with goals, first steps, and fun rewards.",
          },
          meditation: {
            name: "Focused Flame Meditation",
            description:
              "Visualize a bright steady flame while breathing deeply, channeling excitement into calm focus and repeating: \"My energy can move with purpose.\"",
          },
          exercise:
            "Go to a park or café and create a \"slow challenge\" where you must notice 10 tiny details before checking your phone or moving on.",
        },
        {
          key: "energetic",
          label: "Energetic",
          definition: "Feeling lively, active, and full of energy.",
          tone:
            "Playful and active. Help the user direct energy rather than suppress it.",
          activity: {
            name: "Energy Burst Challenge",
            description:
              "Complete fast, fun mini tasks like dance moves, quick quizzes, or reaction games to channel your energy positively.",
          },
          meditation: {
            name: "Pulse Flow Meditation",
            description:
              "Match your breathing to upbeat rhythmic sounds while gently moving or stretching, repeating: \"I can guide my energy, not chase it.\"",
          },
          exercise:
            "Try a silent sunset walk where your only goal is to match your breathing with your footsteps and slow your pace little by little.",
        },
      ],
    },
  ],
};

// Primaries listed in the spec but not yet expanded with secondary/tertiary
// drill-down. The wheel still renders them so the user has a complete entry
// surface — they collapse to a single "talk about feeling X" handoff that
// applies the primary-level tone directive.
const HAPPY: Primary = {
  key: "happy",
  label: "Happy",
  emoji: "☀️",
  definition: "Feeling joyful, content, grateful, or lifted.",
  tone:
    "Warm and savouring. Help the user notice and stay with what is good without rushing past it.",
  secondaries: [],
};

const ANGRY: Primary = {
  key: "angry",
  label: "Angry",
  emoji: "🔥",
  definition:
    "Feeling irritated, frustrated, resentful, or charged with energy because something feels wrong or unfair.",
  tone:
    "Grounding and calming. Validate the anger as information — there is something being protected. Slow the breath before any reframe.",
  secondaries: [],
};

const FEARFUL: Primary = {
  key: "fearful",
  label: "Fearful",
  emoji: "🌫️",
  definition:
    "Feeling scared, anxious, worried, or uncertain about something that might happen.",
  tone:
    "Steady and present. Slow pace. Name the body. Offer a small grounding technique (5-4-3-2-1 or physiological sigh) when it fits.",
  secondaries: [],
};

const DISGUSTED: Primary = {
  key: "disgusted",
  label: "Disgusted",
  emoji: "🍂",
  definition:
    "Feeling repulsed, contemptuous, or pulled away from something that feels wrong.",
  tone:
    "Respectful and clear. Help the user understand what value is being violated, without judgement.",
  secondaries: [],
};

const OVERWHELMED: Primary = {
  key: "overwhelmed",
  label: "Bad / Overwhelmed",
  emoji: "🌪️",
  definition:
    "Feeling stretched thin, foggy, exhausted, or like there is too much at once.",
  tone:
    "Very slow, very small. One thing at a time. Lower the volume of the conversation. Offer one breath, one micro-step, or a quiet object.",
  secondaries: [],
};

export const EMOTION_CATALOG: Primary[] = [
  SAD,
  SURPRISED,
  HAPPY,
  ANGRY,
  FEARFUL,
  DISGUSTED,
  OVERWHELMED,
];

export interface EmotionSelection {
  primary: PrimaryKey;
  secondary?: string;
  tertiary?: string;
}

export interface ResolvedEmotion {
  primary: Primary;
  secondary?: Secondary;
  tertiary?: Tertiary;
  /** Most-specific label (tertiary > secondary > primary). */
  label: string;
  /** Most-specific tone directive available. */
  tone: string;
}

export function resolveEmotion(sel: EmotionSelection | null | undefined): ResolvedEmotion | null {
  if (!sel) return null;
  const primary = EMOTION_CATALOG.find((p) => p.key === sel.primary);
  if (!primary) return null;
  const secondary = sel.secondary
    ? primary.secondaries.find((s) => s.key === sel.secondary)
    : undefined;
  const tertiary = secondary && sel.tertiary
    ? secondary.tertiaries.find((t) => t.key === sel.tertiary)
    : undefined;
  return {
    primary,
    secondary,
    tertiary,
    label: tertiary?.label ?? secondary?.label ?? primary.label,
    tone: tertiary?.tone ?? primary.tone,
  };
}

/**
 * Build the system-prompt directive for a chosen emotion. Empty string when
 * no selection — keeps composeSystemPrompt happy.
 */
export function buildEmotionDirective(sel: EmotionSelection | null | undefined): string {
  const r = resolveEmotion(sel);
  if (!r) return "";
  const lines = [
    "EMOTION DIRECTIVE",
    `The user has named their feeling using the emotion wheel. Most specific label: "${r.label}".`,
    `Path: ${r.primary.label}${r.secondary ? " → " + r.secondary.label : ""}${r.tertiary ? " → " + r.tertiary.label : ""}.`,
    `Tone for this turn: ${r.tone}`,
  ];
  if (r.tertiary?.activity) {
    lines.push(
      `An in-app activity exists for this feeling — "${r.tertiary.activity.name}". You may mention it once if it would genuinely help, but never as a list. Lead with presence.`,
    );
  }
  lines.push(
    "Do not list resources or activities back to the user unprompted. The wheel UI already surfaces them; your job is to be present with the named feeling.",
  );
  return lines.join("\n");
}

/**
 * Directive for the *opening* turn of a session — when the user has just
 * named their feeling on the wheel and the AI is the first to speak.
 *
 * The opener is short: a greeting that acknowledges the named feeling, and a
 * single open question. If the user has talked before, gently compare to past
 * themes (e.g. "feeling X again today?" or "this is different from last
 * time"). Never list the activity/meditation/exercise here — those live in
 * the wheel UI; the opener's job is presence.
 */
export function buildOpenerDirective(
  sel: EmotionSelection | null | undefined,
  hasPriorHistory: boolean,
  persona: "vespers" | "gappu" = "vespers",
): string {
  const r = resolveEmotion(sel);
  const lines: string[] = ["OPENING DIRECTIVE — YOU SPEAK FIRST THIS TURN"];

  if (r) {
    lines.push(
      `The user has just opened a new session and named their feeling on the emotion wheel: "${r.label}".`,
      "There is no user message yet — you are starting the conversation. Open with a brief, warm greeting that gently names the feeling. Do not lecture. Do not list resources. Two to four short sentences total, ending with one open question.",
    );
    if (hasPriorHistory) {
      lines.push(
        'The user has talked with you before. If the prior memory makes it natural, you may compare softly — "feeling this again today?" or "different from last time" — without summarising past sessions back at them. If nothing in memory connects, just greet plainly.',
      );
    } else {
      lines.push(
        "This is a brand-new user. Welcome them in a single line, name the feeling, and ask one gentle opening question.",
      );
    }
  } else {
    // No emotion — this is a persona-switch opener. The other persona was
    // talking; the user just toggled to you. Walk in, in your own voice.
    if (persona === "gappu") {
      lines.push(
        "The user just switched the persona toggle to YOU (Gappu). Vespers may have been talking before — now you walk in. Arrive in your Hinglish voice in 1–3 short lines: announce yourself, set the energy, drop one playful opener or question. No therapy framing, no 'how can I help you'. Make it feel like a cousin sliding into the chair next to them.",
      );
    } else {
      lines.push(
        "The user just switched the persona toggle to YOU (Vespers). Gappu may have been talking before — now you take the seat back. Arrive in your calm voice in 1–2 short lines: a soft hello in your own words, then a single open question. Mirror the user's most recent language (English or Hinglish) if there is prior history; otherwise default to English.",
      );
    }
    if (hasPriorHistory) {
      lines.push(
        "The user has talked in this thread before — you may quietly carry that context, but do not summarise it back at them.",
      );
    }
  }

  lines.push(
    "Do not begin with 'Hello' or 'Welcome' templates. Write in your own voice.",
  );
  return lines.join("\n");
}
