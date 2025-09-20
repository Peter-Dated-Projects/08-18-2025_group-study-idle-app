// Script and utility components
export type { SignalCallback } from "./GlobalSignalHandler";
export {
  SignalHandler,
  registerSignalHandler,
  unregisterSignalHandler,
  onSignal,
  emitSignal,
  updateSignals,
} from "./GlobalSignalHandler";
export { default as globalSignalHandler } from "./GlobalSignalHandler";
export * from "./utils";
