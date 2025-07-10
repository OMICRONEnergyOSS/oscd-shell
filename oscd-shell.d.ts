import '@webcomponents/scoped-custom-element-registry';
import { LitElement, TemplateResult } from 'lit';
import { OscdAppBar } from '@omicronenergy/oscd-ui/app-bar/OscdAppBar.js';
import { OscdDialog } from '@omicronenergy/oscd-ui/dialog/OscdDialog.js';
import { OscdDivider } from '@omicronenergy/oscd-ui/divider/OscdDivider.js';
import { OscdFilledIconButton } from '@omicronenergy/oscd-ui/iconbutton/OscdFilledIconButton.js';
import { OscdFilledSelect } from '@omicronenergy/oscd-ui/select/OscdFilledSelect.js';
import { OscdFilledTextField } from '@omicronenergy/oscd-ui/textfield/OscdFilledTextField.js';
import { OscdIcon } from '@omicronenergy/oscd-ui/icon/OscdIcon.js';
import { OscdList } from '@omicronenergy/oscd-ui/list/OscdList.js';
import { OscdListItem } from '@omicronenergy/oscd-ui/list/OscdListItem.js';
import { OscdMenu } from '@omicronenergy/oscd-ui/menu/OscdMenu.js';
import { OscdMenuItem } from '@omicronenergy/oscd-ui/menu/OscdMenuItem.js';
import { OscdNavigationDrawer } from '@omicronenergy/oscd-ui/navigation-drawer/OscdNavigationDrawer.js';
import { OscdNavigationDrawerHeader } from '@omicronenergy/oscd-ui/navigation-drawer/OscdNavigationDrawerHeader.js';
import { OscdSecondaryTab } from '@omicronenergy/oscd-ui/tabs/OscdSecondaryTab.js';
import { OscdSelectOption } from '@omicronenergy/oscd-ui/select/OscdSelectOption.js';
import { OscdTabs } from '@omicronenergy/oscd-ui/tabs/OscdTabs.js';
import { OscdTextButton } from '@omicronenergy/oscd-ui/button/OscdTextButton.js';
import { XMLEditor } from '@omicronenergy/oscd-editor';
import { OpenEvent } from '@omicronenergy/oscd-api';
import { allLocales, targetLocales } from './locales.js';
export type Plugin = {
    name: string;
    translations?: Record<(typeof targetLocales)[number], string>;
    src: string;
    icon: string;
    requireDoc?: boolean;
};
export type PluginSet = {
    menu: Plugin[];
    editor: Plugin[];
    background: Plugin[];
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
    xmlEditor: XMLEditor;
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
    /** Undo the last `n` [[Edit]]s committed */
    undo(n?: number): void;
    /** Redo the last `n` [[Edit]]s that have been undone */
    redo(n?: number): void;
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
