import { lc1, refCallback, registerCallback, unrefCallback } from "./ffi.ts";
import { cstr } from "./utils.ts";

const rocketStreamMap = new Map<
  BigInt,
  ReadableStreamDefaultController<{
    payload: TelemetryData<unknown>;
    status: TargetStatus;
  }>
>();

const telemetryJsCallback = (
  rocketStatus: RocketStatus,
  targetStatus: TargetStatus,
  rocket: Deno.UnsafePointer,
) => {
  const controller = rocketStreamMap.get(rocket.value);
  if (!controller) {
    throw new Error(`Rocket telemetry cannot find receiving stream`);
  }

  if (rocketStatus === RocketStatus.MISSION_SUCCESS) {
    controller.enqueue({
      payload: {
        type: "foo",
        value: "bar",
      },
      status: targetStatus,
    });
  } else {
    // Failure in flight!
    let code: RocketError;
    if (rocketStatus in RocketError) {
      code = rocketStatus as unknown as RocketError;
    } else {
      code = RocketError.LOST;
    }
    controller.error(
      new Error(
        `Rocket failed to reach target with error code: ${RocketError[code]}`,
      ),
    );
  }
  if (!lc1.isFlightOngoing(rocket)) {
    // Most rockets only fly once and give telemetry at the end,
    // but RESEARCH rockets will keep researching until the rocket
    // is purposefully exploded using the cancel() / triggerFTS() call.
    controller.close();
    rocketStreamMap.delete(rocket.value);
    if (rocketStreamMap.size === 0) {
      // No flying rockets, telemetry callback is not relevant.
      unrefCallback(telemetryCallback);
    }
  }
};

/**
 * This callback will be called only as a synchronous response to LaunchTower's `processComms()` call.
 * That is, this callback will only ever be called from the event loop thread.
 */
const telemetryCallback = registerCallback(
  {
    parameters: ["u8", "u32", "pointer"],
    result: "void",
  },
  // @ts-expect-error oof
  telemetryJsCallback,
);

// This callback should not keep Deno alive while it is not being used.
unrefCallback(telemetryCallback);

export enum RocketStatus {
  MISSION_SUCCESS = 0,
  MISSION_FAILURE = 1,
}

export enum RocketMission {
  SURVEY = 1,
  RESUPPLY = 2,
  RESEARCH = 3,
  ESTABLISH_BASE = 4,
  ICBM = 5,
}

export enum TargetStatus {
  TARGET_OK = 200,
  BAD_TARGET = 400,
  NO_PERMISSION = 401,
  TARGET_NOT_FOUND = 404,
  SIMULATION_MISSING = 501,
  UNIVERSE_OUT_OF_ORDER = 503,
}

export enum RocketError {
  FAILURE = 1,
  TARGET_NOT_FOUND = 2,
  CREW_PERISHED = 3,
  FTS_ABORT = 4,
  LOST = -1,
}

export const launch = Symbol("[[launch]]");

export interface TelemetryData<T> {
  value: T;
  type: string;
}

export interface RocketOpts {
  permissions?: Deno.UnsafePointer;
  maxTime?: number;
  minTime?: number;
  payload?: Deno.UnsafePointer;
}

export class Rocket {
  #ptr?: Deno.UnsafePointer;
  #inflight = false;
  #landed = false;
  #aborted = false;

  readonly id: string;
  readonly maxTime?: number;
  readonly minTime?: number;
  readonly mission: RocketMission;
  readonly payload?: Deno.UnsafePointer;
  readonly permissions?: Deno.UnsafePointer;
  readonly target: string;

  constructor(
    id: string,
    mission: RocketMission,
    target: string,
    opts?: RocketOpts,
  ) {
    this.id = id;
    this.mission = mission;
    this.target = target;
    if (opts) {
      if (opts.maxTime) {
        this.maxTime = opts.maxTime;
      }
      if (opts.minTime) {
        this.minTime = opts.minTime;
      }
      if (opts.payload) {
        this.payload = opts.payload;
      }
      if (opts.permissions) {
        this.permissions = opts.permissions;
      }
    }
  }

  [launch](
    missionPtr: Deno.UnsafePointer,
  ): ReadableStream<{ payload: TelemetryData<unknown>; status: TargetStatus }> {
    this.#ptr = missionPtr;
    this.#inflight = true;

    if (this.maxTime) {
      lc1.setRocketMaximumTelemetryTime(this.#ptr, this.maxTime);
    }
    if (this.minTime) {
      lc1.setRocketMinimumTelemetryTime(this.#ptr, this.minTime);
    }
    if (this.payload) {
      lc1.setRocketPayload(this.#ptr, this.payload);
    }

    const mission = this.mission;
    const target = this.target;

    const reader = new ReadableStream<{
      payload: TelemetryData<unknown>;
      status: TargetStatus;
    }>({
      start(controller) {
        if (rocketStreamMap.size === 0) {
          refCallback(telemetryCallback);
        }
        rocketStreamMap.set(missionPtr.value, controller);
        lc1.launchRocket(missionPtr, mission, cstr(target), telemetryCallback);
      },
      // TODO unify stream cancel and triggerFTS somehow
      cancel() {
        lc1.triggerFTS(missionPtr);
        rocketStreamMap.delete(missionPtr.value);
        if (rocketStreamMap.size === 0) {
          unrefCallback(telemetryCallback);
        }
      },
    });

    return reader;
  }

  triggerFTS() {
    if (this.#aborted) {
      return;
    }
    this.#aborted = true;
    if (this.#landed) {
      throw new Error("Cannot trigger FTS on landed rocket");
    } else if (!this.#inflight) {
      throw new Error("Cannot trigger FTS on rocket sitting on launch pad");
    }
    if (this.#ptr) {
      lc1.triggerFTS(this.#ptr);
      rocketStreamMap.delete(this.#ptr.value);
      if (rocketStreamMap.size === 0) {
        unrefCallback(telemetryCallback);
      }
    }
    this.#inflight = false;
  }
}
