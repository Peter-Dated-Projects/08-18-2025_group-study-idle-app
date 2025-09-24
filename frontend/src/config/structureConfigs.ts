import { Structure } from "@/engine";

// Interface for structure configuration
export interface StructureConfig {
  id: string;
  width: number;
  height: number;
  cost: number;
  image: string;
  name: string;
  description?: string;
}

export const EMPTY_STRUCTURE_CONFIG = {
  id: "default-structure",
  width: 128,
  height: 128,
  cost: 0,
  image: "/entities/empty-structure.png",
  name: "Default Structure",
  description: "A default structure with no specific purpose.",
};

// Structure configurations
export const STRUCTURE_CONFIGS: Record<string, StructureConfig> = {
  CHICKEN_COOP: {
    id: "chicken-coop",
    width: 256,
    height: 256,
    cost: 500,
    image: "/entities/chicken_coop.png",
    name: "Chicken Coop",
    description: "A structure for raising chickens and collecting eggs",
  },

  MAILBOX: {
    id: "mailbox",
    width: 128,
    height: 128,
    cost: 150,
    image: "/entities/mailbox.png",
    name: "Mailbox",
    description: "A mailbox for receiving mail and packages",
  },

  PICNIC: {
    id: "picnic",
    width: 185,
    height: 186,
    cost: 300,
    image: "/entities/picnic.png",
    name: "Picnic Table",
    description: "A relaxation and social area for rest and gatherings",
  },

  WATER_WELL: {
    id: "water-well",
    width: 128,
    height: 128,
    cost: 800,
    image: "/entities/water_well.png",
    name: "Water Well",
    description: "A structure for drawing fresh water",
  },

  WORKBENCH: {
    id: "workbench",
    width: 150,
    height: 150,
    cost: 250,
    image: "/entities/workbench.png",
    name: "Workbench",
    description: "A crafting and tool creation station",
  },
};

// Helper functions
export function getStructureConfig(id: string): StructureConfig | undefined {
  return Object.values(STRUCTURE_CONFIGS).find((config) => config.id === id);
}

export function getAllStructureConfigs(): StructureConfig[] {
  return Object.values(STRUCTURE_CONFIGS);
}

// Export individual configs for convenience
export const CHICKEN_COOP_CONFIG = STRUCTURE_CONFIGS.CHICKEN_COOP;
export const MAILBOX_CONFIG = STRUCTURE_CONFIGS.MAILBOX;
export const PICNIC_CONFIG = STRUCTURE_CONFIGS.PICNIC;
export const WATER_WELL_CONFIG = STRUCTURE_CONFIGS.WATER_WELL;
export const WORKBENCH_CONFIG = STRUCTURE_CONFIGS.WORKBENCH;
