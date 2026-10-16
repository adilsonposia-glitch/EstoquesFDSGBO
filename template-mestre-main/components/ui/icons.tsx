'use client'

/**
 * Wrapper global de ícones.
 *
 * Reexporta cada ícone com o MESMO nome do `lucide-react`, mas cada um troca
 * automaticamente para o equivalente do Hugeicons quando o usuário escolhe
 * esse conjunto no preset. Assim, qualquer arquivo que antes importava de
 * `lucide-react` passa a respeitar a preferência global apenas trocando o
 * caminho do import para `@/components/ui/icons`.
 *
 * Para ícones sem equivalente no Hugeicons, mantém-se o Lucide como fallback.
 */

import {
  Alert02Icon,
  Analytics01Icon,
  ArrowDown01Icon,
  ArrowDownRight01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowUpRight01Icon,
  AtIcon,
  Building01Icon,
  Calendar03Icon,
  Cancel01Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  Database01Icon,
  Delete02Icon,
  Dollar01Icon,
  Download04Icon,
  GridViewIcon,
  InformationCircleIcon,
  Link01Icon,
  Mail01Icon,
  Menu01Icon,
  MinusSignIcon,
  Moon02Icon,
  PaintBoardIcon,
  PencilEdit02Icon,
  PlusSignIcon,
  RedoIcon,
  RefreshIcon,
  Search01Icon,
  Settings02Icon,
  ShoppingBag01Icon,
  ShoppingCart01Icon,
  SidebarLeft01Icon,
  Sun03Icon,
  Table01Icon,
  TextBoldIcon,
  TextItalicIcon,
  TextUnderlineIcon,
  Tick02Icon,
  UndoIcon,
  UnfoldMoreIcon,
  Upload04Icon,
  UserAdd01Icon,
  UserCheck01Icon,
  UserMultipleIcon,
} from 'hugeicons-react'
import {
  AlertTriangle as LAlertTriangle,
  ArrowDown as LArrowDown,
  ArrowDownRight as LArrowDownRight,
  ArrowRight as LArrowRight,
  ArrowUp as LArrowUp,
  ArrowUpRight as LArrowUpRight,
  AtSign as LAtSign,
  BarChart3 as LBarChart3,
  Bold as LBold,
  Building2 as LBuilding2,
  CalendarDays as LCalendarDays,
  Check as LCheck,
  CheckCircle2 as LCheckCircle2,
  ChevronLeft as LChevronLeft,
  ChevronRight as LChevronRight,
  ChevronsUpDown as LChevronsUpDown,
  Component as LComponent,
  Copy as LCopy,
  Database as LDatabase,
  DollarSign as LDollarSign,
  Download as LDownload,
  Info as LInfo,
  Italic as LItalic,
  LayoutGrid as LLayoutGrid,
  Link2 as LLink2,
  type LucideProps,
  Mail as LMail,
  Menu as LMenu,
  Minus as LMinus,
  Moon as LMoon,
  Palette as LPalette,
  PanelLeft as LPanelLeft,
  Pencil as LPencil,
  Plus as LPlus,
  Redo2 as LRedo2,
  RotateCcw as LRotateCcw,
  Search as LSearch,
  Settings2 as LSettings2,
  ShoppingBag as LShoppingBag,
  ShoppingCart as LShoppingCart,
  Sun as LSun,
  Table as LTable,
  Trash2 as LTrash2,
  Underline as LUnderline,
  Undo2 as LUndo2,
  Upload as LUpload,
  UserCheck as LUserCheck,
  UserPlus as LUserPlus,
  Users as LUsers,
  X as LX,
  XCircle as LXCircle,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { useIconSet } from '@/components/providers/icon-set-provider'

// As props expostas seguem o Lucide (className, size, strokeWidth, etc.),
// garantindo total compatibilidade com os usos existentes.
export type IconProps = LucideProps

/**
 * Cria um ícone que troca entre Lucide e Hugeicons conforme o preset.
 * O componente Hugeicons é opcional: quando ausente, usa-se sempre o Lucide.
 */
function createIcon(
  Lucide: ComponentType<IconProps>,
  Huge?: ComponentType<IconProps>,
): ComponentType<IconProps> {
  function ThemedIcon(props: IconProps) {
    const { iconSet } = useIconSet()
    const Cmp =
      iconSet === 'hugeicons' && Huge
        ? Huge
        : (Lucide as ComponentType<IconProps>)
    return <Cmp {...props} />
  }
  return ThemedIcon
}

// O cast para ComponentType<IconProps> é seguro: em runtime ambos recebem
// className/size e renderizam um <svg>; os tipos divergem apenas no nível do TS.
const huge = (c: unknown) => c as ComponentType<IconProps>

export const AlertTriangle = createIcon(LAlertTriangle, huge(Alert02Icon))
export const ArrowDown = createIcon(LArrowDown, huge(ArrowDown01Icon))
export const ArrowDownRight = createIcon(
  LArrowDownRight,
  huge(ArrowDownRight01Icon),
)
export const ArrowRight = createIcon(LArrowRight, huge(ArrowRight01Icon))
export const ArrowUp = createIcon(LArrowUp, huge(ArrowUp01Icon))
export const ArrowUpRight = createIcon(LArrowUpRight, huge(ArrowUpRight01Icon))
export const AtSign = createIcon(LAtSign, huge(AtIcon))
export const BarChart3 = createIcon(LBarChart3, huge(Analytics01Icon))
export const Bold = createIcon(LBold, huge(TextBoldIcon))
export const Building2 = createIcon(LBuilding2, huge(Building01Icon))
export const CalendarDays = createIcon(LCalendarDays, huge(Calendar03Icon))
export const Check = createIcon(LCheck, huge(Tick02Icon))
export const CheckCircle2 = createIcon(
  LCheckCircle2,
  huge(CheckmarkCircle02Icon),
)
export const ChevronLeft = createIcon(LChevronLeft, huge(ArrowLeft01Icon))
export const ChevronRight = createIcon(LChevronRight, huge(ArrowRight01Icon))
export const ChevronsUpDown = createIcon(LChevronsUpDown, huge(UnfoldMoreIcon))
export const Component = createIcon(LComponent, huge(GridViewIcon))
export const Copy = createIcon(LCopy, huge(Copy01Icon))
export const Database = createIcon(LDatabase, huge(Database01Icon))
export const DollarSign = createIcon(LDollarSign, huge(Dollar01Icon))
export const Download = createIcon(LDownload, huge(Download04Icon))
export const Info = createIcon(LInfo, huge(InformationCircleIcon))
export const Italic = createIcon(LItalic, huge(TextItalicIcon))
export const LayoutGrid = createIcon(LLayoutGrid, huge(GridViewIcon))
export const Link2 = createIcon(LLink2, huge(Link01Icon))
export const Mail = createIcon(LMail, huge(Mail01Icon))
export const Menu = createIcon(LMenu, huge(Menu01Icon))
export const Minus = createIcon(LMinus, huge(MinusSignIcon))
export const Moon = createIcon(LMoon, huge(Moon02Icon))
export const Palette = createIcon(LPalette, huge(PaintBoardIcon))
export const PanelLeft = createIcon(LPanelLeft, huge(SidebarLeft01Icon))
export const Pencil = createIcon(LPencil, huge(PencilEdit02Icon))
export const Plus = createIcon(LPlus, huge(PlusSignIcon))
export const Redo2 = createIcon(LRedo2, huge(RedoIcon))
export const RotateCcw = createIcon(LRotateCcw, huge(RefreshIcon))
export const Search = createIcon(LSearch, huge(Search01Icon))
export const Settings2 = createIcon(LSettings2, huge(Settings02Icon))
export const ShoppingBag = createIcon(LShoppingBag, huge(ShoppingBag01Icon))
export const ShoppingCart = createIcon(LShoppingCart, huge(ShoppingCart01Icon))
export const Sun = createIcon(LSun, huge(Sun03Icon))
export const Table = createIcon(LTable, huge(Table01Icon))
export const Trash2 = createIcon(LTrash2, huge(Delete02Icon))
export const Underline = createIcon(LUnderline, huge(TextUnderlineIcon))
export const Undo2 = createIcon(LUndo2, huge(UndoIcon))
export const Upload = createIcon(LUpload, huge(Upload04Icon))
export const UserCheck = createIcon(LUserCheck, huge(UserCheck01Icon))
export const UserPlus = createIcon(LUserPlus, huge(UserAdd01Icon))
export const Users = createIcon(LUsers, huge(UserMultipleIcon))
export const X = createIcon(LX, huge(Cancel01Icon))
export const XCircle = createIcon(LXCircle, huge(CancelCircleIcon))
