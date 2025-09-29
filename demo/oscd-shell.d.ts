import '@webcomponents/scoped-custom-element-registry';
import { LitElement, TemplateResult } from 'lit';
import '@omicronenergy/oscd-ui/app-bar/oscd-app-bar.js';
import type { OscdDialog } from '@omicronenergy/oscd-ui/dialog/OscdDialog.js';
import '@omicronenergy/oscd-ui/dialog/oscd-dialog.js';
import '@omicronenergy/oscd-ui/divider/oscd-divider.js';
import type { OscdFilledIconButton } from '@omicronenergy/oscd-ui/iconbutton/OscdFilledIconButton.js';
import '@omicronenergy/oscd-ui/iconbutton/oscd-filled-icon-button.js';
import '@omicronenergy/oscd-ui/select/oscd-filled-select.js';
import '@omicronenergy/oscd-ui/textfield/oscd-filled-text-field.js';
import '@omicronenergy/oscd-ui/icon/oscd-icon.js';
import '@omicronenergy/oscd-ui/list/oscd-list.js';
import '@omicronenergy/oscd-ui/list/oscd-list-item.js';
import type { OscdMenu } from '@omicronenergy/oscd-ui/menu/OscdMenu.js';
import '@omicronenergy/oscd-ui/menu/oscd-menu.js';
import '@omicronenergy/oscd-ui/menu/oscd-menu-item.js';
import type { OscdNavigationDrawer } from '@omicronenergy/oscd-ui/navigation-drawer/OscdNavigationDrawer.js';
import '@omicronenergy/oscd-ui/navigation-drawer/oscd-navigation-drawer.js';
import '@omicronenergy/oscd-ui/navigation-drawer/oscd-navigation-drawer-header.js';
import '@omicronenergy/oscd-ui/tabs/oscd-secondary-tab.js';
import '@omicronenergy/oscd-ui/select/oscd-select-option.js';
import '@omicronenergy/oscd-ui/tabs/oscd-tabs.js';
import '@omicronenergy/oscd-ui/button/oscd-text-button.js';
import { XMLEditor } from '@omicronenergy/oscd-editor';
import { EditV2, OpenEvent, Transactor } from '@omicronenergy/oscd-api';
import { allLocales, targetLocales } from './locales.js';
export interface Plugin {
    editor: Transactor<EditV2>;
    docs: Record<string, XMLDocument>;
    doc?: XMLDocument;
    docName?: string;
    docVersion: unknown;
    /** @deprecated Use `docVersion` instead */
    editCount: number;
    locale: string;
}
export type PluginEntry = {
    name: string;
    translations?: Record<(typeof targetLocales)[number], string>;
    tagName: string;
    icon: string;
    requireDoc?: boolean;
};
export type SourcedPluginEntry = {
    name: string;
    translations?: Record<(typeof targetLocales)[number], string>;
    src: string;
    icon: string;
    requireDoc?: boolean;
};
export type PluginSet<P = PluginEntry> = {
    menu: P[];
    editor: P[];
    background: P[];
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
export declare class OpenSCD extends LitElement {
    #private;
    /** The file endings of editable files */
    editable: string[];
    isEditable(docName: string): boolean;
    get editableDocs(): string[];
    private _docs;
    /** The set of `XMLDocument`s currently loaded */
    get docs(): Record<string, XMLDocument>;
    set docs(newDocs: Record<string, XMLDocument>);
    onDocsChanged(): void;
    /** The name of the [[`doc`]] currently being edited */
    docName: string;
    get doc(): XMLDocument;
    xmlEditor: XMLEditor;
    docVersion: number;
    get last(): number;
    get canUndo(): boolean;
    get canRedo(): boolean;
    get plugins(): PluginSet;
    set plugins(plugins: Partial<PluginSet<Partial<PluginEntry | SourcedPluginEntry>>>);
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
    renderPlugin(tagName: string): TemplateResult;
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
