import { css, html, LitElement, nothing } from 'lit';
import {
  customElement,
  property,
  query,
  queryAssignedNodes,
  state,
} from 'lit/decorators.js';
import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';
import { localized, msg } from '@lit/localize';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';

import { OscdFilledIconButton } from '@omicronenergy/oscd-ui/iconbutton/OscdFilledIconButton.js';
import { XMLEditor } from '@openscd/oscd-editor';
import { EditEventV2, OpenEvent } from '@openscd/oscd-api';

import {
  flattenPluginEntries,
  loadSourcedPlugins,
} from './utils/plugin-utils.js';
import { getLocale, LocaleTag, setLocale } from './localization.js';
import { EditorPluginsPanel } from './side-panel/editor-plugins-panel.js';
import { PluginsMenu } from './menus/plugins-menu.js';
import { LandingPage } from './landing-page/landing-page.js';
import { RenameEvent, CloseEvent } from './foundation/events.js';
import { FilesMenu } from './menus/files-menu.js';
import { oscdShellDesignTokens } from './oscd-shell-design-tokens.js';
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
export interface PluginGroup<
  P extends PluginMetadata = OscdPlugin,
> extends PluginMetadata {
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

@localized()
@customElement('oscd-shell')
export class OscdShell extends ScopedElementsMixin(LitElement) {
  static scopedElements = {
    'oscd-app-bar': OscdAppBar,
    'oscd-filled-icon-button': OscdFilledIconButton,
    'oscd-divider': OscdDivider,
    'oscd-icon': OscdIcon,
    'files-menu': FilesMenu,
    'plugins-menu': PluginsMenu,
    'editor-plugins-panel': EditorPluginsPanel,
    'landing-page': LandingPage,
  };

  /*
   * Properties
   */

  /**
   * Url to the app icon displayed in the app bar
   */
  @property({ type: String })
  appIcon: string = '';

  @property({ type: String })
  appTitle: string = 'OpenSCD';

  @property({ type: String })
  landingPageHeading: string = 'Welcome to OpenSCD';

  @property({ type: String })
  landingPageSubHeading: string =
    'Open Source IEC-61850-6 SCL Editing Platform';

  /** The file endings of editable files */
  @property({ type: Array, reflect: true }) editable = [
    'cid',
    'icd',
    'iid',
    'scd',
    'sed',
    'ssd',
  ];

  @property({ type: String, reflect: true })
  get locale() {
    return getLocale() as LocaleTag;
  }

  set locale(tag: LocaleTag) {
    try {
      if (tag) {
        setLocale(tag);
      }
    } catch {
      // don't change locale if tag is invalid
    }
  }

  _plugins: PluginSet<OscdPlugin> = {
    menu: [],
    editor: [],
    background: [],
  };

  /** Internal representation of processed `_plugins`. These plugins have been validated and the
   * `tagName` here is guaranteed, sourced entries imported into the registry & tagged. This copy of the
   *  plugins is kept separate from the _plugins, which remain an unmodified single source of truth.
   */
  _resolvedPlugins: PluginSet<ResolvedPlugin> = {
    menu: [],
    editor: [],
    background: [],
  };

  /**
   * The plugin set as declared. Deliberately symmetric: what you assign is
   * what you read back, untouched. Resolution (deriving `tagName` from `src`,
   * validating, importing) happens into `_resolvedPlugins`, so the hashed
   * tag names it invents stay an implementation detail.
   */
  @property({ type: Object })
  get plugins(): PluginSet<OscdPlugin> {
    return this._plugins;
  }

  set plugins(plugins: Partial<PluginSet<OscdPlugin>>) {
    this._plugins = {
      menu: plugins.menu ?? [],
      editor: plugins.editor ?? [],
      background: plugins.background ?? [],
    };
    this._resolvedPlugins = {
      menu: loadSourcedPlugins(this._plugins.menu, this.registry!),
      editor: loadSourcedPlugins(this._plugins.editor, this.registry!),
      background: loadSourcedPlugins(this._plugins.background, this.registry!),
    };
  }

  /*
   * States
   */
  @state()
  get canRedo(): boolean {
    return this.xmlEditor.future.length >= 1;
  }

  @state()
  get canUndo(): boolean {
    return this.xmlEditor.past.length >= 1;
  }

  @state()
  selectedEditor?: ResolvedPlugin;

  @state()
  /** The `XMLDocument` currently being edited */
  get doc(): XMLDocument {
    return this.docs[this.docName];
  }

  /** The name of the [[`doc`]] currently being edited */
  @property({ type: String, reflect: true })
  docName = '';

  /** The set of `XMLDocument`s currently loaded */
  private _docs: Record<string, XMLDocument> = {};

  @state()
  get docs(): Record<string, XMLDocument> {
    return this._docs;
  }

  set docs(newDocs: Record<string, XMLDocument>) {
    this._docs = newDocs;
    this.docVersion += 1;
  }

  @state()
  docVersion: number = -1;

  @state()
  get editableDocs(): string[] {
    return Object.keys(this.docs).filter(name => this.isEditable(name));
  }

  @state()
  get last(): number {
    return this.xmlEditor.past.length - 1;
  }

  @state()
  xmlEditor: XMLEditor = new XMLEditor();

  /*
   * All Queries
   */

  @query('plugins-menu')
  pluginsMenu!: PluginsMenu;

  @query('editor-plugins-panel')
  editorPluginsPanel!: EditorPluginsPanel;

  @queryAssignedNodes({ slot: 'landing-page' })
  private _landingPageNodes?: NodeListOf<HTMLElement>;

  /*
   * Constructor & life cycle methods
   */
  constructor() {
    super();
    // Catch all edits (from commits AND events) and trigger an update
    this.xmlEditor.subscribe(() => {
      this.docVersion += 1;
    });
  }

  willUpdate(changedProperties: Map<PropertyKey, unknown>) {
    if (changedProperties.has('docName') || changedProperties.has('plugins')) {
      const firstEditor = flattenPluginEntries(this._resolvedPlugins.editor)[0];
      if (this.docName && firstEditor && !this.selectedEditor) {
        this.selectedEditor = firstEditor;
      }
    }
  }

  connectedCallback() {
    super.connectedCallback();

    document.addEventListener('keydown', this.handleKeyPress, true);
    this.addEventListener('oscd-open', this.handleOpenDoc);
    this.addEventListener('oscd-rename', this.handleRenameDoc);
    this.addEventListener('oscd-close', this.handleCloseDoc);
    this.addEventListener('oscd-edit-v2', this.handleEditV2);
    this.addEventListener('oscd-undo', this.handleUndo);
    this.addEventListener('oscd-redo', this.handleRedo);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyPress, true);
    this.removeEventListener('oscd-open', this.handleOpenDoc);
    this.removeEventListener('oscd-rename', this.handleRenameDoc);
    this.removeEventListener('oscd-edit-v2', this.handleEditV2);
    this.removeEventListener('oscd-undo', this.handleUndo);
    this.removeEventListener('oscd-redo', this.handleRedo);
    this.removeEventListener('oscd-close', this.handleCloseDoc);
  }

  /*
   * Event Handlers
   */

  handleOpenDoc = ({ detail: { docName, doc } }: OpenEvent) => {
    this.docs = {
      ...this.docs,
      [docName]: doc,
    };
    if (this.isEditable(docName)) {
      this.docName = docName;
    }
    this.requestUpdate();
  };

  handleRenameDoc = (customEvent: RenameEvent) => {
    const { oldName, newName } = customEvent.detail;
    if (!this.docs[oldName] || newName === oldName || this.docs[newName]) {
      return;
    }
    const doc = this.docs[oldName];
    delete this.docs[oldName];
    this.docs = {
      ...this.docs,
      [newName]: doc,
    };
    this.docName = newName;
  };

  handleEditV2 = (event: EditEventV2) => {
    const { edit, title, squash } = event.detail;
    this.xmlEditor.commit(edit, { title, squash });
  };

  handleCloseDoc = (event: CloseEvent) => {
    const docName = event.detail.docName as string;
    delete this.docs[docName];
    if (this.docName === docName) {
      this.docName = this.editableDocs[0] || '';
    }
  };

  handleUndo = () => {
    this.undo();
  };

  handleRedo = () => {
    this.redo();
  };

  private handleKeyPress = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
      const panel = this.shadowRoot?.querySelector<EditorPluginsPanel>(
        'editor-plugins-panel',
      );
      if (panel) {
        if (!panel.expanded) {
          panel.searchMode = true;
        }
        panel.focusSearch(true);
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }
    if (!e.ctrlKey) {
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(this.hotkeys, e.key)) {
      return;
    }
    this.hotkeys[e.key]!.call(this);
    e.preventDefault();
  };

  handleOpenPluginMenu = () => {
    this.pluginsMenu.open();
  };

  handlePluginMenuSelect(customEvent: CustomEvent) {
    const plugin = customEvent.detail.plugin as ResolvedPlugin;
    if (plugin.tagName) {
      this.shadowRoot!.querySelector<
        HTMLElement & { run: () => Promise<void> }
      >(plugin.tagName)!.run?.();
    }
  }
  /** Undo the last `n` [[Edit]]s committed */
  undo = (n = 1) => {
    if (!this.canUndo || n < 1) {
      return;
    }
    this.xmlEditor.undo();
    if (n > 1) {
      this.undo(n - 1);
    }
    this.requestUpdate();
  };

  /** Redo the last `n` [[Edit]]s that have been undone */
  redo = (n = 1) => {
    if (!this.canRedo || n < 1) {
      return;
    }
    this.xmlEditor.redo();
    if (n > 1) {
      this.redo(n - 1);
    }
    this.requestUpdate();
  };

  private hotkeys: Partial<Record<string, () => void>> = {
    m: this.handleOpenPluginMenu,
    z: this.undo,
    y: this.redo,
    Z: this.redo,
  };

  isEditable(docName: string): boolean {
    return !!this.editable.find(ext =>
      docName.toLowerCase().endsWith(`.${ext}`),
    );
  }

  renderPlugin(plugin: ResolvedPlugin) {
    const tag = unsafeStatic(plugin.tagName);
    return staticHtml`<${tag}
              .locale="${this.locale}"
              .docName="${this.docName}"
              .doc=${this.doc}
              .docs=${this.docs}
              .editCount=${this.docVersion}
              .docVersion=${this.docVersion}
              .editor=${this.xmlEditor}>
            </${tag}>`;
  }

  renderOffScreenPlugins() {
    return html`
      <section class="off-screen-plugin-container" aria-hidden="true">
        <div class="menu-plugins">
          ${flattenPluginEntries(this._resolvedPlugins.menu)
            .filter(plugin => !plugin.requireDoc || !!this.docName)
            .map(plugin => this.renderPlugin(plugin))}
        </div>
        <div class="background-plugins">
          ${this._resolvedPlugins.background
            .filter(plugin => !plugin.requireDoc || !!this.docName)
            .map(plugin => this.renderPlugin(plugin))}
        </div>
      </section>
    `;
  }

  renderDefaultLandingPage() {
    return html`
      <landing-page
        heading=${this.landingPageHeading}
        subHeading=${this.landingPageSubHeading}
        .menuPlugins=${flattenPluginEntries(this._resolvedPlugins.menu).filter(
          plugin => !plugin.requireDoc || !!this.docName,
        )}
        .locale=${this.locale}
        @menu-plugin-select=${(event: CustomEvent) =>
          this.handlePluginMenuSelect(event)}
      >
      </landing-page>
    `;
  }

  render() {
    const hasCustomLandingPage = !!this._landingPageNodes?.length;
    if (this.editableDocs.length === 0) {
      return html` <div class="landing-page-container">
          <slot
            name="landing-page"
            @slotchange=${() => this.requestUpdate()}
          ></slot>
          ${!hasCustomLandingPage ? this.renderDefaultLandingPage() : nothing}
        </div>
        ${this.renderOffScreenPlugins()}`;
    }

    return html` <oscd-app-bar>
        <plugins-menu
          slot="alignStart"
          appTitle=${this.appTitle}
          appIcon=${this.appIcon}
          .editableDocs=${this.editableDocs}
          .menuPlugins=${this._resolvedPlugins.menu}
          .locale=${this.locale}
          @menu-plugin-select=${(event: CustomEvent) =>
            this.handlePluginMenuSelect(event)}
        ></plugins-menu>

        ${this.selectedEditor
          ? html`<div class="current-editor" slot="alignStart">
              <oscd-divider class="vertical" aria-hidden="true"></oscd-divider>
              <span>${this.selectedEditor.name}</span>
            </div>`
          : nothing}

        <div slot="alignEnd">
          ${this.docName
            ? html`<files-menu
                  .selectedDocName=${this.docName}
                  .editableDocs=${this.editableDocs}
                  .locale=${this.locale}
                  @change=${(event: CustomEvent) => {
                    const name = event.detail.name as string;
                    this.docName = name;
                  }}
                ></files-menu>
                <oscd-divider
                  class="vertical"
                  aria-hidden="true"
                ></oscd-divider>`
            : nothing}
          <oscd-filled-icon-button
            aria-label="${msg('Undo')}"
            ?disabled=${!this.canUndo}
            @click=${async () => {
              this.dispatchEvent(
                new CustomEvent('oscd-undo', {
                  bubbles: true,
                  composed: true,
                }),
              );
            }}
            ><oscd-icon>undo</oscd-icon></oscd-filled-icon-button
          >
          <oscd-filled-icon-button
            aria-label="${msg('Redo')}"
            ?disabled=${!this.canRedo}
            @click=${async () => {
              this.dispatchEvent(
                new CustomEvent('oscd-redo', {
                  bubbles: true,
                  composed: true,
                }),
              );
            }}
            ><oscd-icon>redo</oscd-icon></oscd-filled-icon-button
          >
        </div>
      </oscd-app-bar>

      <main>
        <section class="editors-side-panel-section">
          <editor-plugins-panel
            .editors=${this._resolvedPlugins.editor}
            .selectedEditor=${this.selectedEditor}
            .locale=${this.locale}
            @editor-select=${(e: CustomEvent) => {
              this.selectedEditor = e.detail.editor;
            }}
          ></editor-plugins-panel>
        </section>

        <section class="editor-container">
          ${this.selectedEditor
            ? this.renderPlugin(this.selectedEditor)
            : nothing}
        </section>

        ${this.renderOffScreenPlugins()}
      </main>`;
  }

  static styles = [
    oscdShellDesignTokens,
    css`
      :host {
        height: 100%;
        display: grid;
        grid-template-rows: min-content 1fr;
        grid-template-columns: 1fr;
        grid-template-areas:
          'header'
          'main';
        background-color: var(--shell-background-color);
      }

      .landing-page-container {
        grid-column: 1 / -1;
        grid-row: 1 / -1;
        height: 100%;
        overflow: auto;
      }

      .landing-page-container ::slotted(*) {
        height: 100%;
      }

      oscd-app-bar {
        grid-area: header;
        box-shadow: var(--md-sys-elevation-level-2);
        z-index: 10;
      }

      .current-editor {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-right: 12px;
        color: var(--app-bar-current-editor-color);
        font-family: var(--app-bar-current-editor-font-family);
        font-size: var(--app-bar-current-editor-font-size);
        font-style: var(--app-bar-current-editor-font-style);
        line-height: var(--app-bar-current-editor-line-height);
        font-weight: var(--app-bar-current-editor-font-weight);
        white-space: nowrap;
      }

      oscd-divider.vertical {
        width: 1px;
        height: 32px;
        --md-divider-color: var(--app-bar-separator-color);
        opacity: var(--app-bar-separator-opacity);
      }

      [slot='alignEnd'] {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      [slot='alignEnd'] oscd-divider.vertical {
        margin: 0 8px;
      }

      [slot='alignEnd'] oscd-filled-icon-button {
        /* Local colour scheme: setting the system colour once lets the icon
           colour and every derived state layer follow from one declaration.
           Safe because the token mapping block is declared only on :host, so
           --app-bar-action-icon-color is inherited here, not re-declared. */
        --md-sys-color-on-primary: var(--app-bar-action-icon-color);
        --md-filled-icon-button-icon-size: var(--app-bar-action-icon-size);
        --md-filled-icon-button-disabled-icon-color: var(
          --app-bar-action-icon-disabled-color
        );
        --md-filled-icon-button-disabled-container-opacity: var(
          --app-bar-action-icon-disabled-container-opacity
        );
      }

      main {
        grid-area: main;
        display: grid;
        /* The side-panel column follows the panel's own intrinsic width, which
           the panel switches between its expanded (308px) and collapsed rail
           (76px) states. */
        grid-template-columns: auto 1fr;
        grid-template-areas: 'sidebar editor';
        overflow: hidden;
      }

      section.editors-side-panel-section {
        grid-area: sidebar;
        overflow-y: auto;
        overflow-x: hidden;
      }

      section.editor-container {
        grid-area: editor;
        background-color: var(--editor-background-color);
        padding: var(--editor-padding);
        overflow: auto;
        position: relative;
      }

      .off-screen-plugin-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 0;
        height: 0;
        overflow: hidden;
        margin: 0;
        padding: 0;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'oscd-shell': OscdShell;
  }
}
