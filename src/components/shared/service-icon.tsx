import {
  Building2Icon,
  ClipboardCheckIcon,
  DraftingCompassIcon,
  DropletsIcon,
  FactoryIcon,
  HammerIcon,
  HardHatIcon,
  LandmarkIcon,
  PaintRollerIcon,
  RouteIcon,
  RulerIcon,
  TreesIcon,
  TruckIcon,
  WarehouseIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";

import type { ServiceIconName } from "@/config/service-icons";

const icons: Record<ServiceIconName, LucideIcon> = {
  "hard-hat": HardHatIcon,
  "building-2": Building2Icon,
  route: RouteIcon,
  hammer: HammerIcon,
  "paint-roller": PaintRollerIcon,
  "clipboard-check": ClipboardCheckIcon,
  ruler: RulerIcon,
  "drafting-compass": DraftingCompassIcon,
  truck: TruckIcon,
  factory: FactoryIcon,
  warehouse: WarehouseIcon,
  landmark: LandmarkIcon,
  zap: ZapIcon,
  droplets: DropletsIcon,
  trees: TreesIcon,
};

export function ServiceIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name && icons[name as ServiceIconName]) || HardHatIcon;
  return <Icon className={className} aria-hidden="true" />;
}
