// Ícones das categorias e contas (o banco guarda o nome do ícone; aqui vira o componente Lucide) e as
// categorias padrão semeadas no primeiro uso.
import type { AccountKind, CategoryColor, CategoryKind } from '@glife/domain/finance';
import {
  ArrowLeftRight,
  Briefcase,
  Building2,
  Car,
  CircleDot,
  CreditCard,
  HandCoins,
  HeartHandshake,
  HeartPulse,
  House,
  Landmark,
  Music,
  PiggyBank,
  ShoppingBag,
  ShoppingCart,
  Sofa,
  Ticket,
  Tv,
  Utensils,
  Wallet,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

const ICONS: Record<string, LucideIcon> = {
  house: House,
  'shopping-cart': ShoppingCart,
  utensils: Utensils,
  car: Car,
  'heart-pulse': HeartPulse,
  sofa: Sofa,
  'shopping-bag': ShoppingBag,
  tv: Tv,
  ticket: Ticket,
  landmark: Landmark,
  briefcase: Briefcase,
  'hand-coins': HandCoins,
  wifi: Wifi,
  zap: Zap,
  'building-2': Building2,
  music: Music,
  'heart-handshake': HeartHandshake,
  'piggy-bank': PiggyBank,
  wallet: Wallet,
  'credit-card': CreditCard,
};

export const TRANSFER_ICON = ArrowLeftRight;

/** Ícone de uma categoria pelo nome gravado; desconhecido vira um ponto neutro. */
export const categoryIcon = (name: string | null | undefined): LucideIcon => (name && ICONS[name]) || CircleDot;

export const accountIcon = (kind: AccountKind): LucideIcon =>
  ({
    checking: Landmark,
    savings: PiggyBank,
    cash: Wallet,
    credit_card: CreditCard,
  })[kind];

export const ACCOUNT_KIND_LABEL: Record<AccountKind, string> = {
  checking: 'Conta corrente',
  savings: 'Poupança',
  cash: 'Carteira',
  credit_card: 'Cartão de crédito',
};

export interface DefaultCategory {
  key: string;
  name: string;
  kind: CategoryKind;
  color: CategoryColor;
  icon: string;
}

/** Semeadas uma vez por dono (id fixo por chave): a pessoa pode renomear ou arquivar depois. */
export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  {
    key: 'mercado',
    name: 'Mercado',
    kind: 'expense',
    color: 'sage',
    icon: 'shopping-cart',
  },
  {
    key: 'restaurantes',
    name: 'Restaurantes',
    kind: 'expense',
    color: 'clay',
    icon: 'utensils',
  },
  {
    key: 'transporte',
    name: 'Transporte',
    kind: 'expense',
    color: 'steel',
    icon: 'car',
  },
  {
    key: 'moradia',
    name: 'Moradia',
    kind: 'expense',
    color: 'slate',
    icon: 'house',
  },
  { key: 'casa', name: 'Casa', kind: 'expense', color: 'sand', icon: 'sofa' },
  {
    key: 'saude',
    name: 'Saúde',
    kind: 'expense',
    color: 'rose',
    icon: 'heart-pulse',
  },
  {
    key: 'compras',
    name: 'Compras',
    kind: 'expense',
    color: 'plum',
    icon: 'shopping-bag',
  },
  {
    key: 'lazer',
    name: 'Lazer',
    kind: 'expense',
    color: 'teal',
    icon: 'ticket',
  },
  {
    key: 'assinaturas',
    name: 'Assinaturas',
    kind: 'expense',
    color: 'steel',
    icon: 'tv',
  },
  {
    key: 'impostos',
    name: 'Impostos',
    kind: 'expense',
    color: 'slate',
    icon: 'landmark',
  },
  {
    key: 'salario',
    name: 'Salário',
    kind: 'income',
    color: 'sage',
    icon: 'briefcase',
  },
  {
    key: 'outras-receitas',
    name: 'Outras receitas',
    kind: 'income',
    color: 'teal',
    icon: 'hand-coins',
  },
];
