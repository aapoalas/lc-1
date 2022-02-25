import * as lc1 from "../mod.ts";
import {
    RocketMission
} from "../mod.ts";

const testPad = lc1.createTestLaunchPad("LC-1");

const tower1 = testPad.constructorLaunchTower("LC-1a");

const firstRocket = tower1.prepareRocket("Dawn", RocketMission.SURVEY, "Earth", {});
const secondRocket = tower1.prepareRocket("Dusk", RocketMission.ICBM, "Mars", {});
const thirdRocket = tower1.prepareRocket("Midnight", RocketMission.RESEARCH, "Mars", {});

const firstStream = tower1.launchRocket(firstRocket);
const secondStream = tower1.launchRocket(secondRocket);
const thridStream = tower1.launchRocket(thirdRocket);

for await (const chunk of firstStream) {
    console.log(chunk);
    // Survey mission should only send telemetry once
}

for await (const chunk of secondStream) {
    console.log(chunk);
    // ICBM mission should only send telemetry once
}

let index = 0;
for await (const chunk of thridStream) {
    index++;
    console.log(chunk);
    // Research mission will send telemetry until told to finish the mission
    if (index === 10) {
        thridStream.cancel();
    }
}