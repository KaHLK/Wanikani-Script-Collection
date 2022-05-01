interface Window {
    wkof: WanikaniOpenFramework | undefined,
}

interface WanikaniOpenFramework {
    file_cache: WKOFFileCache,

    include: (module_list: string) => Promise<{ loaded: string[], failed: string[], error?: string }>,
    ready: (module_list: string) => Promise<string[]>,

    load_css: (url: string, use_cache?: boolean) => Promise<void>,
    load_file: (url: string, use_cache?: boolean) => Promise<string>,
    load_script: (url: string, use_cache?: boolean) => Promise<void>,

    on: (event: string, callback: Function) => WanikaniOpenFramework,
    trigger: (event: string, ...args: any[]) => WanikaniOpenFramework,

    get_state: (state_var: string | number) => any,
    set_state: (state_var: string | number, value: any) => void,
    wait_state: (state_var: string | number, value: any, callback?: (value: any, current_value: any) => void, persistent?: boolean) => Promise<void>,

    version: {
        value: string,
        compare_to: (needed_version: string) => WKOFVersion,
    }

    ItemData: WKOFItemData,
    Menu: {
        insert_script_link: (config: WKOFMenuConfig) => void,
    }
    Progress: {
        update: (progress: WKOFProgressConfig) => void
    }
    Settings: WKOFSettings,
    settings: {
        [key: string]: Object,
    }

    Apiv2: WKOFApiv2,
}

type WKOFVersion = "older" | "same" | "newer";

interface WKOFFileCache {
    dir: {
        [key: string]: WKOFFile,
    },
    clear: () => Promise<void>,
    delete: (pattern: string | RegExp) => Promise<void>,
    flush: () => void,
    load: (name: string) => Promise<string>,
    ls: () => void,
    no_cache: (list: string) => void
    save: (name: string, content: string | Object) => Promise<void>,
}

interface WKOFFile {
    added: string,
    last_loaded: string,
}

interface WKOFItemData {
    presets: Object,
    registry: {
        sources: Object,
        indices: Object,
    },
    get_index: (items: any[], index_name: string) => Object,
    get_items: (config: WKOFGetItemConfig) => Promise<any[]>,
    pause_ready_event: (value?: boolean) => void,
}

type WKOFGetItemConfig = {
    wk_items: {
        options?: {
            assignments?: boolean,
            review_statistics?: boolean,
            study_materails?: boolean,
            include_hidden?: boolean,
        },
        filters?: {
            item_type?: WKOFGetItemFilter<WKOFItemType[] | string>,
            level?: WKOFGetItemFilter<string>,
            srs?: WKOFGetItemFilter<(WKOFsrs | number)[] | string | number>,
            have_burned?: WKOFGetItemFilter<boolean>,
        }
    }
}

type WKOFGetItemFilter<T> = T | { value: T, invert: true };

type WKOFItemType = "rad" | "kan" | "voc";
type WKOFsrs = "lock" | "init" | "appr1" | "appr2" | "appr3" | "appr4" | "guru1" | "guru2" | "mast" | "enli" | "burn";

interface WKOFProgressConfig {
    name: string,
    label: string,
    value: number,
    max: number,
}

interface WKOFMenuConfig {
    name: string,
    submenu?: string,
    title: string,
    class?: string,
    on_click: (e: MouseEvent) => void,
}

interface WKOFSettings {
    new(config: Object): WKOFDialog,

    load: (script_id: string, defaults?: Object) => Promise<Object>,
    save: (script_id: string) => Promise<void>,
}

type WKOFSettingsConfig = {
    script_id: string,
    title: string,

    autosave?: boolean,
    background?: boolean,
    pre_open?: (dialog: WKOFDialog) => void,
    on_save?: (settings: Object) => void,
    on_cancel?: (settings: Object) => void,
    on_close?: (settings: Object) => void,
    on_change?: (name: string, value: any, config: { type: string, label: string, default: any }) => void,
    on_refresh?: (settings: Object) => void,

    content: WKOFSettingsContent
}

interface WKOFSettingsContent {
    [key: string]: WKOFSettingsTabset | WKOFSettingsPage | WKOFSettingsSection | WKOFSettingsDivider | WKOFSettingsTabset | WKOFSettingsGroup | WKOFSettingslist | WKOFSettingsDropdown | WKOFSettingsCheckbox | WKOFSettingsInput | WKOFSettingsNumber | WKOFSettingsText | WKOFSettingsColor | WKOFSettingsButton | WKOFSettingsHTML
}

interface WKOFSettingsTabset {
    type: "tabset",
    content: WKOFSettingsContent,
}

interface WKOFSettingsPage {
    type: "page",
    label: string,
    hover_tip?: string,
    content: WKOFSettingsContent,
}

interface WKOFSettingsSection {
    type: "section",
    label: string,
}

interface WKOFSettingsDivider {
    type: "divider",
}

interface WKOFSettingsTabset {
    type: "tabset",
    content: WKOFSettingsContent,
}

interface WKOFSettingsGroup {
    type: "group",
    label: string,
    content: WKOFSettingsContent,
}

interface WKOFSettingslist {
    type: "list"
    label: string,
    multi?: boolean,
    size?: number,
    hover_tip?: string,
    default?: string,
    full_width?: boolean,
    validate?: (value: any, config: Object) => boolean | string | { valid: boolean, msg: string },
    on_change?: (value: any, current: any) => void,
    path?: string,
    content: {
        [key: string]: any,
    },
}

interface WKOFSettingsDropdown {
    type: "dropdown",
    label: string,
    hover_tip?: string,
    default?: string,
    full_width?: boolean,
    validate?: (value: any, config: Object) => boolean | string | { valid: boolean, msg: string },
    on_change?: (value: any, current: any) => void,
    path?: string,
    content: {
        [key: string]: any,
    },
}

interface WKOFSettingsCheckbox {
    type: "checkbox",
    label: string,
    hover_tip?: string,
    default?: string,
    full_width?: boolean,
    validate?: (value: any, config: Object) => boolean | string | { valid: boolean, msg: string },
    on_change?: (value: any, current: any) => void,
    path?: string,
}

interface WKOFSettingsInput {
    type: "input",
    label: string,
    subtype?: string,
    hover_tip?: string,
    placeholder?: string,
    default?: string,
    full_width?: boolean,
    validate?: (value: any, config: Object) => boolean | string | { valid: boolean, msg: string },
    on_change?: (value: any, current: any) => void,
    path?: string,
}

interface WKOFSettingsNumber {
    type: "number",
    label: string,
    hover_tip?: string,
    placeholder?: string
    default?: number,
    min?: number,
    max?: number,
    full_width?: boolean,
    validate?: (value: any, config: Object) => boolean | string | { valid: boolean, msg: string },
    on_change?: (value: any, current: any) => void,
    path?: string,
}

interface WKOFSettingsText {
    type: "text",
    label: string,
    hover_tip?: string,
    placeholder?: string
    default?: string,
    match?: RegExp,
    full_width?: boolean,
    validate?: (value: any, config: Object) => boolean | string | { valid: boolean, msg: string },
    on_change?: (value: any, current: any) => void,
    path?: string,
}

interface WKOFSettingsColor {
    type: "color",
    label: string,
    hover_tip?: string,
    default?: string,
    full_width?: boolean,
    validate?: (value: any, config: Object) => boolean | string | { valid: boolean, msg: string },
    on_change?: (value: any, current: any) => void,
    path?: string,
}

interface WKOFSettingsButton {
    type: "button",
    label: string,
    text?: string,
    hover_tip?: string,
    full_width?: boolean,
    validate?: (value: any, config: Object) => boolean | string | { valid: boolean, msg: string },
    on_change?: (value: any, current: any) => void,
    path?: string,
    on_click: (name: string, config: Object, on_change: Function) => void,
}

interface WKOFSettingsHTML {
    type: "html",
    label?: string,
    html: string,
}

interface WKOFDialog {
    cancel: () => void,
    close: () => void,
    open: () => void,
    refresh: () => void,

    load: (defaults?: Object) => Promise<Object>,
    save: () => Promise<void>,

    background: {
        open: () => void,
        close: () => void,
    }
}

interface WKOFApiv2 {
    fetch_endpoint: (endpoint: string, config?: object) => Promise<any>
    get_endpoint: (endpoint: string, config?: object) => Promise<any>
    clear_cache: (include_non_user?: boolean) => Promise<void>
    is_valid_apikey_format: (apikey: string) => boolean
}

interface WKOFApiv2FetchOptions {
    progress_callback?: (endpoint_name: string, first_new: number, so_far: number, total: number) => void
    last_update?: Date
    filters?: WKOFGetItemConfig["wk_items"]["filters"]
}

interface WKOFApiv2GetOptions {
    progress_callback?: (endpoint_name: string, first_new: number, so_far: number, total: number) => void
    forc_update?: boolean
}