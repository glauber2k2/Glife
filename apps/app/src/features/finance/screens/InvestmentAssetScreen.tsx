// Investimentos, tela 2: detalhe do ativo (protótipo 2a–2c) — valor atual, investido, resultado, cotação, gráfico,
// ações (Aporte, Resgate, Rendimento e, nos manuais, Cotação), histórico por mês e o menu ⋯ (editar, encerrar,
// excluir). Tudo com desfazer. Ao abrir, pede a cotação se estiver vencida (ações, FIIs e cripto).
import {
  ASSET_KIND_LABELS,
  accountBalance,
  assetPosition,
  isAutoQuoted,
  quoteSourceOf,
  type InvestmentMovement,
  type MovementKind,
} from "@glife/domain/finance";
import { keyOf } from "@glife/domain/quotes";
import { router, useLocalSearchParams } from "expo-router";
import { Archive, Ellipsis, Pencil, Trash2 } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import {
  BackHeader,
  Button,
  EmptyState,
  IconButton,
  ListGroup,
  Reveal,
  Screen,
  Sheet,
  Text,
  makeStyles,
  useTheme,
  useToast,
  type TextTone,
} from "@/shared/ui";

import { MovementSheet, type MovementDraft } from "../components/MovementSheet";
import {
  balance,
  dm,
  dmy,
  money,
  signed,
  todayIso,
  MONTH_NAMES,
} from "../components/format";
import {
  dayTime,
  pctSigned,
  quantityText,
} from "../components/investmentFormat";
import {
  AssetChart,
  MOVEMENT_LABELS,
  MovementRow,
  movementIcon,
  resultTone,
} from "../components/investmentRows";
import { ActionRow } from "../components/shoppingSheets";
import { useCountUp } from "../components/ui";
import { useFinance } from "../hooks/FinanceData";
import { useInvestments, useRefreshQuotes } from "../hooks/useInvestments";

const SOURCE_LABELS = { brapi: "B3", coingecko: "CoinGecko" } as const;
const SAVED: Record<MovementKind, string> = {
  contribution: "Aporte registrado",
  withdrawal: "Resgate registrado",
  income: "Rendimento registrado",
  quote: "Cotação atualizada",
};
const DELETED: Record<MovementKind, string> = {
  contribution: "Aporte excluído",
  withdrawal: "Resgate excluído",
  income: "Rendimento excluído",
  quote: "Cotação excluída",
};
const MONTH_SHORT = MONTH_NAMES.map((m) => m.slice(0, 3));
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const warn = (what: string) => (e: unknown) => console.warn(what, e);

export function InvestmentAssetScreen() {
  const s = useStyles();
  const t = useTheme();
  const toast = useToast();
  const today = todayIso();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repos, data } = useFinance();
  const snap = useInvestments();
  const { refreshing, refresh, notFound } = useRefreshQuotes(snap);
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState<{
    kind: MovementKind;
    editing: InvestmentMovement | null;
  } | null>(null);

  const asset = snap?.assets.find((a) => a.id === id) ?? null;
  const movements = useMemo(
    () =>
      snap && asset
        ? snap.movements.filter((m) => m.asset_id === asset.id)
        : [],
    [snap, asset],
  );
  const pos = asset ? assetPosition(asset, movements, today) : null;
  const current = useCountUp(pos?.current ?? 0);
  const accounts = useMemo(
    () =>
      (data?.accounts ?? [])
        .filter(
          (a) =>
            a.deleted_at === null && !a.archived && a.kind !== "credit_card",
        )
        .map((account) => ({
          account,
          balance: accountBalance(account, data!.transactions, data!.flows),
        })),
    [data],
  );
  const accountName = (accountId: string | null) =>
    accounts.find((a) => a.account.id === accountId)?.account.name;

  if (!snap) return <Screen>{null}</Screen>;
  if (!asset || !pos) {
    return (
      <Screen header={<BackHeader title="Investimento" fallback="/financas/investimentos" />}>
        <EmptyState
          title="Ativo não encontrado"
          mood="pensando"
          message="Este ativo não existe mais."
          actionLabel="Ver investimentos"
          onAction={() => router.replace("/financas/investimentos")}
        />
      </Screen>
    );
  }

  const auto = isAutoQuoted(asset.kind);
  const source = quoteSourceOf(asset.kind);
  const eyebrow = [
    ASSET_KIND_LABELS[asset.kind],
    asset.institution,
    pos.closed ? "Encerrado" : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const missing =
    !!source &&
    !!asset.quote_symbol &&
    notFound.has(keyOf({ source, symbol: asset.quote_symbol }));
  const quoteLine = missing
    ? `Código ${asset.quote_symbol} não encontrado na ${SOURCE_LABELS[source!]}. Confira em Editar.`
    : auto
      ? asset.last_price_at
        ? `Cotação de ${dayTime(asset.last_price_at)} · ${SOURCE_LABELS[source!]}`
        : "Aguardando a primeira cotação"
      : pos.lastQuoteDate
        ? `Última cotação em ${dmy(pos.lastQuoteDate)}`
        : "Sem cotação ainda";
  const unitPrice =
    asset.last_price_e8 !== null ? Math.round(asset.last_price_e8 / 1e6) : null;

  // Histórico por mês, mais recente primeiro.
  const history = [...movements].reverse();
  const months: { key: string; label: string; items: InvestmentMovement[] }[] =
    [];
  for (const m of history) {
    const key = m.date.slice(0, 7);
    let g = months.at(-1);
    if (!g || g.key !== key) {
      g = {
        key,
        label: `${capital(MONTH_NAMES[Number(key.slice(5, 7)) - 1]!)} ${key.slice(0, 4)}`,
        items: [],
      };
      months.push(g);
    }
    g.items.push(m);
  }

  const actions: MovementKind[] = auto
    ? ["contribution", "withdrawal", "income"]
    : ["contribution", "withdrawal", "income", "quote"];

  const saveMovement = async (draft: MovementDraft) => {
    const editing = sheet?.editing ?? null;
    try {
      if (editing) {
        const before = {
          kind: editing.kind,
          amount_cents: editing.amount_cents,
          quantity: editing.quantity,
          date: editing.date,
          account_id: editing.account_id,
          notes: editing.notes,
        };
        await repos.investments.updateMovement(editing.id, draft);
        setSheet(null);
        toast({
          message: "Movimento atualizado",
          actionLabel: "Desfazer",
          onAction: () =>
            void repos.investments
              .updateMovement(editing.id, before)
              .catch(warn("Falha ao desfazer")),
        });
      } else {
        const m = await repos.investments.addMovement({
          ...draft,
          asset_id: asset.id,
        });
        setSheet(null);
        toast({
          message: SAVED[m.kind],
          actionLabel: "Desfazer",
          onAction: () =>
            void repos.investments
              .removeMovement(m.id)
              .catch(warn("Falha ao desfazer")),
        });
      }
    } catch (e) {
      warn("Falha ao salvar o movimento")(e);
      toast({
        message:
          "Não foi possível salvar: confira o valor, a quantidade (até 8 casas) e se o resgate não passa das cotas.",
      });
    }
  };

  const deleteMovement = async (m: InvestmentMovement) => {
    setSheet(null);
    try {
      await repos.investments.removeMovement(m.id);
      toast({
        message: DELETED[m.kind],
        actionLabel: "Desfazer",
        onAction: () =>
          void repos.investments
            .restoreMovement(m.id)
            .catch(warn("Falha ao desfazer")),
      });
    } catch (e) {
      warn("Falha ao excluir o movimento")(e);
      toast({
        message:
          auto && m.kind === "contribution"
            ? "Não foi possível excluir: sem este aporte, as cotas ficariam negativas. Exclua o resgate antes."
            : "Não foi possível excluir o movimento.",
      });
    }
  };

  const close = async () => {
    setMenu(false);
    try {
      const m = await repos.investments.close(asset.id, today);
      toast({
        message: "Ativo encerrado",
        actionLabel: "Desfazer",
        onAction: () =>
          void repos.investments
            .removeMovement(m.id)
            .catch(warn("Falha ao desfazer")),
      });
    } catch (e) {
      warn("Falha ao encerrar")(e);
      toast({
        message:
          auto && !pos.hasPrice
            ? "Aguardando a primeira cotação para encerrar."
            : "Não foi possível encerrar: o ativo não tem valor a resgatar.",
      });
    }
  };

  const remove = async () => {
    setMenu(false);
    try {
      const ids = await repos.investments.removeAsset(asset.id);
      if (router.canGoBack()) router.back();
      else router.replace("/financas/investimentos");
      toast({
        message: "Ativo excluído",
        actionLabel: "Desfazer",
        onAction: () =>
          void repos.investments
            .restoreAsset(asset.id, ids)
            .catch(warn("Falha ao desfazer")),
      });
    } catch (e) {
      warn("Falha ao excluir o ativo")(e);
      toast({ message: "Não foi possível excluir o ativo." });
    }
  };

  return (
    <Screen>
      <BackHeader
        title={asset.name}
        subtitle={eyebrow}
        backLabel="Investimentos"
        fallback="/financas/investimentos"
        right={<IconButton icon={Ellipsis} label="Mais opções" onPress={() => setMenu(true)} />}
      />

      <Reveal>
        <View style={s.hero}>
          <Text variant="small" tone="tertiary">
            Valor atual
          </Text>
          <Text
            variant="big"
            numeric
            accessibilityLabel={`Valor atual ${money(pos.current)}`}
          >
            {balance(current)}
          </Text>
          <View style={s.quoteLine}>
            <Text
              variant="caption"
              tone={missing ? "warning" : "tertiary"}
              numeric
              style={s.shrink}
            >
              {quoteLine}
            </Text>
            {auto && !pos.closed && (
              <Pressable
                accessibilityRole="button"
                disabled={refreshing}
                onPress={() =>
                  void refresh(true).then(
                    (ok) =>
                      !ok &&
                      toast({
                        message:
                          "Não foi possível atualizar a cotação agora. Confira a conexão.",
                      }),
                  )
                }
                hitSlop={t.touch.hitSlop}
              >
                <Text variant="caption" tone="accent" style={s.semibold}>
                  {refreshing ? "Atualizando…" : "Atualizar"}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={[s.block, s.grid]}>
          <Stat label="Investido" value={money(pos.invested)} />
          <Stat
            label="Resultado"
            value={signed(pos.result)}
            sub={pctSigned(pos.pct)}
            tone={resultTone(pos.result)}
          />
          {auto && pos.units !== null && (
            <Stat
              label={asset.kind === "crypto" ? "Quantidade" : "Cotas"}
              value={quantityText(Math.max(pos.units, 0))}
            />
          )}
          {auto && unitPrice !== null && (
            <Stat
              label="Preço"
              value={unitPrice > 0 ? money(unitPrice) : "< R$ 0,01"}
            />
          )}
        </View>

        {pos.series.length > 1 && pos.firstDate && (
          <View style={s.block}>
            <AssetChart
              series={pos.series}
              from={`Desde ${MONTH_SHORT[Number(pos.firstDate.slice(5, 7)) - 1]}/${pos.firstDate.slice(2, 4)}`}
            />
          </View>
        )}

        <View style={[s.block, s.actions]}>
          {actions.map((k) => (
            <View key={k} style={s.action}>
              <Button
                label={MOVEMENT_LABELS[k]}
                variant="secondary"
                size="sm"
                fullWidth
                onPress={() => setSheet({ kind: k, editing: null })}
              />
            </View>
          ))}
        </View>

        <Text variant="heading" style={s.historyTitle}>
          Histórico
        </Text>
        {months.length === 0 ? (
          <EmptyState compact message="Nenhum movimento ainda. Comece por um aporte." />
        ) : (
          months.map((g) => (
            <View key={g.key} style={s.month}>
              <Text
                variant="small"
                tone="secondary"
                style={[s.semibold, s.monthLabel]}
              >
                {g.label}
              </Text>
              <ListGroup>
                {g.items.map((m) => {
                  const negative =
                    m.kind === "withdrawal" ||
                    (m.kind === "income" && m.amount_cents < 0);
                  const qty =
                    m.quantity !== null
                      ? `${quantityText(m.quantity)} ${asset.kind === "crypto" ? "un." : "cotas"}`
                      : "";
                  return (
                    <MovementRow
                      key={m.id}
                      icon={movementIcon(m.kind, m.amount_cents)}
                      label={MOVEMENT_LABELS[m.kind]}
                      sub={[dm(m.date), qty, accountName(m.account_id), m.notes]
                        .filter(Boolean)
                        .join(" · ")}
                      amount={
                        m.kind === "quote"
                          ? money(m.amount_cents)
                          : signed(
                              negative
                                ? -Math.abs(m.amount_cents)
                                : Math.abs(m.amount_cents),
                            )
                      }
                      muted={m.kind === "quote"}
                      onPress={() => setSheet({ kind: m.kind, editing: m })}
                    />
                  );
                })}
              </ListGroup>
            </View>
          ))
        )}
      </Reveal>

      <MovementSheet
        visible={!!sheet}
        asset={asset}
        movements={movements}
        accounts={accounts}
        editing={sheet?.editing ?? null}
        initialKind={sheet?.kind ?? "contribution"}
        today={today}
        onClose={() => setSheet(null)}
        onSave={saveMovement}
        onDelete={(m) => void deleteMovement(m)}
      />

      <Sheet
        visible={menu}
        onClose={() => setMenu(false)}
        title={asset.name}
        subtitle={`${money(pos.current)} · ${movements.length === 1 ? "1 movimento" : `${movements.length} movimentos`}`}
      >
        <Reveal>
          <ActionRow
            icon={Pencil}
            label="Editar"
            onPress={() => {
              setMenu(false);
              router.push({
                pathname: "/financas/investimento/editar/[id]",
                params: { id: asset.id },
              });
            }}
          />
          {!pos.closed && (
            <ActionRow
              icon={Archive}
              label="Encerrar"
              aside="Resgata o valor atual"
              onPress={() => void close()}
            />
          )}
          <ActionRow
            icon={Trash2}
            label="Excluir"
            tone="danger"
            color="danger"
            onPress={() => void remove()}
          />
        </Reveal>
      </Sheet>
    </Screen>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: TextTone;
}) {
  const s = useStyles();
  return (
    <View style={s.stat}>
      <Text variant="caption" tone="tertiary">
        {label}
      </Text>
      <Text tone={tone ?? "primary"} numeric style={s.statValue}>
        {value}
      </Text>
      {sub ? (
        <Text variant="caption" tone={tone ?? "tertiary"} numeric>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  semibold: { fontFamily: t.type.button.font },
  shrink: { flexShrink: 1 },
  hero: { gap: t.space[1.5] },
  quoteLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space[3],
    flexWrap: "wrap",
  },
  block: {
    backgroundColor: t.colors.card,
    borderRadius: t.radius.card,
    padding: t.space[4.5],
  },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: t.space[4] },
  stat: { width: "50%", paddingRight: t.space[3], gap: t.space[1] },
  statValue: { fontFamily: t.type.chip.font, fontSize: t.type.item.fontSize },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: t.space[3],
  },
  action: { width: "50%", padding: t.space[1] },
  historyTitle: { marginBottom: -t.space[3] },
  month: { gap: t.space[2] },
  monthLabel: {},
}));
