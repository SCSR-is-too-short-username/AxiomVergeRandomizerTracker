const websocketUrl = "ws://localhost:19906/"
let websocket = undefined;

const map = document.getElementById("map");
const areas = [
    document.getElementById("area1"),
    document.getElementById("area2"),
    document.getElementById("area3"),
    document.getElementById("area4"),
    document.getElementById("area5"),
    document.getElementById("area6"),
    document.getElementById("area7"),
    document.getElementById("area8"),
    document.getElementById("area9"),
];
const items = document.getElementsByClassName("item");
const trackerIcons = document.getElementsByClassName("itemIcon");
const collectCounters = document.getElementsByClassName("collectCounter");
const connectionStatus = document.getElementById("connectionStatus");

const seedText = document.getElementById("seedDisplayText");
const pbText = document.getElementById("pbDisplayText");
const difficultyText = document.getElementById("difficultyText");
const progressionText = document.getElementById("progressionText");

const healthNodesIcon = document.getElementById("icoHealthNode").getElementsByTagName("img")[0];
const healthNodeFragmentsIcon = document.getElementById("icoHealthNodeFragment").getElementsByTagName("img")[0];
const powerNodesIcon = document.getElementById("icoPowerNode").getElementsByTagName("img")[0];
const powerNodeFragmentsIcon = document.getElementById("icoPowerNodeFragment").getElementsByTagName("img")[0];
const rangeNodesIcon = document.getElementById("icoRangeNode").getElementsByTagName("img")[0];
const sizeNodesIcon = document.getElementById("icoSizeNode").getElementsByTagName("img")[0];

const healthNodesText = document.getElementById("icoHealthNode").getElementsByClassName("collectCounter")[0];
const healthNodeFragmentsText = document.getElementById("icoHealthNodeFragment").getElementsByClassName("collectCounter")[0];
const powerNodesText = document.getElementById("icoPowerNode").getElementsByClassName("collectCounter")[0];
const powerNodeFragmentsText = document.getElementById("icoPowerNodeFragment").getElementsByClassName("collectCounter")[0];
const rangeNodesText = document.getElementById("icoRangeNode").getElementsByClassName("collectCounter")[0];
const sizeNodesText = document.getElementById("icoSizeNode").getElementsByClassName("collectCounter")[0];

const disconnected = '<p class="disconnected">Disconnected</p>'
const connected = '<p class="connected">Connected</p>'

const PowersBitmask = {
    Gun: 0x000001,
    Nova: 0x000002,
    Drill: 0x000004,
    Kilver: 0x000008,
    AddressDisruptor1: 0x000010,
    HighJump: 0x000020,
    LabCoat: 0x000040,
    Drone: 0x000080,
    AddressDisruptor2: 0x000100,
    Grapple: 0x000200,
    Trenchcoat: 0x000400,
    AddressBomb: 0x000800,
    DroneTeleport: 0x001000,
    ExtendedDroneLaunch: 0x002000,
    SudranKey: 0x004000,
    RedCoat: 0x008000,
    PasswordTool: 0x010000
}

const DifficultyMode = {
    0: "Normal",
    1: "Hard",
}

const ProgressionMode = {
    0: "Default",
    1: "Advanced",
    2: "Masochist",
}

const ProgressionRequiredPowers = {
    0: "RequiredPowers",
    1: "RequiredPowersAdvanced",
    2: "RequiredPowersMasochist",
}

const ProgressionRequiredPowersHallucination = "RequiredPowersHallucination";

const HallucinationNonExistentItemIds = [73, 75, 76, 97];

let isRandomizer = true;
let isVisionDead = false;
let difficultyMode = 0;
let progressionMode = 0;
let healthNodes = 0;
let healthNodeFragments = 0;
let powerNodes = 0;
let powerNodeFragments = 0;
let rangeNodes = 0;
let sizeNodes = 0;
let currentPowers = 0;

const connectionStatusCheck = setInterval(() => {
    if(websocket !== undefined && websocket.readyState === WebSocket.OPEN) {
        connectionStatus.innerHTML = connected;
    }
    else {
        connectionStatus.innerHTML = disconnected;
    }
}, 2500);

window.addEventListener("load", (event) => {
    ClearTracker();
    websocket = new WebSocket(websocketUrl);
    websocket.onmessage = event => UpdateTracker(JSON.parse(event.data));
});

function UpdateTracker(data) {
    console.log(data)
    ClearTracker();

    currentPowers = data["CurrentPowers"];

    isRandomizer = data["IsRandomizer"];
    isVisionDead = data["IsVisionDead"];
    progressionMode = data["Progression"];
    seedText.innerHTML = `Seed: ${data["Seed"]}`;
    pbText.innerHTML = `Personal Best: ${getPBString(data["PersonalBest"])}`;
    difficultyText.innerHTML = `Difficulty: ${DifficultyMode[difficultyMode]}`;
    progressionText.innerHTML = `Progression: ${ProgressionMode[progressionMode]}`;

    healthNodes = data["HealthNodes"]
    healthNodeFragments = data["HealthNodeFragments"]
    powerNodes = data["PowerNodes"]
    powerNodeFragments = data["PowerNodesFragments"]
    rangeNodes = data["RangeNodes"]
    sizeNodes = data["SizeNodes"]

    healthNodesText.innerHTML = healthNodes;
    healthNodeFragmentsText.innerHTML = healthNodeFragments;
    powerNodesText.innerHTML = powerNodes;
    powerNodeFragmentsText.innerHTML = powerNodeFragments;
    rangeNodesText.innerHTML = rangeNodes;
    sizeNodesText.innerHTML = sizeNodes;

    healthNodesIcon.classList.value = healthNodes > 0 ? "itemCollected" : "itemUncollected"
    healthNodeFragmentsIcon.classList.value = healthNodeFragments > 0 ? "itemCollected" : "itemUncollected"
    powerNodesIcon.classList.value = powerNodes > 0 ? "itemCollected" : "itemUncollected"
    powerNodeFragmentsIcon.classList.value = powerNodeFragments > 0 ? "itemCollected" : "itemUncollected"
    rangeNodesIcon.classList.value = rangeNodes > 0 ? "itemCollected" : "itemUncollected"
    sizeNodesIcon.classList.value = sizeNodes > 0 ? "itemCollected" : "itemUncollected"

    for(const i of data["Items"]) {
        const target = document.getElementById(`ico${i["mName"]}`);

        if(target !== null) {
            target.children[0].classList.value = "itemCollected"
        }
    }

    for(const i of data["LocationsData"]) {
        if(!isVisionDead && HallucinationNonExistentItemIds.includes(i["LocationId"])) {
            continue;
        }

        if(data["Items"].some(e => e["mName"] === data["RandomItems"][i["VanillaItemName"]])) {
            document.getElementById(i["VanillaItemName"]).children[0].classList.value = "collected";
        }
        else {
            let unlocked = false;

            const openHallucination = CheckAvailableHallucination(i);

            switch (progressionMode) {
                case 0:
                    unlocked = CheckAvailable(i, 0) || openHallucination;
                    break;

                case 1:
                    unlocked = CheckAvailable(i, 0) || CheckAvailable(i, 1) || openHallucination;
                    break;

                case 2:
                    unlocked = CheckAvailable(i, 0) || CheckAvailable(i, 1) || CheckAvailable(i, 2) || openHallucination;
                    break;
            }

            if(unlocked) {
                document.getElementById(i["VanillaItemName"]).children[0].classList.value = "unlocked";
            }
            else {
                document.getElementById(i["VanillaItemName"]).children[0].classList.value = "locked";
            }
        }
    }
}

function ClearTracker() {
    for(const i of items) {
        i.children[0].classList.value = "locked"
    }
    for(const i of trackerIcons) {
        i.children[0].classList.value = "itemUncollected"
    }
    for(const i of collectCounters) {
        i.innerHTML = "0";
    }
}

function NumberToString(number, size) {
    let result = number.toString();

    while(result.length < size) {
        result = "0" + result;
    }

    return result;
}

function getPBString(time) {
    const hours = Math.trunc(time / 216000);
    const hours_rem = time % 216000;
    const mins = Math.trunc(hours_rem / 3600);
    const mins_rem = hours_rem % 3600;
    const secs = Math.trunc(mins_rem / 60);
    const secs_rem = mins_rem % 60;
    const millis = Math.round(secs_rem);

    return `${NumberToString(hours, 2)}:${NumberToString(mins, 2)}:${NumberToString(secs, 2)}:${NumberToString(millis, 2)}`
}

function BaseCheck(location, key) {
    if(location[key]) {
        for(const power of location[key]) {
            if((currentPowers & power) === power) {
                return true;
            }
        }
    }

    return false;
}

function CheckAvailable(location, progression) {
    if(progression > progressionMode) {
        return false;
    }

    return BaseCheck(location, ProgressionRequiredPowers[progression])
}

function CheckAvailableHallucination(location) {
    return BaseCheck(location, ProgressionRequiredPowersHallucination);
}
