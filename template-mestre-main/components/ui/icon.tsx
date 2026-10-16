'use client'

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Analytics01Icon,
  Cancel01Icon,
  DashboardSquare01Icon,
  File01Icon,
  Folder01Icon,
  GridViewIcon,
  Logout01Icon,
  Menu01Icon,
  Notification01Icon,
  Settings01Icon,
  SparklesIcon,
  UserCircleIcon,
  UserMultipleIcon,
  UserSettings01Icon,
} from 'hugeicons-react'
import {
  BarChart3,
  Bell,
  Boxes,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Folder,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  User,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { useIconSet } from '@/components/providers/icon-set-provider'
import type { IconName } from '@/lib/icon-set'

type IconComponent = ComponentType<{ className?: string }>

/**
 * Registro semântico: cada nome aponta para o componente equivalente em cada
 * biblioteca. Para suportar uma nova biblioteca, basta adicionar uma coluna.
 */
const REGISTRY: Record<
  IconName,
  { lucide: LucideIcon; hugeicons: IconComponent }
> = {
  dashboard: { lucide: LayoutDashboard, hugeicons: DashboardSquare01Icon },
  components: { lucide: Boxes, hugeicons: GridViewIcon },
  users: { lucide: Users, hugeicons: UserMultipleIcon },
  analytics: { lucide: BarChart3, hugeicons: Analytics01Icon },
  files: { lucide: Folder, hugeicons: Folder01Icon },
  settings: { lucide: Settings, hugeicons: Settings01Icon },
  document: { lucide: FileText, hugeicons: File01Icon },
  notification: { lucide: Bell, hugeicons: Notification01Icon },
  logo: { lucide: Sparkles, hugeicons: SparklesIcon },
  profile: { lucide: User, hugeicons: UserCircleIcon },
  profileSettings: { lucide: UserCog, hugeicons: UserSettings01Icon },
  logout: { lucide: LogOut, hugeicons: Logout01Icon },
  menu: { lucide: Menu, hugeicons: Menu01Icon },
  close: { lucide: X, hugeicons: Cancel01Icon },
  collapse: { lucide: ChevronsLeft, hugeicons: ArrowLeft01Icon },
  expand: { lucide: ChevronsRight, hugeicons: ArrowRight01Icon },
}

/**
 * Ícone que respeita o conjunto escolhido no preset (Lucide ou Hugeicons).
 * Use sempre que o ícone deva acompanhar a preferência global do usuário.
 */
export function Icon({
  name,
  className,
}: {
  name: IconName
  className?: string
}) {
  const { iconSet } = useIconSet()
  const Cmp = REGISTRY[name][iconSet]
  return <Cmp className={className} aria-hidden />
}
