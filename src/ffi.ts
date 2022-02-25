import { path } from "./deps.ts";

const PACKAGE_LIB_PATH = "lib";

// Resolve library directory for this application package.
const libpath = path.resolve(PACKAGE_LIB_PATH, "liblc-1.so");

export const lc1 = Deno.dlopen(libpath, {
  lcConfiguration: {
    parameters: ["pointer"],
    result: "void",
  },
  lcCustomConfiguration: {
    parameters: ["pointer", "pointer", "pointer", "pointer", "u64", "u32"],
    result: "void",
  },
  /**
   * Creates a launch pad from LC configuration
   */
  createLaunchPad: {
    parameters: ["pointer", "u8"],
    result: "pointer",
  },
  /**
   * Gets the official name of the launch pad as cstr
   */
  getLaunchPadName: {
    parameters: ["pointer"],
    result: "pointer",
  },
  /**
   * Creates a launch tower on a pad
   */
  createLaunchTower: {
    parameters: ["pointer"],
    result: "pointer",
  },
  /**
   * Sets a launch tower to use given comms
   */
  setLaunchTowerComms: {
    parameters: ["pointer", "pointer"],
    result: "u8",
  },
  /**
   * Create a comms object
   */
  createComms: {
    parameters: ["pointer"],
    result: "void",
  },
  /**
   * Set a comms JS callback
   *
   * The corresponding C callback (C++ `std::function<>`) can be called from any
   * thread. A call to the callback means that there is rocket telemetry on the
   * comms and that it should be processed by calling `processComms`.
   */
  setCommsCallback: {
    parameters: [
      "pointer",
      "pointer", // Callback fn()
    ],
    result: "void",
  },
  /**
   * Processes all telemetry data available in comms
   *
   * This function should only ever be called from the event loop thread (never
   * with `nonblocking`) as this will synchronously call rocket telemetry
   * callbacks.
   */
  processComms: {
    parameters: ["pointer"],
    result: "void",
  },
  /**
   * Prepares a rocket on the launch pad
   *
   * A rocket's information is determined through APIs after it has
   * been prepared on the launch pad but before it is launched.
   *
   * Multiple rockets can be prepared, launched and in flight at the
   * same time from the same launch pad.
   */
  prepareRocket: {
    parameters: ["pointer"],
    result: "pointer",
  },
  /**
   * Sets the minimum time between rocket telemetry updates, ie. maximum update
   * frequency
   */
  setRocketMinimumTelemetryTime: {
    parameters: ["pointer", "u32"],
    result: "void",
  },
  /**
   * Sets the maximum time between rocket telemetry updates, ie. minimum update
   * frequency
   */
  setRocketMaximumTelemetryTime: {
    parameters: ["pointer", "u32"],
    result: "void",
  },
  /**
   * Sets the rocket payload
   *
   * Not all rockets carry payload.
   */
  setRocketPayload: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  /**
   * Sets the rocket's flight permissions
   *
   * Can be used to eg. allow the rocket to land on Mars but not on Jupiter.
   */
  setRocketPermissions: {
    parameters: ["pointer", "usize"],
    result: "void",
  },
  /**
   * Launches the rocket
   *
   * @param rocket The rocket pointer
   * @param mission The rocket's mission (think HTTP method)
   * @param target The rocket's target (eg. `Mars/Olympus Mons/top` or `/universe/solarSystems/local/Mars/Olympus Mons/top`)
   * @param telemetryCallback Callback for the rocket's telemetry data: `fn(u8, u32, *const Rocket) -> void`
   */
  launchRocket: {
    parameters: ["pointer", "u8", "pointer", "pointer"],
    result: "void",
  },
  /**
   * Triggers the rocket flight termination system
   *
   * This leads to a loss of rocket and payload with no further telemetry received.
   */
  triggerFTS: {
    parameters: ["pointer"],
    result: "void",
  },
  /**
   * Gets the current flight status of a rocket
   *
   * A flight is ongoing if it has been launched and the flight has not yet finished.
   */
  isFlightOngoing: {
    parameters: ["pointer"],
    result: "u8",
  },
}).symbols;

export class UnsafeCallbackPointer<
  T extends Deno.ForeignFunction
> extends Deno.UnsafePointer {
  definition: T;
  callback: Deno.StaticForeignFunction<T>;
  interval?: number;

  constructor(definition: T, callback: Deno.StaticForeignFunction<T>) {
    super(1n);
    this.definition = definition;
    this.callback = callback;
    this.interval = setInterval(() => {}, 1000000);
  }

  remove() {
    this.value = 0n;
    this.unref();
  }

  unref() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  ref() {
    if (this.value === 0n) {
      throw new Error("Cannot ref a released UnsafeCallbackPointer");
    }
    if (!this.interval) {
      this.interval = setInterval(() => {}, 1000000);
    }
  }
}

/**
 *
 */
export const registerCallback = <T extends Deno.ForeignFunction>(
  definition: T,
  callback: Deno.StaticForeignFunction<T>
) => new UnsafeCallbackPointer(definition, callback);

export const unrefCallback = (callbackPointer: UnsafeCallbackPointer<any>) => {
  callbackPointer.unref();
};

export const refCallback = (callbackPointer: UnsafeCallbackPointer<any>) => {
  callbackPointer.ref();
};
