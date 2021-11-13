// ==UserScript==
// @name         Wanikani: Levels completed per SRS
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Displays how many levels have been completed to a given SRS level. A re-implementation of https://community.wanikani.com/t/userscript-levels-by-srs/37711 using modern js
// @author       KaHLK
// @match        https://www.wanikani.com/dashboard
// @match        https://www.wanikani.com
// @include      *preview.wanikani.com*
// @grant        none
// ==/UserScript==
// @ts-ignore
const SCRIPT_ID = "srs_levels";
const SRS_LEVELS_STYLE = `
.srs-progress li{
    position: relative;
    overflow: hidden;
}
.${SCRIPT_ID}.levels_cleared{
    display: flex;
    justify-content: center;
    align-items: center;
    background: #222;
    color: #fafafa;
    height: 2em;
    width: 100%;

    position: absolute;
    bottom: 0;
    left: 0;
}
`;
(function () {
    let wkof;
    if (!window.wkof) {
        let response = confirm("\"WaniKani: Total Progress\" script requires WaniKani Open Framework.\n Click \"OK\" to be forwarded to installation instructions.");
        if (response) {
            window.location.href = 'https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549';
        }
        return;
    }
    else {
        wkof = window.wkof;
    }
    let settings;
    let data;
    let stage_dom_items = Array.from(document.querySelectorAll(".srs-progress li"));
    let stage_divs = [];
    const el = document.createElement("div");
    el.classList.add(SCRIPT_ID, "levels_cleared");
    for (let item of stage_dom_items) {
        const padding_bottom = Number(window.getComputedStyle(item).paddingBottom.slice(0, -2));
        item.style.setProperty("padding-bottom", `${padding_bottom + 28}px`);
        const node = el.cloneNode();
        item.append(node);
        stage_divs.push(node);
    }
    setup();
    async function setup() {
        wkof.include("Menu,Settings,ItemData");
        await wkof.ready("Menu,Settings,ItemData");
        settings = prepare_srs_levels_settings_dialog(update);
        await settings.load({ threshold: 90 });
        wkof.Menu.insert_script_link({
            name: `${SCRIPT_ID}_settings`,
            submenu: "Settings",
            title: "Levels by SRS",
            on_click: open_settings,
        });
        const items = await wkof.ItemData.get_items({
            wk_items: {
                options: { assignments: true },
                filters: { level: "1..+0" },
            },
        });
        const item_by_level = [];
        for (let i of items) {
            let level = i.data.level;
            let stage = srs_map(i.assignments.srs_stage);
            if (item_by_level[level] === undefined) {
                item_by_level[level] = { level: level, total_items: 0, per_stage: Array(stage_dom_items.length) };
                item_by_level[level].per_stage.fill(0);
            }
            item_by_level[level].total_items++;
            for (let idx = stage; idx >= 0; idx--) {
                item_by_level[level].per_stage[idx]++;
            }
        }
        data = item_by_level.reverse();
        data.pop();
        update();
    }
    async function update() {
        const settings = wkof.settings[SCRIPT_ID];
        let threshold = settings.threshold;
        const max_level_on_stage = Array(stage_dom_items.length).fill(0);
        for (let level of data) {
            let continued = 0;
            for (let i = 0; i < max_level_on_stage.length; i++) {
                if (max_level_on_stage[i] > level.level) {
                    continued++;
                    continue;
                }
                if (level.per_stage[i] / level.total_items * 100 >= threshold) {
                    max_level_on_stage[i] = level.level;
                }
            }
            if (continued >= 5) {
                break;
            }
        }
        max_level_on_stage.forEach((val, i) => {
            stage_divs[i].innerText = `Level: ${val}`;
        });
    }
    function open_settings() {
        settings.open();
    }
    const style = document.createElement("style");
    style.id = `${SCRIPT_ID}_style`;
    style.innerHTML = SRS_LEVELS_STYLE;
    document.head.append(style);
})();
function dbg(obj, ...other) {
    console.debug(...other, obj);
    return obj;
}
function prepare_srs_levels_settings_dialog(update) {
    return new window.wkof.Settings({
        script_id: SCRIPT_ID,
        title: "Levels by srs",
        on_save: update,
        content: {
            threshold: {
                type: "number",
                label: "Threshold",
                hover_tip: "Percentage of level needed completed before SRS stage is considered completed.",
                default: 90
            }
        }
    });
}
var SRSIndividualStage;
(function (SRSIndividualStage) {
    SRSIndividualStage[SRSIndividualStage["APPRENTICE_1"] = 1] = "APPRENTICE_1";
    SRSIndividualStage[SRSIndividualStage["APPRENTICE_2"] = 2] = "APPRENTICE_2";
    SRSIndividualStage[SRSIndividualStage["APPRENTICE_3"] = 3] = "APPRENTICE_3";
    SRSIndividualStage[SRSIndividualStage["APPRENTICE_4"] = 4] = "APPRENTICE_4";
    SRSIndividualStage[SRSIndividualStage["GURU_1"] = 5] = "GURU_1";
    SRSIndividualStage[SRSIndividualStage["GURU_2"] = 6] = "GURU_2";
    SRSIndividualStage[SRSIndividualStage["MASTER"] = 7] = "MASTER";
    SRSIndividualStage[SRSIndividualStage["ENLIGHTENED"] = 8] = "ENLIGHTENED";
    SRSIndividualStage[SRSIndividualStage["BURN"] = 9] = "BURN";
})(SRSIndividualStage || (SRSIndividualStage = {}));
var SRSCombinedStage;
(function (SRSCombinedStage) {
    SRSCombinedStage[SRSCombinedStage["APPRENTICE"] = 0] = "APPRENTICE";
    SRSCombinedStage[SRSCombinedStage["GURU"] = 1] = "GURU";
    SRSCombinedStage[SRSCombinedStage["MASTER"] = 2] = "MASTER";
    SRSCombinedStage[SRSCombinedStage["ENLIGHTENED"] = 3] = "ENLIGHTENED";
    SRSCombinedStage[SRSCombinedStage["BURN"] = 4] = "BURN";
})(SRSCombinedStage || (SRSCombinedStage = {}));
function srs_map(srs) {
    switch (srs) {
        case SRSIndividualStage.APPRENTICE_1:
        case SRSIndividualStage.APPRENTICE_2:
        case SRSIndividualStage.APPRENTICE_3:
        case SRSIndividualStage.APPRENTICE_4:
            return SRSCombinedStage.APPRENTICE;
        case SRSIndividualStage.GURU_1:
        case SRSIndividualStage.GURU_2:
            return SRSCombinedStage.GURU;
        case SRSIndividualStage.MASTER:
            return SRSCombinedStage.MASTER;
        case SRSIndividualStage.ENLIGHTENED:
            return SRSCombinedStage.ENLIGHTENED;
        case SRSIndividualStage.BURN:
            return SRSCombinedStage.BURN;
    }
}
