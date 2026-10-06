import { expect, fixture, html } from '@open-wc/testing';
import { OscdMenuItem } from '@omicronenergy/oscd-ui/menu/OscdMenuItem.js';
import type { OscdShell } from '../oscd-shell.js';

import '../oscd-shell.js';
import { createTestDocs } from '../utils/testing/test-doc-helpers.js';
import { FilesMenu } from './files-menu.js';

describe('files-menu', () => {
  let oscdShell: OscdShell;
  let filesMenu: FilesMenu;
  let docs: Record<string, XMLDocument>;

  beforeEach(async () => {
    docs = createTestDocs(3);
    oscdShell = <OscdShell>(
      await fixture(
        html`<oscd-shell
          .docs=${docs}
          docName=${Object.keys(docs)[0]}
        ></oscd-shell>`,
      )
    );
    filesMenu = oscdShell.shadowRoot!.querySelector('files-menu')!;
    await oscdShell.updateComplete;
    await filesMenu.updateComplete;
  });

  it('allows the user to switch documents', async () => {
    const fileDropdownButton =
      filesMenu.shadowRoot?.querySelector('oscd-text-button');
    expect(fileDropdownButton?.localName).to.equal('oscd-text-button');
    fileDropdownButton?.click();
    await filesMenu.updateComplete;
    (filesMenu.menu.firstElementChild as OscdMenuItem).click();
    await oscdShell.updateComplete;
    const oldDocName = oscdShell.docName;
    fileDropdownButton?.click();
    await filesMenu.updateComplete;
    (filesMenu.menu.lastElementChild as OscdMenuItem).click();
    await oscdShell.updateComplete;
    expect(oscdShell.docName).to.not.equal(oldDocName);
  });

  it('renders a decorative leading folder and trailing dropdown icon', () => {
    const button = filesMenu.shadowRoot!.querySelector('oscd-text-button')!;
    const folder = button.querySelector('.file-menu-label oscd-icon')!;
    const arrow = button.querySelector('oscd-icon[slot="icon"]')!;

    expect(button.hasAttribute('trailing-icon')).to.be.true;
    expect(folder.textContent).to.equal('folder');
    expect(arrow.textContent).to.equal('arrow_drop_down');
    expect(folder.getAttribute('aria-hidden')).to.equal('true');
    expect(arrow.getAttribute('aria-hidden')).to.equal('true');
    expect(button.querySelector('.file-menu-label span')!.textContent).to.equal(
      filesMenu.selectedDocName,
    );
  });

  it('moves focus with ArrowDown without changing the current document selection, including after reopening', async () => {
    const items = Array.from(filesMenu.menu.querySelectorAll('oscd-menu-item'));
    const currentItem = items.find(item =>
      item.textContent?.trim() === filesMenu.selectedDocName,
    )!;
    const nextItem = items[(items.indexOf(currentItem) + 1) % items.length];
    const docName = oscdShell.docName;
    expect(items.length).to.be.greaterThan(1);
    expect(currentItem.selected).to.be.true;

    await filesMenu.menu.show();
    currentItem.focus();
    expect(currentItem.matches(':focus-within')).to.be.true;
    expect(nextItem.matches(':focus-within')).to.be.false;
    currentItem.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        code: 'ArrowDown',
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
    expect(nextItem.matches(':focus-within')).to.be.true;
    expect(currentItem.matches(':focus-within')).to.be.false;
    expect(currentItem.selected).to.be.true;
    expect(items.filter(item => item.selected).length).to.equal(1);
    expect(oscdShell.docName).to.equal(docName);
    await filesMenu.menu.close();
    await filesMenu.menu.show();
    expect(currentItem.selected).to.be.true;
    expect(items.filter(item => item.selected).length).to.equal(1);
    expect(oscdShell.docName).to.equal(docName);
  });
});
