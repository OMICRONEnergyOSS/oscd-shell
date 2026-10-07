import { expect, fixture, html } from '@open-wc/testing';

import './oscd-shell.js';
import type { OscdShell } from './oscd-shell.js';
import { createTestDocs } from './utils/testing/test-doc-helpers.js';
import { testEditorPlugin } from './utils/testing/test-plugins.js';

/**
 * Design tokens flow --oscd-theme-* -\> --oscd-* -\> --md-sys-* -\> --oscd-shell-*
 * and must only ever be read upward. A component that assigns a shell token
 * back into an --md-sys-* token creates a reference cycle on that element,
 * which CSS resolves to the guaranteed-invalid value: the token silently
 * empties for the whole subtree and Material's stock fallbacks (notably the
 * baseline purple #6750a4) surface instead. These specs pin the resolved
 * values so such an inversion fails the build rather than the UI.
 */
const tokenValue = (element: Element, token: string) =>
  getComputedStyle(element).getPropertyValue(token).trim();

const solarizedBase3 = '#fdf6e3';
const solarizedBase3Rgb = 'rgb(253, 246, 227)';
const solarizedPrimary = '#2aa198';

/* Inline so the spec never depends on a network request for the logo. */
const testLogo =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' " +
  "viewBox='0 0 40 40'%3E%3Crect width='40' height='40'/%3E%3C/svg%3E";

describe('shell design tokens', () => {
  let oscdShell: OscdShell;

  beforeEach(async () => {
    const docs = createTestDocs(1);
    oscdShell = <OscdShell>(
      await fixture(
        html`<oscd-shell
          .docs=${docs}
          docName=${Object.keys(docs)[0]}
        ></oscd-shell>`,
      )
    );
    await oscdShell.updateComplete;
  });

  it('applies the Solarized palette through the opt-in mapper', () => {
    expect(tokenValue(oscdShell, '--md-sys-color-primary')).to.equal(
      solarizedPrimary,
    );
    expect(tokenValue(oscdShell, '--md-sys-color-surface')).to.equal(
      solarizedBase3,
    );
  });

  it('allows inherited OpenSCD palette values to override mapper defaults', () => {
    oscdShell.style.setProperty('--oscd-theme-primary', 'rgb(1, 2, 3)');

    expect(tokenValue(oscdShell, '--md-sys-color-primary')).to.equal(
      'rgb(1, 2, 3)',
    );
  });

  it('resolves app bar container tokens and color tokens on its light-DOM descendants', async () => {
    const appBar = oscdShell.shadowRoot!.querySelector('oscd-app-bar')!;
    expect(tokenValue(appBar, '--oscd-app-bar-container-color')).to.equal(
      solarizedPrimary,
    );
    expect(tokenValue(appBar, '--oscd-app-bar-headline-color')).to.equal(
      solarizedBase3,
    );
    expect(
      getComputedStyle(appBar.shadowRoot!.querySelector('.main-header')!).height,
    ).to.equal('54px');

    const appBarChildren = Array.from(
      oscdShell.shadowRoot!.querySelectorAll('oscd-app-bar *'),
    );
    expect(appBarChildren.length).to.be.greaterThan(0);

    appBarChildren.forEach((child) => {
      expect(
        tokenValue(child, '--md-sys-color-on-primary'),
        `--md-sys-color-on-primary empty on <${child.localName}>`,
      ).to.equal(solarizedBase3);
      expect(
        tokenValue(child, '--app-bar-action-icon-color'),
        `--app-bar-action-icon-color empty on <${child.localName}>`,
      ).to.equal(solarizedBase3);
    });
  });

  it('honors the public shell app-bar height override', () => {
    oscdShell.style.setProperty('--oscd-shell-app-bar-height', '60px');

    const appBar = oscdShell.shadowRoot!.querySelector('oscd-app-bar')!;
    const mainHeader = appBar.shadowRoot!.querySelector('.main-header')!;

    expect(getComputedStyle(mainHeader).height).to.equal('60px');
  });

  it('resolves the file menu label color rather than the Material fallback', async () => {
    const filesMenu = oscdShell.shadowRoot!.querySelector('files-menu')!;
    await (filesMenu as HTMLElement & { updateComplete: Promise<unknown> })
      .updateComplete;

    expect(tokenValue(filesMenu, '--file-menu-text-color')).to.equal(
      solarizedBase3,
    );

    const button = filesMenu.shadowRoot!.querySelector('oscd-text-button')!;
    expect(tokenValue(button, '--md-sys-color-primary')).to.equal(
      solarizedBase3,
    );

    const label = button.shadowRoot!.querySelector('.label')!;
    expect(
      getComputedStyle(label).color,
      'label fell back to Material purple',
    ).to.equal(solarizedBase3Rgb);
  });

  it('resolves the plugins menu button color rather than the Material fallback', async () => {
    const pluginsMenu = oscdShell.shadowRoot!.querySelector('plugins-menu')!;
    await (pluginsMenu as HTMLElement & { updateComplete: Promise<unknown> })
      .updateComplete;

    expect(tokenValue(pluginsMenu, '--plugins-menu-button-color')).to.equal(
      solarizedBase3,
    );

    const button = pluginsMenu.shadowRoot!.querySelector(
      'oscd-filled-icon-button',
    )!;
    expect(tokenValue(button, '--md-sys-color-on-primary')).to.equal(
      solarizedBase3,
    );
  });

  it('applies the public app bar action icon color override to the Undo button', async () => {
    oscdShell.style.setProperty(
      '--oscd-shell-app-bar-action-icon-color',
      'rgb(1, 2, 3)',
    );

    const undoButton = oscdShell.shadowRoot!.querySelector(
      '[slot="alignEnd"] oscd-filled-icon-button',
    )!;
    expect(tokenValue(undoButton, '--md-sys-color-on-primary')).to.equal(
      'rgb(1, 2, 3)',
    );
  });

  it('spaces the app logo, title and menu button apart', async () => {
    const docs = createTestDocs(1);
    const shellWithLogo = <OscdShell>(
      await fixture(
        html`<oscd-shell
          appIcon=${testLogo}
          appTitle="OpenSCD Explorer"
          .docs=${docs}
          docName=${Object.keys(docs)[0]}
        ></oscd-shell>`,
      )
    );
    await shellWithLogo.updateComplete;

    const pluginsMenu =
      shellWithLogo.shadowRoot!.querySelector('plugins-menu')!;
    await (pluginsMenu as HTMLElement & { updateComplete: Promise<unknown> })
      .updateComplete;

    const logo = pluginsMenu.shadowRoot!.querySelector('img')!;
    const title = pluginsMenu.shadowRoot!.querySelector('h1.app-title')!;

    expect(getComputedStyle(logo).marginInlineEnd).to.equal('16px');
    expect(getComputedStyle(title).marginInlineEnd).to.equal('4px');
    // The h1 must not contribute its UA block margins inside the app bar.
    expect(getComputedStyle(title).marginBlockStart).to.equal('0px');

    expect(
      title.getBoundingClientRect().left - logo.getBoundingClientRect().right,
      'app logo and title are crowded together',
    ).to.be.at.least(16);
  });

  it('exposes the app bar separator tokens it uses', async () => {
    oscdShell.plugins = { editor: [testEditorPlugin] };
    await oscdShell.updateComplete;
    await oscdShell.updateComplete;

    const dividers = Array.from(
      oscdShell.shadowRoot!.querySelectorAll('oscd-divider.vertical'),
    );
    expect(dividers.length, 'app bar separators not rendered').to.equal(2);

    dividers.forEach((divider) => {
      expect(tokenValue(divider, '--app-bar-separator-color')).to.equal(
        solarizedBase3,
      );
      expect(tokenValue(divider, '--app-bar-separator-opacity')).to.equal('0.38');
    });
  });

  it('uses the app bar foreground for both separators', () => {
    oscdShell.style.setProperty(
      '--oscd-shell-app-bar-color',
      'rgb(1, 2, 3)',
    );

    const dividers = Array.from(
      oscdShell.shadowRoot!.querySelectorAll('oscd-divider.vertical'),
    );
    dividers.forEach((divider) => {
      expect(tokenValue(divider, '--app-bar-separator-color')).to.equal(
        'rgb(1, 2, 3)',
      );
    });
  });
});
