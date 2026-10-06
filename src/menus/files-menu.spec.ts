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
    expect(fileDropdownButton).to.exist;
    fileDropdownButton?.click();
    await filesMenu.updateComplete;
    (filesMenu.menu.firstElementChild as OscdMenuItem).click();
    await oscdShell.updateComplete;
    const oldDocName = oscdShell.docName;
    fileDropdownButton?.click();
    await filesMenu.updateComplete;
    (filesMenu.menu.lastElementChild as OscdMenuItem).click();
    await oscdShell.updateComplete;
    expect(oscdShell).to.not.have.property('docName', oldDocName);
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

  it('preserves the current document selection when navigating and reopening', async () => {
    const items = Array.from(filesMenu.menu.querySelectorAll('oscd-menu-item'));
    const currentItem = items.find(item =>
      item.textContent?.trim() === filesMenu.selectedDocName,
    )!;
    expect(currentItem.selected).to.be.true;

    await filesMenu.menu.show();
    currentItem.focus();
    currentItem.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        composed: true,
      }),
    );
    expect(currentItem.selected).to.be.true;
    expect(items.filter(item => item.selected)).to.have.lengthOf(1);
    await filesMenu.menu.close();
    await filesMenu.menu.show();
    expect(currentItem.selected).to.be.true;
  });
});
