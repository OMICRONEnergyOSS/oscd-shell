import '@webcomponents/scoped-custom-element-registry';
import { LitElement, TemplateResult } from 'lit';
import { OscdAppBar } from '@omicronenergy/oscd-ui/app-bar/oscd-app-bar.js';
import { OscdDialog } from '@omicronenergy/oscd-ui/dialog/oscd-dialog.js';
import { OscdDivider } from '@omicronenergy/oscd-ui/divider/oscd-divider.js';
import { OscdFilledIconButton } from '@omicronenergy/oscd-ui/iconbutton/oscd-filled-icon-button.js';
import { OscdFilledSelect } from '@omicronenergy/oscd-ui/select/oscd-filled-select.js';
import { OscdFilledTextField } from '@omicronenergy/oscd-ui/textfield/oscd-filled-text-field.js';
import { OscdIcon } from '@omicronenergy/oscd-ui/icon/oscd-icon.js';
import { OscdList } from '@omicronenergy/oscd-ui/list/oscd-list.js';
import { OscdListItem } from '@omicronenergy/oscd-ui/list/oscd-list-item.js';
import { OscdMenu } from '@omicronenergy/oscd-ui/menu/oscd-menu.js';
import { OscdMenuItem } from '@omicronenergy/oscd-ui/menu/oscd-menu-item.js';
import { OscdNavigationDrawer } from '@omicronenergy/oscd-ui/navigation-drawer/oscd-navigation-drawer.js';
import { OscdNavigationDrawerHeader } from '@omicronenergy/oscd-ui/navigation-drawer/oscd-navigation-drawer-header.js';
import { OscdSecondaryTab } from '@omicronenergy/oscd-ui/tabs/oscd-secondary-tab.js';
import { OscdSelectOption } from '@omicronenergy/oscd-ui/select/oscd-select-option.js';
import { OscdTabs } from '@omicronenergy/oscd-ui/tabs/oscd-tabs.js';
import { OscdTextButton } from '@omicronenergy/oscd-ui/button/oscd-text-button.js';
import { allLocales, targetLocales } from './locales.js';
import { Edit, EditEvent, OpenEvent } from './foundation.js';
export type LogEntry = {
    undo: Edit;
    redo: Edit;
};
export type Plugin = {
    name: string;
    translations?: Record<(typeof targetLocales)[number], string>;
    src: string;
    icon: string;
    requireDoc?: boolean;
    active?: boolean;
};
export type PluginSet = {
    menu: Plugin[];
    editor: Plugin[];
};
type Control = {
    icon: string;
    getName: () => string;
    isDisabled: () => boolean;
    action?: () => void | Promise<void>;
};
type RenderedPlugin = Control & {
    tagName: string;
};
type LocaleTag = (typeof allLocales)[number];
declare const OpenSCD_base: typeof LitElement & import("@open-wc/scoped-elements/lit-element.js").ScopedElementsHostConstructor;
export declare class OpenSCD extends OpenSCD_base {
    #private;
    static get scopedElements(): {
        'oscd-app-bar': typeof OscdAppBar;
        'oscd-dialog': typeof OscdDialog;
        'oscd-icon': typeof OscdIcon;
        'oscd-filled-text-field': typeof OscdFilledTextField;
        'oscd-filled-select': typeof OscdFilledSelect;
        'oscd-select-option': typeof OscdSelectOption;
        'oscd-filled-icon-button': typeof OscdFilledIconButton;
        'oscd-list': typeof OscdList;
        'oscd-list-item': typeof OscdListItem;
        'oscd-divider': typeof OscdDivider;
        'oscd-menu-item': typeof OscdMenuItem;
        'oscd-navigation-drawer': typeof OscdNavigationDrawer;
        'oscd-navigation-drawer-header': typeof OscdNavigationDrawerHeader;
        'oscd-secondary-tab': typeof OscdSecondaryTab;
        'oscd-tabs': typeof OscdTabs;
        'oscd-text-button': typeof OscdTextButton;
        'oscd-menu': typeof OscdMenu;
    };
    get doc(): XMLDocument;
    history: LogEntry[];
    editCount: number;
    get last(): number;
    get canUndo(): boolean;
    get canRedo(): boolean;
    /** The set of `XMLDocument`s currently loaded */
    docs: Record<string, XMLDocument>;
    /** The name of the [[`doc`]] currently being edited */
    docName: string;
    /** The file endings of editable files */
    editable: string[];
    isEditable(docName: string): boolean;
    get editableDocs(): string[];
    get plugins(): PluginSet;
    set plugins(plugins: Partial<PluginSet>);
    get loadedPlugins(): PluginSet;
    addLoadedPlugin(tagName: string, kind: keyof PluginSet, plugin: Plugin, index: number): void;
    handleOpenDoc({ detail: { docName, doc } }: OpenEvent): void;
    handleEditEvent(event: EditEvent): void;
    /** Undo the last `n` [[Edit]]s committed */
    undo(n?: number): void;
    /** Redo the last `n` [[Edit]]s that have been undone */
    redo(n?: number): void;
    logUI: OscdDialog;
    editFileUI: OscdDialog;
    menuUI: OscdNavigationDrawer;
    fileNameUI: HTMLInputElement;
    fileExtensionUI: HTMLInputElement;
    fileMenuUI: OscdMenu;
    fileMenuButtonUI?: OscdFilledIconButton;
    get locale(): LocaleTag;
    set locale(tag: LocaleTag);
    private editorIndex;
    get editor(): string;
    private controls;
    get menu(): Required<Control>[];
    get editors(): RenderedPlugin[];
    private hotkeys;
    private handleKeyPress;
    constructor();
    private renderLogEntry;
    private renderHistory;
    updated(changedProps: Map<string, unknown>): void;
    render(): TemplateResult<1>;
    firstUpdated(): void;
    static styles: import("lit").CSSResult;
}
declare global {
    interface HTMLElementTagNameMap {
        'oscd-shell': OpenSCD;
    }
}
export {};
