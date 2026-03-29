import { css, html, LitElement, nothing, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';
import { localized, msg } from '@lit/localize';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';

import { OscdIcon } from '@omicronenergy/oscd-ui/icon/OscdIcon.js';
import { OscdIconButton } from '@omicronenergy/oscd-ui/iconbutton/OscdIconButton.js';
import { OscdList } from '@omicronenergy/oscd-ui/list/OscdList.js';
import { OscdListItem } from '@omicronenergy/oscd-ui/list/OscdListItem.js';

import { LocaleTag, Translation } from '../localization.js';
import {
  EditorPluginEntry,
  PluginEntry,
  ResolvedPluginGroup,
} from '../oscd-shell.js';
import { isPluginGroup } from '../utils/plugin-utils.js';

declare global {
  interface HTMLElementTagNameMap {
    'editor-plugins-panel': EditorPluginsPanel;
  }
}

function loadSet(key: string): Set<string> {
  try {
    const stored = localStorage.getItem(key);
    return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

function saveSet(key: string, set: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...set]));
}

@localized()
export class EditorPluginsPanel extends ScopedElementsMixin(LitElement) {
  static scopedElements = {
    'oscd-icon': OscdIcon,
    'oscd-icon-button': OscdIconButton,
    'oscd-list': OscdList,
    'oscd-list-item': OscdListItem,
  };

  @property({ type: Array })
  editors: EditorPluginEntry[] = [];

  @property({ type: Number })
  editorIndex = 0;

  @property({ type: String })
  locale!: LocaleTag;

  @state()
  private collapsedGroups: Set<string> = loadSet(
    'editorsPanel.collapsedGroups',
  );

  @state()
  private pinnedGroups: Set<string> = loadSet('editorsPanel.pinnedGroups');

  private get groupNames(): string[] {
    return this.editors
      .filter(isPluginGroup)
      .map(e => (e as ResolvedPluginGroup).name);
  }

  private toggleGroup(name: string) {
    // Collapsing a pinned group unpins it first, then collapses.
    if (this.pinnedGroups.has(name) && !this.collapsedGroups.has(name)) {
      const newPinned = new Set(this.pinnedGroups);
      newPinned.delete(name);
      this.pinnedGroups = newPinned;
      saveSet('editorsPanel.pinnedGroups', newPinned);
    }
    const next = new Set(this.collapsedGroups);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    this.collapsedGroups = next;
    saveSet('editorsPanel.collapsedGroups', next);
  }

  private togglePin(name: string) {
    const next = new Set(this.pinnedGroups);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
      // unpin implicitly expands the group
      const collapsed = new Set(this.collapsedGroups);
      collapsed.delete(name);
      this.collapsedGroups = collapsed;
      saveSet('editorsPanel.collapsedGroups', collapsed);
    }
    this.pinnedGroups = next;
    saveSet('editorsPanel.pinnedGroups', next);
  }

  private expandAll() {
    this.collapsedGroups = new Set();
    saveSet('editorsPanel.collapsedGroups', new Set());
  }

  private collapseAll() {
    const next = new Set(
      this.groupNames.filter(n => !this.pinnedGroups.has(n)),
    );
    this.collapsedGroups = next;
    saveSet('editorsPanel.collapsedGroups', next);
  }

  private isExpanded: boolean =
    localStorage.getItem('editorsPanel.expanded') !== 'false';

  @property({ type: Boolean, reflect: true })
  get expanded() {
    return this.isExpanded;
  }

  set expanded(value: boolean) {
    const old = this.isExpanded;
    this.isExpanded = value;
    localStorage.setItem('editorsPanel.expanded', value.toString());
    this.requestUpdate('expanded', old);
  }

  private pluginLabel(plugin: PluginEntry | ResolvedPluginGroup): string {
    return plugin.translations?.[this.locale as Translation] ?? plugin.name;
  }

  private selectEditor(editor: PluginEntry, index: number) {
    this.dispatchEvent(
      new CustomEvent('editor-select', {
        detail: { editor, index },
        bubbles: true,
        composed: true,
      }),
    );
  }

  // eslint-disable-next-line class-methods-use-this
  private renderPluginIcon(plugin: PluginEntry): TemplateResult {
    if (plugin.icon) {
      return html`<oscd-icon slot="start">${plugin.icon}</oscd-icon>`;
    }
    const letter = (plugin.name || '?')[0].toUpperCase();
    return html`<span slot="start" class="plugin-letter-icon">${letter}</span>`;
  }

  private renderPluginItem(
    plugin: PluginEntry,
    flatIndex: number,
  ): TemplateResult {
    const isActive = this.editorIndex === flatIndex;
    const tooltip = !this.expanded ? this.pluginLabel(plugin) : undefined;
    return html`<oscd-list-item
      class=${classMap({ active: isActive })}
      type="button"
      title=${ifDefined(tooltip)}
      @click=${() => this.selectEditor(plugin, flatIndex)}
    >
      ${this.renderPluginIcon(plugin)}
      ${this.expanded
        ? html`<span>${this.pluginLabel(plugin)}</span>`
        : nothing}
    </oscd-list-item>`;
  }

  private renderGroup(
    group: ResolvedPluginGroup,
    _groupIdx: number,
    flatStart: number,
  ): TemplateResult {
    const label = this.pluginLabel(group);
    const isPinned = this.pinnedGroups.has(group.name);
    const hasActiveChild = group.plugins.some(
      (_, i) => flatStart + i === this.editorIndex,
    );
    // Active groups are always expanded; pinned groups cannot be collapsed.
    const isCollapsed =
      !hasActiveChild && this.collapsedGroups.has(group.name) && !isPinned;
    const canToggle = !hasActiveChild;

    const containerClasses = classMap({
      'group-container': true,
      'group-container--inactive': !hasActiveChild,
    });

    const children = isCollapsed
      ? nothing
      : group.plugins.map((plugin, i) =>
          this.renderPluginItem(plugin, flatStart + i),
        );

    if (this.expanded) {
      return html`
        <div class=${containerClasses}>
          <div
            class=${classMap({
              'group-header': true,
              'group-active': hasActiveChild,
              'group-header--locked': !canToggle,
            })}
            role=${ifDefined(canToggle ? 'button' : undefined)}
            tabindex=${ifDefined(canToggle ? 0 : undefined)}
            @click=${canToggle ? () => this.toggleGroup(group.name) : nothing}
            @keydown=${canToggle
              ? (e: KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    this.toggleGroup(group.name);
                  }
                }
              : nothing}
          >
            <oscd-icon class="group-header-icon">${group.icon}</oscd-icon>
            <span class="group-name">${label}</span>
            <div
              class="group-header-actions"
              @click=${(e: Event) => e.stopPropagation()}
              @keydown=${(e: KeyboardEvent) => e.stopPropagation()}
            >
              <button
                class=${classMap({
                  'pin-button': true,
                  'pin-button--active': isPinned,
                })}
                title=${isPinned ? 'Unpin group' : 'Pin group open'}
                @click=${() => this.togglePin(group.name)}
              >
                <oscd-icon ?filled=${isPinned}>push_pin</oscd-icon>
              </button>
              <oscd-icon
                class=${classMap({
                  'group-chevron': true,
                  'group-chevron--collapsed': isCollapsed,
                  'group-chevron--hidden': !canToggle,
                })}
                >expand_more</oscd-icon
              >
            </div>
          </div>
          ${children}
        </div>
      `;
    }

    // Narrow sidebar: group icon above a small chevron (chevron hidden when active).
    return html`
      <div class=${containerClasses}>
        <div
          class=${classMap({
            'group-header-narrow': true,
            'group-active': hasActiveChild,
          })}
          role=${ifDefined(canToggle ? 'button' : undefined)}
          tabindex=${ifDefined(canToggle ? 0 : undefined)}
          title=${label}
          @click=${canToggle ? () => this.toggleGroup(group.name) : nothing}
          @keydown=${canToggle
            ? (e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  this.toggleGroup(group.name);
                }
              }
            : nothing}
        >
          <oscd-icon class="group-header-icon">${group.icon}</oscd-icon>
          <oscd-icon
            class=${classMap({
              'group-chevron': true,
              'group-chevron--narrow': true,
              'group-chevron--collapsed': isCollapsed,
              'group-chevron--hidden': !canToggle,
            })}
            >expand_more</oscd-icon
          >
        </div>
        ${children}
      </div>
    `;
  }

  render() {
    let flatIndex = 0;

    const items = this.editors.map((item, groupIdx) => {
      if (isPluginGroup(item)) {
        const flatStart = flatIndex;
        flatIndex += (item as ResolvedPluginGroup).plugins.length;
        return this.renderGroup(
          item as ResolvedPluginGroup,
          groupIdx,
          flatStart,
        );
      }
      const result = this.renderPluginItem(item as PluginEntry, flatIndex);
      flatIndex++;
      return result;
    });

    const hasGroups = this.groupNames.length > 0;

    return html`
      <div class="toolbar">
        ${this.expanded && hasGroups
          ? html`
              <button
                class="toolbar-btn"
                title="Expand all groups"
                @click=${() => this.expandAll()}
              >
                <oscd-icon>unfold_more</oscd-icon>
              </button>
              <button
                class="toolbar-btn"
                title="Collapse all groups"
                @click=${() => this.collapseAll()}
              >
                <oscd-icon>unfold_less</oscd-icon>
              </button>
            `
          : nothing}
      </div>
      <oscd-list class="editors-list" role="tablist">${items}</oscd-list>
      <div class="list-end-spacer"></div>
      <div class="footer">
        <oscd-icon-button
          class="toggle-button"
          title=${!this.expanded ? msg('Expand sidebar') : ''}
          @click=${() => {
            this.expanded = !this.expanded;
          }}
        >
          <oscd-icon
            >${this.expanded
              ? 'left_panel_close'
              : 'left_panel_open'}</oscd-icon
          >
        </oscd-icon-button>
        ${this.expanded
          ? html`<span
              class="toggle-sidebar"
              role="button"
              tabindex="0"
              @click=${() => {
                this.expanded = !this.expanded;
              }}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  this.expanded = !this.expanded;
                }
              }}
              >${msg('Collapse sidebar')}</span
            >`
          : nothing}
      </div>
    `;
  }

  static styles = css`
    :host {
      width: var(--editor-plugins-panel-collapsed-width);
      height: calc(100% - var(--editor-plugins-panel-padding-top));
      display: flex;
      flex-direction: column;
      padding-top: var(--editor-plugins-panel-padding-top);
      transition: width 0.2s ease-in-out;
      /* overlay scrollbar floats above content — no layout shift on appear/disappear */
      /* overflow-y: overlay; */
      overflow-x: hidden;
      scrollbar-gutter: stable;
      scrollbar-width: thin;
      scrollbar-color: color-mix(
          in srgb,
          var(--editor-plugins-panel-item-icon-color) 15%,
          transparent
        )
        transparent;
    }

    :host([expanded]) {
      width: var(--editor-plugins-panel-width);
    }

    :host::-webkit-scrollbar {
      width: 4px;
    }

    :host::-webkit-scrollbar-track {
      background: transparent;
    }

    :host::-webkit-scrollbar-thumb {
      background-color: color-mix(
        in srgb,
        var(--editor-plugins-panel-item-icon-color) 15%,
        transparent
      );
      border-radius: 2px;
    }

    :host:hover::-webkit-scrollbar-thumb {
      background-color: color-mix(
        in srgb,
        var(--editor-plugins-panel-item-icon-color) 45%,
        transparent
      );
    }

    /* ── Toolbar ── */

    .toolbar {
      display: flex;
      gap: 6px;
      padding: 6px 14px 2px;
      flex-shrink: 0;
    }

    .toolbar-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: 1.5px solid
        color-mix(
          in srgb,
          var(--editor-plugins-panel-item-icon-color) 45%,
          transparent
        );
      background: transparent;
      color: var(--editor-plugins-panel-item-icon-color);
      cursor: pointer;
      padding: 0;
      transition:
        border-color 0.15s ease,
        background-color 0.15s ease;
      --md-icon-size: 15px;
    }

    .toolbar-btn:hover {
      border-color: var(--editor-plugins-panel-item-icon-color);
      background-color: color-mix(
        in srgb,
        var(--editor-plugins-panel-item-icon-color) 12%,
        transparent
      );
    }

    /* ── Plugin list ── */

    .editors-list {
      flex: 1 0 auto;
      overflow: visible;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      --md-list-item-leading-space: var(
        --editor-plugins-panel-item-leading-space
      );
      --md-list-item-trailing-space: var(
        --editor-plugins-panel-item-trailing-space
      );
      --md-icon-size: var(--editor-plugins-panel-item-icon-size);
      --md-list-container-color: rgba(0, 0, 0, 0);
      --md-list-item-label-text-color: var(
        --editor-plugins-panel-item-text-color
      );
      --md-list-item-leading-icon-color: var(
        --editor-plugins-panel-item-icon-color
      );
    }

    .editors-list .active {
      background-color: var(--editor-plugins-panel-item-active-bg);
    }

    .editors-list oscd-list-item span {
      /* prevents jitter when collapsing */
      white-space: nowrap;
    }

    /* ── Plugin letter icon fallback ── */

    .plugin-letter-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--editor-plugins-panel-item-icon-size);
      height: var(--editor-plugins-panel-item-icon-size);
      border-radius: 5px;
      background-color: color-mix(
        in srgb,
        var(--editor-plugins-panel-item-icon-color) 30%,
        transparent
      );
      color: var(--editor-plugins-panel-item-icon-color);
      font-size: calc(var(--editor-plugins-panel-item-icon-size) * 0.55);
      font-weight: 600;
      font-family: var(--oscd-text-font, Roboto);
      flex-shrink: 0;
    }

    /* ── Group container ── */

    /* Active group: stronger secondary-blue card wraps the selected item */
    .group-container {
      margin: 3px 6px;
      border-radius: 10px;
      overflow-x: hidden;
      background: color-mix(
        in srgb,
        var(--editor-plugins-panel-group-active-bg) 55%,
        transparent
      );
      transition:
        margin 0.2s ease,
        background 0.2s ease;
    }

    /* Inactive group: subtle tint so grouping is still obvious */
    .group-container--inactive {
      margin: 1px 6px;
      background: color-mix(
        in srgb,
        var(--editor-plugins-panel-group-active-bg) 28%,
        transparent
      );
    }

    /* Selected item inside an active group: subtle white overlay so the
     * group card's blue clearly wraps around and outside it */
    :host([expanded]) .group-container .active {
      background-color: color-mix(in srgb, white 22%, transparent);
      border-radius: 7px;
      margin: 0 3px;
    }

    :host(:not([expanded])) .group-container .active {
      background-color: color-mix(in srgb, white 22%, transparent);
      border-radius: 7px;
    }

    /* Center icons in collapsed group items */
    :host(:not([expanded])) .group-container {
      --md-list-item-leading-space: 13px;
      --md-list-item-trailing-space: 13px;
    }

    /* Indent child items in expanded sidebar */
    :host([expanded]) .group-container oscd-list-item:not(.group-header) {
      --md-list-item-leading-space: calc(
        var(--editor-plugins-panel-item-leading-space) + 14px
      );
    }

    /* Group header in expanded sidebar (plain div, not oscd-list-item) */
    .group-header {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      padding: 10px var(--editor-plugins-panel-item-trailing-space) 10px
        var(--editor-plugins-panel-item-leading-space);
      cursor: pointer;
      border-radius: 8px 8px 0 0;
      color: var(--editor-plugins-panel-item-text-color);
    }

    .group-header--locked {
      cursor: default;
    }

    .group-header .group-header-icon {
      --md-icon-size: var(--editor-plugins-panel-item-icon-size);
      color: var(--editor-plugins-panel-item-icon-color);
      flex-shrink: 0;
    }

    .group-header:focus-visible {
      outline: 2px solid var(--editor-plugins-panel-item-icon-color);
      outline-offset: -2px;
    }

    .group-active {
      background-color: var(--editor-plugins-panel-group-active-bg);
    }

    .group-name {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: var(--oscd-text-font, Roboto);
      font-size: var(--md-list-item-label-text-size, 16px);
    }

    /* Pin + chevron wrapper */
    .group-header-actions {
      display: flex;
      align-items: center;
      gap: 2px;
      margin-left: auto;
    }

    /* Pin button */
    .pin-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: none;
      background: transparent;
      cursor: pointer;
      padding: 0;
      color: color-mix(
        in srgb,
        var(--editor-plugins-panel-item-icon-color) 45%,
        transparent
      );
      --md-icon-size: 15px;
      --md-icon-color: color-mix(
        in srgb,
        var(--editor-plugins-panel-item-icon-color) 45%,
        transparent
      );
      transition:
        color 0.15s ease,
        background-color 0.15s ease;
    }

    .pin-button:hover {
      background-color: color-mix(
        in srgb,
        var(--editor-plugins-panel-item-icon-color) 15%,
        transparent
      );
      color: var(--editor-plugins-panel-item-icon-color);
      --md-icon-color: var(--editor-plugins-panel-item-icon-color);
    }

    .pin-button--active {
      color: var(--editor-plugins-panel-group-active-bg);
      --md-icon-color: var(--editor-plugins-panel-group-active-bg);
    }

    /* FILL=1 makes the push_pin icon appear filled when pinned.
     * font-variation-settings is an inherited property and flows into
     * oscd-icon's shadow root where the variable font text is rendered. */
    /* .pin-button--active oscd-icon {
      font-variation-settings: 'FILL' 1;
    } */

    oscd-icon[filled] {
      font-variation-settings: 'FILL' 1;
    }

    /* Chevron in expanded sidebar — animates on collapse */
    .group-chevron {
      --md-icon-size: 24px;
      display: block;
      transform: rotate(0deg);
      transition: transform 0.25s ease;
      color: var(--editor-plugins-panel-item-icon-color);
    }

    .group-chevron--collapsed {
      transform: rotate(-90deg);
    }

    /* Tiny chevron in narrow sidebar */
    .group-chevron--narrow {
      --md-icon-size: 13px;
      opacity: 0.75;
    }

    /* Hidden chevron: takes up space but is invisible, preventing layout jump */
    .group-chevron--hidden {
      visibility: hidden;
      pointer-events: none;
    }

    /*
     * Group header in narrow sidebar: group icon stacked above a small chevron.
     */
    .group-header-narrow {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1px;
      padding: 5px 0 3px;
      cursor: pointer;
      color: var(--editor-plugins-panel-group-active-bg);
      border-bottom: 1px solid
        color-mix(
          in srgb,
          var(--editor-plugins-panel-group-active-bg) 50%,
          transparent
        );
    }

    .group-header-narrow .group-header-icon {
      --md-icon-size: var(--editor-plugins-panel-item-icon-size);
    }

    .group-header-narrow.group-active {
      background-color: var(--editor-plugins-panel-group-active-bg);
      color: var(--editor-plugins-panel-item-icon-color);
    }

    /* ── Spacer between list and footer ── */

    .list-end-spacer {
      min-height: 60px;
      flex-shrink: 0;
    }

    /* ── Footer — always at bottom, above all content ── */

    .footer {
      position: sticky;
      bottom: 0;
      /* margin-top: auto pushes footer to bottom when content is short */
      margin-top: auto;
      display: flex;
      align-items: center;
      min-height: 56px;
      flex-shrink: 0;
      padding-left: calc(var(--editor-plugins-panel-item-leading-space) - 6px);
      background-color: var(
        --oscd-shell-editor-plugins-panel-background,
        var(--oscd-primary)
      );
      /* Own stacking context above all list-item hover/focus states */
      isolation: isolate;
      z-index: 10;
    }

    .footer:focus,
    .footer:hover,
    .footer:active {
      background-color: color-mix(
        in srgb,
        var(--editor-plugins-panel-item-icon-color) 8%,
        var(--oscd-shell-editor-plugins-panel-background)
      );
    }

    .toggle-button {
      --md-icon-button-icon-size: var(--editor-plugins-panel-item-icon-size);
      --md-icon-button-icon-color: var(--editor-plugins-panel-item-icon-color);
      --md-icon-button-hover-icon-color: var(
        --editor-plugins-panel-item-icon-color
      );
      --md-icon-button-focus-icon-color: var(
        --editor-plugins-panel-item-icon-color
      );
      --md-icon-button-pressed-icon-color: var(
        --editor-plugins-panel-item-icon-color
      );
    }

    .toggle-sidebar {
      margin-left: 12px;
      height: 100%;
      width: 100%;
      align-content: center;
      cursor: pointer;
      color: var(--editor-plugins-panel-item-text-color);
      font-family: var(--oscd-text-font, Roboto);
      font-size: var(--md-list-item-label-text-size, 16px);
      white-space: nowrap;
    }
  `;
}
