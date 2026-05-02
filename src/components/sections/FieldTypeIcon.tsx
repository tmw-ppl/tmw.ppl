import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'
import {
  AlignLeft,
  CalendarDays,
  CheckSquare,
  FileText,
  Hash,
  Link2,
  List,
  ListChecks,
  Mail,
  Phone,
} from 'lucide-react'
import type { FieldType } from '@/types/sections'

const ICON_MAP: Record<FieldType, ComponentType<LucideProps>> = {
  text: FileText,
  textarea: AlignLeft,
  select: List,
  multiselect: ListChecks,
  checkbox: CheckSquare,
  number: Hash,
  date: CalendarDays,
  url: Link2,
  email: Mail,
  phone: Phone,
}

export function FieldTypeIcon({
  type,
  className,
  size = 16,
  ...rest
}: { type: FieldType; className?: string; size?: number } & LucideProps) {
  const Icon = ICON_MAP[type]
  return <Icon className={className} size={size} strokeWidth={2} aria-hidden {...rest} />
}
