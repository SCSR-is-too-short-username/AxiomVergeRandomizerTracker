const websocketUrl = "ws://localhost:19906/"
let websocket = undefined;

// Pixel size of map square
// Coordinates in itemData.js are in grid units and are
// multiplied by this value to get the absolute position
const mapGridSize = 12;

// Map and tracker boc HTML element
const map = document.getElementById("map");
const trackerBox = document.getElementById("itemTrackerBox");

// List of HTML elements of item icons on the map
let items = [];

// Item tracker icons and numeric displays HTML elements
const trackerIcons = document.getElementsByClassName("itemIcon");
const collectCounters = document.getElementsByClassName("collectCounter");

// Connection status HTML element
const connectionStatus = document.getElementById("connectionStatus");

// Text display items
const seedText = document.getElementById("seedDisplayText");
const pbText = document.getElementById("pbDisplayText");
const difficultyText = document.getElementById("difficultyText");
const progressionText = document.getElementById("progressionText");

// Icons for powerups
let healthNodesIcon = undefined;
let healthNodeFragmentsIcon = undefined;
let powerNodesIcon = undefined;
let powerNodeFragmentsIcon = undefined;
let rangeNodesIcon = undefined;
let sizeNodesIcon = undefined;

// Numerical indicators for powerups
let healthNodesText = undefined;
let healthNodeFragmentsText = undefined;
let powerNodesText = undefined;
let powerNodeFragmentsText = undefined;
let rangeNodesText = undefined;
let sizeNodesText = undefined;

// Required Powers HTML element
const requiredPowersList = document.getElementById("requiredPowersList");

// HTML elements for "Connected/Disconnected" display
const disconnected = '<p class="disconnected">Disconnected</p>'
const connected = '<p class="connected">Connected</p>'

// Child element of map marker
const mapMarkerChild = '<div class="locked"></div>'

// Names for each notable powerup used in tracker UI
const PowersNames = {
    None: "None",
    Gun: "Gun",
    Nova: "Nova",
    Drill: "Drill",
    Kilver: "Kilver",
    AddressDisruptor1: "Address Disruptor 1",
    HighJump: "High Jump",
    Labcoat: "Lab Coat",
    Drone: "Drone",
    AddressDisruptor2: "Address Disruptor 2",
    Grapple: "Grapple",
    Trenchcoat: "Trenchcoat",
    AddressBomb: "Address Bomb",
    DroneTeleport: "Drone Teleport",
    ExtendedDroneLaunch: "Extended Drone Launch",
    SudranKey: "Sudran Key",
    RedCoat: "Red Coat",
    Password: "Password Tool",
    LongKilver: "Long Kilver",
    FatBeam: "Fat Beam",
    TeleReset: "Teleport Reset",
}

// Enum for difficulties
const DifficultyMode = {
    0: "Normal",
    1: "Hard",
}

// Enum for progression modes
const ProgressionMode = {
    0: "Default",
    1: "Advanced",
    2: "Masochist",
}

// Enum for progression mode's required powers key names
const ProgressionRequiredPowers = {
    0: "RequiredPowers",
    1: "RequiredPowersAdvanced",
    2: "RequiredPowersMasochist",
}

// Required powers key name for hallucination sequence
const ProgressionRequiredPowersHallucination = "RequiredPowersHallucination";

// List of item IDs that don't exist in Ukkin-Na until player has completed the hallucination sequence
const HallucinationNonExistentItemIds = [73, 75, 76, 97];

// Generic variables
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

// Copy of the latest "LocationsData" used to check required items to acquire
let locationsData = [];

// Check if websocket is open
const connectionStatusCheck = setInterval(() => {
    if(websocket !== undefined && websocket.readyState === WebSocket.OPEN) {
        connectionStatus.innerHTML = connected;
    }
    else {
        connectionStatus.innerHTML = disconnected;
    }
}, 2500);

// Setup event listener for when Axiom Verge sends data through the websocket
window.addEventListener("load", () => {
    InitializeMapMarkers()
    InitializeTrackerItems()

    ClearTracker();
    websocket = new WebSocket(websocketUrl);
    websocket.onmessage = event => UpdateTracker(JSON.parse(event.data));
});

// Update tracker data
function UpdateTracker(data) {
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

    locationsData = data["LocationsData"]

    for(const i of data["Items"]) {
        const target = document.getElementById(`ico${i["mName"]}`);

        if(target !== null) {
            target.children[0].classList.value = "itemCollected"
        }
    }

    for(const i of locationsData) {
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

// Clears map markers and collected items
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

// Convert number to string
// number is input value and size is how many digits the output should have added as leading zeros
function NumberToString(number, size) {
    let result = number.toString();

    while(result.length < size) {
        result = "0" + result;
    }

    return result;
}

// Convert the "PersonalBest" property float to human-readable string
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

// Check if player is able to access item in this location with their current equipment
// location is item from "LocationsData" and key is one of the "RequiredPowers" items from this item
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

// Check if player is able to access item in this location with their current equipment
// location is item from "LocationsData" and progression is what progression setting (Default/Advanced/Masochist) to check
function CheckAvailable(location, progression) {
    if(progression > progressionMode) {
        return false;
    }

    return BaseCheck(location, ProgressionRequiredPowers[progression])
}

// Check if player is able to access item in this location with their current equipment before or during hallucination sequence
// location is item from "LocationsData"
function CheckAvailableHallucination(location) {
    return BaseCheck(location, ProgressionRequiredPowersHallucination);
}

// Create a list of items required to get to selected item location
function listRequiredItems(id, event) {
    event.stopPropagation();

    const item = locationsData.find(x => x["VanillaItemName"] === id)
    const requiredList = [];

    if(locationsData.length > 0) {
        if(item["RequiredPowersString"] !== null && item["RequiredPowersString"].length > 0) {
            for(const d of item["RequiredPowersString"]) {
                requiredList.push(`<p>- ${RenameArrayItems(d).join(", ")}</p>`);
            }
        }
        if(!isVisionDead && item["RequiredPowersStringHallucination"] !== null && item["RequiredPowersStringHallucination"].length > 0) {
            for(const h of item["RequiredPowersStringHallucination"]) {
                requiredList.push(`<p>- ${RenameArrayItems(h).join(", ")}</p>`);
            }
        }
        if(progressionMode >= 1 && item["RequiredPowersStringAdvanced"] !== null && item["RequiredPowersStringAdvanced"].length > 0) {
            for(const a of item["RequiredPowersStringAdvanced"]) {
                requiredList.push(`<p>- ${RenameArrayItems(a).join(", ")}</p>`);
            }
        }
        if(progressionMode === 2 && item["RequiredPowersStringMasochist"] !== null && item["RequiredPowersStringMasochist"].length > 0) {
            for(const m of item["RequiredPowersStringMasochist"]) {
                requiredList.push(`<p>- ${RenameArrayItems(m).join(", ")}</p>`);
            }
        }
    }

    requiredPowersList.innerHTML = requiredList.join("");
}

// Rename required powers array items to the human-readable names
function RenameArrayItems(array) {
    const result = [];

    for(const s of array) {
        result.push(PowersNames[s]);
    }

    return result;
}

// Populate map markers to HTML
// Data is stored in itemData.js
function InitializeMapMarkers() {
    for(const i of itemData) {
        const p = document.createElement("div");

        p.className = "item";
        p.title = `Vanilla: ${i["title"]}`
        p.id = i["id"];
        p.style.setProperty("position", "absolute");
        p.style.setProperty("top", `${i["top"] * mapGridSize}px`);
        p.style.setProperty("left", `${i["left"] * mapGridSize}px`);
        p.onclick = function(event) {listRequiredItems(this.id, event)}
        p.innerHTML = mapMarkerChild;
        map.appendChild(p);
    }

    items = document.getElementsByClassName("item");
}

// Populate item tracker table to HTML
// Data is stored in trackerItems.js
function InitializeTrackerItems() {
    const table = document.createElement("table");

    for(const o of trackerItems) {
        const tr = document.createElement("tr");

        for(const i of o) {
            const th = document.createElement("th");
            const img = document.createElement("img");
            let p = undefined;

            img.className = "itemUncollected"
            img.src = i["src"]
            img.alt = ""

            th.id = i["id"];
            th.className = "itemIcon"

            if(i["hasCount"]) {
                th.classList.add("itemsCounted")

                p = document.createElement("p");
                p.className = "collectCounter"
                p.innerText = "0";
            }

            th.appendChild(img);

            if(p !== undefined) {
                th.appendChild(p);
            }

            tr.appendChild(th);
        }

        table.appendChild(tr);
    }

    trackerBox.appendChild(table);

    healthNodesIcon = document.getElementById("icoHealthNode").getElementsByTagName("img")[0];
    healthNodeFragmentsIcon = document.getElementById("icoHealthNodeFragment").getElementsByTagName("img")[0];
    powerNodesIcon = document.getElementById("icoPowerNode").getElementsByTagName("img")[0];
    powerNodeFragmentsIcon = document.getElementById("icoPowerNodeFragment").getElementsByTagName("img")[0];
    rangeNodesIcon = document.getElementById("icoRangeNode").getElementsByTagName("img")[0];
    sizeNodesIcon = document.getElementById("icoSizeNode").getElementsByTagName("img")[0];

    healthNodesText = document.getElementById("icoHealthNode").getElementsByClassName("collectCounter")[0];
    healthNodeFragmentsText = document.getElementById("icoHealthNodeFragment").getElementsByClassName("collectCounter")[0];
    powerNodesText = document.getElementById("icoPowerNode").getElementsByClassName("collectCounter")[0];
    powerNodeFragmentsText = document.getElementById("icoPowerNodeFragment").getElementsByClassName("collectCounter")[0];
    rangeNodesText = document.getElementById("icoRangeNode").getElementsByClassName("collectCounter")[0];
    sizeNodesText = document.getElementById("icoSizeNode").getElementsByClassName("collectCounter")[0];
}
