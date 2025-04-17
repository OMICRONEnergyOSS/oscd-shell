import { css, html, LitElement, nothing, TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';

import { configureLocalization, localized, msg, str } from '@lit/localize';

import '@material/mwc-button';
import '@material/mwc-dialog';
import '@material/mwc-drawer';
import '@material/mwc-icon';
import '@material/mwc-icon-button';
import '@material/mwc-list';
import '@material/mwc-menu';
import '@material/mwc-select';
import '@material/mwc-tab-bar';
import '@material/mwc-textfield';
import '@material/mwc-top-app-bar-fixed';
import type { ActionDetail, SingleSelectedEvent } from '@material/mwc-list';
import type { Dialog } from '@material/mwc-dialog';
import type { Drawer } from '@material/mwc-drawer';
import type { IconButton } from '@material/mwc-icon-button';
import type { ListItemBase } from '@material/mwc-list/mwc-list-item-base.js';
import type { Menu } from '@material/mwc-menu';
import type { Select } from '@material/mwc-select';
import type { TextField } from '@material/mwc-textfield';

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
  translations?: Record<typeof targetLocales[number], string>;
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

type LocaleTag = typeof allLocales[number];

const { getLocale, setLocale } = configureLocalization({
  sourceLocale,
  targetLocales,
  loadLocale: locale =>
    import(new URL(`./locales/${locale}.js`, import.meta.url).href),
});

function describe({ undo, redo }: LogEntry) {
  let result = msg('Something shockingly unexpected happened!');
  if (isComplex(redo)) result = msg(str`≥ ${redo.length} nodes changed`);
  if (isInsert(redo))
    if (isInsert(undo))
      result = msg(str`${redo.node.nodeName} moved to ${redo.parent.nodeName}`);
    else
      result = msg(
        str`${redo.node.nodeName} inserted into ${redo.parent.nodeName}`
      );
  if (isRemove(redo)) result = msg(str`${redo.node.nodeName} removed`);
  if (isUpdate(redo)) result = msg(str`${redo.element.tagName} updated`);
  return result;
}

function renderActionItem(
  control: Control,
  slot = 'actionItems'
): TemplateResult {
  return html`<mwc-icon-button
    slot="${slot}"
    icon="${control.icon}"
    label="${control.getName()}"
    ?disabled=${control.isDisabled()}
    @click=${control.action}
  ></mwc-icon-button>`;
}

function renderMenuItem(control: Control): TemplateResult {
  return html`
    <mwc-list-item graphic="icon" .disabled=${control.isDisabled()}
      ><mwc-icon slot="graphic">${control.icon}</mwc-icon>
      <span>${control.getName()}</span>
    </mwc-list-item>
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
      docName.toLowerCase().endsWith(`.${ext}`)
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
      })
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
  logUI!: Dialog;

  @query('#editFile')
  editFileUI!: Dialog;

  @query('#menu')
  menuUI!: Drawer;

  @query('#fileName')
  fileNameUI!: TextField;

  @query('#fileExtension')
  fileExtensionUI!: Select;

  @query('#fileMenu')
  fileMenuUI!: Menu;

  @query('#fileMenuButton')
  fileMenuButtonUI?: IconButton;

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
        this.menuUI.open = !this.menuUI.open;
        await this.menuUI.updateComplete;
        if (this.menuUI.open) this.menuUI.querySelector('mwc-list')!.focus();
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
                  this.locale as typeof targetLocales[number]
                ] || plugin.name,
              isDisabled: () => (plugin.requireDoc && !this.docName) ?? false,
              tagName: pluginTag(plugin.src),
              action: () =>
                this.shadowRoot!.querySelector<
                  HTMLElement & { run: () => Promise<void> }
                >(pluginTag(plugin.src))!.run?.(),
            }
          : undefined
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
                  this.locale as typeof targetLocales[number]
                ] || plugin.name,
              isDisabled: () => (plugin.requireDoc && !this.docName) ?? false,
              tagName: pluginTag(plugin.src),
            }
          : undefined
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
      <mwc-list-item
        graphic="icon"
        ?activated=${this.history[this.last] === entry}
      >
        <span>${describe(entry)}</span>
        <mwc-icon slot="graphic">history</mwc-icon>
      </mwc-list-item></abbr
    >`;
  }

  private renderHistory(): TemplateResult[] | TemplateResult {
    if (this.history.length > 0)
      return this.history.slice().reverse().map(this.renderLogEntry, this);
    return html`<mwc-list-item disabled graphic="icon">
      <span>${msg('Your editing history will be displayed here.')}</span>
      <mwc-icon slot="graphic">info</mwc-icon>
    </mwc-list-item>`;
  }

  render() {
    return html`<mwc-drawer
        class="mdc-theme--surface"
        hasheader
        type="modal"
        id="menu"
      >
        <span
          slot="title"
          style="color: var(--mdc-theme-text-primary-on-background)"
          >${msg('Menu')}</span
        >
        ${this.docName
          ? html`<span
              slot="subtitle"
              style="color: var(--mdc-theme-text-secondary-on-background)"
              >${this.docName}</span
            >`
          : ''}
        <mwc-list
          wrapFocus
          @action=${(e: CustomEvent<ActionDetail>) =>
            this.menu[e.detail.index]!.action()}
        >
          <li divider padded role="separator"></li>
          ${this.menu.map(renderMenuItem)}
        </mwc-list>
        <mwc-top-app-bar-fixed slot="appContent">
          ${renderActionItem(this.controls.menu, 'navigationIcon')}
          <div
            slot="title"
            id="title"
            style="position: relative; --mdc-icon-button-size: 32px"
          >
            ${this.editableDocs.length > 1
              ? html`<mwc-icon-button
                  icon="arrow_drop_down"
                  id="fileMenuButton"
                  @click=${() => this.fileMenuUI.show()}
                ></mwc-icon-button>`
              : nothing}
            ${this.docName}
            ${this.docName
              ? html`<mwc-icon-button
                  icon="edit"
                  @click=${() => this.editFileUI.show()}
                ></mwc-icon-button>`
              : nothing}
            <mwc-menu
              fixed
              id="fileMenu"
              corner="BOTTOM_END"
              @selected=${({ detail: { index } }: SingleSelectedEvent) => {
                const item = this.fileMenuUI.selected as ListItemBase | null;
                if (!item) return;
                this.docName = this.editableDocs[index];
                item.selected = false;
                this.fileMenuUI.layout();
              }}
            >
              ${this.editableDocs.map(
                name => html`<mwc-list-item>${name}</mwc-list-item>`
              )}
            </mwc-menu>
          </div>
          ${this.#actions.map(op => renderActionItem(op))}
          <mwc-tab-bar
            activeIndex=${this.editors.filter(p => !p.isDisabled()).length
              ? 0
              : -1}
            @MDCTabBar:activated=${({
              detail: { index },
            }: {
              detail: { index: number };
            }) => {
              this.editorIndex = index;
            }}
          >
            ${this.editors.map(editor =>
              editor.isDisabled()
                ? nothing
                : html`<mwc-tab
                    label="${editor.getName()}"
                    icon="${editor.icon}"
                  ></mwc-tab>`
            )}
          </mwc-tab-bar>
          ${this.editor
            ? staticHtml`<${unsafeStatic(this.editor)} docName="${
                this.docName || nothing
              }" .doc=${this.doc} locale="${this.locale}" .docs=${
                this.docs
              } .editCount=${this.editCount}></${unsafeStatic(this.editor)}>`
            : nothing}
        </mwc-top-app-bar-fixed>
      </mwc-drawer>
      <mwc-dialog
        id="editFile"
        heading="${this.docName}"
        @closed=${({ detail }: { detail: { action: string } | null }) => {
          if (!detail) return;
          if (detail.action === 'remove') {
            delete this.docs[this.docName];
            this.docName = this.editableDocs[0] || '';
          }
        }}
      >
        <mwc-textfield
          id="fileName"
          label="${msg('Filename')}"
          value="${this.docName.replace(/\.[^.]+$/, '')}"
          dialogInitialFocus
          .validityTransform=${(value: string) => {
            const name = `${value}.${this.fileExtensionUI.value}`;
            if (name in this.docs && name !== this.docName)
              return {
                valid: false,
              };
            return {};
          }}
        ></mwc-textfield>
        <mwc-select
          label="${msg('Extension')}"
          fixedMenuPosition
          id="fileExtension"
          @selected=${() => this.fileNameUI.reportValidity()}
        >
          ${this.editable.map(
            ext =>
              html`<mwc-list-item
                ?selected=${this.docName.endsWith(`.${ext}`)}
                value="${ext}"
                >${ext}</mwc-list-item
              >`
          )}
        </mwc-select>
        <mwc-button
          slot="secondaryAction"
          icon="delete"
          style="--mdc-theme-primary: var(--oscd-error)"
          dialogAction="remove"
        >
          ${msg('Close file')}
        </mwc-button>
        <mwc-button slot="secondaryAction" dialogAction="close">
          ${msg('Cancel')}
        </mwc-button>
        <mwc-button
          slot="primaryAction"
          icon="edit"
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
          trailingIcon
        >
          ${msg('Rename')}
        </mwc-button>
      </mwc-dialog>
      <mwc-dialog id="log" heading="${this.controls.log.getName()}">
        <mwc-list wrapFocus>${this.renderHistory()}</mwc-list>
        <mwc-button
          icon="undo"
          label="${msg('Undo')}"
          ?disabled=${!this.canUndo}
          @click=${this.undo}
          slot="secondaryAction"
        ></mwc-button>
        <mwc-button
          icon="redo"
          label="${msg('Redo')}"
          ?disabled=${!this.canRedo}
          @click=${this.redo}
          slot="secondaryAction"
        ></mwc-button>
        <mwc-button slot="primaryAction" dialogaction="close"
          >${msg('Close')}</mwc-button
        >
      </mwc-dialog>
      <aside>
        ${this.loadedPlugins.menu.map(
          plugin =>
            staticHtml`<${unsafeStatic(pluginTag(plugin.src))} docName="${
              this.docName
            }" .doc=${this.doc} locale="${this.locale}" .docs=${
              this.docs
            } .editCount=${this.editCount}></${unsafeStatic(
              pluginTag(plugin.src)
            )}>`
        )}
      </aside>`;
  }

  firstUpdated() {
    const background = getComputedStyle(this.menuUI).getPropertyValue(
      '--oscd-base2'
    );
    document.body.style.background = background;
  }

  updated() {
    if (this.fileMenuButtonUI) this.fileMenuUI.anchor = this.fileMenuButtonUI;
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

      mwc-top-app-bar-fixed {
        --mdc-theme-text-disabled-on-light: rgba(255, 255, 255, 0.38);
      } /* hack to fix disabled icon buttons rendering black */
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

      --mdc-theme-primary: var(--oscd-primary);
      --mdc-theme-secondary: var(--oscd-secondary);
      --mdc-theme-background: var(--oscd-base3);
      --mdc-theme-surface: var(--oscd-base3);
      --mdc-theme-on-primary: var(--oscd-base2);
      --mdc-theme-on-secondary: var(--oscd-base2);
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

    mwc-drawer {
      background-color: var(--mdc-theme-on-primary);
    }

    mwc-tab {
      background-color: var(--oscd-primary);
      --mdc-theme-primary: var(--mdc-theme-on-primary);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'open-scd': OpenSCD;
  }
}
