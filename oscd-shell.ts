import '@webcomponents/scoped-custom-element-registry';

import { configureLocalization, localized, msg } from '@lit/localize';
import { css, html, LitElement, nothing, TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';

import '@omicronenergy/oscd-ui/app-bar/oscd-app-bar.js';
import type { OscdDialog } from '@omicronenergy/oscd-ui/dialog/OscdDialog.js';
import '@omicronenergy/oscd-ui/dialog/oscd-dialog.js';
import '@omicronenergy/oscd-ui/divider/oscd-divider.js';
import type { OscdFilledIconButton } from '@omicronenergy/oscd-ui/iconbutton/OscdFilledIconButton.js';
import '@omicronenergy/oscd-ui/iconbutton/oscd-filled-icon-button.js';
import '@omicronenergy/oscd-ui/select/oscd-filled-select.js';
import '@omicronenergy/oscd-ui/textfield/oscd-filled-text-field.js';
import '@omicronenergy/oscd-ui/icon/oscd-icon.js';
import type { OscdList } from '@omicronenergy/oscd-ui/list/OscdList.js';
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
import type { OscdTabs } from '@omicronenergy/oscd-ui/tabs/OscdTabs.js';
import '@omicronenergy/oscd-ui/button/oscd-text-button.js';
import { XMLEditor } from '@omicronenergy/oscd-editor';
import {
  EditEventV2,
  EditV2,
  OpenEvent,
  Transactor,
} from '@omicronenergy/oscd-api';
import { allLocales, sourceLocale, targetLocales } from './locales.js';
import { loadSourcedPlugins } from './utils/plugin-utils.js';

const _customElementsDefine = window.customElements.define;
window.customElements.define = (name, cl, conf) => {
  if (!customElements.get(name)) {
    _customElementsDefine.call(window.customElements, name, cl, conf);
  }
};

/* Copied from API because the export is currently missing, this should be removed when the fixed oscd-api is released */
export interface Plugin {
  editor: Transactor<EditV2>;
  docs: Record<string, XMLDocument>;
  doc?: XMLDocument; // the document currently being edited
  docName?: string; // the current doc's name
  stateVersion: unknown; // changes when the document is modified
  /** @deprecated Use `stateVersion` instead */
  editCount: number; // the number of edits made to the document
  locale: string; // the end user's chosen locale
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

type RenderedPlugin = Control & { tagName: string };

type LocaleTag = (typeof allLocales)[number];

const { getLocale, setLocale } = configureLocalization({
  sourceLocale,
  targetLocales,
  loadLocale: locale =>
    import(new URL(`./locales/${locale}.js`, import.meta.url).href),
});

function renderActionItem(
  control: Control,
  slot = 'actionItems',
): TemplateResult {
  return html`<oscd-filled-icon-button
    slot="${slot}"
    aria-label="${control.getName()}"
    ?disabled=${control.isDisabled()}
    @click=${control.action}
    ><oscd-icon>${control.icon}</oscd-icon></oscd-filled-icon-button
  >`;
}

function renderMenuItem(control: Control): TemplateResult {
  return html`
    <oscd-list-item
      type="button"
      .disabled=${control.isDisabled()}
      @click=${control.action}
    >
      <oscd-icon slot="start">${control.icon}</oscd-icon>
      <span>${control.getName()}</span>
    </oscd-list-item>
  `;
}

@customElement('oscd-shell')
@localized()
export class OpenSCD extends LitElement {
  /** The file endings of editable files */
  @property({ type: Array, reflect: true }) editable = [
    'cid',
    'icd',
    'iid',
    'scd',
    'sed',
    'ssd',
  ];

  isEditable(docName: string): boolean {
    return !!this.editable.find(ext =>
      docName.toLowerCase().endsWith(`.${ext}`),
    );
  }

  @state()
  get editableDocs(): string[] {
    return Object.keys(this.docs).filter(name => this.isEditable(name));
  }

  private _docs: Record<string, XMLDocument> = {};

  /** The set of `XMLDocument`s currently loaded */
  @state()
  get docs(): Record<string, XMLDocument> {
    return this._docs;
  }

  set docs(newDocs: Record<string, XMLDocument>) {
    this._docs = newDocs;
    this.onDocsChanged();
  }

  onDocsChanged() {
    this.stateVersion += 1;
  }

  /** The name of the [[`doc`]] currently being edited */
  @property({ type: String, reflect: true }) docName = '';

  @state()
  /** The `XMLDocument` currently being edited */
  get doc(): XMLDocument {
    return this.docs[this.docName];
  }

  @state()
  xmlEditor: XMLEditor = new XMLEditor();

  @state()
  stateVersion: number = -1;

  @state()
  get last(): number {
    return this.xmlEditor.past.length - 1;
  }

  @state()
  get canUndo(): boolean {
    return this.xmlEditor.past.length >= 0;
  }

  @state()
  get canRedo(): boolean {
    return this.xmlEditor.future.length >= 0;
  }

  #plugins: PluginSet = { menu: [], editor: [], background: [] };

  @property({ type: Object })
  get plugins(): PluginSet {
    return this.#plugins;
  }

  set plugins(
    plugins: Partial<PluginSet<Partial<PluginEntry | SourcedPluginEntry>>>,
  ) {
    this.#plugins = Object.entries(plugins).reduce(
      (acc, [pluginType, kind]) => {
        const convertedPlugins = loadSourcedPlugins(kind);
        acc[pluginType as keyof PluginSet] = convertedPlugins;
        return acc;
      },
      { menu: [], editor: [], background: [] } as PluginSet,
    );
  }

  handleOpenDoc({ detail: { docName, doc } }: OpenEvent) {
    this.docs = {
      ...this.docs,
      [docName]: doc,
    };
    if (this.isEditable(docName)) {
      this.docName = docName;
    }
    this.requestUpdate();
  }

  /** Undo the last `n` [[Edit]]s committed */
  undo(n = 1) {
    if (!this.canUndo || n < 1) {
      return;
    }
    this.xmlEditor.undo();
    if (n > 1) {
      this.undo(n - 1);
    }
    this.requestUpdate();
  }

  /** Redo the last `n` [[Edit]]s that have been undone */
  redo(n = 1) {
    if (!this.canRedo || n < 1) {
      return;
    }
    this.xmlEditor.redo();
    if (n > 1) {
      this.redo(n - 1);
    }
    this.requestUpdate();
  }

  @query('#editFile')
  editFileUI!: OscdDialog;

  @query('#menu')
  menuUI!: OscdNavigationDrawer;

  @query('#fileName')
  fileNameUI!: HTMLInputElement;

  @query('#fileExtension')
  fileExtensionUI!: HTMLInputElement;

  @query('#fileMenu')
  fileMenuUI!: OscdMenu;

  @query('#fileMenuButton')
  fileMenuButtonUI?: OscdFilledIconButton;

  @property({ type: String, reflect: true })
  get locale() {
    return getLocale() as LocaleTag;
  }

  set locale(tag: LocaleTag) {
    try {
      setLocale(tag);
    } catch {
      // don't change locale if tag is invalid
    }
  }

  @state()
  private editorIndex = 0;

  @state()
  get editor() {
    return this.editors[this.editorIndex]?.tagName ?? '';
  }

  private controls: Record<'undo' | 'redo' | 'menu', Required<Control>> = {
    undo: {
      icon: 'undo',
      getName: () => msg('Undo'),
      action: () => {
        this.undo();
        this.menuUI.opened = false;
      },
      isDisabled: () => !this.canUndo,
    },
    redo: {
      icon: 'redo',
      getName: () => msg('Redo'),
      action: () => {
        this.redo();
        this.menuUI.opened = false;
      },
      isDisabled: () => !this.canRedo,
    },

    menu: {
      icon: 'menu',
      getName: () => msg('Menu'),
      action: async () => {
        this.menuUI.opened = !this.menuUI.opened;
        await this.menuUI.updateComplete;
        if (this.menuUI.opened) {
          this.menuUI.querySelector<OscdList>('oscd-list')!.focus();
        }
      },
      isDisabled: () => false,
    },
  };

  #actions = [this.controls.undo, this.controls.redo];

  @state()
  get menu() {
    return (<Required<Control>[]>this.plugins.menu
      ?.map(
        ({ name, tagName, requireDoc, icon, translations }): RenderedPlugin =>
          ({
            icon,
            getName: () =>
              translations?.[this.locale as (typeof targetLocales)[number]] ||
              name,
            isDisabled: () => (requireDoc && !this.docName) ?? false,
            tagName,
            action: () => {
              if (tagName) {
                this.shadowRoot!.querySelector<
                  HTMLElement & { run: () => Promise<void> }
                >(tagName)!.run?.();
                this.menuUI.opened = false;
              }
            },
          }) as RenderedPlugin,
      )
      .filter(p => p !== undefined)).concat(this.#actions);
  }

  @state()
  get editors() {
    return <RenderedPlugin[]>this.plugins.editor?.map(
      ({
        name,
        tagName,
        requireDoc,
        icon,
        translations,
      }): RenderedPlugin | undefined =>
        ({
          icon,
          getName: () =>
            translations?.[this.locale as (typeof targetLocales)[number]] ||
            name,
          isDisabled: () => (requireDoc && !this.docName) ?? false,
          tagName,
        }) as RenderedPlugin,
    );
  }

  private hotkeys: Partial<Record<string, () => void>> = {
    m: this.controls.menu.action,
    z: this.controls.undo.action,
    y: this.controls.redo.action,
    Z: this.controls.redo.action,
  };

  private handleKeyPress(e: KeyboardEvent): void {
    if (!e.ctrlKey) {
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(this.hotkeys, e.key)) {
      return;
    }
    this.hotkeys[e.key]!();
    e.preventDefault();
  }

  constructor() {
    super();

    document.addEventListener('keydown', event => this.handleKeyPress(event));

    this.addEventListener('oscd-open', event => this.handleOpenDoc(event));
    this.addEventListener('oscd-edit-v2', (event: EditEventV2) => {
      this.xmlEditor.commit(event.detail.edit);
    });

    // Catch all edits (from commits AND events) and trigger an update
    this.xmlEditor.subscribe(() => {
      this.stateVersion += 1;
    });
  }

  updated(changedProps: Map<string, unknown>) {
    super.updated(changedProps);

    this.updateComplete.then(() => {
      // Ensure the active tab is set after tabs are rendered
      const oscdTabs = this.shadowRoot!.querySelector('oscd-tabs');
      if (oscdTabs && oscdTabs.activeTabIndex !== this.editorIndex) {
        oscdTabs.activeTabIndex = this.editorIndex;
      }
    });
  }

  renderPlugin(tagName: string) {
    const tag = unsafeStatic(tagName);
    return staticHtml`<${tag} 
              .locale="${this.locale}"
              .docName="${this.docName}"
              .doc=${this.doc}
              .docs=${this.docs} 
              .editCount=${this.stateVersion}
              .stateVersion=${this.stateVersion}
              .editor=${this.xmlEditor}>
            </${tag}>`;
  }

  render() {
    return html`<oscd-app-bar slot="appContent">
        ${renderActionItem(this.controls.menu, 'actionStart')}
        <div slot="title" id="title">
          ${this.editableDocs.length > 1
            ? html`<oscd-filled-icon-button
                id="fileMenuButton"
                @click=${() => this.fileMenuUI.show()}
                ><oscd-icon>arrow_drop_down</oscd-icon></oscd-filled-icon-button
              >`
            : nothing}
          ${this.docName}
          ${this.docName
            ? html`<oscd-filled-icon-button
                @click=${() => this.editFileUI.show()}
                ><oscd-icon>edit</oscd-icon></oscd-filled-icon-button
              >`
            : nothing}
          <oscd-menu
            fixed
            id="fileMenu"
            anchor="fileMenuButton"
            corner="BOTTOM_END"
          >
            ${this.editableDocs.map(
              (name, index) =>
                html`<oscd-menu-item
                  @click=${() => {
                    this.docName = name;
                  }}
                  ?disabled=${!this.isEditable(name)}
                  ?selected=${this.docName === name}
                  id=${index}
                  >${name}</oscd-menu-item
                >`,
            )}
          </oscd-menu>
        </div>

        <div slot="actionEnd">
          ${this.#actions.map(op => renderActionItem(op))}
        </div>

        <oscd-tabs
          .activeTabIndex=${this.editorIndex}
          @change=${(event: Event) => {
            const tabs = event.currentTarget as OscdTabs;
            this.editorIndex = tabs.activeTabIndex;
          }}
        >
          ${this.editors.map(editor =>
            editor.isDisabled()
              ? nothing
              : html`<oscd-secondary-tab>
                  <oscd-icon slot="icon">${editor.icon}</oscd-icon>
                  ${editor.getName()}
                </oscd-secondary-tab>`,
          )}
        </oscd-tabs>
      </oscd-app-bar>

      <oscd-navigation-drawer hasheader type="modal" id="menu">
        <oscd-navigation-drawer-header>
          <span slot="headline">${msg('Menu')}</span>
          ${this.docName
            ? html`<span slot="supporting-text">${this.docName}</span>`
            : ''}
        </oscd-navigation-drawer-header>
        <oscd-list>
          <oscd-divider></oscd-divider>
          ${this.menu.map(renderMenuItem)}
        </oscd-list>
      </oscd-navigation-drawer>

      ${this.editor ? this.renderPlugin(this.editor) : nothing}

      <oscd-dialog
        id="editFile"
        @closed=${(event: CustomEvent) => {
          const dialog = event.target as OscdDialog;
          if (dialog.returnValue === 'remove') {
            delete this.docs[this.docName];
            this.docName = this.editableDocs[0] || '';
          }
        }}
      >
        <div slot="headline">
          <oscd-icon>description</oscd-icon>${this.docName}
        </div>
        <form slot="content" id="edit-file-form" method="dialog">
          <oscd-filled-text-field
            id="fileName"
            label="${msg('Filename')}"
            value="${this.docName.replace(/\.[^.]+$/, '')}"
            @input=${(event: Event) => {
              const input = event.target as HTMLInputElement;
              const { value } = input;
              const name = `${value}.${this.fileExtensionUI.value}`;
              if (name in this.docs && name !== this.docName) {
                input.setCustomValidity('File already exists!');
              } else {
                input.setCustomValidity('');
              }
              input.reportValidity();
            }}
          ></oscd-filled-text-field>
          <oscd-filled-select
            label="${msg('Extension')}"
            fixedMenuPosition
            id="fileExtension"
            @selected=${() => this.fileNameUI.reportValidity()}
          >
            ${this.editable.map(
              ext =>
                html`<oscd-select-option
                  ?selected=${this.docName.endsWith(`.${ext}`)}
                  value="${ext}"
                  >${ext}</oscd-select-option
                >`,
            )}
          </oscd-filled-select>
        </form>
        <div slot="actions">
          <oscd-text-button
            form="edit-file-form"
            class="edit-dialog-remove-button"
            value="remove"
          >
            <oscd-icon slot="icon">delete</oscd-icon>
            ${msg('Close file')}
          </oscd-text-button>
          <oscd-text-button form="edit-file-form" value="close">
            ${msg('Cancel')}
          </oscd-text-button>
          <oscd-text-button
            @click=${() => {
              const valid = this.fileNameUI.checkValidity();
              if (!valid) {
                this.fileNameUI.reportValidity();
                return;
              }
              const newDocName = `${this.fileNameUI.value}.${this.fileExtensionUI.value}`;
              const doc = this.docs[this.docName];
              delete this.docs[this.docName];
              this.docs = {
                ...this.docs,
                [newDocName]: doc,
              };
              this.docName = newDocName;
              this.editFileUI.close();
            }}
            trailing-icon
          >
            <oscd-icon slot="icon">edit</oscd-icon>
            ${msg('Rename')}
          </oscd-text-button>
        </div>
      </oscd-dialog>

      <aside>
        <div class="menu-plugins">
          ${this.plugins.menu.map(plugin => this.renderPlugin(plugin.tagName))}
        </div>
        <div class="background-plugins">
          ${this.plugins.background
            .filter(plugin => !plugin.requireDoc || !!this.docName)
            .map(plugin => this.renderPlugin(plugin.tagName))}
        </div>
      </aside> `;
  }

  firstUpdated() {
    const background = getComputedStyle(this.menuUI).getPropertyValue(
      '--oscd-base2',
    );
    document.body.style.background = background;
  }

  static styles = css`
    .fileext {
      opacity: 0.81;
    }

    .filename {
      caret-color: var(--oscd-secondary);
    }

    .filename:focus {
      outline: none;
    }

    aside {
      position: absolute;
      top: 0;
      left: 0;
      width: 0;
      height: 0;
      overflow: hidden;
      margin: 0;
      padding: 0;
    }

    abbr {
      text-decoration: none;
    }

    @media (prefers-color-scheme: light) {
      * {
        --oscd-primary: var(--oscd-theme-primary, #2aa198);
        --oscd-secondary: var(--oscd-theme-secondary, #6c71c4);
        --oscd-base03: var(--oscd-theme-base03, #002b36);
        --oscd-base02: var(--oscd-theme-base02, #073642);
        --oscd-base01: var(--oscd-theme-base01, #586e75);
        --oscd-base00: var(--oscd-theme-base00, #657b83);
        --oscd-base0: var(--oscd-theme-base0, #839496);
        --oscd-base1: var(--oscd-theme-base1, #93a1a1);
        --oscd-base2: var(--oscd-theme-base2, #eee8d5);
        --oscd-base3: var(--oscd-theme-base3, #fdf6e3);

        --mdc-theme-text-disabled-on-light: rgba(255, 255, 255, 0.38);
      }
    }

    @media (prefers-color-scheme: dark) {
      * {
        --oscd-primary: var(--oscd-theme-secondary, #6c71c4);
        --oscd-secondary: var(--oscd-theme-primary, #2aa198);
        --oscd-base03: var(--oscd-theme-base3, #fdf6e3);
        --oscd-base02: var(--oscd-theme-base2, #eee8d5);
        --oscd-base01: var(--oscd-theme-base1, #93a1a1);
        --oscd-base00: var(--oscd-theme-base0, #839496);
        --oscd-base0: var(--oscd-theme-base00, #657b83);
        --oscd-base1: var(--oscd-theme-base01, #586e75);
        --oscd-base2: var(--oscd-theme-base02, #073642);
        --oscd-base3: var(--oscd-theme-base03, #002b36);
      }
    }

    * {
      --oscd-error: var(--oscd-theme-error, #dc322f);

      --oscd-text-font: var(--oscd-theme-text-font, 'Roboto');
      --oscd-icon-font: var(--oscd-theme-icon-font, 'Material Icons');
      --oscd-text-font-mono: var(--oscd-theme-text-font-mono, 'Roboto Mono');

      --oscd-warning: var(--oscd-theme-warning, #b58900);
      --md-sys-color-primary: var(--oscd-primary);
      --md-sys-color-on-primary: var(--oscd-base3);

      --md-sys-color-secondary: var(--oscd-secondary);
      --md-sys-color-on-secondary: var(--oscd-base3);
      --md-sys-color-secondary-container: var(--oscd-base2);

      --md-sys-color-surface: var(--oscd-base3);
      --md-sys-color-on-surface: var(--oscd-base00);
      --md-sys-color-surface-variant: var(--oscd-base3);
      --md-sys-color-on-surface-variant: var(--oscd-base00);
      --md-sys-color-surface-bright: var(--oscd-base2);
      --md-sys-color-surface-container: var(--oscd-base3);
      --md-sys-color-surface-container-high: var(--oscd-base3);
      --md-sys-color-surface-container-highest: var(--oscd-base3);

      --md-sys-color-outline-variant: var(--oscd-primary);
      --md-sys-color-scrim: #000000;
      --md-sys-color-error: var(--oscd-error);
      --md-sys-color-on-error: var(--oscd-base3);

      /* --md-menu-item-selected-label-text-color: var(--oscd-base01); */
      --md-icon-button-disabled-icon-color: var(--oscd-base3);

      /* MDC Theme Colors 
       * Needed for supporting any pluggins still using the depricated MWC Components
       */
      --mdc-theme-primary: var(--oscd-primary);
      --mdc-theme-secondary: var(--oscd-secondary);
      --mdc-theme-background: var(--oscd-base3);
      --mdc-theme-surface: var(--oscd-base3);
      --mdc-theme-on-primary: var(--oscd-base2);
      --mdc-theme-on-secondary: var(--oscd-base02);
      --mdc-theme-on-background: var(--oscd-base00);
      --mdc-theme-on-surface: var(--oscd-base00);
      --mdc-theme-text-primary-on-background: var(--oscd-base01);
      --mdc-theme-text-secondary-on-background: var(--oscd-base00);
      --mdc-theme-text-icon-on-background: var(--oscd-base00);
      --mdc-theme-error: var(--oscd-error);

      --mdc-button-disabled-ink-color: var(--oscd-base1);

      --mdc-drawer-heading-ink-color: var(--oscd-base00);

      --mdc-dialog-heading-ink-color: var(--oscd-base00);

      --mdc-text-field-fill-color: var(--oscd-base2);
      --mdc-text-field-ink-color: var(--oscd-base02);
      --mdc-text-field-label-ink-color: var(--oscd-base01);
      --mdc-text-field-idle-line-color: var(--oscd-base00);
      --mdc-text-field-hover-line-color: var(--oscd-base02);

      --mdc-select-fill-color: var(--oscd-base2);
      --mdc-select-ink-color: var(--oscd-base02);
      --mdc-select-label-ink-color: var(--oscd-base01);
      --mdc-select-idle-line-color: var(--oscd-base00);
      --mdc-select-hover-line-color: var(--oscd-base02);
      --mdc-select-dropdown-icon-color: var(--oscd-base01);

      --mdc-typography-font-family: var(--oscd-text-font);
      --mdc-icon-font: var(--oscd-icon-font);
    }

    oscd-navigation-drawer-header {
      --md-list-item-supporting-text-color: var(--md-sys-color-on-surface);
    }
    oscd-app-bar * {
      --md-filled-icon-button-disabled-container-opacity: 0;
      --md-filled-icon-button-disabled-icon-color: var(
        --md-sys-color-on-primary
      );
    }

    oscd-tabs {
      display: flex;
      flex-grow: 1;
      --md-secondary-tab-container-color: var(--oscd-primary);
    }
    oscd-secondary-tab {
      --md-sys-color-on-surface: var(--md-sys-color-on-primary);
      --md-sys-color-on-surface-variant: var(--md-sys-color-on-primary);
      --md-secondary-tab-active-indicator-color: var(--oscd-base2);
    }

    .edit-dialog-remove-button {
      --md-text-button-icon-color: var(--oscd-error);
      --md-text-button-label-text-color: var(--oscd-error);

      --md-text-button-focus-label-text-color: var(--oscd-error);
      --md-text-button-focus-icon-color: var(--oscd-error);

      --md-text-button-hover-label-text-color: var(--oscd-error);
      --md-text-button-hover-state-layer-color: var(--oscd-error);
      --md-text-button-hover-icon-color: var(--oscd-error);

      --md-text-button-pressed-label-text-color: var(--oscd-error);
      --md-text-button-pressed-state-layer-color: var(--oscd-error);
      --md-text-button-pressed-icon-color: var(--oscd-error);
    }

    #title {
      position: relative;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'oscd-shell': OpenSCD;
  }
}
