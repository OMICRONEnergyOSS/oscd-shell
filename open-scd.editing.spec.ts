import { expect, fixture, html } from '@open-wc/testing';

import {
  Arbitrary,
  array,
  assert,
  constant,
  constantFrom,
  dictionary,
  object as objectArbitrary,
  oneof,
  property,
  record,
  string as stringArbitrary,
  tuple,
  webUrl,
} from 'fast-check';

import { OscdFilledSelect } from '@omicronenergy/oscd-ui/select/oscd-filled-select.js';
import { OscdFilledTextField } from '@omicronenergy/oscd-ui/textfield/oscd-filled-text-field.js';
import { OscdListItem } from '@omicronenergy/oscd-ui/list/OscdListItem.js';

import { OscdMenuItem } from '@omicronenergy/oscd-ui/menu/OscdMenuItem.js';
import { OscdTextButton } from '@omicronenergy/oscd-ui/button/OscdTextButton.js';

import {
  Edit,
  Insert,
  isNamespaced,
  NamespacedAttributeValue,
  newEditEvent,
  newOpenEvent,
  Remove,
  Update,
} from './foundation.js';
import {
  findButtonByIcon,
  querySelectorContainingText,
  simulateKeypressOnElement,
  waitForDialogState,
} from './utils/testing.js';

import type { OpenSCD } from './open-scd.js';

import './open-scd.js';
import { UpdateNS, Value } from './foundation/edit-event.js';

export namespace util {
  export const xmlAttributeName =
    /^(?!xml|Xml|xMl|xmL|XMl|xML|XmL|XML)[A-Za-z_][A-Za-z0-9-_.]*(:[A-Za-z_][A-Za-z0-9-_.]*)?$/;

  export function descendants(parent: Element | XMLDocument): Node[] {
    return (Array.from(parent.childNodes) as Node[]).concat(
      ...Array.from(parent.children).map(child => descendants(child)),
    );
  }

  export const sclDocString = `<?xml version="1.0" encoding="UTF-8"?>
  <SCL version="2007" revision="B" xmlns="http://www.iec.ch/61850/2003/SCL" xmlns:ens1="http://example.org/somePreexistingExtensionNamespace">
  <Substation ens1:foo="a" name="A1" desc="test substation"></Substation>
</SCL>`;
  export const testDocStrings = [
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

  export type TestDoc = { doc: XMLDocument; nodes: Node[] };
  export const testDocs = tuple(
    constantFrom(...testDocStrings),
    constantFrom(...testDocStrings),
  )
    .map(strs =>
      strs.map(str => new DOMParser().parseFromString(str, 'application/xml')),
    )
    .map(docs =>
      docs.map(doc => ({ doc, nodes: descendants(doc).concat([doc]) })),
    ) as Arbitrary<[TestDoc, TestDoc]>;

  export function remove(nodes: Node[]): Arbitrary<Remove> {
    const node = oneof(
      { arbitrary: constantFrom(...nodes), weight: nodes.length },
      testDocs.chain(docs => constantFrom(...docs.map(d => d.doc))),
    );
    return record({ node });
  }

  export function insert(nodes: Node[]): Arbitrary<Insert> {
    const references = (nodes as (Node | null)[]).concat([null]);
    const parent = constantFrom(...nodes);
    const node = constantFrom(...nodes);
    const reference = constantFrom(...references);
    return record({ parent, node, reference });
  }

  export function update(nodes: Node[]): Arbitrary<Update> {
    const element = <Arbitrary<Element>>(
      constantFrom(...nodes.filter(nd => nd.nodeType === Node.ELEMENT_NODE))
    );
    const attributes = dictionary(
      oneof(stringArbitrary(), constant('colliding-attribute-name')),
      oneof(stringArbitrary(), constant(null)),
    );
    return record({ element, attributes });
  }

  export function updateNS(nodes: Node[]): Arbitrary<UpdateNS> {
    const element = <Arbitrary<Element>>(
      constantFrom(...nodes.filter(nd => nd.nodeType === Node.ELEMENT_NODE))
    );
    const attributes = dictionary(
      stringArbitrary(),
      oneof(stringArbitrary(), constant(null)),
    );
    // object() instead of nested dictionary() necessary for performance reasons
    const attributesNS = objectArbitrary({
      key: webUrl(),
      values: [stringArbitrary(), constant(null)],
      maxDepth: 1,
    }).map(
      aNS =>
        Object.fromEntries(
          Object.entries(aNS).filter(
            ([_, attrs]) => attrs && !(typeof attrs === 'string'),
          ),
        ) as Partial<Record<string, Partial<Record<string, Value>>>>,
    );
    return record({ element, attributes, attributesNS });
  }

  export function simpleEdit(
    nodes: Node[],
  ): Arbitrary<Insert | Update | Remove> {
    return oneof(remove(nodes), insert(nodes), update(nodes), updateNS(nodes));
  }

  export function complexEdit(nodes: Node[]): Arbitrary<Edit[]> {
    return array(simpleEdit(nodes));
  }

  export function edit(nodes: Node[]): Arbitrary<Edit> {
    return oneof(
      { arbitrary: simpleEdit(nodes), weight: 2 },
      complexEdit(nodes),
    );
  }

  /** A series of arbitrary edits that allow us to test undo and redo */
  export type UndoRedoTestCase = {
    doc1: XMLDocument;
    doc2: XMLDocument;
    edits: Edit[];
  };
  export function undoRedoTestCases(
    testDoc1: TestDoc,
    testDoc2: TestDoc,
  ): Arbitrary<UndoRedoTestCase> {
    const nodes = testDoc1.nodes.concat(testDoc2.nodes);
    return record({
      doc1: constant(testDoc1.doc),
      doc2: constant(testDoc2.doc),
      edits: array(edit(nodes)),
    });
  }

  export function isParentNode(node: Node): node is ParentNode {
    return (
      node instanceof Element ||
      node instanceof Document ||
      node instanceof DocumentFragment
    );
  }

  export function isParentOf(parent: Node, node: Node | null) {
    return (
      isParentNode(parent) &&
      (node === null ||
        Array.from(parent.childNodes).includes(node as ChildNode))
    );
  }

  export function isValidInsert({ parent, node, reference }: Insert) {
    return (
      node !== reference &&
      isParentOf(parent, reference) &&
      !node.contains(parent) &&
      ![Node.DOCUMENT_NODE, Node.DOCUMENT_TYPE_NODE].some(
        nodeType => node.nodeType === nodeType,
      ) &&
      !(
        parent instanceof Document &&
        (parent.documentElement || !(node instanceof Element))
      )
    );
  }
}

function newTestDoc() {
  const docString =
    util.testDocStrings[Math.floor(Math.random() * util.testDocStrings.length)];
  return new DOMParser().parseFromString(docString, 'application/xml');
}

describe('open-scd', () => {
  let editor: OpenSCD;
  let sclDoc: XMLDocument;

  beforeEach(async () => {
    editor = <OpenSCD>await fixture(html`<open-scd></open-scd>`);
    sclDoc = new DOMParser().parseFromString(
      util.sclDocString,
      'application/xml',
    );
    editor.logUI.quick = true; // enable quick mode for faster tests
  });

  it('loads a non-SCL document on OpenDocEvent', async () => {
    editor.dispatchEvent(newOpenEvent(sclDoc, 'test.xml'));
    await editor.updateComplete;
    expect(editor.docs).to.have.property('test.xml', sclDoc);
    expect(editor).to.have.property('doc', undefined);
    expect(editor).to.not.have.property('docName', 'test.xml');
  });

  it('opens an SCL document for editing on OpenDocEvent', async () => {
    editor.dispatchEvent(newOpenEvent(sclDoc, 'test.scd'));
    await editor.updateComplete;
    expect(editor.docs).to.have.property('test.scd', sclDoc);
    expect(editor).to.have.property('doc', sclDoc);
    expect(editor).to.have.property('docName', 'test.scd');
  });

  describe('with an SCL document loaded', () => {
    beforeEach(async () => {
      editor.dispatchEvent(newOpenEvent(sclDoc, 'test.scd'));
      await editor.updateComplete;
    });

    it('updates the UI when a document with the same name is opened', async () => {
      const newDoc = newTestDoc();
      const oldUpdate = editor.updateComplete;
      editor.dispatchEvent(newOpenEvent(newDoc, 'test.scd'));
      expect(oldUpdate).to.not.equal(editor.updateComplete);
    });

    it('allows the user to change the current doc name', async () => {
      findButtonByIcon(editor.shadowRoot!, 'oscd-icon-button', 'edit')?.click();
      const dialog = editor.editFileUI;
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
      findButtonByIcon(dialog, 'oscd-text-button', 'edit')?.click();
      await editor.updateComplete;
      expect(editor).to.have.property('docName', 'newName.cid');
      expect(editor).to.have.property('doc', sclDoc);
    });

    it('allows the user to close the current doc', async () => {
      const currentDocName = editor.docName;
      const editButton = findButtonByIcon(
        editor.shadowRoot!,
        'oscd-icon-button',
        'edit',
      );
      expect(editButton).to.exist;
      editButton?.click();

      const dialog = editor.editFileUI;
      await dialog.updateComplete;
      const deleteButton = findButtonByIcon(
        dialog,
        'oscd-text-button',
        'delete',
      );
      expect(deleteButton).to.exist;
      deleteButton?.click();

      await new Promise<void>(resolve => {
        dialog.addEventListener('closed', () => resolve(), { once: true });
      });

      await editor.updateComplete;
      expect(editor.docName).to.not.equal(currentDocName);
      expect(editor.doc).to.be.undefined;
    });
  });

  describe('with several documents loaded', () => {
    beforeEach(async () => {
      for (let i = 0; i < 5; i += 1) {
        editor.dispatchEvent(newOpenEvent(newTestDoc(), `test${i}.scd`));
      }
      await editor.updateComplete;
    });

    it('allows the user to switch documents', async () => {
      editor.fileMenuButtonUI?.click();
      await editor.fileMenuUI.updateComplete;
      (editor.fileMenuUI.firstElementChild as OscdMenuItem).click();
      await editor.updateComplete;
      const oldDocName = editor.docName;
      editor.fileMenuButtonUI?.click();
      await editor.fileMenuUI.updateComplete;
      (editor.fileMenuUI.lastElementChild as OscdMenuItem).click();
      await editor.updateComplete;
      expect(editor).to.not.have.property('docName', oldDocName);
    });

    it('prevents the user from renaming the current doc to an already opened doc name', async () => {
      const anotherDocNameWithoutExtension = Object.keys(editor.docs)
        ?.find(docName => docName !== editor.docName)
        ?.split('.')[0];
      const existingDocNameWithExtension = editor.docName;
      findButtonByIcon(
        editor.shadowRoot!,
        'oscd-app-bar oscd-icon-button',
        'edit',
      )?.click();
      const dialog = editor.editFileUI;
      await dialog.updateComplete;
      const textfield = dialog.querySelector<OscdFilledTextField>('#fileName')!;
      await textfield.updateComplete;
      textfield.value = anotherDocNameWithoutExtension!;
      textfield.dispatchEvent(
        new Event('input', { bubbles: true, composed: true }),
      );
      await textfield.updateComplete;
      findButtonByIcon(dialog, 'oscd-text-button', 'edit')?.click();
      await editor.updateComplete;
      expect(editor).to.have.property('docName', existingDocNameWithExtension);
    });
  });

  it('inserts an element on Insert', () => {
    const parent = sclDoc.documentElement;
    const node = sclDoc.createElement('test');
    const reference = sclDoc.querySelector('Substation');
    editor.dispatchEvent(newEditEvent({ parent, node, reference }));
    expect(sclDoc.documentElement.querySelector('test')).to.have.property(
      'nextSibling',
      reference,
    );
  });

  it('removes an element on Remove', () => {
    const node = sclDoc.querySelector('Substation')!;
    editor.dispatchEvent(newEditEvent({ node }));
    expect(sclDoc.querySelector('Substation')).to.not.exist;
  });

  it("updates an element's attributes on Update", () => {
    const element = sclDoc.querySelector('Substation')!;
    editor.dispatchEvent(
      newEditEvent({
        element,
        attributes: {
          name: 'A2',
          desc: null,
          ['__proto__']: 'a string', // covers a rare edge case branch
          'ens1:attr': {
            value: 'namespaced value',
            namespaceURI: 'http://example.org/myns',
          },
          'ens1:foo': 'namespaced value set with a string not an object',
        },
      }),
    );
    expect(element).to.have.attribute('name', 'A2');
    expect(element).to.not.have.attribute('desc');
    expect(element).to.have.attribute('__proto__', 'a string');
    expect(element).to.have.attribute('ens1:attr', 'namespaced value');
  });

  it("updates an element's attributes on UpdateNS", () => {
    const element = sclDoc.querySelector('Substation')!;
    editor.dispatchEvent(
      newEditEvent({
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
          'http://example.org/myns2': {
            attr: 'value2',
            attr2: 'value2',
          },
          'http://example.org/myns3': {
            attr: 'value3',
            attr2: 'value3',
          },
        },
      }),
    );
    expect(element).to.have.attribute('name', 'A2');
    expect(element).to.not.have.attribute('desc');
    expect(element).to.have.attribute('__proto__', 'a string');
    expect(element).to.have.attribute('myns:attr', 'value1');
    expect(element).to.have.attribute('myns:attr2', 'value1');
    expect(element).to.have.attribute('ens2:attr', 'value2');
    expect(element).to.have.attribute('ens2:attr2', 'value2');
    expect(element).to.have.attribute('ens3:attr', 'value3');
    expect(element).to.have.attribute('ens3:attr2', 'value3');
  });

  it('processes complex edits in the given order', () => {
    const parent = sclDoc.documentElement;
    const reference = sclDoc.querySelector('Substation');
    const node1 = sclDoc.createElement('test1');
    const node2 = sclDoc.createElement('test2');
    editor.dispatchEvent(
      newEditEvent([
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
    editor.dispatchEvent(newEditEvent({ node }));

    const navMenuButton = findButtonByIcon(
      editor.shadowRoot!,
      'oscd-icon-button',
      'menu',
    );
    expect(navMenuButton).to.exist;
    navMenuButton?.click();

    await editor.updateComplete;
    const undoButton = querySelectorContainingText(
      editor.menuUI,
      'oscd-list-item > span',
      'Undo',
    )?.closest('oscd-list-item') as OscdListItem;
    expect(undoButton).to.exist;
    expect(undoButton).to.have.property('disabled', false);
    undoButton?.click();
    await editor.updateComplete;
    expect(sclDoc.querySelector('Substation')).to.exist;
  });

  it('redoes an undone edit from Redo menu option', async () => {
    const node = sclDoc.querySelector('Substation')!;
    editor.dispatchEvent(newEditEvent({ node }));
    expect(sclDoc.querySelector('Substation')).to.not.exist;
    editor.undo();
    await editor.updateComplete;
    expect(sclDoc.querySelector('Substation')).to.exist;
    const redoButton = querySelectorContainingText(
      editor.menuUI,
      'oscd-list-item > span',
      'Redo',
    )?.closest('oscd-list-item') as OscdListItem;
    expect(redoButton).to.exist;
    expect(redoButton).to.have.property('disabled', false);
    redoButton?.click();
    await editor.updateComplete;

    expect(sclDoc.querySelector('Substation')).to.not.exist;
  });

  describe('use the keyboard shortcuts', () => {
    it('displays the menu with Ctrl+m', async () => {
      simulateKeypressOnElement('m', true);
      await editor.updateComplete;
      expect(editor.menuUI).to.have.property('opened');
    });

    it('undoes the last edit with Ctrl+z', async () => {
      const node = sclDoc.querySelector('Substation')!;
      editor.dispatchEvent(newEditEvent({ node }));
      await editor.updateComplete;

      expect(sclDoc.querySelector('Substation')).to.not.exist;
      simulateKeypressOnElement('z', true);
      await editor.updateComplete;
      expect(sclDoc.querySelector('Substation')).to.exist;
    });

    it('redoes the last edit with Ctrl+y', async () => {
      const node = sclDoc.querySelector('Substation')!;
      editor.dispatchEvent(newEditEvent({ node }));
      expect(sclDoc.querySelector('Substation')).to.not.exist;
      editor.undo();
      await editor.updateComplete;
      expect(sclDoc.querySelector('Substation')).to.exist;
      simulateKeypressOnElement('y', true);
      await editor.updateComplete;
      expect(sclDoc.querySelector('Substation')).to.not.exist;
    });

    it('it redoes the last edit with Ctrl+Z', async () => {
      const node = sclDoc.querySelector('Substation')!;
      editor.dispatchEvent(newEditEvent({ node }));
      expect(sclDoc.querySelector('Substation')).to.not.exist;
      editor.undo();
      await editor.updateComplete;
      expect(sclDoc.querySelector('Substation')).to.exist;
      simulateKeypressOnElement('Z', true);
      await editor.updateComplete;
      expect(sclDoc.querySelector('Substation')).to.not.exist;
    });

    it('displays the logs dialog on Ctrl+l', async () => {
      simulateKeypressOnElement('l', true);
      await editor.updateComplete;
      await waitForDialogState(editor.logUI, 'open');
      expect(editor.logUI).to.have.attribute('open');
      const closeButton = editor.logUI?.querySelector(
        'oscd-text-button[value="close"]',
      ) as OscdTextButton;
      expect(closeButton).to.exist;
      closeButton?.click();
      await editor.updateComplete;
      await waitForDialogState(editor.logUI, 'closed');
      expect(editor.logUI).to.not.have.attribute('open');
    });

    it('closes the dialog on Ctrl+l', async () => {
      await editor.logUI.show();
      await waitForDialogState(editor.logUI, 'open');
      expect(editor.logUI).to.have.attribute('open');
      simulateKeypressOnElement('l', true);
      await waitForDialogState(editor.logUI, 'closed');
      await editor.updateComplete;
      expect(editor.logUI).to.not.have.attribute('open');
    });

    it('does not trigger anything if the Ctrl button was not pressed', async () => {
      simulateKeypressOnElement('m', false);
      await editor.updateComplete;
      expect(editor.menuUI).to.not.have.attribute('open');
      expect(editor.logUI).to.not.have.attribute('open');
    });

    it('does not trigger anything if the Ctrl button was pressed but the key was not one of the shortcuts', async () => {
      simulateKeypressOnElement('a', true);
      await editor.updateComplete;
      expect(editor.menuUI).to.not.have.attribute('open');
      expect(editor.logUI).to.not.have.attribute('open');
    });
  });

  describe('with the editing history dialog open', () => {
    beforeEach(async () => {
      editor.logUI.show();
      await editor.updateComplete;
    });

    it('displays the edit history', async () => {
      const historyItemsCount =
        editor.logUI?.querySelectorAll('oscd-list > abbr').length;
      const node = sclDoc.querySelector('Substation')!;
      editor.dispatchEvent(newEditEvent({ node }));
      await editor.updateComplete;

      expect(
        editor.logUI?.querySelectorAll('oscd-list > abbr'),
      ).to.have.lengthOf(historyItemsCount! + 1);
    });

    it('undoes the last edit when clicking the undo button in the log dialog', async () => {
      const node = sclDoc.querySelector('Substation')!;
      editor.dispatchEvent(newEditEvent({ node }));
      await editor.updateComplete;
      const undoButton = editor.logUI?.querySelector(
        'oscd-text-button[value="undo"]',
      ) as HTMLButtonElement;
      expect(undoButton).to.exist;
      expect(undoButton).to.have.property('disabled', false);
      undoButton?.click();
      await editor.updateComplete;
      expect(sclDoc.querySelector('Substation')).to.exist;
    });

    it('redoes the last undone when clicking the redo button in the log dialog', async () => {
      const node = sclDoc.querySelector('Substation')!;
      editor.dispatchEvent(newEditEvent({ node }));
      await editor.updateComplete;
      editor.undo();
      await editor.updateComplete;
      expect(sclDoc.querySelector('Substation')).to.exist;
      const redoButton = editor.logUI?.querySelector(
        'oscd-text-button[value="redo"]',
      ) as HTMLButtonElement;
      expect(redoButton).to.exist;
      expect(redoButton).to.have.property('disabled', false);
      redoButton?.click();
      await editor.updateComplete;
      expect(sclDoc.querySelector('Substation')).to.not.exist;
    });
  });

  describe('generally', () => {
    it('inserts elements on Insert edit events', () =>
      assert(
        property(
          util.testDocs.chain(([doc1, doc2]) => {
            const nodes = doc1.nodes.concat(doc2.nodes);
            return util.insert(nodes);
          }),
          edit => {
            editor.dispatchEvent(newEditEvent(edit));
            if (util.isValidInsert(edit)) {
              return (
                edit.node.parentElement === edit.parent &&
                edit.node.nextSibling === edit.reference
              );
            }
            return true;
          },
        ),
      ));

    it('updates default namespace attributes on Update edit events', () =>
      assert(
        property(
          util.testDocs.chain(([{ nodes }]) => util.update(nodes)),
          edit => {
            editor.dispatchEvent(newEditEvent(edit));
            return Object.entries(edit.attributes)
              .filter(
                ([name, value]) =>
                  util.xmlAttributeName.test(name) && !isNamespaced(value!),
              )
              .every(
                ([name, value]) => edit.element.getAttribute(name) === value,
              );
          },
        ),
      ));

    it('updates namespaced attributes on Update edit events', () =>
      assert(
        property(
          util.testDocs.chain(([{ nodes }]) => util.update(nodes)),
          edit => {
            editor.dispatchEvent(newEditEvent(edit));
            return Object.entries(edit.attributes)
              .filter(
                ([name, value]) =>
                  util.xmlAttributeName.test(name) &&
                  isNamespaced(value!) &&
                  value.namespaceURI,
              )
              .map(entry => entry as [string, NamespacedAttributeValue])
              .every(
                ([name, { value, namespaceURI }]) =>
                  edit.element.getAttributeNS(
                    <string>namespaceURI,
                    name.includes(':') ? <string>name.split(':', 2)[1] : name,
                  ) === value,
              );
          },
        ),
      ));

    it('updates default- and foreign-namespace attributes on UpdateNS events', () =>
      assert(
        property(
          util.testDocs.chain(([{ nodes }]) => util.updateNS(nodes)),
          edit => {
            editor.dispatchEvent(newEditEvent(edit));
            return (
              Object.entries(edit.attributes)
                .filter(([name]) => util.xmlAttributeName.test(name))
                .map(entry => entry as [string, Value])
                .every(
                  ([name, value]) => edit.element.getAttribute(name) === value,
                ) &&
              Object.entries(edit.attributesNS)
                .map(entry => entry as [string, Record<string, Value>])
                .every(([ns, attributes]) =>
                  Object.entries(attributes)
                    .filter(([name]) => util.xmlAttributeName.test(name))
                    .map(entry => entry as [string, Value])
                    .every(
                      ([name, value]) =>
                        edit.element.getAttributeNS(
                          ns,
                          name.includes(':')
                            ? <string>name.split(':', 2)[1]
                            : name,
                        ) === value,
                    ),
                )
            );
          },
        ),
      )).timeout(20000);

    it('removes elements on Remove edit events', () =>
      assert(
        property(
          util.testDocs.chain(([{ nodes }]) => util.remove(nodes)),
          ({ node }) => {
            editor.dispatchEvent(newEditEvent({ node }));
            return !node.parentNode;
          },
        ),
      ));

    it('undoes up to n edits on undo(n) call', () =>
      assert(
        property(
          util.testDocs.chain(docs => util.undoRedoTestCases(...docs)),
          ({ doc1, doc2, edits }: util.UndoRedoTestCase) => {
            const [oldDoc1, oldDoc2] = [doc1, doc2].map(doc =>
              doc.cloneNode(true),
            );
            edits.forEach((a: Edit) => {
              editor.dispatchEvent(newEditEvent(a));
            });
            if (edits.length) {
              editor.undo(edits.length);
            }
            expect(doc1).to.satisfy((doc: XMLDocument) =>
              doc.isEqualNode(oldDoc1),
            );
            expect(doc2).to.satisfy((doc: XMLDocument) =>
              doc.isEqualNode(oldDoc2),
            );
            return true;
          },
        ),
      )).timeout(20000);

    it('redoes up to n edits on redo(n) call', () =>
      assert(
        property(
          util.testDocs.chain(docs => util.undoRedoTestCases(...docs)),
          ({ doc1, doc2, edits }: util.UndoRedoTestCase) => {
            edits.forEach((a: Edit) => {
              editor.dispatchEvent(newEditEvent(a));
            });
            const [oldDoc1, oldDoc2] = [doc1, doc2].map(doc =>
              new XMLSerializer().serializeToString(doc),
            );
            if (edits.length) {
              editor.undo(edits.length + 1);
              editor.redo(edits.length + 1);
            }
            const [newDoc1, newDoc2] = [doc1, doc2].map(doc =>
              new XMLSerializer().serializeToString(doc),
            );
            return oldDoc1 === newDoc1 && oldDoc2 === newDoc2;
          },
        ),
      )).timeout(20000);
  });
});
