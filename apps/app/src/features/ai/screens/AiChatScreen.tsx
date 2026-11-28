// Glife IA (tela /ia, aberta pelo botão do mascote): conversa com o agente. Ações aparecem como cartão com "Desfazer"; lixeira, dinheiro e lote
// pedem "Confirmar?" antes. O texto do usuário sai mascarado (ver agentTransport) e a resposta é mostrada com os
// dados reais repostos.
import { parseAttachmentPart } from "@glife/domain/ai";
import type { UIMessage } from "ai";
import {
  ArrowUp,
  ChevronLeft,
  SquarePen,
  Square,
  Sparkles,
} from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";

import { goBackOr } from "@/shared/navigation/backNavigation";
import {
  Alert,
  Card,
  Chip,
  EmptyState,
  IconButton,
  Input,
  Mascot,
  Screen,
  Spinner,
  Text,
  makeStyles,
  useTheme,
} from "@/shared/ui";

import { ActionCard } from "../components/ActionCard";
import {
  AttachButton,
  AttachmentChips,
  AttachmentTag,
  useAttachments,
} from "../components/Attachments";
import { ConfirmCard } from "../components/ConfirmCard";
import { useAiChat } from "../AiChatProvider";

const SUGGESTIONS = [
  "O que tenho na agenda hoje?",
  "Me lembra de comprar café amanhã às 9h",
  "Resumir minhas notas recentes",
];
const MESSAGE_MAX = 2000;

type Part = UIMessage["parts"][number];
const toolCallIdOf = (p: Part) =>
  p.type.startsWith("tool-")
    ? (p as { toolCallId?: string }).toolCallId
    : undefined;

export function AiChatScreen() {
  const s = useStyles();
  const t = useTheme();
  const chat = useAiChat();
  const [text, setText] = useState("");
  const files = useAttachments();
  const busy = chat.status === "submitted" || chat.status === "streaming";

  const send = (value = text) => {
    const v = value.trim().slice(0, MESSAGE_MAX);
    if ((!v && !files.items.length) || busy || files.reading) return;
    chat.clearError();
    void chat.send(v, files.items);
    setText("");
    files.clear();
  };

  const last = chat.messages[chat.messages.length - 1];
  const thinking =
    busy &&
    (!last ||
      last.role === "user" ||
      !last.parts.some((p) => p.type === "text" && p.text.trim()));

  return (
    <Screen
      header={
        <View style={s.header}>
          <IconButton
            icon={ChevronLeft}
            label="Voltar"
            variant="ghost"
            onPress={() => goBackOr("/")}
          />
          <Mascot size={t.size.iconButton - t.space[2.5]} />
          <View style={s.grow}>
            <Text variant="heading" accessibilityRole="header">
              Glife IA
            </Text>
            <Text variant="caption" tone="tertiary">
              Lê e organiza suas notas e sua agenda
            </Text>
          </View>
          <IconButton
            icon={SquarePen}
            label="Nova conversa"
            onPress={chat.newConversation}
          />
        </View>
      }
      footer={
        <View style={s.footer}>
          <AttachmentChips items={files.items} onRemove={files.remove} />
          <View style={s.composer}>
            <AttachButton
              onPress={() => void files.add()}
              reading={files.reading}
              disabled={busy || files.full}
            />
            <Input
              placeholder="Peça qualquer coisa…"
              value={text}
              onChangeText={setText}
              onSubmitEditing={() => send()}
              returnKeyType="send"
              maxLength={MESSAGE_MAX}
              accessibilityLabel="Mensagem para a Glife IA"
              style={s.grow}
            />
            {busy ? (
              <IconButton icon={Square} label="Parar" onPress={chat.stop} />
            ) : (
              <IconButton
                icon={ArrowUp}
                label="Enviar"
                onPress={() => send()}
                disabled={
                  (!text.trim() && !files.items.length) || files.reading
                }
              />
            )}
          </View>
        </View>
      }
    >
      {chat.messages.length === 0 && (
        <View style={s.empty}>
          <EmptyState
            title="Como posso ajudar?"
            message="Crio notas, lembretes e eventos, encontro o que você guardou e organizo sua agenda."
          />
          <View style={s.chips}>
            {SUGGESTIONS.map((q) => (
              <Chip key={q} label={q} icon={Sparkles} onPress={() => send(q)} />
            ))}
          </View>
        </View>
      )}

      {chat.messages.map((m) =>
        m.role === "user" ? (
          <View key={m.id} style={s.mineGroup}>
            <View style={[s.bubble, s.mine]}>
              <Text tone="onAccent">
                {m.parts
                  .map((p) =>
                    p.type === "text" && !parseAttachmentPart(p.text)
                      ? p.text
                      : "",
                  )
                  .join("")}
              </Text>
            </View>
            {m.parts.map((p, i) => {
              const file =
                p.type === "text" ? parseAttachmentPart(p.text) : null;
              return file ? (
                <AttachmentTag
                  key={i}
                  name={file.name}
                  size={file.text.length}
                />
              ) : null;
            })}
          </View>
        ) : (
          <View key={m.id} style={s.reply}>
            {m.parts.map((p, i) => {
              if (p.type === "text" && p.text.trim()) {
                return (
                  <Card key={i} padding="sm" style={s.bubble}>
                    <Text>{chat.unmask(p.text)}</Text>
                  </Card>
                );
              }
              const callId = toolCallIdOf(p);
              const entry = callId ? chat.actions[callId] : undefined;
              return entry ? (
                <ActionCard key={i} entry={entry} onUndo={chat.undo} />
              ) : null;
            })}
          </View>
        ),
      )}

      {chat.pending && <ConfirmCard pending={chat.pending} />}

      {thinking && !chat.pending && (
        <View style={s.thinking} accessibilityLabel="A Glife IA está pensando">
          <Spinner />
          <Text variant="small" tone="tertiary">
            Pensando…
          </Text>
        </View>
      )}

      {chat.limitReached && (
        <Alert tone="info">
          A Glife IA fez muitas ações seguidas e parou para você conferir. Diga
          se quer continuar.
        </Alert>
      )}

      {chat.error && <Alert tone="danger">{chat.error}</Alert>}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space[3],
    paddingVertical: t.space[2],
  },
  grow: { flex: 1 },
  empty: { gap: t.space[4] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: t.space[2] },
  bubble: { maxWidth: t.layout.chatBubbleMaxWidth, alignSelf: "flex-start" },
  mine: {
    alignSelf: "flex-end",
    backgroundColor: t.colors.accent,
    borderRadius: t.radius.field,
    paddingHorizontal: t.space[4],
    paddingVertical: t.space[2.5],
  },
  reply: { gap: t.space[2], alignItems: "flex-start" },
  thinking: { flexDirection: "row", alignItems: "center", gap: t.space[2] },
  footer: { gap: t.space[2] },
  composer: { flexDirection: "row", alignItems: "center", gap: t.space[2] },
  mineGroup: { alignItems: "flex-end", gap: t.space[1] },
}));
