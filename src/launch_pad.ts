import { lc1 } from "./ffi.ts";
import { LaunchTower } from "./launch_tower.ts";
import { cstr, pointerToString } from "./utils.ts";

export class LaunchPad {
  readonly name: string;

  #launchTowers = new Set<LaunchTower>();
  #ptr: Deno.UnsafePointer;
  #decomissioned = false;
  #decomissionPromise: Promise<void>;
  #decomissionResolve: () => void;

  constructor(ptr: Deno.UnsafePointer) {
    this.#ptr = ptr;
    this.name = pointerToString(lc1.getLaunchPadName(ptr));
    let decomissionResolve: () => void;
    this.#decomissionPromise = new Promise<void>((resolve) => {
      decomissionResolve = resolve;
    });
    this.#decomissionResolve = decomissionResolve!;
  }

  #deconstructLaunchTower(launchTower: LaunchTower) {
    this.#launchTowers.delete(launchTower);
  }

  addLaunchPadPublicData<T>(
    _name: string,
    _value: { value: T; type: string },
    _publishToGovernmentSystems: boolean,
  ) {
    throw new Error("todo");
  }

  removeLaunchPadPublicData(
    _name: string,
  ) {
    throw new Error("todo");
  }

  constructorLaunchTower(name: string): LaunchTower {
    const launchTowerPointer = lc1.createLaunchTower(this.#ptr, cstr(name));
    const launchTower = new LaunchTower(
      name,
      this,
      launchTowerPointer,
      this.#deconstructLaunchTower.bind(this),
    );
    this.#launchTowers.add(launchTower);
    return launchTower;
  }

  getDecomissionPromise(): Promise<void> {
    if (this.#decomissioned) {
      throw new Error("Launch pad decomissioned");
    }
    return this.#decomissionPromise;
  }

  decomissionLaunchPad() {
    if (this.#decomissioned) {
      return;
    }
    this.#decomissioned = true;
    for (const lt of this.#launchTowers) {
      lt.deconstruct();
    }
    // TODO: delete LaunchPad #ptr data
    this.#decomissionResolve();
  }
}
