import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Display } from "../components/Display";
import { Eyebrow } from "../components/Eyebrow";
import { Hairline } from "../components/Hairline";
import { Script } from "../components/Script";
import { loadSession, sendChat, type ChatMessage } from "../lib/chat";
import {
  clearRecoveryCode,
  loadRecoveryCode,
  saveRecoveryCode,
} from "../lib/storage";
import { isRecoveryCode, normalizeCode } from "../lib/recovery-code";
import { colors, fonts, space } from "../lib/theme";

const OPENINGS = [
  "i had a hard day.",
  "i don't know where to begin.",
  "something is sitting heavy.",
  "i just need to talk.",
];

export default function Chat() {
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showCodePanel, setShowCodePanel] = useState(false);
  const [pasteCode, setPasteCode] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    (async () => {
      const stored = await loadRecoveryCode();
      if (stored) {
        setCode(stored);
        const history = await loadSession(stored);
        setMessages(history);
      }
    })();
  }, []);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages, sending]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    setInput("");
    setSending(true);

    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(next);

    try {
      const result = await sendChat({
        code,
        history: messages,
        message: content,
      });
      if (result.code && result.code !== code) {
        setCode(result.code);
        await saveRecoveryCode(result.code);
      }
      setMessages([...next, { role: "assistant", content: result.reply }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "something went wrong";
      setMessages([
        ...next,
        {
          role: "assistant",
          content: `(couldn't reach the companion right now — ${msg})`,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function applyPastedCode() {
    const c = normalizeCode(pasteCode);
    if (!isRecoveryCode(c)) return;
    setCode(c);
    await saveRecoveryCode(c);
    const history = await loadSession(c);
    setMessages(history);
    setShowCodePanel(false);
    setPasteCode("");
  }

  async function startFresh() {
    await clearRecoveryCode();
    setCode(null);
    setMessages([]);
    setShowCodePanel(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* mast */}
      <View style={styles.mast}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Eyebrow>← home</Eyebrow>
        </Pressable>
        <Eyebrow color={colors.aubergine}>vespers · session</Eyebrow>
        <Pressable onPress={() => setShowCodePanel((v) => !v)} hitSlop={12}>
          <Text style={styles.codeChip}>{code ?? "no code yet"}</Text>
        </Pressable>
      </View>
      <Hairline />

      {showCodePanel && <CodePanel
        pasteCode={pasteCode}
        setPasteCode={setPasteCode}
        onApply={applyPastedCode}
        onFresh={startFresh}
      />}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.transcript}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && !sending && (
            <View style={styles.openingsBlock}>
              <Display heading size={30} style={{ lineHeight: 38 }}>
                what's been{" "}
                <Script size={38}>weighing</Script>{" "}
                on you tonight?
              </Display>
              <Text style={styles.openingsHint}>
                or begin with a phrase —
              </Text>
              {OPENINGS.map((o) => (
                <Pressable
                  key={o}
                  onPress={() => send(o)}
                  style={({ pressed }) => [
                    styles.opening,
                    pressed && styles.openingPressed,
                  ]}
                >
                  <Display italic size={16} color={colors.ink}>
                    {o}
                  </Display>
                </Pressable>
              ))}
            </View>
          )}

          {messages.map((m, i) => (
            <View key={i} style={styles.line}>
              <Eyebrow style={{ width: 64, paddingTop: 4 }}>
                {m.role === "user" ? "you" : "vespers"}
              </Eyebrow>
              <Display
                italic={m.role === "user"}
                size={16}
                color={m.role === "user" ? colors.ink : colors.inkSoft}
                style={{ flex: 1, lineHeight: 26 }}
              >
                {m.content}
              </Display>
            </View>
          ))}

          {sending && (
            <View style={styles.line}>
              <Eyebrow style={{ width: 64, paddingTop: 4 }}>vespers</Eyebrow>
              <ActivityIndicator color={colors.aubergine} />
            </View>
          )}
        </ScrollView>

        {/* composer */}
        <Hairline />
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="say what you'd like to say…"
            placeholderTextColor={colors.margin}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <Pressable
            onPress={() => send(input)}
            disabled={!input.trim() || sending}
            style={({ pressed }) => [
              styles.send,
              (!input.trim() || sending) && styles.sendDisabled,
              pressed && styles.sendPressed,
            ]}
          >
            <Eyebrow color={colors.paper}>send →</Eyebrow>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function CodePanel({
  pasteCode,
  setPasteCode,
  onApply,
  onFresh,
}: {
  pasteCode: string;
  setPasteCode: (s: string) => void;
  onApply: () => void;
  onFresh: () => void;
}) {
  return (
    <View style={styles.codePanel}>
      <Text style={styles.codeHint}>
        this is your private recovery code. only you have it. paste another to
        continue an earlier conversation.
      </Text>
      <View style={styles.codeRow}>
        <TextInput
          style={styles.codeInput}
          placeholder="VESP-XXXX-XXXX"
          placeholderTextColor={colors.margin}
          autoCapitalize="characters"
          autoCorrect={false}
          value={pasteCode}
          onChangeText={setPasteCode}
        />
        <Pressable onPress={onApply} style={styles.codeBtn}>
          <Eyebrow color={colors.paper}>restore</Eyebrow>
        </Pressable>
      </View>
      <Pressable onPress={onFresh}>
        <Eyebrow color={colors.aubergine} style={{ marginTop: space.sm }}>
          start a fresh session →
        </Eyebrow>
      </Pressable>
      <Hairline style={{ marginTop: space.md }} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },

  mast: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.paper,
  },
  codeChip: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.ink,
    letterSpacing: 1.6,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.rule,
    backgroundColor: colors.paperDeep,
  },

  codePanel: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
    backgroundColor: colors.paperDeep,
  },
  codeHint: {
    fontFamily: fonts.sans,
    fontSize: 12.5,
    color: colors.margin,
    lineHeight: 19,
    marginBottom: space.sm,
  },
  codeRow: {
    flexDirection: "row",
    gap: space.sm,
    alignItems: "center",
  },
  codeInput: {
    flex: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    borderWidth: 1,
    borderColor: colors.rule,
    fontFamily: fonts.mono,
    color: colors.ink,
    fontSize: 14,
    letterSpacing: 2,
    backgroundColor: colors.paper,
  },
  codeBtn: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    backgroundColor: colors.aubergine,
  },

  transcript: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.md,
    gap: space.md,
    minHeight: "100%",
  },

  openingsBlock: {
    marginTop: space.lg,
    gap: space.md,
  },
  openingsHint: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    color: colors.margin,
    marginTop: space.lg,
  },
  opening: {
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    borderWidth: 1,
    borderColor: colors.rule,
    backgroundColor: colors.paperDeep,
  },
  openingPressed: {
    backgroundColor: colors.blush,
  },

  line: {
    flexDirection: "row",
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    gap: space.sm,
  },

  composer: {
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.paper,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 130,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    borderWidth: 1,
    borderColor: colors.rule,
    backgroundColor: colors.paperDeep,
    color: colors.ink,
    fontSize: 15,
    fontFamily: fonts.display,
    lineHeight: 22,
  },
  send: {
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    backgroundColor: colors.aubergine,
  },
  sendDisabled: { opacity: 0.4 },
  sendPressed: { backgroundColor: colors.violetInk },
});
