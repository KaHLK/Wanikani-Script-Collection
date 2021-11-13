// ==UserScript==
// @name         WaniKani: Total Progress
// @namespace    https://wanikani.com/
// @version      0.1.3
// @description  A (smaller) re-implementation of https://community.wanikani.com/t/userscript-total-progress-bar-allows-level-progress-removalaka-2cool4progress/38899 using modern js
// @author       KaHLK
// @include      /https://(preview|www).wanikani.com/dashboard/
// @include      /https://(preview|www).wanikani.com//
// @grant        none
// ==/UserScript==
// @ts-ignore
const SCRIPT_ID = "total_progress_bar";
const STYLE = `
#${SCRIPT_ID} {
    position: relative;
    padding: 1em;
    background: #d5d5d5;
    border-radius: 5px;
}
#${SCRIPT_ID} #inner {
    overflow: hidden;
}
#${SCRIPT_ID} .bar{
    display: flex;
    height: 2.5em;
    background: transparent;
}

#${SCRIPT_ID} h5{
    margin-bottom: 0;
    margin-top: 1em;
}

#${SCRIPT_ID} .section{
    display: flex;
    justify-content: center;
    align-items: center;
    height: inherit;
    color: #fafafa;
}

#${SCRIPT_ID} #tooltip {
    position: absolute;
    padding: .5em;
    background-color: #222;
    color: #fafafa;
    border-radius: 5px;
    transform: translate(0, -100%);
    width: max-content;
    visibility: hidden;
}

#${SCRIPT_ID} #tooltip::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translate(-50%, 100%);

    height: 0;
    width: 0;

    border: 4px solid transparent;
    border-top-color: #222;
}
`;

type Color = string;
interface Settings {
    [key: string]: any,
    reverse: boolean,
    sub_section: boolean,
    locked_color: Color,
    apprentice1_color: Color,
    apprentice2_color: Color,
    apprentice3_color: Color,
    apprentice4_color: Color,
    guru1_color: Color,
    guru2_color: Color,
    master_color: Color,
    enlightened_color: Color,
    burned_color: Color,
    show_type_breakdown: boolean,
}
const SETTINGS_DEFAULT: Settings = {
    reverse: true,
    sub_section: true,
    locked_color: "#434343",
    apprentice1_color: "#ffe0f4",
    apprentice2_color: "#ff80d4",
    apprentice3_color: "#ff33bb",
    apprentice4_color: "#f500a3",
    guru1_color: "#b95bd1",
    guru2_color: "#a035bb",
    master_color: "#3a5bde",
    enlightened_color: "#009eee",
    burned_color: "#fab623",
    show_type_breakdown: false,
};

interface Section extends HTMLDivElement {
    text: string
}

type TMap<T> = { [kef: string]: T };

type StageMap = TMap<number>;
type TypeMap = TMap<number>;
type TypeStageMap = TMap<StageMap>;
type DivMap = TMap<Section>;
type TypeDivMap = TMap<DivMap>;
type MouseMap = TMap<(e: MouseEvent) => void>
const EMPTY_MAP: StageMap = {
    locked: 0,
    apprentice1: 0,
    apprentice2: 0,
    apprentice3: 0,
    apprentice4: 0,
    guru1: 0,
    guru2: 0,
    master: 0,
    enlightened: 0,
    burned: 0,
};

(function () {
    'use strict';

    let wkof: WanikaniOpenFramework;

    if(!window.wkof) {
        let response = confirm("\"WaniKani: Total Progress\" script requires WaniKani Open Framework.\n Click \"OK\" to be forwarded to installation instructions.");

        if(response) {
            window.location.href = 'https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549';
        }
        return;
    } else {
        wkof = window.wkof;
    }

    // Prepare variables
    const total: StageMap = { ...EMPTY_MAP };
    const total_type: TypeStageMap = {
        radical: { ...EMPTY_MAP },
        kanji: { ...EMPTY_MAP },
        vocabulary: { ...EMPTY_MAP },
    };
    const percent: StageMap = { ...EMPTY_MAP };
    const percent_type: TypeStageMap = {
        radical: { ...EMPTY_MAP },
        kanji: { ...EMPTY_MAP },
        vocabulary: { ...EMPTY_MAP },
    };
    const amount: TypeMap = {
        radical: 0,
        kanji: 0,
        vocabulary: 0,
    };
    const container = el("section");
    container.id = SCRIPT_ID;
    const inner = div("inner");
    const bar = div();
    const sections: DivMap = {};
    const bar_type: DivMap = {
        radical: div(),
        kanji: div(),
        vocabulary: div(),
    };
    const sections_type: TypeDivMap = {
        radical: {},
        kanji: {},
        vocabulary: {},
    };
    const mouse_move: MouseMap = {};
    const mouse_move_type: TMap<MouseMap> = {
        radical: {},
        kanji: {},
        vocabulary: {},
    };

    const tooltip = div("tooltip");

    let dialog: WKOFDialog;
    let item_total = 0;
    let container_rect: DOMRect;

    setup()

    async function setup() {
        wkof.include("Menu,Settings,ItemData")
        await wkof.ready("Menu,Settings,ItemData");

        dialog = prepare_dialog(update_bar);
        dialog.load(SETTINGS_DEFAULT);
        install_menu();

        const items = await wkof.ItemData.get_items({
            wk_items: {
                options: {
                    assignments: true,
                }
            }
        });
        item_total = items.length;

        // Count the amount of items for each srs stage
        for(let item of items) {
            const type = item.object;
            let stage = "locked";
            if(item.assignments != undefined) {
                stage = stage_num_to_id(item.assignments.srs_stage);
            }
            amount[type]++;
            total_type[type][stage]++;
            total[stage]++;
        }

        // Setup divs for the bar and calculate the different srs percentages
        document.querySelector(".srs-progress")!!.before(container);

        container.append(inner);
        inner.append(bar);
        setup_bar(total, item_total, percent, sections, bar);

        for(let key of Object.keys(total_type)) {
            const bar = bar_type[key];
            inner.append(bar);

            const title = el("h5");
            title.innerHTML = key.charAt(0).toUpperCase() + key.slice(1);
            bar.before(title);

            setup_bar(total_type[key], amount[key], percent_type[key], sections_type[key], bar);
        }

        container.append(tooltip);

        update_bar();
    }

    function setup_bar(items: StageMap, amount: number, percent_arr: StageMap, section_arr: DivMap, bar: HTMLDivElement) {
        bar.classList.add("bar");
        bar.addEventListener("mouseenter", mouseover);
        bar.addEventListener("mouseleave", mouseout);
        for(let [key, value] of Object.entries(items)) {
            percent_arr[key] = value / amount * 100;

            const section = div();
            section.classList.add(key, "section");
            section_arr[key] = section;
            bar.append(section);
        }
    }

    function mouseover() {
        tooltip_show = true;
        position_tooltip();
        tooltip.style.visibility = "visible";
    }

    function mouseout() {
        tooltip_show = false;
        tooltip.style.visibility = "hidden";
    }

    let tooltip_show = false;
    let tooltip_y = 0;
    let tooltip_x = 0;
    function mousemove(bar: HTMLDivElement, section: Section) {
        const rect = bar.getBoundingClientRect();
        const top = rect.top - container_rect.top - 6;
        const offset = rect.left - container_rect.left;
        const max = rect.width;
        return (e: MouseEvent) => {
            tooltip.innerText = section.text;
            const half_width = tooltip.getBoundingClientRect().width / 2;
            const x = e.clientX - rect.x;
            let resX = offset;
            if(x > half_width && x < max - half_width) {
                resX = x + offset - half_width;
            } else if(x >= max - half_width) {
                resX = max - half_width * 2 + offset;
            }

            tooltip_y = top;
            tooltip_x = resX;
        };
    }

    function position_tooltip() {
        tooltip.style.top = `${tooltip_y}px`;
        tooltip.style.left = `${tooltip_x}px`;
        if(tooltip_show) {
            requestAnimationFrame(position_tooltip);
        }
    }

    // Update the bar with values from the settings
    function update_bar() {
        const settings = wkof.settings[SCRIPT_ID] as Settings;

        // Reverse the bar
        if(settings.reverse) {
            bar.style.flexDirection = "row-reverse";
            for(let el of Object.values(bar_type)) {
                el.style.flexDirection = "row-reverse";
            }
        } else {
            bar.style.flexDirection = "row";
            for(let el of Object.values(bar_type)) {
                el.style.flexDirection = "row";
            }
        }

        let [percent_values, percent_values_type] = map_values(percent, percent_type, settings);
        let [total_values, total_values_type] = map_values(total, total_type, settings);


        if(settings.show_type_breakdown) {
            inner.style.height = "auto";
        } else {
            inner.style.height = `${bar.getBoundingClientRect().height}px`;
        }

        container_rect = container.getBoundingClientRect();
        // Update the width, text, and color of the sections
        set_sections(bar, sections, percent_values, total_values, item_total, settings, mouse_move);
        for(let key of Object.keys(sections_type)) {
            set_sections(bar_type[key], sections_type[key], percent_values_type[key], total_values_type[key], amount[key], settings, mouse_move_type[key]);
        }
    }

    function merge_sections(data: StageMap, settings: Settings): StageMap {
        if(settings.sub_section) {
            return data;
        }
        let values: StageMap = {};
        for(let [key, value] of Object.entries(data)) {
            let k = key;
            if(key.startsWith("apprentice")) {
                k = "apprentice4";
            } else if(k.startsWith("guru")) {
                k = "guru2";
            }
            if(values[k] === undefined) {
                values[k] = 0;
            }
            values[k] += value;
        }
        return values;
    }

    function map_values(data: StageMap, data_by_type: TypeStageMap, settings: Settings): [StageMap, TypeStageMap] {
        let values = merge_sections(data, settings);
        let values_types: TypeStageMap = {};
        for(let key of Object.keys(sections_type)) {
            values_types[key] = merge_sections(data_by_type[key], settings);
        }

        return [values, values_types];
    }

    function set_sections(bar: HTMLDivElement, sections: DivMap, values: TypeMap, amount: TypeMap, total: number, settings: Settings, listeners: MouseMap) {
        for(let [key, section] of Object.entries(sections)) {
            let value = 0;
            if(values[key] !== undefined) {
                value = values[key];
            }
            section.style.width = `${value}%`;
            section.style.background = settings[`${key}_color`] as Color;
            section.text = `${stage_id_to_title(key, !settings.sub_section)}: ${value.toFixed(2)}% (${amount[key]} / ${total})`;
            if(value > 4) {
                section.innerHTML = `${value.toFixed(2)}%`;
            } else {
                section.innerHTML = "";
            }

            section.removeEventListener("mousemove", listeners[key]);
            listeners[key] = mousemove(bar, section)
            section.addEventListener("mousemove", listeners[key]);
        }
    }

    function install_menu() {
        wkof.Menu.insert_script_link({
            name: `${SCRIPT_ID}_settings`,
            submenu: "Settings",
            title: "Total Progress",
            on_click: open_settings,
        });
    }

    function open_settings() {
        dialog.open();
    }



    // Add the required styles to the header
    const style = el("style");
    style.id = `${SCRIPT_ID}_style`;
    style.innerHTML = STYLE;

    document.head.append(style);
})();

// A utility logger function that appends an easy to locate identifier before each log call
function log(...args: any[]): void {
    console.log("TP:", ...args);
}

// A utility function that maps a srs_stage number from the api to a number used for look-up in the maps
function stage_num_to_id(stage: number): string {
    switch(stage) {
        case 1: return "apprentice1";
        case 2: return "apprentice2";
        case 3: return "apprentice3";
        case 4: return "apprentice4";
        case 5: return "guru1";
        case 6: return "guru2";
        case 7: return "master";
        case 8: return "enlightened";
        case 9: return "burned";
    }
    return "locked";
}

function stage_id_to_title(stage: string, merge: boolean): string {
    switch(stage) {
        case "locked": return "Locked/Lesson";
        case "apprentice1": if(!merge) { return "Apprentice 1"; }
        case "apprentice2": if(!merge) { return "Apprentice 2"; }
        case "apprentice3": if(!merge) { return "Apprentice 3"; }
        case "apprentice4": if(!merge) { return "Apprentice 4"; } else { return "Apprentice"; }
        case "guru1": if(!merge) { return "Guru 1"; }
        case "guru2": if(!merge) { return "Guru 2"; } else { return "Guru"; }
        case "master": return "Master";
        case "enlightened": return "Enlightened";
        case "burned": return "Burned";
    }
    return "locked";
}

function div(id: string = ""): Section {
    const d = el("div") as Section;
    d.id = id;
    return d;
}

function el(el: string): HTMLElement {
    return document.createElement(el);
}

function prepare_dialog(update_bar: Function) {
    return new window.wkof.Settings({
        script_id: SCRIPT_ID,
        title: "Total Progress",
        on_change: update_bar,
        on_close: update_bar,
        content: {
            reverse: {
                type: "checkbox",
                label: "Reverse order",
                hover_tip: "Reverses the order of the stages",
                default: true,
            },
            sub_section: {
                type: "checkbox",
                label: "Subsection",
                hover_tip: "Divide Apprentice and Guru stages into their subsections",
                default: true,
            },
            show_type_breakdown: {
                type: "checkbox",
                label: "Show type breakdown",
                hover_tip: "Show bars breakingdown the progress for each item type (radical, kanji, vocabulary)",
                default: false,
            },
            color_section: {
                type: "group",
                label: "Colors",
                content: {
                    locked_color: {
                        type: "color",
                        label: "Locked/Lesson Color",
                        hover_tip: "The color of Locked/Lesson items",
                        default: "#434343",
                    },
                    apprentice1_color: {
                        type: "color",
                        label: "Apprentice 1 Color",
                        hover_tip: "The color of Apprentice 2 items",
                        default: "#ffe0f4",
                    },
                    apprentice2_color: {
                        type: "color",
                        label: "Apprentice 2 Color",
                        hover_tip: "The color of Apprentice 2 items",
                        default: "#ff80d4",
                    },
                    apprentice3_color: {
                        type: "color",
                        label: "Apprentice 3 Color",
                        hover_tip: "The color of Apprentice 3 items",
                        default: "#ff33bb",
                    },
                    apprentice4_color: {
                        type: "color",
                        label: "Apprentice 4 Color",
                        hover_tip: "The color of Apprentice 4 items",
                        default: "#f500a3",
                    },
                    guru1_color: {
                        type: "color",
                        label: "Guru 1 Color",
                        hover_tip: "The color of Guru 1 items",
                        default: "#b95bd1",
                    },
                    guru2_color: {
                        type: "color",
                        label: "Guru 2 Color",
                        hover_tip: "The color of Guru 2 items",
                        default: "#a035bb",
                    },
                    master_color: {
                        type: "color",
                        label: "Master Color",
                        hover_tip: "The color of Master items",
                        default: "#3a5bde",
                    },
                    enlightened_color: {
                        type: "color",
                        label: "Enlightened Color",
                        hover_tip: "The color of Enlightened items",
                        default: "#009eee",
                    },
                    burned_color: {
                        type: "color",
                        label: "Burned Color",
                        hover_tip: "The color of Burned items",
                        default: "#fab623",
                    },
                },
            },
        }
    });
}