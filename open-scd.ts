import { configureLocalization, localized, msg, str } from '@lit/localize';
import { css, html, LitElement, nothing, TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';

import type {
  CloseMenuEvent,
  OscdMenu,
} from '@omicronenergy/oscd-ui/menu/menu.js';

import '@omicronenergy/oscd-ui/app-bar/oscd-app-bar.js';
import '@omicronenergy/oscd-ui/drawer/oscd-navigation-drawer.js';
import '@omicronenergy/oscd-ui/drawer/oscd-navigation-drawer-header.js';
import '@omicronenergy/oscd-ui/dialog/oscd-dialog.js';
import '@omicronenergy/oscd-ui/button/oscd-text-button.js';
import '@omicronenergy/oscd-ui/icon/oscd-icon.js';
import '@omicronenergy/oscd-ui/textfield/oscd-filled-text-field.js';
import '@omicronenergy/oscd-ui/select/oscd-filled-select.js';
import '@omicronenergy/oscd-ui/select/oscd-select-option.js';
import '@omicronenergy/oscd-ui/iconbutton/icon-button.js';
import '@omicronenergy/oscd-ui/list/list.js';
import '@omicronenergy/oscd-ui/list/list-item.js';
import '@omicronenergy/oscd-ui/divider/divider.js';
import '@omicronenergy/oscd-ui/menu/menu.js';
import '@omicronenergy/oscd-ui/menu/menu-item.js';
import '@omicronenergy/oscd-ui/tabs/tabs.js';
import '@omicronenergy/oscd-ui/tabs/secondary-tab.js';
import type { OscdDialog } from '@omicronenergy/oscd-ui/dialog/oscd-dialog.js';
import type { OscdIconButton } from '@omicronenergy/oscd-ui/iconbutton/icon-button.js';
import type { OscdList } from '@omicronenergy/oscd-ui/list/list.js';
import type { OscdNavigationDrawer } from '@omicronenergy/oscd-ui/drawer/oscd-navigation-drawer.js';
import type { OscdTabs } from '@omicronenergy/oscd-ui/tabs/tabs.js';

import { allLocales, sourceLocale, targetLocales } from './locales.js';

import {
  cyrb64,
  Edit,
  EditEvent,
  handleEdit,
  isComplex,
  isInsert,
  isRemove,
  isUpdate,
  OpenEvent,
} from './foundation.js';

export type LogEntry = { undo: Edit; redo: Edit };

export type Plugin = {
  name: string;
  translations?: Record<(typeof targetLocales)[number], string>;
  src: string;
  icon: string;
  requireDoc?: boolean;
  active?: boolean;
};
export type PluginSet = { menu: Plugin[]; editor: Plugin[] };

const pluginTags = new Map<string, string>();

/** @returns a valid customElement tagName containing the URI hash. */
function pluginTag(uri: string): string {
  if (!pluginTags.has(uri)) pluginTags.set(uri, `oscd-p${cyrb64(uri)}`);
  return pluginTags.get(uri)!;
}

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

function describe({ undo, redo }: LogEntry) {
  let result = msg('Something unexpected happened!');
  if (isComplex(redo)) result = msg(str`≥ ${redo.length} nodes changed`);
  if (isInsert(redo))
    if (isInsert(undo))
      result = msg(str`${redo.node.nodeName} moved to ${redo.parent.nodeName}`);
    else
      result = msg(
        str`${redo.node.nodeName} inserted into ${redo.parent.nodeName}`,
      );
  if (isRemove(redo)) result = msg(str`${redo.node.nodeName} removed`);
  if (isUpdate(redo)) result = msg(str`${redo.element.tagName} updated`);
  return result;
}

function renderActionItem(
  control: Control,
  slot = 'actionItems',
): TemplateResult {
  return html`<oscd-icon-button
    slot="${slot}"
    aria-label="${control.getName()}"
    ?disabled=${control.isDisabled()}
    @click=${control.action}
    ><oscd-icon>${control.icon}</oscd-icon></oscd-icon-button
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

@customElement('open-scd')
@localized()
export class OpenSCD extends LitElement {
  @state()
  /** The `XMLDocument` currently being edited */
  get doc(): XMLDocument {
    return this.docs[this.docName];
  }

  @state()
  history: LogEntry[] = [];

  @state()
  editCount: number = 0;

  @state()
  get last(): number {
    return this.editCount - 1;
  }

  @state()
  get canUndo(): boolean {
    return this.last >= 0;
  }

  @state()
  get canRedo(): boolean {
    return this.editCount < this.history.length;
  }

  /** The set of `XMLDocument`s currently loaded */
  @state()
  docs: Record<string, XMLDocument> = {};

  /** The name of the [[`doc`]] currently being edited */
  @property({ type: String, reflect: true }) docName = '';

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

  #loadedPlugins: PluginSet = { menu: [], editor: [] };

  #loadedPluginTagNames: string[] = [];

  @state()
  get loadedPlugins(): PluginSet {
    return this.#loadedPlugins;
  }

  addLoadedPlugin(tagName: string, kind: keyof PluginSet, plugin: Plugin) {
    this.#loadedPlugins[kind].push(plugin);
    this.#loadedPluginTagNames.push(tagName);
  }

  #plugins: PluginSet = { menu: [], editor: [] };

  @property({ type: Object })
  get plugins(): PluginSet {
    return this.#plugins;
  }

  set plugins(plugins: Partial<PluginSet>) {
    Object.entries(plugins).forEach(([pluginType, kind]) =>
      kind.forEach(plugin => {
        const tagName = pluginTag(plugin.src);
        if (this.#loadedPluginTagNames.includes(tagName)) {
          return;
        }

        if (customElements.get(tagName)) {
          this.addLoadedPlugin(tagName, pluginType as keyof PluginSet, plugin);
          this.requestUpdate('loadedPlugins');
          return;
        }
        const url = new URL(plugin.src, window.location.href).toString();
        import(url).then(mod => {
          this.addLoadedPlugin(tagName, pluginType as keyof PluginSet, plugin);
          // Because this is async, we need to check (again) if the element is already defined.
          if (!customElements.get(tagName)) {
            customElements.define(tagName, mod.default);
          }
          this.requestUpdate('loadedPlugins');
        });
      }),
    );
    this.#plugins = { menu: [], editor: [], ...plugins };
  }

  handleOpenDoc({ detail: { docName, doc } }: OpenEvent) {
    this.docs[docName] = doc;
    if (this.isEditable(docName)) this.docName = docName;
    this.requestUpdate();
  }

  handleEditEvent(event: EditEvent) {
    const edit = event.detail;
    this.history.splice(this.editCount);
    this.history.push({ undo: handleEdit(edit), redo: edit });
    this.editCount += 1;
  }

  /** Undo the last `n` [[Edit]]s committed */
  undo(n = 1) {
    if (!this.canUndo || n < 1) return;
    handleEdit(this.history[this.last!].undo);
    this.editCount -= 1;
    if (n > 1) this.undo(n - 1);
  }

  /** Redo the last `n` [[Edit]]s that have been undone */
  redo(n = 1) {
    if (!this.canRedo || n < 1) return;
    handleEdit(this.history[this.editCount].redo);
    this.editCount += 1;
    if (n > 1) this.redo(n - 1);
  }

  @query('#log')
  logUI!: OscdDialog;

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
  fileMenuButtonUI?: OscdIconButton;

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

  private controls: Record<
    'undo' | 'redo' | 'log' | 'menu',
    Required<Control>
  > = {
    undo: {
      icon: 'undo',
      getName: () => msg('Undo'),
      action: () => this.undo(),
      isDisabled: () => !this.canUndo,
    },
    redo: {
      icon: 'redo',
      getName: () => msg('Redo'),
      action: () => this.redo(),
      isDisabled: () => !this.canRedo,
    },
    log: {
      icon: 'history',
      getName: () => msg('Editing history'),
      action: () => (this.logUI.open ? this.logUI.close() : this.logUI.show()),
      isDisabled: () => false,
    },
    menu: {
      icon: 'menu',
      getName: () => msg('Menu'),
      action: async () => {
        this.menuUI.opened = !this.menuUI.opened;
        await this.menuUI.updateComplete;
        if (this.menuUI.opened)
          this.menuUI.querySelector<OscdList>('oscd-list')!.focus();
      },
      isDisabled: () => false,
    },
  };

  #actions = [this.controls.undo, this.controls.redo, this.controls.log];

  @state()
  get menu() {
    return (<Required<Control>[]>this.loadedPlugins.menu
      ?.map((plugin): RenderedPlugin | undefined =>
        plugin.active
          ? {
              icon: plugin.icon,
              getName: () =>
                plugin.translations?.[
                  this.locale as (typeof targetLocales)[number]
                ] || plugin.name,
              isDisabled: () => (plugin.requireDoc && !this.docName) ?? false,
              tagName: pluginTag(plugin.src),
              action: () =>
                this.shadowRoot!.querySelector<
                  HTMLElement & { run: () => Promise<void> }
                >(pluginTag(plugin.src))!.run?.(),
            }
          : undefined,
      )
      .filter(p => p !== undefined)).concat(this.#actions);
  }

  @state()
  get editors() {
    return <RenderedPlugin[]>this.loadedPlugins.editor
      ?.map((plugin): RenderedPlugin | undefined =>
        plugin.active
          ? {
              icon: plugin.icon,
              getName: () =>
                plugin.translations?.[
                  this.locale as (typeof targetLocales)[number]
                ] || plugin.name,
              isDisabled: () => (plugin.requireDoc && !this.docName) ?? false,
              tagName: pluginTag(plugin.src),
            }
          : undefined,
      )
      .filter(p => p !== undefined);
  }

  private hotkeys: Partial<Record<string, () => void>> = {
    m: this.controls.menu.action,
    z: this.controls.undo.action,
    y: this.controls.redo.action,
    Z: this.controls.redo.action,
    l: this.controls.log.action,
  };

  private handleKeyPress(e: KeyboardEvent): void {
    if (!e.ctrlKey) return;
    if (!Object.prototype.hasOwnProperty.call(this.hotkeys, e.key)) return;
    this.hotkeys[e.key]!();
    e.preventDefault();
  }

  constructor() {
    super();

    document.addEventListener('keydown', event => this.handleKeyPress(event));

    this.addEventListener('oscd-open', event => this.handleOpenDoc(event));
    this.addEventListener('oscd-edit', event => this.handleEditEvent(event));
  }

  private renderLogEntry(entry: LogEntry) {
    return html` <abbr title="${describe(entry)}">
      <oscd-list-item ?activated=${this.history[this.last] === entry}>
        <span>${describe(entry)}</span>
        <oscd-icon slot="start">history</oscd-icon>
      </oscd-list-item></abbr
    >`;
  }

  private renderHistory(): TemplateResult[] | TemplateResult {
    if (this.history.length > 0)
      return this.history.slice().reverse().map(this.renderLogEntry, this);
    return html`<oscd-list-item>
      <span>${msg('Your editing history will be displayed here.')}</span>
      <oscd-icon slot="start">info</oscd-icon>
    </oscd-list-item>`;
  }

  render() {
    return html`<oscd-app-bar slot="appContent">
        ${renderActionItem(this.controls.menu, 'actionStart')}
        <div
          slot="title"
          id="title"
          style="position: relative; --mdc-icon-button-size: 32px"
        >
          ${this.editableDocs.length > 1
            ? html`<oscd-icon-button
                id="fileMenuButton"
                @click=${() => this.fileMenuUI.show()}
                ><oscd-icon>arrow_drop_down</oscd-icon></oscd-icon-button
              >`
            : nothing}
          ${this.docName}
          ${this.docName
            ? html`<oscd-icon-button @click=${() => this.editFileUI.show()}
                ><oscd-icon>edit</oscd-icon></oscd-icon-button
              >`
            : nothing}
          <oscd-menu
            fixed
            id="fileMenu"
            anchor="fileMenuButton"
            corner="BOTTOM_END"
            @close-menu=${({ detail: { initiator } }: CloseMenuEvent) => {
              if (!initiator) return;
              this.docName = this.editableDocs[parseInt(initiator.id, 10)];
            }}
          >
            ${this.editableDocs.map(
              (name, index) =>
                html`<oscd-menu-item
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
          activeTabIndex=${this.editors.filter(p => !p.isDisabled()).length
            ? 0
            : -1}
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

      <oscd-navigation-drawer
        class="mdc-theme--surface"
        hasheader
        type="modal"
        id="menu"
      >
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

      ${this.editor
        ? staticHtml`<${unsafeStatic(this.editor)} docName="${
            this.docName || nothing
          }" .doc=${this.doc} locale="${this.locale}" .docs=${
            this.docs
          } .editCount=${this.editCount}></${unsafeStatic(this.editor)}>`
        : nothing}

      <oscd-dialog
        id="editFile"
        @closed=${(event: CustomEvent) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          const dialog = event.target as OscdDialog;
          if (!dialog) return;
          if (dialog.returnValue === 'remove') {
            delete this.docs[this.docName];
            this.docName = this.editableDocs[0] || '';
          }
        }}
      >
        <div slot="headline"><oscd-icon>file</oscd-icon>${this.docName}</div>
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
                input.setCustomValidity('File already exists');
              } else {
                input.setCustomValidity('');
              }
              input.reportValidity();
            }}
          ></oscd-filled-text-field>
          <oscd-select
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
          </oscd-select>
        </form>
        <div slot="actions">
          <oscd-text-button
            form="edit-file-form"
            class="edit-dialog-remove-button"
            value="remove"
          >
            <oscd-icon slot="icon">delete</oscd-icon>
            ${msg('Close file').toUpperCase()}
          </oscd-text-button>
          <oscd-text-button form="edit-file-form" value="close">
            ${msg('Cancel').toUpperCase()}
          </oscd-text-button>
          <oscd-text-button
            @click=${() => {
              const valid = this.fileNameUI.checkValidity();
              if (!valid) {
                this.fileNameUI.reportValidity();
                return;
              }
              const newDocName = `${this.fileNameUI.value}.${this.fileExtensionUI.value}`;
              if (this.docs[newDocName]) return;
              this.docs[newDocName] = this.doc;
              delete this.docs[this.docName];
              this.docName = newDocName;
              this.editFileUI.close();
            }}
            trailing-icon
          >
            <oscd-icon slot="icon">edit</oscd-icon>
            ${msg('Rename').toUpperCase()}
          </oscd-text-button>
        </div>
      </oscd-dialog>
      <oscd-dialog id="log" heading="">
        <div slot="headline">
          <oscd-icon>history</oscd-icon>${this.controls.log.getName()}
        </div>
        <form slot="content" id="log-dialog-form" method="dialog">
          <oscd-list>${this.renderHistory()}</oscd-list>
        </form>
        <div slot="actions">
          <oscd-text-button ?disabled=${!this.canUndo} @click=${this.undo}
            >${msg('Undo')}<oscd-icon slot="icon"
              >undo</oscd-icon
            ></oscd-text-button
          >
          <oscd-text-button ?disabled=${!this.canRedo} @click=${this.redo}
            >${msg('Redo')}<oscd-icon slot="icon"
              >redo</oscd-icon
            ></oscd-text-button
          >
          <oscd-text-button form="log-dialog-form" value="close"
            >${msg('Close')}</oscd-text-button
          >
        </div>
      </oscd-dialog>
      <aside>
        ${this.loadedPlugins.menu.map(
          plugin =>
            staticHtml`<${unsafeStatic(pluginTag(plugin.src))} docName="${
              this.docName
            }" .doc=${this.doc} locale="${this.locale}" .docs=${
              this.docs
            } .editCount=${this.editCount}></${unsafeStatic(
              pluginTag(plugin.src),
            )}>`,
        )}
      </aside>`;
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
      --md-sys-color-secondary: var(--oscd-secondary);
      --md-sys-color-secondary-container: var(--oscd-base2);
      --md-sys-color-on-primary: var(--oscd-base3);
      --md-sys-color-on-secondary: var(--oscd-base3);
      --md-sys-color-on-surface: var(--oscd-base00);
      --md-sys-color-on-surface-variant: var(--oscd-base3);
      --md-sys-color-surface: var(--oscd-base3);
      --md-sys-color-surface-bright: var(--oscd-base2);
      --md-sys-color-surface-container: var(--oscd-base3);
      --md-sys-color-surface-container-high: var(--oscd-base3);
      --md-sys-color-surface-container-highest: var(--oscd-base3);
      --md-sys-color-outline-variant: var(--oscd-base0);
      --md-sys-color-scrim: #000000;
      --md-sys-color-error: var(--oscd-error);
      --md-sys-color-on-error: var(--oscd-base3);

      --md-menu-item-selected-label-text-color: var(--oscd-base01);
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

    oscd-secondary-tab {
      --md-sys-color-on-surface: var(--md-sys-color-on-surface-variant);
      --md-secondary-tab-active-indicator-color: var(--oscd-base2);
    }

    oscd-tabs {
      display: flex;
      flex-grow: 1;
      --md-secondary-tab-container-color: var(--oscd-primary);
      --md-secondary-tab-active-label-text-color: var(
        --md-sys-color-on-surface-variant
      );
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'open-scd': OpenSCD;
  }
}
