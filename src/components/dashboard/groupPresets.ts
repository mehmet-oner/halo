import {
  BookOpen,
  Heart,
  Home as HomeIcon,
  Plane,
  Sun,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { GroupMember } from '@/types/groups';

export type QuickStatus = {
  label: string;
  emoji: string;
};

type GroupPresetConfig = {
  key: string;
  label: string;
  icon: string;
  statuses: QuickStatus[];
};

export const GROUP_PRESETS: GroupPresetConfig[] = [
  {
    key: 'home',
    label: 'Home',
    icon: 'home',
    statuses: [
      { label: 'At home', emoji: '🏠' },
      { label: 'At work', emoji: '💼' },
      { label: 'Commuting', emoji: '🚗' },
      { label: 'At school', emoji: '📚' },
      { label: 'Shopping', emoji: '🛒' },
      { label: "I'm safe", emoji: '✅' },
    ],
  },
  {
    key: 'weekend',
    label: 'Weekend Squad',
    icon: 'users',
    statuses: [
      { label: 'Free tonight', emoji: '🎉' },
      { label: 'Down for coffee', emoji: '☕' },
      { label: 'At the gym', emoji: '💪' },
      { label: 'Busy today', emoji: '🚫' },
      { label: 'At this spot', emoji: '📍' },
      { label: 'Party mode', emoji: '🎊' },
    ],
  },
  {
    key: 'study',
    label: 'Study Group',
    icon: 'book',
    statuses: [
      { label: 'At library', emoji: '📖' },
      { label: 'Available to help', emoji: '🙋' },
      { label: 'Need help', emoji: '🆘' },
      { label: 'Deep work mode', emoji: '🎯' },
      { label: 'Study break', emoji: '☕' },
      { label: 'Done for today', emoji: '✅' },
    ],
  },
  {
    key: 'best-friends',
    label: 'Best Friends',
    icon: 'heart',
    statuses: [
      { label: 'Catching up', emoji: '💬' },
      { label: 'Need a vent', emoji: '🗣️' },
      { label: 'Movie night?', emoji: '🎬' },
      { label: 'Self-care time', emoji: '🛁' },
      { label: 'Call me', emoji: '📞' },
      { label: 'Let’s brunch', emoji: '🥞' },
    ],
  },
  {
    key: 'holiday',
    label: 'Holiday',
    icon: 'sun',
    statuses: [
      { label: 'Beach day', emoji: '🏖️' },
      { label: 'On an adventure', emoji: '🧭' },
      { label: 'Poolside', emoji: '🏊' },
      { label: 'Out exploring', emoji: '🚶' },
      { label: 'Back at the room', emoji: '🛏️' },
      { label: 'Heading home', emoji: '✈️' },
    ],
  },
  {
    key: 'trip',
    label: 'Trip',
    icon: 'plane',
    statuses: [
      { label: 'At the gate', emoji: '🛫' },
      { label: 'In the air', emoji: '☁️' },
      { label: 'Just landed', emoji: '🛬' },
      { label: 'On the road', emoji: '🚗' },
      { label: 'Checking in', emoji: '🏨' },
      { label: 'Exploring', emoji: '🗺️' },
    ],
  },
];

export const ICON_MAP: Record<string, LucideIcon> = {
  home: HomeIcon,
  users: Users,
  book: BookOpen,
  heart: Heart,
  sun: Sun,
  plane: Plane,
};

export const DEFAULT_STATUSES: QuickStatus[] = [
  { label: 'Available', emoji: '✅' },
  { label: 'Busy', emoji: '🚫' },
  { label: 'Be right back', emoji: '⏳' },
  { label: 'Out and about', emoji: '🚶' },
  { label: 'Call me', emoji: '📞' },
  { label: 'Need help', emoji: '🆘' },
];

export const findPreset = (key: string | undefined | null) =>
  GROUP_PRESETS.find((preset) => preset.key === key) ?? null;

export const findIconKeyByPreset = (presetKey: string) =>
  GROUP_PRESETS.find((preset) => preset.key === presetKey)?.icon ?? 'users';

export const getDisplayName = (member: GroupMember) =>
  member.displayName || member.username || member.email || 'Friend';
