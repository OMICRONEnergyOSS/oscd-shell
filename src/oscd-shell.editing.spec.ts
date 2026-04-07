import { newEditEventV2, newOpenEvent } from '@openscd/oscd-api/utils.js';

import { expect, fixture, html } from '@open-wc/testing';

import { EditV2 } from '@openscd/oscd-api';

import type { OscdShell } from './oscd-shell.js';

import './oscd-shell.js';
import { OscdFilledIconButton } from '@omicronenergy/oscd-ui/iconbutton/OscdFilledIconButton.js';
import { queryButtonByIcon } from '@omicronenergy/oscd-test-utils';

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

describe('oscd-shell', () => {
  let oscdShell: OscdShell;
  let sclDoc: XMLDocument;

  beforeEach(async () => {
    oscdShell = <OscdShell>await fixture(html`<oscd-shell></oscd-shell>`);
    sclDoc = new DOMParser().parseFromString(sclDocString, 'application/xml');
    oscdShell.dispatchEvent(newOpenEvent(sclDoc, 'test.scd'));
    await oscdShell.updateComplete;
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

  describe('App-Bar Undo and Redo Buttons', () => {
    let undoButton: OscdFilledIconButton;
    let redoButton: OscdFilledIconButton;

    beforeEach(async () => {
      const appBar = oscdShell.shadowRoot?.querySelector('oscd-app-bar');
      expect(appBar, 'expect oscd-app-bar to be present').to.exist;
      undoButton = queryButtonByIcon(
        appBar!,
        'oscd-filled-icon-button',
        'undo',
      ) as OscdFilledIconButton;
      redoButton = queryButtonByIcon(
        appBar!,
        'oscd-filled-icon-button',
        'redo',
      ) as OscdFilledIconButton;
    });

    it('disabled the Undo button when there is nothing to undo', async () => {
      expect(oscdShell.canUndo).to.be.false;
      expect(undoButton.disabled).to.be.true;
    });
    it('enabled the Undo button when there is something to undo', async () => {
      const node = sclDoc.querySelector('Substation')!;
      oscdShell.dispatchEvent(newEditEventV2({ node }));
      await oscdShell.updateComplete;

      expect(oscdShell.canUndo).to.be.true;
      expect(undoButton.disabled).to.be.false;
    });

    it('disabled the Redo button when there is nothing to redo', async () => {
      expect(oscdShell.canRedo).to.be.false;
      expect(redoButton.disabled).to.be.true;
    });

    it('enabled the Redo button when there is something to redo', async () => {
      const node = sclDoc.querySelector('Substation')!;
      oscdShell.dispatchEvent(newEditEventV2({ node }));
      await oscdShell.updateComplete;
      oscdShell.undo();
      await oscdShell.updateComplete;

      expect(oscdShell.canRedo).to.be.true;
      expect(redoButton.disabled).to.be.false;
    });

    it('undoes an edit when the Undo button is clicked', async () => {
      const before = new XMLSerializer().serializeToString(sclDoc);

      //Delete the substation to have something to undo
      const node = sclDoc.querySelector('Substation')!;
      oscdShell.dispatchEvent(newEditEventV2({ node }));
      await oscdShell.updateComplete;

      //Now undo the deletion via the Undo button
      undoButton.click();
      await oscdShell.updateComplete;

      //compare before and after
      const after = new XMLSerializer().serializeToString(sclDoc);
      expect(after).to.equal(before);
    });
    it('redoes an edit when the Redo button is clicked', async () => {
      //Delete the substation to have an edit to undo & redo
      const node = sclDoc.querySelector('Substation')!;
      oscdShell.dispatchEvent(newEditEventV2({ node }));
      await oscdShell.updateComplete;

      //lets snapshot the document before the undo
      const beforeUndo = new XMLSerializer().serializeToString(sclDoc);

      //Now undo the deletion via the Undo button
      undoButton.click();
      await oscdShell.updateComplete;

      //Now redo the deletion via the Redo button
      redoButton.click();
      await oscdShell.updateComplete;

      //compare before and after
      const afterRedo = new XMLSerializer().serializeToString(sclDoc);
      expect(afterRedo).to.equal(beforeUndo);
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

      oscdShell.undo();
      await oscdShell.updateComplete;

      oscdShell.redo(10);
      await oscdShell.updateComplete;
      const after = new XMLSerializer().serializeToString(sclDoc);
      expect(after).to.equal(before);
    });
  });
});
