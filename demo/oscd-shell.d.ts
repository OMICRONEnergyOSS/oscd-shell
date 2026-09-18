import { LitElement } from 'lit';
import { OscdFilledIconButton } from '@omicronenergy/oscd-ui/iconbutton/OscdFilledIconButton.js';
import { XMLEditor } from '@openscd/oscd-editor';
import { EditEventV2, OpenEvent } from '@openscd/oscd-api';
import { LocaleTag } from './localization.js';
import { EditorPluginsPanel } from './side-panel/editor-plugins-panel.js';
import { PluginsMenu } from './menus/plugins-menu.js';
import { LandingPage } from './landing-page/landing-page.js';
import { RenameEvent, CloseEvent } from './foundation/events.js';
import { FilesMenu } from './menus/files-menu.js';
import { OscdAppBar } from '@omicronenergy/oscd-ui/app-bar/OscdAppBar.js';
import { OscdDivider } from '@omicronenergy/oscd-ui/divider/OscdDivider.js';
import { OscdIcon } from '@omicronenergy/oscd-ui/icon/OscdIcon.js';
/** Fields shared by plugin entries and the groups that contain them. */
export interface PluginMetadata {
    name: string;
    translations?: Record<string, string>;
    icon: string;
}
/** Fields common to actual plugins (not groups)
 * require a document. */
export interface OscdPluginBase extends PluginMetadata {
    requireDoc?: boolean;
}
/** A plugin dynamically imported at runtime from a URL, defined by the `src` field.
 *  The shell will load the plugin and assign it a unique tagName generated from hashing the `src` url. */
export interface SourcedPlugin extends OscdPluginBase {
    src: string;
}
/** A plugin already defined in the registry under `tagName`. */
export interface TaggedPlugin extends OscdPluginBase {
    tagName: string;
}
/** A declared plugin, either sourced or already registered. */
export type OscdPlugin = SourcedPlugin | TaggedPlugin;
/**
 * The shell's internal object for all plugins. Here `tagName` is guaranteed because
 * resolution has already happened, and `src` is deliberately absent - it has
 * served its purpose and nothing downstream reads it.
 * Currently its the same shape as TaggedPlugin, their purposes are
 * different and clarity is favored over brevity.
 */
export interface ResolvedPlugin extends OscdPluginBase {
    tagName: string;
}
/** A group of plugins. */
export interface PluginGroup<P extends PluginMetadata = OscdPlugin> extends PluginMetadata {
    plugins: P[];
}
/**
 * The root object representing the plugins property (and the resolved plugins).
 */
export interface PluginSet<P extends PluginMetadata = OscdPlugin> {
    menu: (P | PluginGroup<P>)[];
    editor: (P | PluginGroup<P>)[];
    background: P[];
}
declare const OscdShell_base: typeof LitElement & import("@open-wc/dedupe-mixin").Constructor<import("@open-wc/scoped-elements/types.js").ScopedElementsHost> & import("@open-wc/scoped-elements/types.js").ScopedElementsHostConstructor;
export declare class OscdShell extends OscdShell_base {
    static scopedElements: {
        'oscd-app-bar': typeof OscdAppBar;
        'oscd-filled-icon-button': typeof OscdFilledIconButton;
        'oscd-divider': typeof OscdDivider;
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
    _plugins: PluginSet<OscdPlugin>;
    /** Internal representation of processed `_plugins`. These plugins have been validated and the
     * `tagName` here is guaranteed, sourced entries imported into the registry & tagged. This copy of the
     *  plugins is kept separate from the _plugins, which remain an unmodified single source of truth.
     */
    _resolvedPlugins: PluginSet<ResolvedPlugin>;
    /**
     * The plugin set as declared. Deliberately symmetric: what you assign is
     * what you read back, untouched. Resolution (deriving `tagName` from `src`,
     * validating, importing) happens into `_resolvedPlugins`, so the hashed
     * tag names it invents stay an implementation detail.
     */
    get plugins(): PluginSet<OscdPlugin>;
    set plugins(plugins: Partial<PluginSet<OscdPlugin>>);
    get canRedo(): boolean;
    get canUndo(): boolean;
    selectedEditor?: ResolvedPlugin;
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
    willUpdate(changedProperties: Map<PropertyKey, unknown>): void;
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
    handlePluginMenuSelect(customEvent: CustomEvent): void;
    /** Undo the last `n` [[Edit]]s committed */
    undo: (n?: number) => void;
    /** Redo the last `n` [[Edit]]s that have been undone */
    redo: (n?: number) => void;
    private hotkeys;
    isEditable(docName: string): boolean;
    renderPlugin(plugin: ResolvedPlugin): import("lit-html").TemplateResult;
    renderOffScreenPlugins(): import("lit-html").TemplateResult<1>;
    renderDefaultLandingPage(): import("lit-html").TemplateResult<1>;
    render(): import("lit-html").TemplateResult<1>;
    static styles: import("lit").CSSResult[];
}
declare global {
    interface HTMLElementTagNameMap {
        'oscd-shell': OscdShell;
    }
}
export {};
