import { lc1, registerCallback, UnsafeCallbackPointer } from "./ffi.ts";
import { LaunchPad } from "./launch_pad.ts";
import { launch, Rocket, RocketMission, RocketOpts } from "./rocket.ts";
import { UnsafeOwnedPointer } from "./utils.ts";

export class LaunchTower {
  #ptr: Deno.UnsafePointer;
  #commsPtr: UnsafeOwnedPointer;
  #deconstructLaunchTower: (launchTower: LaunchTower) => void;
  #launchPad: WeakRef<LaunchPad>;
  #commsCallback: UnsafeCallbackPointer<{ parameters: []; result: "void" }>;
  #commsTimeout?: number;
  #commsQueue = false;

  readonly name: string;

  constructor(
    name: string,
    launchPad: LaunchPad,
    ptr: Deno.UnsafePointer,
    deconstructLaunchTower: (launchTower: LaunchTower) => void,
  ) {
    this.name = name;
    this.#launchPad = new WeakRef(launchPad);
    this.#ptr = ptr;
    this.#deconstructLaunchTower = deconstructLaunchTower;

    this.#commsPtr = new UnsafeOwnedPointer(8);
    lc1.createComms(this.#commsPtr);
    lc1.setLaunchTowerComms(this.#ptr);
    this.#commsCallback = registerCallback({
      parameters: [],
      result: "void",
      // This CB may and will be called from any thread,
      // most probably never the event loop thread but that
      // may also be possible if a rocket targeting the
      // LaunchPad itself is launched... TODO: Check.
      // As such, lets make it be known that this CB should be threadsafe.
      threadsafe: true,
    }, () => {
      if (!this.#commsTimeout) {
        lc1.processComms(this.#commsPtr);
        this.#commsTimeout = setTimeout(() => {
          this.#commsTimeout = undefined;
          if (this.#commsQueue) {
            lc1.processComms(this.#commsPtr);
            this.#commsQueue = false;
          }
        }, 100);
      } else {
        this.#commsQueue = true;
      }
    });
    lc1.setCommsCallback(this.#commsPtr, this.#commsCallback);
  }

  get launchPad(): LaunchPad | undefined {
    return this.#launchPad.deref();
  }

  prepareRocket(
    id: string,
    mission: RocketMission,
    target: string,
    opts: RocketOpts,
  ) {
    return new Rocket(id, mission, target, opts);
  }

  launchRocket(rocket: Rocket) {
    const rocketPtr = lc1.prepareRocket(this.#ptr);
    return rocket[launch](rocketPtr);
  }

  // createLandingSite(landingCallback: LandingCallback) { return new LandingSize(this, new Deno.UnsafePointer(0n), landingCallback); }

  deconstruct() {
    this.#deconstructLaunchTower(this);
    if (this.#commsTimeout) {
      clearTimeout(this.#commsTimeout);
    }
    this.#commsCallback.remove();
    // TODO free LaunchTower data, which would also free comms data
    this.#ptr.value = 0n;
  }
}
