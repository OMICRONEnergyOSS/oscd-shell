import { LitElement } from 'lit';
import { OscdFilledIconButton } from '@omicronenergy/oscd-ui/iconbutton/OscdFilledIconButton.js';
import { XMLEditor } from '@omicronenergy/oscd-editor';
import { EditEventV2, OpenEvent } from '@openscd/oscd-api';
import { LocaleTag, Translations } from './localization.js';
import { EditorPluginsPanel } from './side-panel/editor-plugins-panel.js';
import { PluginsMenu } from './menus/plugins-menu.js';
import { LandingPage } from './landing-page/landing-page.js';
import { RenameEvent, CloseEvent } from './foundation/events.js';
import { FilesMenu } from './menus/files-menu.js';
import { OscdAppBar } from '@omicronenergy/oscd-ui/app-bar/OscdAppBar.js';
import { OscdIcon } from '@omicronenergy/oscd-ui/icon/OscdIcon.js';
export type PluginEntry = {
    name: string;
    translations?: Translations;
    tagName: string;
    icon: string;
    requireDoc?: boolean;
};
export type SourcedPluginEntry = {
    name: string;
    translations?: Translations;
    src: string;
    icon: string;
    requireDoc?: boolean;
};
export type PluginSet<P = PluginEntry> = {
    menu: P[];
    editor: P[];
    background: P[];
};
declare const OscdShell_base: typeof LitElement & import("@open-wc/scoped-elements/lit-element.js").ScopedElementsHostConstructor;
export declare class OscdShell extends OscdShell_base {
    static scopedElements: {
        'oscd-app-bar': typeof OscdAppBar;
        'oscd-filled-icon-button': typeof OscdFilledIconButton;
        'oscd-icon': typeof OscdIcon;
        'files-menu': typeof FilesMenu;
        'plugins-menu': typeof PluginsMenu;
        'editor-plugins-panel': typeof EditorPluginsPanel;
        'landing-page': typeof LandingPage;
    };
    /**
     * Url to the app icon displayed in the app bar
     */
    appIcon: string;
    appTitle: string;
    landingPageHeading: string;
    landingPageSubHeading: string;
    /** The file endings of editable files */
    editable: string[];
    get locale(): LocaleTag;
    set locale(tag: LocaleTag);
    _plugins: PluginSet;
    get plugins(): PluginSet;
    set plugins(plugins: Partial<PluginSet<Partial<PluginEntry | SourcedPluginEntry>>>);
    get canRedo(): boolean;
    get canUndo(): boolean;
    get editor(): string;
    private editorIndex;
    get doc(): XMLDocument;
    /** The name of the [[`doc`]] currently being edited */
    docName: string;
    /** The set of `XMLDocument`s currently loaded */
    private _docs;
    get docs(): Record<string, XMLDocument>;
    set docs(newDocs: Record<string, XMLDocument>);
    docVersion: number;
    get editableDocs(): string[];
    get last(): number;
    xmlEditor: XMLEditor;
    pluginsMenu: PluginsMenu;
    editorPluginsPanel: EditorPluginsPanel;
    private _landingPageNodes?;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    handleOpenDoc: ({ detail: { docName, doc } }: OpenEvent) => void;
    handleRenameDoc: (customEvent: RenameEvent) => void;
    handleEditV2: (event: EditEventV2) => void;
    handleCloseDoc: (event: CloseEvent) => void;
    handleUndo: () => void;
    handleRedo: () => void;
    private handleKeyPress;
    handleOpenPluginMenu: () => void;
    /** Undo the last `n` [[Edit]]s committed */
    undo: (n?: number) => void;
    /** Redo the last `n` [[Edit]]s that have been undone */
    redo: (n?: number) => void;
    private hotkeys;
    isEditable(docName: string): boolean;
    onDocsChanged(): void;
    renderPlugin(tagName: string): import("lit-html").TemplateResult;
    onMenuPluginSelect(customEvent: CustomEvent): void;
    renderOffScreenPlugins(): import("lit-html").TemplateResult<1>;
    renderDefaultLandingPage(): import("lit-html").TemplateResult<1>;
    render(): import("lit-html").TemplateResult<1>;
    static styles: import("lit").CSSResult;
}
declare global {
    interface HTMLElementTagNameMap {
        'oscd-shell': OscdShell;
    }
}
export {};
