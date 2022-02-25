import { lc1 } from "./ffi.ts";
import { LaunchPad } from "./launch_pad.ts";
import { cstr, UnsafeOwnedPointer } from "./utils.ts";

export {
    RocketError,
    RocketMission,
    RocketStatus,
} from "./rocket.ts";
export type { RocketOpts } from "./rocket.ts"

let activeLaunchPad: LaunchPad | null = null;

const assertNoOverlap = (): void => {
  if (activeLaunchPad !== null) {
    throw new Error("Launch pad already exists");
  }
};

export const launchPad = () => {
  if (!activeLaunchPad) {
    throw new Error("Launch pad has not been created");
  }
  return activeLaunchPad;
};

export const createCustomLaunchPad = (
  name: string,
  streetAddress: string,
  zipCode: string,
  opts: {
    padId: number;
    towerId: number;
  } = {
    padId: 0,
    towerId: 0,
  },
) => {
  assertNoOverlap();
  const nameBuffer = cstr(name);
  const streetAddressBuffer = cstr(streetAddress);
  const zipCodeBuffer = cstr(zipCode);
  const configurationPointer = new UnsafeOwnedPointer(24);
  lc1.lcCustomConfiguration(
    configurationPointer,
    nameBuffer,
    streetAddressBuffer,
    zipCodeBuffer,
    opts.padId,
    opts.towerId,
  );
  if (configurationPointer.value == 0n) {
    throw new Error(
      "Failed to create launch pad, could not create custom LC configuration",
    );
  }
  const launchPadPointer = lc1.createLaunchPad(configurationPointer, 1);
  // TODO: delete configurationPointer data
  if (launchPadPointer.value === 0n) {
    throw new Error("Failed to create launch pad, got nullptr");
  }
  activeLaunchPad = new LaunchPad(launchPadPointer);
  return activeLaunchPad;
};

export const createManagedLaunchPad = () => {
  assertNoOverlap();
  const configurationPointer = new UnsafeOwnedPointer(24);
  lc1.lcConfiguration(configurationPointer);
  if (configurationPointer.value == 0n) {
    throw new Error(
      "Failed to create launch pad, could not get managed pad configuration",
    );
  }
  const launchPadPointer = lc1.createLaunchPad(configurationPointer, 1);
  // TODO: delete configurationPointer data
  if (launchPadPointer.value === 0n) {
    throw new Error("Failed to create launch pad, got nullptr");
  }
  activeLaunchPad = new LaunchPad(launchPadPointer);
  return activeLaunchPad;
};

export const createTestLaunchPad = (name: string) =>
  createCustomLaunchPad(name, "10 Broad Street, Titusville", "FL 32796");
