"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export type GappuMood = "idle" | "thinking" | "talking" | "laughing" | "smiling";

/** One-shot reactions triggered by the chat layer when stream content matches
 *  a known pattern. The avatar plays them for a fixed TTL then clears. */
export type GappuReaction =
  | "surprise"
  | "wink"
  | "lightbulb"
  | "sweat"
  | "tear"
  | "filmi"
  | "chai";

export interface GappuReactionEvent {
  type: GappuReaction;
  /** Monotonic id; bump this each time you want to (re)trigger the reaction. */
  id: number;
}

interface Props {
  mood: GappuMood;
  size?: number;
  className?: string;
  /** When non-null, Gappu periodically peeks at this element while it has focus. */
  peekTarget?: HTMLElement | null;
  /** Bump `id` to fire a one-shot reaction overlay. */
  reactionEvent?: GappuReactionEvent | null;
  /** Briefly play a confused/error expression. */
  errorMode?: boolean;
  /** Step aside posture (head down, faded) when Vespers is standing in. */
  crisisOverride?: boolean;
  /** Play a hello wave on mount of a new session. */
  firstMessage?: boolean;
  /** Show dazed/hit expression — X_X eyes, stars overhead, body shake.
   *  Used when the user clicks (beats) Gappu, and during the fall pose. */
  dazed?: boolean;
}

// Reaction display durations.
const REACTION_TTL: Record<GappuReaction, number> = {
  surprise: 750,
  wink: 380,
  lightbulb: 1500,
  sweat: 1300,
  tear: 1700,
  filmi: 1000,
  chai: 1800,
};

// Idle sub-mood thresholds (ms since last mood change).
const LOOK_AROUND_INTERVAL_MIN = 8000;
const LOOK_AROUND_INTERVAL_MAX = 12000;
const SNEAK_PEEK_INTERVAL_MIN = 14000;
const SNEAK_PEEK_INTERVAL_MAX = 28000;
const YAWN_AFTER = 45000;
const SNORE_AFTER = 180000;
const WAVE_DURATION = 2400;

const PUPIL_MAX = 2.6;
const GAZE_LERP = 0.18;
const GAZE_FPS_INTERVAL = 33;

// Regex catalog used by the chat layer to detect reactions from streaming text.
// Exported so the caller can run detection without re-importing patterns.
const REACTION_PATTERNS: { type: GappuReaction; re: RegExp }[] = [
  { type: "surprise",  re: /(\barre+\b|\babey+\b|\bwhaaa+t+\b|\bseriously\b|wait\s+what|hai\s+na|kya\s+bol)/i },
  { type: "wink",      re: /(\bwink\b|;\)|;\]|\*wink\*)/i },
  { type: "filmi",     re: /\b(srk|filmy|filmi|picture|movie|sholay|bollywood|govinda|amitabh|dialogue)\b/i },
  { type: "chai",      re: /\b(chai|cutting|garam|kadak)\b/i },
  { type: "lightbulb", re: /\b(try\s+ye|try\s+this|sun\s+ek|idea|kar\s+le)\b/i },
  { type: "sweat",     re: /\b(pata\s+nahi|main\s+bhi|same\s+yaar|kya\s+pata|mujhe\s+bhi)\b/i },
  { type: "tear",      re: /\b(strong|main\s+yahin|tu\s+kar\s+lega|hum\s+saath|aaja\s+gale)\b/i },
];

/** Returns all reaction types whose pattern appears anywhere in `text`. */
export function detectReactions(text: string): GappuReaction[] {
  const out: GappuReaction[] = [];
  for (const { type, re } of REACTION_PATTERNS) {
    if (re.test(text)) out.push(type);
  }
  return out;
}

/** Cheap regex-based laugh detector. Used by the chat page to switch the
 *  avatar into a brief laughing state when Gappu cracks himself up. */
const LAUGH_RE = /\b(haha+|hehe+|lo+l|lmao+|lmfao|rofl|bhk)\b|😂|🤣|😆|😹|😅/i;
export function looksLikeLaughter(text: string): boolean {
  return LAUGH_RE.test(text);
}

type SubMood = "yawn" | "snore" | "sneakPeek" | null;

/**
 * Gappu mascot.
 *
 * Stacks several timed micro-behaviours on top of a single SVG body:
 *   - core mood (idle / thinking / talking / laughing / smiling) — drives
 *     eyes, mouth, dots, sparkles
 *   - one-shot reactions (surprise / wink / lightbulb / sweat / tear / filmi
 *     / chai) — short overlays triggered by stream content
 *   - long-idle sub-mood (yawn after 45s, snore after 3min, sneak-peek and
 *     look-around in between)
 *   - hover lift on the brows
 *   - cursor-tracking pupils + periodic textbox peek
 *   - lifecycle: hello wave on first message, head-bow + fade during a
 *     crisis-override turn, confused face on error
 *   - ambient: gentle head sway and breathing scale always on
 *   - ahoge cowlick wiggles on every mood change
 *
 * Perf notes:
 *   - One global mousemove listener stored in a ref — zero rerenders on movement.
 *   - One rAF loop, 30fps cap, skips state updates within 0.18 SVG units.
 *   - All timers/intervals torn down when leaving their state.
 */
export function GappuAvatar({
  mood, size = 72, className, peekTarget,
  reactionEvent, errorMode, crisisOverride, firstMessage, dazed,
}: Props) {
  const [blink, setBlink] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });
  const [peekActive, setPeekActive] = useState(false);
  const [hover, setHover] = useState(false);
  const [reaction, setReaction] = useState<GappuReaction | null>(null);
  const [subMood, setSubMood] = useState<SubMood>(null);
  const [waving, setWaving] = useState(false);
  const [ahogeKey, setAhogeKey] = useState(0);
  const [lookDir, setLookDir] = useState<-1 | 0 | 1>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const pupilRef = useRef({ x: 0, y: 0 });
  const peekActiveRef = useRef(false);
  const lookDirRef = useRef<-1 | 0 | 1>(0);
  const lastMoodChangeRef = useRef(typeof performance !== "undefined" ? performance.now() : 0);
  const reactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { peekActiveRef.current = peekActive; }, [peekActive]);
  useEffect(() => { lookDirRef.current = lookDir; }, [lookDir]);

  // Blink scheduler — eyes-visible moods only.
  useEffect(() => {
    if (mood === "laughing" || subMood === "snore" || subMood === "yawn") return;
    if (reaction === "wink" || reaction === "surprise") return;
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (!mounted) return;
      setBlink(true);
      timeoutId = setTimeout(() => {
        if (!mounted) return;
        setBlink(false);
        timeoutId = setTimeout(tick, 2500 + Math.random() * 2500);
      }, 110);
    };
    timeoutId = setTimeout(tick, 1200 + Math.random() * 1500);
    return () => { mounted = false; clearTimeout(timeoutId); };
  }, [mood, subMood, reaction]);

  // Mouth flap while talking (and not overridden by chai/yawn/wink mouth).
  useEffect(() => {
    if (mood !== "talking" || reaction === "chai" || subMood === "yawn") {
      setMouthOpen(false);
      return;
    }
    let mounted = true;
    const id = setInterval(() => {
      if (mounted) setMouthOpen((v) => !v);
    }, 180);
    return () => { mounted = false; clearInterval(id); };
  }, [mood, reaction, subMood]);

  // Global mousemove → ref only.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Periodic peek toward the textbox while it's focused.
  useEffect(() => {
    if (!peekTarget) return;
    let mounted = true;
    let scheduleId: ReturnType<typeof setTimeout>;
    let resetId: ReturnType<typeof setTimeout>;
    const isFocused = () => {
      const ae = document.activeElement;
      return !!ae && (ae === peekTarget || peekTarget.contains(ae));
    };
    const trigger = () => {
      if (!mounted) return;
      if (isFocused()) {
        setPeekActive(true);
        resetId = setTimeout(() => mounted && setPeekActive(false), 650 + Math.random() * 350);
      }
      scheduleId = setTimeout(trigger, 3500 + Math.random() * 3000);
    };
    scheduleId = setTimeout(trigger, 2500 + Math.random() * 1500);
    return () => { mounted = false; clearTimeout(scheduleId); clearTimeout(resetId); };
  }, [peekTarget]);

  // Reaction event — bumping id replays the reaction with its TTL.
  useEffect(() => {
    if (!reactionEvent) return;
    setReaction(reactionEvent.type);
    if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    reactionTimeoutRef.current = setTimeout(
      () => setReaction(null),
      REACTION_TTL[reactionEvent.type],
    );
    return () => {
      if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    };
  }, [reactionEvent]);

  // Mood change → reset idle timer, wiggle the ahoge.
  useEffect(() => {
    lastMoodChangeRef.current = performance.now();
    setSubMood(null);
    setAhogeKey((k) => k + 1);
  }, [mood]);

  // Long-idle sub-mood scheduler.
  useEffect(() => {
    if (mood !== "idle" && mood !== "smiling") return;
    let mounted = true;
    let yawnResetId: ReturnType<typeof setTimeout>;
    const check = () => {
      if (!mounted) return;
      const idle = performance.now() - lastMoodChangeRef.current;
      if (idle > SNORE_AFTER) {
        setSubMood("snore");
      } else if (idle > YAWN_AFTER) {
        setSubMood((cur) => {
          if (cur === "snore") return cur;
          if (cur !== "yawn") {
            yawnResetId = setTimeout(() => mounted && setSubMood(null), 2000);
          }
          return "yawn";
        });
      }
    };
    const id = setInterval(check, 2000);
    return () => { mounted = false; clearInterval(id); clearTimeout(yawnResetId); };
  }, [mood]);

  // Look-around scheduler — small left/right glances during pure idle.
  useEffect(() => {
    if (mood !== "idle" && mood !== "smiling") return;
    if (subMood === "snore" || subMood === "yawn") return;
    let mounted = true;
    let id: ReturnType<typeof setTimeout>;
    const trigger = () => {
      if (!mounted) return;
      const dir = (Math.random() > 0.5 ? 1 : -1) as -1 | 1;
      setLookDir(dir);
      setTimeout(() => {
        if (mounted) setLookDir(0);
      }, 750);
      id = setTimeout(
        trigger,
        LOOK_AROUND_INTERVAL_MIN + Math.random() * (LOOK_AROUND_INTERVAL_MAX - LOOK_AROUND_INTERVAL_MIN),
      );
    };
    id = setTimeout(trigger, LOOK_AROUND_INTERVAL_MIN);
    return () => { mounted = false; clearTimeout(id); };
  }, [mood, subMood]);

  // Sneak-peek scheduler — head rotates briefly to look "behind".
  useEffect(() => {
    if (mood !== "idle" && mood !== "smiling") return;
    if (subMood === "snore" || subMood === "yawn") return;
    let mounted = true;
    let id: ReturnType<typeof setTimeout>;
    const trigger = () => {
      if (!mounted) return;
      setSubMood("sneakPeek");
      setTimeout(() => mounted && setSubMood(null), 900);
      id = setTimeout(
        trigger,
        SNEAK_PEEK_INTERVAL_MIN + Math.random() * (SNEAK_PEEK_INTERVAL_MAX - SNEAK_PEEK_INTERVAL_MIN),
      );
    };
    id = setTimeout(trigger, SNEAK_PEEK_INTERVAL_MIN);
    return () => { mounted = false; clearTimeout(id); };
  }, [mood, subMood]);

  // Hello wave on first message of a session.
  useEffect(() => {
    if (!firstMessage) return;
    setWaving(true);
    const id = setTimeout(() => setWaving(false), WAVE_DURATION);
    return () => clearTimeout(id);
  }, [firstMessage]);

  // rAF loop for pupil gaze.
  useEffect(() => {
    let mounted = true;
    let rafId = 0;
    let lastUpdate = 0;
    const loop = (t: number) => {
      if (!mounted) return;
      if (t - lastUpdate >= GAZE_FPS_INTERVAL) {
        lastUpdate = t;
        const c = containerRef.current;
        if (c) {
          const rect = c.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height * 0.55;
          let target: { x: number; y: number } | null = null;
          if (lookDirRef.current !== 0) {
            // Forced glance left/right (look-around sub-mood)
            target = { x: cx + lookDirRef.current * 220, y: cy };
          } else if (peekActiveRef.current && peekTarget) {
            const tr = peekTarget.getBoundingClientRect();
            target = { x: tr.left + tr.width / 2, y: tr.top + tr.height / 2 };
          } else if (mouseRef.current) {
            target = mouseRef.current;
          }
          let nx = 0, ny = 0;
          if (target) {
            const dx = target.x - cx;
            const dy = target.y - cy;
            const d = Math.hypot(dx, dy);
            if (d > 0) {
              const norm = Math.min(1, d / 120);
              nx = (dx / d) * PUPIL_MAX * norm;
              ny = (dy / d) * PUPIL_MAX * norm;
            }
          }
          pupilRef.current.x += (nx - pupilRef.current.x) * GAZE_LERP;
          pupilRef.current.y += (ny - pupilRef.current.y) * GAZE_LERP;
          if (
            Math.abs(pupilRef.current.x - pupilOffset.x) > 0.18 ||
            Math.abs(pupilRef.current.y - pupilOffset.y) > 0.18
          ) {
            setPupilOffset({ x: pupilRef.current.x, y: pupilRef.current.y });
          }
        }
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => { mounted = false; cancelAnimationFrame(rafId); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peekTarget]);

  // Derived booleans for SVG branching readability.
  const showLaugh = mood === "laughing";
  const showThinking = mood === "thinking";
  const isYawning = subMood === "yawn";
  const isSnoring = subMood === "snore";
  const isSneakPeek = subMood === "sneakPeek";
  const showBlushAmbient = mood === "smiling" || peekActive || reaction === "filmi" || waving;
  const eyesTrackable =
    !showLaugh && !showThinking && !blink && !isYawning && !isSnoring &&
    reaction !== "wink" && reaction !== "surprise" && !errorMode && !dazed;

  // Composite tilt: peek + filmi + sneak + crisis.
  const tilt =
    (peekActive ? -6 : 0) +
    (reaction === "filmi" ? 8 : 0) +
    (isSneakPeek ? -14 : 0) +
    (crisisOverride ? 0 : 0);
  const bowDown = crisisOverride ? 6 : 0;
  const opacity = crisisOverride ? 0.45 : 1;

  return (
    <motion.div
      ref={containerRef}
      className={className}
      style={{ width: size, height: size }}
      initial={false}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      animate={{ rotate: tilt, y: bowDown, opacity }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
    >
      {/* Ambient breath scale — always on, very subtle */}
      <motion.div
        style={{ width: "100%", height: "100%" }}
        animate={{ scale: [1, 1.015, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Mood-change entrance bobble + idle sway */}
        <motion.div
          style={{ width: "100%", height: "100%" }}
          key={mood}
          initial={{ scale: 0.92, y: -2 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
        >
          <motion.div
            style={{ width: "100%", height: "100%", originX: 0.5, originY: 0.6 }}
            animate={{ rotate: [-1.2, 1.2, -1.2] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 100 100"
              aria-hidden
              style={{ display: "block", overflow: "visible" }}
            >
              {/* drop shadow */}
              <ellipse cx="50" cy="92" rx="28" ry="4" fill="rgba(122,51,4,0.18)" />

              {/* neck */}
              <rect x="44" y="82" width="12" height="9" fill="#FFE3C7" stroke="#D88E73" strokeWidth="1" />

              {/* face */}
              <ellipse cx="50" cy="55" rx="32" ry="30" fill="#FFE3C7" stroke="#D88E73" strokeWidth="1.4" />

              {/* ear nubs */}
              <ellipse cx="17" cy="58" rx="2.6" ry="3.4" fill="#F2C8AC" stroke="#D88E73" strokeWidth="1" />
              <ellipse cx="83" cy="58" rx="2.6" ry="3.4" fill="#F2C8AC" stroke="#D88E73" strokeWidth="1" />

              {/* hair cap (drawn after face so it covers forehead) */}
              <path
                d="M 14 48 Q 6 22 26 10 Q 50 2 74 10 Q 94 22 86 48
                   L 82 45 L 78 49 L 74 44 L 70 48 L 66 43 L 62 47 L 58 43
                   L 54 49 L 50 43 L 46 48 L 42 43 L 38 48 L 34 43
                   L 30 47 L 26 44 L 22 47 L 18 44 L 14 48 Z"
                fill="#2a1505"
              />

              {/* ahoge with wiggle on every mood change */}
              <motion.path
                key={`ahoge-${ahogeKey}`}
                d="M 46 9 L 50 -1 L 54 9 Z"
                fill="#2a1505"
                style={{ transformOrigin: "50px 11px" }}
                initial={{ rotate: -15 }}
                animate={{ rotate: showLaugh ? [-8, 8, -8] : 0 }}
                transition={
                  showLaugh
                    ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
                    : { type: "spring", stiffness: 600, damping: 10 }
                }
              />

              {/* sideburns */}
              <path d="M18 48 L 22 60 L 26 54 Z" fill="#2a1505" />
              <path d="M82 48 L 78 60 L 74 54 Z" fill="#2a1505" />

              {/* crown highlight */}
              <path d="M 28 18 Q 50 12 72 18 Q 50 22 28 18 Z" fill="#3a1f10" />

              {/* cheek blush */}
              {(showLaugh || showBlushAmbient) && (
                <>
                  <ellipse cx="32" cy="66" rx="4.5" ry="2.8" fill="#F4978E" opacity={showLaugh ? 0.7 : 0.32} />
                  <ellipse cx="68" cy="66" rx="4.5" ry="2.8" fill="#F4978E" opacity={showLaugh ? 0.7 : 0.32} />
                </>
              )}

              {/* ── eyebrows */}
              {renderBrows({ showThinking, peekActive, eyesTrackable, hover, reaction, errorMode })}

              {/* ── eyes */}
              {dazed ? (
                <>
                  <DazedEye cx={36} />
                  <DazedEye cx={64} />
                </>
              ) : (
                renderEyes({
                  showLaugh, blink, showThinking, isYawning, isSnoring,
                  reaction, errorMode, pupilOffset, eyesTrackable,
                })
              )}

              {/* ── mouth */}
              {dazed ? (
                <ellipse cx="50" cy="74" rx="3.5" ry="1.4" fill="#5B1F12" />
              ) : (
                renderMouth({
                  mood, mouthOpen, showLaugh, showThinking,
                  reaction, isYawning, isSnoring, errorMode,
                })
              )}

              {/* dazed stars orbiting overhead — appears on hit/fall */}
              {dazed && (
                <motion.g
                  style={{ transformOrigin: "50px 5px" }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
                >
                  <Star x={36} y={5} c="#FFE07A" />
                  <Star x={64} y={5} c="#F4978E" />
                  <Star x={50} y={-2} c="#A7D9EE" />
                </motion.g>
              )}

              {/* thinking dots */}
              {showThinking && (
                <g fill="#7A2F1F">
                  <motion.circle cx="74" cy="22" r="1.8"
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 1.1, repeat: Infinity, delay: 0 }} />
                  <motion.circle cx="80" cy="18" r="2.2"
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 1.1, repeat: Infinity, delay: 0.18 }} />
                  <motion.circle cx="87" cy="14" r="2.6"
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 1.1, repeat: Infinity, delay: 0.36 }} />
                </g>
              )}

              {/* laugh sparkles */}
              {showLaugh && (
                <g stroke="#B85A1E" strokeWidth="2" strokeLinecap="round" fill="none">
                  <line x1="18" y1="40" x2="13" y2="36" />
                  <line x1="82" y1="40" x2="87" y2="36" />
                  <line x1="14" y1="44" x2="9" y2="44" />
                  <line x1="86" y1="44" x2="91" y2="44" />
                </g>
              )}

              {/* surprise sparkle ring */}
              {reaction === "surprise" && (
                <g stroke="#B85A1E" strokeWidth="1.8" strokeLinecap="round" fill="none">
                  <line x1="50" y1="-2" x2="50" y2="3" />
                  <line x1="20" y1="6" x2="23" y2="11" />
                  <line x1="80" y1="6" x2="77" y2="11" />
                  <line x1="8" y1="22" x2="13" y2="22" />
                  <line x1="92" y1="22" x2="87" y2="22" />
                </g>
              )}

              {/* filmi sparkle */}
              {reaction === "filmi" && (
                <g stroke="#E8C36D" strokeWidth="2" strokeLinecap="round" fill="none">
                  <line x1="80" y1="36" x2="86" y2="30" />
                  <line x1="80" y1="36" x2="86" y2="42" />
                  <line x1="80" y1="36" x2="74" y2="34" />
                  <circle cx="80" cy="36" r="1.4" fill="#E8C36D" stroke="none" />
                </g>
              )}

              {/* sweat drop on right temple */}
              {reaction === "sweat" && (
                <motion.path
                  d="M 86 38 Q 84 44 86 48 Q 88 44 86 38 Z"
                  fill="#8FCFE6"
                  stroke="#4A8DAB" strokeWidth="0.6"
                  initial={{ y: -2, opacity: 0 }}
                  animate={{ y: [-2, 10, 14], opacity: [0, 1, 0] }}
                  transition={{ duration: 1.25, ease: "easeIn" }}
                />
              )}

              {/* tear sparkle at right eye corner */}
              {reaction === "tear" && (
                <g>
                  <motion.path
                    d="M 70 60 Q 69 64 70 66 Q 71 64 70 60 Z"
                    fill="#A7D9EE" stroke="#4A8DAB" strokeWidth="0.6"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: [0, 1, 1, 0], scale: [0.6, 1, 1, 0.8] }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                  />
                  <motion.circle
                    cx="74" cy="58" r="1.2" fill="#fff"
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1.2, repeat: 1 }}
                  />
                </g>
              )}

              {/* lightbulb floating above head */}
              {reaction === "lightbulb" && (
                <motion.g
                  initial={{ y: 6, opacity: 0 }}
                  animate={{ y: [6, -4, -4], opacity: [0, 1, 0] }}
                  transition={{ duration: 1.4, ease: "easeOut" }}
                >
                  <circle cx="76" cy="-4" r="4.8" fill="#FFE07A" stroke="#A87632" strokeWidth="0.8" />
                  <rect x="74" y="0" width="4" height="2" fill="#A87632" />
                  <g stroke="#FFE07A" strokeWidth="1.2" strokeLinecap="round">
                    <line x1="76" y1="-13" x2="76" y2="-10" />
                    <line x1="68" y1="-8" x2="70" y2="-6" />
                    <line x1="84" y1="-8" x2="82" y2="-6" />
                    <line x1="66" y1="-3" x2="69" y2="-3" />
                    <line x1="86" y1="-3" x2="83" y2="-3" />
                  </g>
                </motion.g>
              )}

              {/* chai cup at the mouth */}
              {reaction === "chai" && (
                <motion.g
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: [0, 1, 1, 0], y: [4, 0, 0, 0], rotate: [0, -18, -18, 0] }}
                  transition={{ duration: 1.7, ease: "easeInOut" }}
                  style={{ transformOrigin: "50px 76px" }}
                >
                  <ellipse cx="50" cy="74" rx="6" ry="2" fill="#3a1f10" />
                  <path d="M 44 74 L 46 80 Q 50 82 54 80 L 56 74 Z" fill="#5B2C0F" />
                  <ellipse cx="50" cy="74" rx="5" ry="1.3" fill="#8a3a06" />
                  {/* steam */}
                  <motion.path
                    d="M 48 70 Q 50 66 48 62"
                    stroke="rgba(255,255,255,0.6)" strokeWidth="1" fill="none" strokeLinecap="round"
                    animate={{ opacity: [0.6, 0.1, 0.6] }}
                    transition={{ duration: 0.9, repeat: Infinity }}
                  />
                  <motion.path
                    d="M 52 70 Q 54 66 52 62"
                    stroke="rgba(255,255,255,0.6)" strokeWidth="1" fill="none" strokeLinecap="round"
                    animate={{ opacity: [0.1, 0.6, 0.1] }}
                    transition={{ duration: 0.9, repeat: Infinity }}
                  />
                </motion.g>
              )}

              {/* snore zZz */}
              {isSnoring && (
                <motion.g
                  fill="#7A2F1F"
                  style={{ fontFamily: "monospace" }}
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <text x="74" y="14" fontSize="5">z</text>
                  <text x="80" y="9" fontSize="7">Z</text>
                  <text x="88" y="4" fontSize="9">z</text>
                </motion.g>
              )}

              {/* hand wave */}
              {waving && (
                <motion.g
                  style={{ transformOrigin: "82px 60px" }}
                  initial={{ opacity: 0, rotate: 0 }}
                  animate={{ opacity: [0, 1, 1, 0], rotate: [0, 25, -10, 25, -10, 0] }}
                  transition={{ duration: WAVE_DURATION / 1000, ease: "easeInOut" }}
                >
                  <ellipse cx="86" cy="60" rx="4" ry="5" fill="#FFE3C7" stroke="#D88E73" strokeWidth="0.8" />
                  <line x1="86" y1="55" x2="86" y2="50" stroke="#D88E73" strokeWidth="1.4" strokeLinecap="round" />
                  <line x1="89" y1="55" x2="91" y2="51" stroke="#D88E73" strokeWidth="1.4" strokeLinecap="round" />
                  <line x1="83" y1="55" x2="81" y2="51" stroke="#D88E73" strokeWidth="1.4" strokeLinecap="round" />
                </motion.g>
              )}
            </svg>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Render helpers — kept as plain functions so the JSX above stays scannable.
// ────────────────────────────────────────────────────────────────────────────

interface BrowProps {
  showThinking: boolean;
  peekActive: boolean;
  eyesTrackable: boolean;
  hover: boolean;
  reaction: GappuReaction | null;
  errorMode?: boolean;
}
function renderBrows({ showThinking, peekActive, eyesTrackable, hover, reaction, errorMode }: BrowProps) {
  // Precedence: error > surprise > filmi > thinking > peek > hover-lift > base.
  if (errorMode) {
    // Inner ends pulled down (worried V)
    return (
      <>
        <path d="M28 50 Q 34 56 42 50" fill="none" stroke="#2a1505" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M58 50 Q 66 56 72 50" fill="none" stroke="#2a1505" strokeWidth="2.6" strokeLinecap="round" />
      </>
    );
  }
  if (reaction === "surprise") {
    // Arched high
    return (
      <>
        <path d="M28 42 Q 34 36 42 42" fill="none" stroke="#2a1505" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M58 42 Q 66 36 72 42" fill="none" stroke="#2a1505" strokeWidth="2.6" strokeLinecap="round" />
      </>
    );
  }
  if (reaction === "filmi") {
    // One brow up (right side)
    return (
      <>
        <path d="M28 49 L 42 47" fill="none" stroke="#2a1505" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M58 44 Q 66 39 72 44" fill="none" stroke="#2a1505" strokeWidth="2.8" strokeLinecap="round" />
      </>
    );
  }
  if (showThinking) {
    return (
      <>
        <path d="M28 48 Q 34 42 42 50" fill="none" stroke="#2a1505" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M58 50 Q 66 42 72 48" fill="none" stroke="#2a1505" strokeWidth="2.6" strokeLinecap="round" />
      </>
    );
  }
  if (peekActive && eyesTrackable) {
    return (
      <>
        <path d="M28 46 Q 35 41 42 46" fill="none" stroke="#2a1505" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M58 46 Q 65 41 72 46" fill="none" stroke="#2a1505" strokeWidth="2.6" strokeLinecap="round" />
      </>
    );
  }
  // Base; lifts 2px when the cursor is over the avatar.
  const yShift = hover ? -2 : 0;
  return (
    <>
      <path d={`M28 ${49 + yShift} L 42 ${47 + yShift}`} fill="none" stroke="#2a1505" strokeWidth="2.8" strokeLinecap="round" />
      <path d={`M58 ${47 + yShift} L 72 ${49 + yShift}`} fill="none" stroke="#2a1505" strokeWidth="2.8" strokeLinecap="round" />
    </>
  );
}

interface EyeProps {
  showLaugh: boolean;
  blink: boolean;
  showThinking: boolean;
  isYawning: boolean;
  isSnoring: boolean;
  reaction: GappuReaction | null;
  errorMode?: boolean;
  pupilOffset: { x: number; y: number };
  eyesTrackable: boolean;
}
function renderEyes({
  showLaugh, blink, showThinking, isYawning, isSnoring,
  reaction, errorMode, pupilOffset, eyesTrackable,
}: EyeProps) {
  // Error: >_<
  if (errorMode) {
    return (
      <>
        <path d="M30 56 L 36 60 L 30 60" fill="none" stroke="#1a0a00" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M70 56 L 64 60 L 70 60" fill="none" stroke="#1a0a00" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </>
    );
  }
  // Yawn: squeezed shut lines
  if (isYawning) {
    return (
      <>
        <path d="M30 57 Q 36 53 42 57" fill="none" stroke="#1a0a00" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M58 57 Q 64 53 70 57" fill="none" stroke="#1a0a00" strokeWidth="2.6" strokeLinecap="round" />
      </>
    );
  }
  // Snore: flat closed lines
  if (isSnoring) {
    return (
      <>
        <line x1="30" y1="58" x2="42" y2="58" stroke="#1a0a00" strokeWidth="2.6" strokeLinecap="round" />
        <line x1="58" y1="58" x2="70" y2="58" stroke="#1a0a00" strokeWidth="2.6" strokeLinecap="round" />
      </>
    );
  }
  // Surprise: wide round circles with extra-bright highlight
  if (reaction === "surprise") {
    return (
      <>
        <ellipse cx="36" cy="58" rx="5.4" ry="5.4" fill="#fff" />
        <ellipse cx="64" cy="58" rx="5.4" ry="5.4" fill="#fff" />
        <circle cx="36" cy="58" r="3.6" fill="#1a0a00" />
        <circle cx="37" cy="56.5" r="1.6" fill="#fff" />
        <circle cx="64" cy="58" r="3.6" fill="#1a0a00" />
        <circle cx="65" cy="56.5" r="1.6" fill="#fff" />
      </>
    );
  }
  // Wink: left eye normal, right eye becomes a curve
  if (reaction === "wink") {
    return (
      <>
        <ellipse cx="36" cy="58" rx="4.6" ry="4.4" fill="#fff" />
        <circle cx="36" cy="58" r="3.2" fill="#1a0a00" />
        <circle cx="37" cy="56.8" r="1.1" fill="#fff" />
        <path d="M58 58 Q 64 55 70 58" fill="none" stroke="#1a0a00" strokeWidth="2.6" strokeLinecap="round" />
      </>
    );
  }
  if (showLaugh) {
    return (
      <>
        <path d="M28 56 Q 36 49 44 56" fill="none" stroke="#1a0a00" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M56 56 Q 64 49 72 56" fill="none" stroke="#1a0a00" strokeWidth="2.8" strokeLinecap="round" />
      </>
    );
  }
  if (blink) {
    return (
      <>
        <line x1="32" y1="58" x2="40" y2="58" stroke="#1a0a00" strokeWidth="2.8" strokeLinecap="round" />
        <line x1="60" y1="58" x2="68" y2="58" stroke="#1a0a00" strokeWidth="2.8" strokeLinecap="round" />
      </>
    );
  }
  if (showThinking) {
    return (
      <>
        <circle cx="36" cy="55" r="3.0" fill="#1a0a00" />
        <circle cx="64" cy="55" r="3.0" fill="#1a0a00" />
      </>
    );
  }
  // Trackable normal eyes
  if (!eyesTrackable) {
    // Defensive fallback — shouldn't be reached, but keep eyes drawn.
    return (
      <>
        <circle cx="36" cy="58" r="3" fill="#1a0a00" />
        <circle cx="64" cy="58" r="3" fill="#1a0a00" />
      </>
    );
  }
  return (
    <>
      <ellipse cx="36" cy="58" rx="4.6" ry="4.4" fill="#fff" />
      <ellipse cx="64" cy="58" rx="4.6" ry="4.4" fill="#fff" />
      <circle cx={36 + pupilOffset.x} cy={58 + pupilOffset.y} r="3.2" fill="#1a0a00" />
      <circle cx={37 + pupilOffset.x} cy={56.8 + pupilOffset.y} r="1.1" fill="#fff" />
      <circle cx={64 + pupilOffset.x} cy={58 + pupilOffset.y} r="3.2" fill="#1a0a00" />
      <circle cx={65 + pupilOffset.x} cy={56.8 + pupilOffset.y} r="1.1" fill="#fff" />
    </>
  );
}

interface MouthProps {
  mood: GappuMood;
  mouthOpen: boolean;
  showLaugh: boolean;
  showThinking: boolean;
  reaction: GappuReaction | null;
  isYawning: boolean;
  isSnoring: boolean;
  errorMode?: boolean;
}
function renderMouth({
  mood, mouthOpen, showLaugh, showThinking, reaction, isYawning, isSnoring, errorMode,
}: MouthProps) {
  if (errorMode) {
    return (
      <path d="M42 74 Q 46 71 50 74 Q 54 77 58 74" stroke="#7A2F1F" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    );
  }
  if (reaction === "chai") {
    // mouth gets hidden behind the cup overlay; draw a tiny neutral line
    return <line x1="48" y1="74" x2="52" y2="74" stroke="#7A2F1F" strokeWidth="2" strokeLinecap="round" />;
  }
  if (isYawning) {
    return <ellipse cx="50" cy="76" rx="5" ry="7" fill="#5B1F12" />;
  }
  if (isSnoring) {
    return <ellipse cx="50" cy="75" rx="3" ry="2" fill="#5B1F12" />;
  }
  if (reaction === "surprise") {
    return <circle cx="50" cy="75" r="3.2" fill="#5B1F12" />;
  }
  if (reaction === "wink" || reaction === "filmi") {
    // smirk — slight slant
    return (
      <path d="M42 74 Q 50 76 58 72" stroke="#7A2F1F" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    );
  }
  if (showLaugh) {
    return <path d="M38 71 Q 50 86 62 71 Q 60 74 50 78 Q 40 74 38 71 Z" fill="#7A2F1F" />;
  }
  if (mood === "talking") {
    return mouthOpen ? (
      <ellipse cx="50" cy="74" rx="6" ry="4.2" fill="#7A2F1F" />
    ) : (
      <path d="M43 73 Q 50 77 57 73" stroke="#7A2F1F" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    );
  }
  if (showThinking) {
    return <line x1="46" y1="73" x2="55" y2="74" stroke="#7A2F1F" strokeWidth="2.6" strokeLinecap="round" />;
  }
  if (mood === "smiling") {
    return <path d="M40 71 Q 50 80 60 71" stroke="#7A2F1F" strokeWidth="2.8" fill="none" strokeLinecap="round" />;
  }
  return <path d="M43 71 Q 50 76 57 71" stroke="#7A2F1F" strokeWidth="2.5" fill="none" strokeLinecap="round" />;
}

/** Dazed eye — two crossed strokes forming an X. */
function DazedEye({ cx }: { cx: number }) {
  return (
    <g stroke="#1a0a00" strokeWidth="2.4" strokeLinecap="round">
      <line x1={cx - 3.4} y1={55} x2={cx + 3.4} y2={61} />
      <line x1={cx - 3.4} y1={61} x2={cx + 3.4} y2={55} />
    </g>
  );
}

/** Five-pointed star drawn cheaply as a single fill path. */
function Star({ x, y, c }: { x: number; y: number; c: string }) {
  const r = 2.2;
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    points.push(`${x + Math.cos(ang) * rr},${y + Math.sin(ang) * rr}`);
  }
  return <polygon points={points.join(" ")} fill={c} />;
}
