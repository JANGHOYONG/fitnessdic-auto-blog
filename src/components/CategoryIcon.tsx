import {
  Flame,
  Dumbbell,
  Home,
  Activity,
  Apple,
  Pill,
  Heart,
  Droplets,
  Sparkles,
  Trophy,
} from 'lucide-react';

export type CategoryId =
  | 'diet' | 'exercise' | 'hometraining' | 'running'
  | 'nutrition' | 'supplement' | 'health'
  | 'beauty' | 'skincare' | 'motivation';

const ICON_MAP: Record<CategoryId, React.ElementType> = {
  diet:         Flame,
  exercise:     Dumbbell,
  hometraining: Home,
  running:      Activity,
  nutrition:    Apple,
  supplement:   Pill,
  health:       Heart,
  skincare:     Droplets,
  beauty:       Sparkles,
  motivation:   Trophy,
};

interface CategoryIconProps {
  categoryId: CategoryId;
  size?: number;
  className?: string;
}

export default function CategoryIcon({ categoryId, size = 20, className }: CategoryIconProps) {
  const Icon = ICON_MAP[categoryId] ?? Flame;
  return <Icon size={size} className={className} />;
}
