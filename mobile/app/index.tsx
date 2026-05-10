import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Display } from "../components/Display";
import { Eyebrow } from "../components/Eyebrow";
import { Hairline } from "../components/Hairline";
import { Reveal } from "../components/Reveal";
import { Script } from "../components/Script";
import { SectionShell } from "../components/SectionShell";
import { Wordmark } from "../components/Wordmark";
import { loadRecoveryCode } from "../lib/storage";
import { colors, fonts, space } from "../lib/theme";

const STAMP = ["no login", "no account", "anonymous", "private code"];

export default function Landing() {
  const router = useRouter();
  const [hasCode, setHasCode] = useState(false);

  useEffect(() => {
    loadRecoveryCode().then((c) => setHasCode(Boolean(c)));
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <MovementOpen onEnter={() => router.push("/chat")} hasCode={hasCode} />
        <MovementWhisper />
        <MovementLetter />
        <MovementCompanion />
        <MovementIndex />
        <MovementUnsigned />
        <MovementClose onEnter={() => router.push("/chat")} hasCode={hasCode} />
        <Footnote />
      </ScrollView>
    </SafeAreaView>
  );
}

// ───────────────────────────────────────────────────────────── MOVEMENT 00

function MovementOpen({
  onEnter,
  hasCode,
}: {
  onEnter: () => void;
  hasCode: boolean;
}) {
  return (
    <View style={styles.openPad}>
      {/* mast */}
      <View style={styles.mast}>
        <Eyebrow>Vespers — est. for difficult evenings</Eyebrow>
        <Pressable onPress={onEnter} hitSlop={12}>
          <Eyebrow color={colors.ink}>enter →</Eyebrow>
        </Pressable>
      </View>

      {/* wordmark */}
      <View style={styles.wordmarkWrap}>
        <Wordmark size={104} />
      </View>

      {/* letterpress dateline */}
      <Hairline />
      <View style={styles.stamp}>
        {STAMP.map((label, i) => (
          <View key={label} style={styles.stampRow}>
            <Eyebrow color={colors.aubergine} spacing={2.6} size={11}>
              {label}
            </Eyebrow>
            {i < STAMP.length - 1 && (
              <Text style={styles.stampDot}>·</Text>
            )}
          </View>
        ))}
      </View>

      {/* opener */}
      <Reveal delay={0.1}>
        <Display italic size={22} style={styles.opener}>
          a quiet place for stress, anxiety, sadness, and the tangled days.
        </Display>
        <Text style={styles.openerSub}>
          no sign-up. nothing leaves the room.
        </Text>
      </Reveal>

      {/* recovery-code specimen */}
      <Reveal delay={0.2}>
        <View style={styles.specimen}>
          <Eyebrow style={{ marginBottom: space.sm }}>your private thread</Eyebrow>
          <Text style={styles.specimenCode}>
            {hasCode ? "VESP-•••• -••••" : "VESP-7Q9F-X41M"}
          </Text>
          <Hairline style={{ marginTop: space.sm }} />
          <Text style={styles.specimenNote}>
            a specimen. yours is generated on the first message, kept only by
            you.
          </Text>
        </View>
      </Reveal>

      {/* footer */}
      <View style={styles.openFooter}>
        <Eyebrow>vol. i  ·  ten movements</Eyebrow>
        <Eyebrow color={colors.margin} style={{ opacity: 0.7 }}>
          scroll, slowly ↓
        </Eyebrow>
      </View>
    </View>
  );
}

// ───────────────────────────────────────────────────────────── MOVEMENT 01

function MovementWhisper() {
  return (
    <SectionShell number="01" title="the whisper">
      <Reveal>
        <Display heading size={44}>
          what's been{" "}
          <Script size={56} style={{ color: colors.aubergine }}>
            weighing
          </Script>{" "}
          on you tonight?
        </Display>
      </Reveal>
      <Reveal delay={0.15}>
        <Text style={styles.margin}>
          there is no correct answer, and no one waiting for one. the question
          is the door, not the test.
        </Text>
      </Reveal>
    </SectionShell>
  );
}

// ───────────────────────────────────────────────────────────── MOVEMENT 02

function MovementLetter() {
  return (
    <SectionShell number="02" title="the letter">
      <Reveal>
        <View style={styles.letterPara}>
          <Text style={styles.dropCap}>S</Text>
          <Display size={18} style={styles.letterBody}>
            ome evenings, the noise inside the head outpaces the noise outside.
            The day asks more than it gave back. A small thing tilts, and an
            older feeling — long-shelved — wakes up and walks the hallway. You
            do not need to know its name to be tired of it. You only need
            somewhere to set it down for a moment.
          </Display>
        </View>
      </Reveal>

      <Reveal delay={0.08}>
        <Display size={18} style={styles.letterBodyBlock}>
          Vespers is that place. Not a clinic, not a feed, not a friend who has
          their own week to carry. A{" "}
          <Script size={26}>quiet</Script> room with the light low,
          where the words can come out a little crooked and still be received.
          We listen first.
        </Display>
      </Reveal>

      <Reveal delay={0.16}>
        <Display size={18} style={styles.letterBodyBlock}>
          Whatever you bring stays linked to a private recovery code that only
          you keep. No account, no inbox, no audience. The next time you
          return, the conversation does too — gently — so you don't have to
          retell what already cost something to say. You are{" "}
          <Script size={26}>heard</Script>, and remembered, in proportion.
        </Display>
      </Reveal>

      <Reveal delay={0.22}>
        <View style={styles.signoff}>
          <View style={styles.signoffRule} />
          <Eyebrow>signed,  vespers</Eyebrow>
        </View>
      </Reveal>
    </SectionShell>
  );
}

// ───────────────────────────────────────────────────────────── MOVEMENT 04

function MovementCompanion() {
  const SCRIPT: { who: "you" | "vespers"; text: string }[] = [
    { who: "you", text: "i don't even know what i'm feeling tonight." },
    {
      who: "vespers",
      text:
        "that's a real place to begin. let's not name it yet. tell me what the last hour felt like in your body — tight, heavy, restless, hollow?",
    },
    { who: "you", text: "heavy. like i'm standing in cold water." },
    {
      who: "vespers",
      text:
        "that's a precise image — keep it. heavy and cold often arrive when something asked too much of you today.",
    },
  ];

  return (
    <SectionShell number="04" title="the companion">
      <Reveal>
        <Display heading size={36}>
          no chat ui.{"\n"}just a{" "}
          <Script size={44}>conversation</Script>
          {"\n"}written down.
        </Display>
      </Reveal>
      <Reveal delay={0.1}>
        <Text style={styles.margin}>
          vespers responds slowly, in full sentences, the way a thoughtful
          person would. there are no buttons to press, no moods to pick from a
          grid.
        </Text>
      </Reveal>

      <Reveal delay={0.2}>
        <View style={styles.transcript}>
          <View style={styles.transcriptHead}>
            <Eyebrow>transcript · session no. 14</Eyebrow>
            <Eyebrow>vesp·7Q9F·X41M</Eyebrow>
          </View>

          {SCRIPT.map((line, i) => (
            <View key={i} style={styles.transcriptLine}>
              <Eyebrow style={{ width: 56, paddingTop: 4 }}>{line.who}</Eyebrow>
              <Display
                italic={line.who === "you"}
                size={15}
                color={line.who === "you" ? colors.ink : colors.inkSoft}
                style={{ flex: 1, lineHeight: 26 }}
              >
                {line.text}
              </Display>
            </View>
          ))}

          <Hairline style={{ marginTop: space.md }} />
          <View style={styles.transcriptFoot}>
            <Eyebrow>end of excerpt</Eyebrow>
            <Eyebrow>paper · loose-leaf</Eyebrow>
          </View>
        </View>
      </Reveal>
    </SectionShell>
  );
}

// ───────────────────────────────────────────────────────────── MOVEMENT 05

function MovementIndex() {
  const ENTRIES = [
    { n: "01", topic: "stress, the recurring kind", gloss: "the day-after-day weight you stopped naming", page: "p. 14" },
    { n: "02", topic: "overthinking", gloss: "the loop that won't take a breath", page: "p. 22" },
    { n: "03", topic: "anxiety, before the thing", gloss: "the body's rehearsal of a future not yet here", page: "p. 31" },
    { n: "04", topic: "grief, of every size", gloss: "for losses both named and quietly carried", page: "p. 40" },
    { n: "05", topic: "loneliness, in a crowd", gloss: "the ache that is not solved by company alone", page: "p. 49" },
    { n: "06", topic: "burnout", gloss: "what arrives after caring for too long without rest", page: "p. 58" },
    { n: "07", topic: "the numb days", gloss: "when feelings refuse the door — that is also a feeling", page: "p. 67" },
    { n: "08", topic: "trauma, gently", gloss: "approached only at the pace you choose", page: "p. 76" },
    { n: "09", topic: "the ordinary tangle", gloss: "for nothing-in-particular days that still feel heavy", page: "p. 85" },
  ];

  return (
    <SectionShell number="05" title="the index">
      <Reveal>
        <Display heading size={36}>
          things vespers can hold{"\n"}
          <Display heading italic size={36} color={colors.margin}>
            — a contents page.
          </Display>
        </Display>
      </Reveal>

      <View style={{ marginTop: space.xl }}>
        {ENTRIES.map((e, i) => (
          <Reveal key={e.n} delay={i * 0.04}>
            {i > 0 && <Hairline />}
            <View style={styles.indexRow}>
              <Display
                size={18}
                color={colors.aubergine}
                style={{ width: 36, paddingTop: 2 }}
              >
                {e.n}
              </Display>
              <View style={{ flex: 1 }}>
                <Display size={20} style={{ lineHeight: 28 }}>
                  {e.topic}
                </Display>
                <Display
                  italic
                  size={13}
                  color={colors.margin}
                  style={{ marginTop: 4, lineHeight: 20 }}
                >
                  {e.gloss}
                </Display>
              </View>
              <Display size={13} color={colors.margin}>
                {e.page}
              </Display>
            </View>
          </Reveal>
        ))}
        <Hairline />
      </View>
    </SectionShell>
  );
}

// ───────────────────────────────────────────────────────────── MOVEMENT 07

function MovementUnsigned() {
  const TENETS = [
    {
      n: "i",
      head: "no account, no inbox.",
      body:
        "you write under no name. there is no email, no profile, no signed-in self. you arrive as you are; you stay anonymous, even to us.",
    },
    {
      n: "ii",
      head: "one private code, only yours.",
      body:
        "your recovery code is the only thread back to your conversation. only you hold it. lose it, and the thread closes with you.",
    },
    {
      n: "iii",
      head: "what we never store.",
      body:
        "no passwords. no payment details. no addresses, phone numbers, or government identifiers. if you mention them, vespers gently steers the conversation back — and stores nothing.",
    },
    {
      n: "iv",
      head: "no audience, no analytics on you.",
      body:
        "your words are not tracked across the web, sold, or surfaced to any feed. nothing you say leaves the room except the room itself.",
    },
  ];

  return (
    <SectionShell number="07" title="the unsigned">
      <Reveal>
        <Display heading size={40}>
          the conversation is{" "}
          <Script size={50}>yours,</Script>
          {"\n"}no signature required.
        </Display>
      </Reveal>
      <Reveal delay={0.08}>
        <Text style={styles.margin}>
          vespers is anonymous by design. there is nothing to log into and
          nothing to log out of — just a private recovery code that only you
          keep, and a conversation that travels nowhere else.
        </Text>
      </Reveal>

      <View style={{ marginTop: space.xl }}>
        {TENETS.map((t, i) => (
          <Reveal key={t.n} delay={i * 0.06}>
            <Hairline />
            <View style={styles.tenet}>
              <Display
                italic
                size={18}
                color={colors.aubergine}
                style={{ width: 32 }}
              >
                {t.n}.
              </Display>
              <View style={{ flex: 1 }}>
                <Display size={20} style={{ lineHeight: 28 }}>
                  {t.head}
                </Display>
                <Display
                  size={14.5}
                  color={colors.inkSoft}
                  style={{ marginTop: 8, lineHeight: 24 }}
                >
                  {t.body}
                </Display>
              </View>
            </View>
          </Reveal>
        ))}
        <Hairline />
      </View>

      <Reveal delay={0.16}>
        <Display
          italic
          size={16}
          color={colors.margin}
          style={styles.unsignedColophon}
        >
          unsigned, unread, unstored — except by you, and the quiet model that
          replies in the moment.
        </Display>
      </Reveal>
    </SectionShell>
  );
}

// ───────────────────────────────────────────────────────────── MOVEMENT 08

function MovementClose({
  onEnter,
  hasCode,
}: {
  onEnter: () => void;
  hasCode: boolean;
}) {
  return (
    <SectionShell number="08" title="the quiet close">
      <Reveal>
        <Display heading size={44}>
          when you're ready,{"\n"}there's a{" "}
          <Script size={56}>quiet</Script>{" "}
          place.
        </Display>
      </Reveal>

      <Reveal delay={0.12}>
        <Pressable onPress={onEnter} style={styles.cta} hitSlop={8}>
          <Display size={22} color={colors.ink}>
            → {hasCode ? "continue your session" : "begin a session"}
          </Display>
          <View style={styles.ctaRule} />
        </Pressable>

        <Text style={styles.margin}>
          a private recovery code is generated on your first message. save it,
          and the conversation will remember itself, only for you.
        </Text>

        <Eyebrow style={{ marginTop: space.md }}>
          no account, no inbox, no audience.
        </Eyebrow>
      </Reveal>
    </SectionShell>
  );
}

// ───────────────────────────────────────────────────────────── FOOTNOTE

function Footnote() {
  return (
    <View>
      <Hairline />
      <View style={styles.footnote}>
        <Reveal>
          <Wordmark size={48} />
          <Text style={styles.footnoteBlurb}>
            a calm, premium emotional wellness companion. anonymous, unsigned,
            and listening — slowly — since the year you needed it.
          </Text>
        </Reveal>

        <View style={styles.footnoteList}>
          {[
            "vespers is a wellness companion, not a substitute for medical or psychiatric care.",
            "if you are in crisis, please contact local emergency services or a trusted person near you.",
            "conversations are linked to a private recovery code only you keep. no accounts.",
            "no passwords, financial data, or government identifiers are ever stored.",
          ].map((line, i) => (
            <View key={i} style={styles.footnoteItem}>
              <Display size={14} color={colors.aubergine} style={{ width: 22 }}>
                {["¹", "²", "³", "⁴"][i]}
              </Display>
              <Text style={styles.footnoteItemText}>{line}</Text>
            </View>
          ))}
        </View>

        <Hairline style={{ marginTop: space.xl }} />
        <View style={styles.footnoteCols}>
          <Eyebrow>© vespers · vol. i</Eyebrow>
          <Eyebrow>set in fraunces · allura · inter</Eyebrow>
        </View>
      </View>
    </View>
  );
}

// ───────────────────────────────────────────────────────────── STYLES

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { flex: 1, backgroundColor: colors.paper },
  content: { backgroundColor: colors.paper },

  // — open
  openPad: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.xl,
    backgroundColor: colors.paper,
    minHeight: 700,
    justifyContent: "space-between",
  },
  mast: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: space.xl,
  },
  wordmarkWrap: {
    marginVertical: space.xl,
  },
  stamp: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingTop: space.sm + 2,
    columnGap: space.md,
    rowGap: 6,
    alignItems: "center",
  },
  stampRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  stampDot: {
    color: colors.margin,
    opacity: 0.5,
    fontSize: 10,
    marginLeft: -space.sm,
  },
  opener: {
    marginTop: space.xl,
    color: colors.ink,
    lineHeight: 32,
  },
  openerSub: {
    fontFamily: fonts.sans,
    fontSize: 14.5,
    color: colors.margin,
    marginTop: space.sm,
    lineHeight: 22,
  },
  specimen: {
    marginTop: space.xl,
    paddingTop: space.md,
  },
  specimenCode: {
    fontFamily: fonts.mono,
    fontSize: 15,
    letterSpacing: 3.3,
    color: colors.ink,
    paddingBottom: space.sm,
  },
  specimenNote: {
    fontFamily: fonts.sans,
    fontSize: 12.5,
    color: colors.margin,
    lineHeight: 19,
    marginTop: space.sm,
  },
  openFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: space.xl,
  },

  // — letter
  letterPara: {
    position: "relative",
  },
  dropCap: {
    fontFamily: fonts.displayMedium,
    fontSize: 92,
    lineHeight: 76,
    color: colors.aubergine,
    position: "absolute",
    left: 0,
    top: -4,
    width: 64,
  },
  letterBody: {
    paddingLeft: 60,
    minHeight: 76,
    lineHeight: 30,
  },
  letterBodyBlock: {
    marginTop: space.md,
    lineHeight: 30,
    color: colors.ink,
  },
  signoff: {
    marginTop: space.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  signoffRule: {
    width: 40,
    height: 1,
    backgroundColor: colors.rule,
  },

  // — companion
  transcript: {
    marginTop: space.xl,
    backgroundColor: colors.paperDeep,
    borderWidth: 1,
    borderColor: colors.rule,
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
  },
  transcriptHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: space.md,
  },
  transcriptLine: {
    flexDirection: "row",
    paddingVertical: space.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    gap: space.sm,
  },
  transcriptFoot: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: space.sm,
  },

  // — index
  indexRow: {
    flexDirection: "row",
    paddingVertical: space.md,
    gap: space.md,
    alignItems: "flex-start",
  },

  // — unsigned
  tenet: {
    flexDirection: "row",
    paddingTop: space.lg,
    paddingBottom: space.lg,
    gap: space.sm,
  },
  unsignedColophon: {
    marginTop: space.xl,
    textAlign: "center",
    paddingHorizontal: space.md,
    lineHeight: 26,
  },

  // — close
  cta: {
    marginTop: space.xl,
    marginBottom: space.md,
    paddingVertical: space.sm,
    alignSelf: "flex-start",
  },
  ctaRule: {
    height: 1,
    backgroundColor: colors.ink,
    marginTop: 4,
  },

  // — shared
  margin: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.margin,
    lineHeight: 22,
    marginTop: space.lg,
  },

  // — footnote
  footnote: {
    paddingHorizontal: space.lg,
    paddingVertical: space.xxl,
    backgroundColor: colors.paper,
  },
  footnoteBlurb: {
    fontFamily: fonts.sans,
    fontSize: 13.5,
    color: colors.inkSoft,
    lineHeight: 23,
    marginTop: space.md,
    maxWidth: 320,
  },
  footnoteList: {
    marginTop: space.xl,
    gap: space.sm,
  },
  footnoteItem: {
    flexDirection: "row",
    gap: space.sm,
  },
  footnoteItemText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.margin,
    lineHeight: 22,
  },
  footnoteCols: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: space.md,
    marginTop: space.lg,
  },
});
