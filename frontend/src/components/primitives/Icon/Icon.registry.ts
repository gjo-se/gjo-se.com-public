import {
  AlertTriangle, Archive, Ban, BarChart3, Boxes, Brain, Briefcase, Building2, Calculator, Calendar, Check, CheckCircle,
  ChevronDown, ChevronLeft, ChevronRight, Circle, CircleDot, Clock, Contact, Copy, Cpu, Crown, Database,
  Download, ExternalLink, Eye, FileCode, FileText, FolderKanban, GitBranch, GitFork, Globe, Home,
  ImageOff, Info, Key, LayoutDashboard, Link2Off, ListTodo, Loader2, LogIn, LogOut, Mail, MailOpen, Maximize2,
  Menu, MessageSquare, Minimize2, Minus, Moon, PanelLeft, Pencil, Play, PlusCircle, RefreshCw,   ScrollText,
  Search, Send, Server, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Star, Sun, Tag, Target, Trash2, Upload,
  Users, Workflow, Wrench, X, XCircle, Zap,
} from 'lucide-react';

import GithubSvg from '@src/assets/icons/github.svg?react';
import LinkedinSvg from '@src/assets/icons/linkedin.svg?react';

export const brandIcons = ['github', 'linkedin'] as const;

export const icons = {
  'alert-triangle': AlertTriangle,
  'archive': Archive,
  'ban': Ban,
  'bar-chart-3': BarChart3,
  'boxes': Boxes,
  'brain': Brain,
  'briefcase': Briefcase,
  'building-2': Building2,
  'calculator': Calculator,
  'calendar': Calendar,
  'check': Check,
  'check-circle': CheckCircle,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'circle': Circle,
  'circle-dot': CircleDot,
  'clock': Clock,
  'contact': Contact,
  'copy': Copy,
  'cpu': Cpu,
  'crown': Crown,
  'database': Database,
  'download': Download,
  'external-link': ExternalLink,
  'eye': Eye,
  'file-code': FileCode,
  'file-text': FileText,
  'folder-kanban': FolderKanban,
  'git-branch': GitBranch,
  'git-fork': GitFork,
  'globe': Globe,
  'home': Home,
  'image-off': ImageOff,
  'info': Info,
  'key': Key,
  'layout-dashboard': LayoutDashboard,
  'link-2-off': Link2Off,
  'list-todo': ListTodo,
  'loader-2': Loader2,
  'log-in': LogIn,
  'log-out': LogOut,
  'mail': Mail,
  'mail-open': MailOpen,
  'maximize-2': Maximize2,
  'menu': Menu,
  'message-square': MessageSquare,
  'minimize-2': Minimize2,
  'minus': Minus,
  'moon': Moon,
  'panel-left': PanelLeft,
  'pencil': Pencil,
  'play': Play,
  'plus-circle': PlusCircle,
  'refresh-cw': RefreshCw,
  'scroll-text': ScrollText,
  'search': Search,
  'send': Send,
  'server': Server,
  'settings': Settings,
  'shield-check': ShieldCheck,
  'sliders-horizontal': SlidersHorizontal,
  'sparkles': Sparkles,
  'star': Star,
  'sun': Sun,
  'tag': Tag,
  'target': Target,
  'trash-2': Trash2,
  'upload': Upload,
  'users': Users,
  'workflow': Workflow,
  'wrench': Wrench,
  'x': X,
  'x-circle': XCircle,
  'zap': Zap,
} as const;

export type IconName = keyof typeof icons | (typeof brandIcons)[number];

export const brandIconComponents = {
  github: GithubSvg,
  linkedin: LinkedinSvg,
} as const;

/**
 *
 */
export function isBrandIcon(name: string): name is (typeof brandIcons)[number] {
  return (brandIcons as readonly string[]).includes(name);
}
