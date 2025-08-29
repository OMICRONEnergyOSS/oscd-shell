import { newEditEventV2, newOpenEvent } from '@omicronenergy/oscd-api/utils.js';

import { expect, fixture, html } from '@open-wc/testing';

import { OscdFilledSelect } from '@omicronenergy/oscd-ui/select/oscd-filled-select.js';
import { OscdFilledTextField } from '@omicronenergy/oscd-ui/textfield/oscd-filled-text-field.js';
import { OscdListItem } from '@omicronenergy/oscd-ui/list/OscdListItem.js';

import { OscdMenuItem } from '@omicronenergy/oscd-ui/menu/OscdMenuItem.js';

import {
  simulateKeypressOnElement,
  queryButtonByIcon,
  querySelectorContainingText,
} from '@omicronenergy/oscd-test-utils';

import { EditV2 } from '@omicronenergy/oscd-api';

import { OscdDialog } from '@omicronenergy/oscd-ui/dialog/OscdDialog.js';
import type { OscdShell } from './oscd-shell.js';

import './oscd-shell.js';

// Temporary addition until we can resolve the issue with the same function
// failing when called from oscd-test-utils
// see: https://github.com/OMICRONEnergyOSS/oscd-test-utils/issues/11
async function waitForDialogState(element: Element, state: 'open' | 'closed') {
  return new Promise<void>(resolve => {
    const dialog = element as OscdDialog;
    // If already closed, resolve immediately
    if (!dialog.open) {
      resolve();
      return;
    }
    const observer = new MutationObserver(() => {
      if (
        (state === 'open' && dialog.open) ||
        (state === 'closed' && !dialog.open)
      ) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });
  });
}

export const xmlAttributeName =
  /^(?!xml|Xml|xMl|xmL|XMl|xML|XmL|XML)[A-Za-z_][A-Za-z0-9-_.]*(:[A-Za-z_][A-Za-z0-9-_.]*)?$/;

export function descendants(parent: Element | XMLDocument): Node[] {
  return (Array.from(parent.childNodes) as Node[]).concat(
    ...Array.from(parent.children).map(child => descendants(child)),
  );
}

const sclDocString = `<?xml version="1.0" encoding="UTF-8"?>
  <SCL version="2007" revision="B" xmlns="http://www.iec.ch/61850/2003/SCL" xmlns:ens1="http://example.org/somePreexistingExtensionNamespace">
  <Substation ens1:foo="a" name="A1" desc="test substation"></Substation>
</SCL>`;
const testDocStrings = [
  sclDocString,
  `<?xml version="1.0" encoding="UTF-8"?>
  <testDoc1>
<element1 property1="value1" property2="value2">SomeText</element1>
<element2 property2="value2" property3="value3"><!--AComment--></element2>
<element3 property3="value3" property1="value1">
  <subelement1 property1="value1" property2="value2">SomeMoreText</subelement1>
  <subelement2 property2="value2" property3="value3"><!----></subelement2>
  <subelement3 property3="value3" property1="value1"></subelement3>
</element3>
</testDoc1>`,
  `<?xml version="1.0" encoding="UTF-8"?>
  <testDoc2>
<element1 property1="value1" property2="value2">SomeText</element1>
<element2 property2="value2" property3="value3"><!--AComment--></element2>
<element3 property3="value3" property1="value1">
  <subelement1 property1="value1" property2="value2">SomeMoreText</subelement1>
  <subelement2 property2="value2" property3="value3"><!----></subelement2>
  <subelement3 property3="value3" property1="value1"></subelement3>
</element3>
</testDoc2>`,
];

function newTestDoc() {
  const docString =
    testDocStrings[Math.floor(Math.random() * testDocStrings.length)];
  return new DOMParser().parseFromString(docString, 'application/xml');
}

describe('oscd-shell', () => {
  let oscdShell: OscdShell;
  let sclDoc: XMLDocument;

  beforeEach(async () => {
    oscdShell = <OscdShell>await fixture(html`<oscd-shell></oscd-shell>`);
    sclDoc = new DOMParser().parseFromString(sclDocString, 'application/xml');
  });

  it('loads a non-SCL document on OpenDocEvent', async () => {
    oscdShell.dispatchEvent(newOpenEvent(sclDoc, 'test.xml'));
    await oscdShell.updateComplete;
    expect(oscdShell.docs).to.have.property('test.xml', sclDoc);
    expect(oscdShell).to.have.property('doc', undefined);
    expect(oscdShell).to.not.have.property('docName', 'test.xml');
  });

  it('opens an SCL document for editing on OpenDocEvent', async () => {
    oscdShell.dispatchEvent(newOpenEvent(sclDoc, 'test.scd'));
    await oscdShell.updateComplete;
    expect(oscdShell.docs).to.have.property('test.scd', sclDoc);
    expect(oscdShell).to.have.property('doc', sclDoc);
    expect(oscdShell).to.have.property('docName', 'test.scd');
  });

  describe('with an SCL document loaded', () => {
    beforeEach(async () => {
      oscdShell.dispatchEvent(newOpenEvent(sclDoc, 'test.scd'));
      await oscdShell.updateComplete;
    });

    it('updates the UI when a document with the same name is opened', async () => {
      const newDoc = newTestDoc();
      const oldUpdate = oscdShell.updateComplete;
      oscdShell.dispatchEvent(newOpenEvent(newDoc, 'test.scd'));
      expect(oldUpdate).to.not.equal(oscdShell.updateComplete);
    });

    it('allows the user to change the current doc name', async () => {
      queryButtonByIcon(
        oscdShell.shadowRoot!,
        'oscd-filled-icon-button',
        'edit',
      )?.click();
      const dialog = oscdShell.editFileUI;
      await dialog.updateComplete;
      const textfield = dialog.querySelector<OscdFilledTextField>(
        'oscd-filled-text-field',
      )!;
      textfield.value = 'newName';
      const select = dialog.querySelector(
        'oscd-filled-select',
      )! as OscdFilledSelect;
      select.value = 'cid';
      await textfield.updateComplete;
      await select.updateComplete;
      queryButtonByIcon(dialog, 'oscd-text-button', 'edit')?.click();
      await oscdShell.updateComplete;
      expect(oscdShell).to.have.property('docName', 'newName.cid');
      expect(oscdShell).to.have.property('doc', sclDoc);
    });

    it('allows the user to close the current doc', async () => {
      const currentDocName = oscdShell.docName;
      const editButton = queryButtonByIcon(
        oscdShell.shadowRoot!,
        'oscd-filled-icon-button',
        'edit',
      );
      expect(editButton).to.exist;
      editButton?.click();

      const dialog = oscdShell.editFileUI;
      await dialog.updateComplete;
      const deleteButton = queryButtonByIcon(
        dialog,
        'oscd-text-button',
        'delete',
      );
      expect(deleteButton).to.exist;
      deleteButton?.click();

      await new Promise<void>(resolve => {
        dialog.addEventListener('closed', () => resolve(), { once: true });
      });

      await oscdShell.updateComplete;
      expect(oscdShell.docName).to.not.equal(currentDocName);
      expect(oscdShell.doc).to.be.undefined;
    });
  });

  describe('with several documents loaded', () => {
    beforeEach(async () => {
      for (let i = 0; i < 5; i += 1) {
        oscdShell.dispatchEvent(newOpenEvent(newTestDoc(), `test${i}.scd`));
      }
      await oscdShell.updateComplete;
    });

    it('allows the user to switch documents', async () => {
      oscdShell.fileMenuButtonUI?.click();
      await oscdShell.fileMenuUI.updateComplete;
      (oscdShell.fileMenuUI.firstElementChild as OscdMenuItem).click();
      await oscdShell.updateComplete;
      const oldDocName = oscdShell.docName;
      oscdShell.fileMenuButtonUI?.click();
      await oscdShell.fileMenuUI.updateComplete;
      (oscdShell.fileMenuUI.lastElementChild as OscdMenuItem).click();
      await oscdShell.updateComplete;
      expect(oscdShell).to.not.have.property('docName', oldDocName);
    });

    it('prevents the user from renaming the current doc to an already opened doc name', async () => {
      const anotherDocNameWithoutExtension = Object.keys(oscdShell.docs)
        ?.find(docName => docName !== oscdShell.docName)
        ?.split('.')[0];
      const existingDocNameWithExtension = oscdShell.docName;
      queryButtonByIcon(
        oscdShell.shadowRoot!,
        'oscd-app-bar oscd-filled-icon-button',
        'edit',
      )?.click();
      const dialog = oscdShell.editFileUI;
      await dialog.updateComplete;
      const textfield = dialog.querySelector<OscdFilledTextField>('#fileName')!;
      textfield.value = anotherDocNameWithoutExtension!;
      textfield.dispatchEvent(
        new Event('input', { bubbles: true, composed: true }),
      );
      await textfield.updateComplete;
      const renameButton = queryButtonByIcon(
        dialog,
        'oscd-text-button',
        'edit',
      );
      expect(renameButton).to.exist;
      renameButton!.click();
      await oscdShell.updateComplete;
      expect(oscdShell.editFileUI.open).to.be.true;

      const [filename] = existingDocNameWithExtension.split('.');
      textfield.value = filename;
      textfield.dispatchEvent(
        new Event('input', { bubbles: true, composed: true }),
      );
      await oscdShell.updateComplete;
      renameButton!.click();
      await waitForDialogState(oscdShell.editFileUI, 'closed');
      await oscdShell.updateComplete;
      expect(oscdShell.editFileUI.open).not.to.be.true;
      expect(oscdShell).to.have.property(
        'docName',
        existingDocNameWithExtension,
      );
    });
  });

  [
    {
      desc: 'Dispatched edit event',
      dispatcher: (edit: EditV2) => {
        oscdShell.dispatchEvent(newEditEventV2(edit));
      },
    },
    {
      desc: 'Commit edit directly to xmlEditor',
      dispatcher: (edit: EditV2) => {
        oscdShell.xmlEditor.commit(edit);
      },
    },
  ].forEach(({ desc, dispatcher }) => {
    describe(desc, () => {
      it('inserts an element on Insert', () => {
        const parent = sclDoc.documentElement;
        const node = sclDoc.createElement('test');
        const reference = sclDoc.querySelector('Substation');
        dispatcher({ parent, node, reference });
        expect(sclDoc.documentElement.querySelector('test')).to.have.property(
          'nextSibling',
          reference,
        );
      });

      it('removes an element on Remove', () => {
        const node = sclDoc.querySelector('Substation')!;
        dispatcher({ node });
        expect(sclDoc.querySelector('Substation')).to.not.exist;
      });

      it("updates an element's attributes on Update", () => {
        const element = sclDoc.querySelector('Substation')!;
        const edit = {
          element,
          attributes: {
            name: 'A2',
            desc: null,
            ['__proto__']: 'a string', // covers a rare edge case branch
          },
          attributesNS: {
            'http://example.org/myns': {
              'myns:attr': 'value1',
              'myns:attr2': 'value1',
            },
          },
        };

        dispatcher(edit);

        expect(element.getAttribute('name')).to.equal('A2');
        expect(element.getAttribute('desc')).to.be.null;
        expect(element.getAttribute('__proto__')).to.equal('a string');
        expect(element.getAttribute('myns:attr')).to.equal('value1');
        expect(element.getAttribute('myns:attr2')).to.equal('value1');
      });
    });
  });

  it('processes complex edits in the given order', () => {
    const parent = sclDoc.documentElement;
    const reference = sclDoc.querySelector('Substation');
    const node1 = sclDoc.createElement('test1');
    const node2 = sclDoc.createElement('test2');
    oscdShell.dispatchEvent(
      newEditEventV2([
        { parent, node: node1, reference },
        { parent, node: node2, reference },
      ]),
    );
    expect(sclDoc.documentElement.querySelector('test1')).to.have.property(
      'nextSibling',
      node2,
    );
    expect(sclDoc.documentElement.querySelector('test2')).to.have.property(
      'nextSibling',
      reference,
    );
  });

  it('undoes a edit from Undo menu option', async () => {
    const node = sclDoc.querySelector('Substation')!;
    oscdShell.dispatchEvent(newEditEventV2({ node }));

    const navMenuButton = queryButtonByIcon(
      oscdShell.shadowRoot!,
      'oscd-filled-icon-button',
      'menu',
    );
    expect(navMenuButton).to.exist;
    navMenuButton?.click();

    await oscdShell.updateComplete;
    const undoButton = querySelectorContainingText(
      oscdShell.menuUI,
      'oscd-list-item > span',
      'Undo',
    )?.closest('oscd-list-item') as OscdListItem;
    expect(undoButton).to.exist;
    expect(undoButton).to.have.property('disabled', false);
    undoButton?.click();
    await oscdShell.updateComplete;
    expect(sclDoc.querySelector('Substation')).to.exist;
  });

  it('redoes an undone edit from Redo menu option', async () => {
    const node = sclDoc.querySelector('Substation')!;
    oscdShell.dispatchEvent(newEditEventV2({ node }));
    expect(sclDoc.querySelector('Substation')).to.not.exist;
    oscdShell.undo();
    await oscdShell.updateComplete;
    expect(sclDoc.querySelector('Substation')).to.exist;
    const redoButton = querySelectorContainingText(
      oscdShell.menuUI,
      'oscd-list-item > span',
      'Redo',
    )?.closest('oscd-list-item') as OscdListItem;
    expect(redoButton).to.exist;
    expect(redoButton).to.have.property('disabled', false);
    redoButton?.click();
    await oscdShell.updateComplete;

    expect(sclDoc.querySelector('Substation')).to.not.exist;
  });

  describe('use the keyboard shortcuts', () => {
    it('displays the menu with Ctrl+m', async () => {
      simulateKeypressOnElement('m', true);
      await oscdShell.updateComplete;
      expect(oscdShell.menuUI).to.have.property('opened');
    });

    it('undoes the last edit with Ctrl+z', async () => {
      const node = sclDoc.querySelector('Substation')!;
      oscdShell.dispatchEvent(newEditEventV2({ node }));
      await oscdShell.updateComplete;

      expect(sclDoc.querySelector('Substation')).to.not.exist;
      simulateKeypressOnElement('z', true);
      await oscdShell.updateComplete;
      expect(sclDoc.querySelector('Substation')).to.exist;
    });

    it('redoes the last edit with Ctrl+y', async () => {
      const node = sclDoc.querySelector('Substation')!;
      oscdShell.dispatchEvent(newEditEventV2({ node }));
      expect(sclDoc.querySelector('Substation')).to.not.exist;
      oscdShell.undo();
      await oscdShell.updateComplete;
      expect(sclDoc.querySelector('Substation')).to.exist;
      simulateKeypressOnElement('y', true);
      await oscdShell.updateComplete;
      expect(sclDoc.querySelector('Substation')).to.not.exist;
    });

    it('it redoes the last edit with Ctrl+Z', async () => {
      const node = sclDoc.querySelector('Substation')!;
      oscdShell.dispatchEvent(newEditEventV2({ node }));
      expect(sclDoc.querySelector('Substation')).to.not.exist;
      oscdShell.undo();
      await oscdShell.updateComplete;
      expect(sclDoc.querySelector('Substation')).to.exist;
      simulateKeypressOnElement('Z', true);
      await oscdShell.updateComplete;
      expect(sclDoc.querySelector('Substation')).to.not.exist;
    });

    it('does not trigger anything if the Ctrl button was not pressed', async () => {
      simulateKeypressOnElement('m', false);
      await oscdShell.updateComplete;
      expect(oscdShell.menuUI).to.not.have.attribute('open');
    });

    it('does not trigger anything if the Ctrl button was pressed but the key was not one of the shortcuts', async () => {
      simulateKeypressOnElement('a', true);
      await oscdShell.updateComplete;
      expect(oscdShell.menuUI).to.not.have.attribute('open');
    });

    it('does not change anything if there is nothing to Undo', async () => {
      const before = new XMLSerializer().serializeToString(sclDoc);
      simulateKeypressOnElement('Z', true);
      await oscdShell.updateComplete;
      const after = new XMLSerializer().serializeToString(sclDoc);
      expect(after).to.equal(before);
    });

    it('does not change anything if there is nothing to redo', async () => {
      const before = new XMLSerializer().serializeToString(sclDoc);
      simulateKeypressOnElement('y', true);
      await oscdShell.updateComplete;
      const after = new XMLSerializer().serializeToString(sclDoc);
      expect(after).to.equal(before);
    });
  });

  describe("Out of range Undo's and Redo's", () => {
    it('does not change anything invoking undo(0)', async () => {
      const before = new XMLSerializer().serializeToString(sclDoc);
      oscdShell.undo(0);
      await oscdShell.updateComplete;
      const after = new XMLSerializer().serializeToString(sclDoc);
      expect(after).to.equal(before);
    });

    it('does not change anything invoking redo(0)', async () => {
      const before = new XMLSerializer().serializeToString(sclDoc);
      oscdShell.redo(0);
      await oscdShell.updateComplete;
      const after = new XMLSerializer().serializeToString(sclDoc);
      expect(after).to.equal(before);
    });

    it('only undoes what can be undone when invoking undo(10)', async () => {
      const before = new XMLSerializer().serializeToString(sclDoc);

      const node = sclDoc.querySelector('Substation')!;
      oscdShell.dispatchEvent(newEditEventV2({ node }));
      await oscdShell.updateComplete;

      oscdShell.undo(10);
      await oscdShell.updateComplete;
      const after = new XMLSerializer().serializeToString(sclDoc);
      expect(after).to.equal(before);
    });

    it('only redoes what can be redone when invoking redo(10)', async () => {
      const node = sclDoc.querySelector('Substation')!;
      oscdShell.dispatchEvent(newEditEventV2({ node }));
      await oscdShell.updateComplete;

      const before = new XMLSerializer().serializeToString(sclDoc);

      oscdShell.redo(10);
      await oscdShell.updateComplete;
      const after = new XMLSerializer().serializeToString(sclDoc);
      expect(after).to.equal(before);
    });
  });

  describe('Undo and Redo from the AppBar', () => {
    beforeEach(async () => {
      const node = sclDoc.querySelector('Substation')!;
      oscdShell.dispatchEvent(newEditEventV2({ node }));
      await oscdShell.updateComplete;
      expect(sclDoc.querySelector('Substation')).to.not.exist;
    });

    it('undoes the last edit when the AppBar undo button is clicked', async () => {
      const undoButton = queryButtonByIcon(
        oscdShell.shadowRoot!,
        'oscd-app-bar oscd-filled-icon-button',
        'undo',
      );
      expect(undoButton).to.exist;
      undoButton?.click();

      await oscdShell.updateComplete;
      expect(sclDoc.querySelector('Substation')).to.exist;
    });

    it('it redoes the last undo when the AppBar redo button is clicked', async () => {
      oscdShell.undo();
      await oscdShell.updateComplete;
      expect(sclDoc.querySelector('Substation')).to.exist;

      const redoButton = queryButtonByIcon(
        oscdShell.shadowRoot!,
        'oscd-app-bar oscd-filled-icon-button',
        'redo',
      );
      expect(redoButton).to.exist;
      redoButton?.click();
      await oscdShell.updateComplete;

      expect(sclDoc.querySelector('Substation')).to.not.exist;
    });
  });
});
