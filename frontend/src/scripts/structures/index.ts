// Re-export all structure classes for easy importing
export { Structure } from "./Structure";
export { Mailbox } from "./Mailbox";
export { ChickenCoop } from "./ChickenCoop";
export { Picnic } from "./Picnic";
export { Workbench } from "./Workbench";
export { WaterWell } from "./WaterWell";

// Import for default export
import { Structure } from "./Structure";
import { Mailbox } from "./Mailbox";
import { ChickenCoop } from "./ChickenCoop";
import { Picnic } from "./Picnic";
import { Workbench } from "./Workbench";
import { WaterWell } from "./WaterWell";

// Export default structure types for convenience
export default {
  Structure,
  Mailbox,
  ChickenCoop,
  Picnic,
  Workbench,
  WaterWell,
};
