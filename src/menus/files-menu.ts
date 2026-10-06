import { css, html, LitElement } from 'lit';
import { property, query } from 'lit/decorators.js';
import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';
import { localized } from '@lit/localize';

import { OscdIcon } from '@omicronenergy/oscd-ui/icon/OscdIcon.js';
import { OscdMenu } from '@omicronenergy/oscd-ui/menu/OscdMenu.js';
import { OscdMenuItem } from '@omicronenergy/oscd-ui/menu/OscdMenuItem.js';
import { OscdTextButton } from '@omicronenergy/oscd-ui/button/OscdTextButton.js';

import { LocaleTag } from '../localization.js';
import { menuStyles } from './menu-styles.js';

declare global {
  interface HTMLElementTagNameMap {
    'files-menu': FilesMenu;
  }
}
@localized()
export class FilesMenu extends ScopedElementsMixin(LitElement) {
  static scopedElements = {
    'oscd-text-button': OscdTextButton,
    'oscd-icon': OscdIcon,
    'oscd-menu': OscdMenu,
    'oscd-menu-item': OscdMenuItem,
  };

  /* Properties */

  @property({ type: Array })
  editableDocs: string[] = [];

  @property({ type: String })
  selectedDocName: string | undefined;

  @property({ type: String, reflect: true })
  locale!: LocaleTag;

  /* Queries */

  @query('#fileMenu')
  menu!: OscdMenu;

  render() {
    return html`
      <oscd-text-button
        id="fileMenuButton"
        @click=${() => this.menu.show()}
        trailing-icon
      >
        <span class="file-menu-label">
          <oscd-icon aria-hidden="true">folder</oscd-icon>
          <span>${this.selectedDocName}</span>
        </span>
        <oscd-icon slot="icon" aria-hidden="true">arrow_drop_down</oscd-icon>
      </oscd-text-button>

      <oscd-menu
        fixed
        id="fileMenu"
        anchor="fileMenuButton"
        corner="BOTTOM_END"
      >
        ${this.editableDocs.map(
          name =>
            html`<oscd-menu-item
              @click=${() => {
                this.dispatchEvent(
                  new CustomEvent('change', {
                    bubbles: true,
                    composed: true,
                    detail: { name },
                  }),
                );
              }}
              .selected=${this.selectedDocName === name}
              ><div slot="headline">${name}</div></oscd-menu-item
            >`,
        )}
      </oscd-menu>
    `;
  }

  static styles = [menuStyles, css`
    :host {
      position: relative;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    :host oscd-text-button {
      --md-text-button-label-text-line-height: normal;
      --md-text-button-label-text-family: var(--file-menu-text-font-family);
      --md-text-button-label-text-weight: var(--file-menu-text-weight);
      --md-text-button-label-text-size: var(--file-menu-text-size);
      --md-text-button-label-text-style: normal;
      /* Local colour scheme: the text button derives its label, icon and
         state-layer colours from the system primary colour. */
      --md-sys-color-primary: var(--file-menu-text-color);
      --md-text-button-icon-size: 24px;
      display: inline;
    }

    oscd-menu {
      min-width: var(--plugins-menu-min-width);
    }

    .file-menu-label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .file-menu-label oscd-icon {
      --md-icon-size: var(--md-text-button-icon-size);
    }
  `];
}
