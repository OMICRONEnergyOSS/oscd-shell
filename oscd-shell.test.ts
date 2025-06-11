import { expect, waitUntil } from '@open-wc/testing';
import { visualDiff } from '@web/test-runner-visual-regression';

import './oscd-shell.js';

import { OscdAppBar } from '@omicronenergy/oscd-ui/app-bar/OscdAppBar.js';
import type { OscdFilledIconButton } from '@omicronenergy/oscd-ui/iconbutton/oscd-filled-icon-button.js';
import type { OscdListItem } from '@omicronenergy/oscd-ui/list/oscd-list-item.js';
import { OscdSecondaryTab } from '@omicronenergy/oscd-ui/tabs/OscdSecondaryTab.js';

import { Edit, newEditEvent, newOpenEvent } from './foundation.js';
import {
  findButtonByIcon,
  simulateKeypressOnElement,
} from './utils/testing.js';
import { allLocales } from './locales.js';
import type { OpenSCD } from './oscd-shell.js';

const factor = window.process && process.env.CI ? 4 : 2;

function timeout(ms: number) {
  return new Promise(res => {
    setTimeout(res, ms * factor);
  });
}

function isMenuFullyOpen(editor: OpenSCD) {
  const rect = editor.menuUI?.shadowRoot
    ?.querySelector('.md3-navigation-drawer-modal--opened')
    ?.getBoundingClientRect();
  return rect && rect.width <= 360;
}

mocha.timeout(2000 * factor);

const doc = new DOMParser().parseFromString(
  `<testdoc></testdoc>`,
  'application/xml',
);

let editor: OpenSCD;
let appBar!: OscdAppBar;
let menuButton!: OscdFilledIconButton;

async function openMenuDrawer() {
  if (!appBar || !menuButton) {
    throw new Error('App bar or menu button not found');
  }
  menuButton.click();
  await editor.menuUI?.updateComplete;
  await waitUntil(() => isMenuFullyOpen(editor), 'menu did not appear', {
    timeout: 2000,
  });
  await timeout(200);
}

async function editorTabCount(count: number) {
  if (!editor.shadowRoot) {
    throw new Error('Editor shadow root not found');
  }
  await waitUntil(
    () =>
      editor.shadowRoot!.querySelectorAll('oscd-secondary-tab').length >= count,
    `waiting for ${count} editor tabs timmed out`,
  );
}

async function menuPluginCount(count: number) {
  if (!editor.shadowRoot) {
    throw new Error('Editor shadow root not found');
  }
  await waitUntil(() => {
    const allElements = editor.shadowRoot!.querySelectorAll('aside > *');
    const menuPlugins = Array.from(allElements).filter(el =>
      el.tagName.toLowerCase().startsWith('oscd-'),
    );
    return menuPlugins.length >= count;
  }, `waiting for ${count} menu plugins timmed out`);
}

beforeEach(async () => {
  editor = document.createElement('oscd-shell');
  document.body.prepend(editor);
  await editor.updateComplete;
  appBar = editor.shadowRoot?.querySelector('oscd-app-bar') as OscdAppBar;
  menuButton =
    appBar &&
    (findButtonByIcon(
      appBar,
      'oscd-filled-icon-button',
      'menu',
    ) as OscdFilledIconButton);
  if (!appBar) {
    throw new Error('App bar not found');
  }
  if (!menuButton) {
    throw new Error('Menu button not found');
  }
});

afterEach(() => {
  editor.remove();
});

it(`changes locales on attribute change`, async () => {
  editor.setAttribute('locale', 'invalid');
  await editor.updateComplete;

  expect(editor).to.have.property('locale', 'en');

  editor.setAttribute('locale', 'de');
  await editor.updateComplete;

  await timeout(180);
  await editor.updateComplete;
  expect(editor).to.have.property('locale', 'de');
});

allLocales.forEach(lang =>
  describe(`translated to ${lang}`, () => {
    beforeEach(async () => {
      editor.setAttribute('locale', lang);
      await editor.updateComplete;
      await waitUntil(
        () => editor.locale === lang,
        `setting locale to ${lang} failed`,
      );
    });

    it(`displays a top app bar`, async () => {
      await editor.updateComplete;
      await timeout(20);
      await visualDiff(editor, `app-bar-${lang}`);
    });

    it(`displays a menu on button click`, async () => {
      await editor.updateComplete;
      await openMenuDrawer();
      await visualDiff(editor, `menu-drawer-${lang}`);
    });

    it(`displays a current document title`, async () => {
      await editor.updateComplete;

      editor.dispatchEvent(newOpenEvent(doc, 'test.scd'));
      await editor.updateComplete;
      await timeout(20);
      await visualDiff(editor, `document-name-${lang}`);
    });

    it(`shows a log screen`, async () => {
      await editor.updateComplete;
      await openMenuDrawer();
      editor.menuUI
        ?.querySelector<OscdListItem>('oscd-list-item:last-child')
        ?.click();

      await editor.updateComplete;
      await timeout(300);
      await visualDiff(editor, `log-screen-${lang}`);
    });

    it(`shows log entries`, async () => {
      const parent = doc.documentElement;
      const node = doc.createElement('test');
      const reference = doc.querySelector('testchild');
      editor.dispatchEvent(newEditEvent({ parent, node, reference }));
      editor.dispatchEvent(newEditEvent({ parent, node, reference: null }));

      const element = doc.querySelector('testdoc')!;
      editor.dispatchEvent(
        newEditEvent({
          element,
          attributes: {
            name: 'A2',
            desc: null,
            'myns:attr': {
              value: 'namespaced value',
              namespaceURI: 'http://example.org/myns',
            },
          },
        }),
      );

      editor.dispatchEvent(newEditEvent({ node }));
      editor.dispatchEvent(
        newEditEvent([
          { parent, node, reference },
          { parent, node, reference: null },
          { invalid: 'edit' } as unknown as Edit,
        ]),
      );

      const undoButton = findButtonByIcon(
        appBar,
        'oscd-filled-icon-button',
        'undo',
      );
      const redoButton = findButtonByIcon(
        appBar,
        'oscd-filled-icon-button',
        'redo',
      );
      const historyButton = findButtonByIcon(
        appBar,
        'oscd-filled-icon-button',
        'history',
      );

      expect(undoButton).to.exist;
      expect(redoButton).to.exist;
      expect(historyButton).to.exist;

      historyButton!.click();

      await editor.updateComplete;
      await timeout(300);
      await visualDiff(editor, `log-entries-${lang}`);

      undoButton!.click();
      await editor.updateComplete;

      undoButton!.click();
      await editor.updateComplete;

      undoButton!.click();
      await editor.updateComplete;

      undoButton!.click();
      await editor.updateComplete;

      simulateKeypressOnElement('z', true);

      simulateKeypressOnElement('y', false);

      simulateKeypressOnElement('X', true);

      await editor.updateComplete;

      await timeout(20);
      await visualDiff(editor, `log-entries-undone-${lang}`);

      redoButton!.click();
      await editor.updateComplete;

      redoButton!.click();
      await editor.updateComplete;

      await timeout(20);
      await visualDiff(editor, `log-entries-redone-${lang}`);
    });

    describe('with menu plugins loaded', () => {
      beforeEach(async () => {
        editor.plugins = {
          editor: [],
          menu: [
            {
              name: 'Test Menu Plugin',
              translations: { de: 'Test Menü Erweiterung' },
              src: 'data:text/javascript;charset=utf-8,export%20default%20class%20TestPlugin%20extends%20HTMLElement%20%7B%0D%0A%20%20async%20run%28%29%20%7B%0D%0A%20%20%20%20return%20false%3B%0D%0A%20%20%7D%0D%0A%7D',
              icon: 'android',
              active: true,
              requireDoc: true,
            },
            {
              name: 'Test Menu Plugin 2',
              src: 'data:text/javascript;charset=utf-8,export%20default%20class%20TestPlugin%20extends%20HTMLElement%20%7B%0D%0A%20%20async%20run%28%29%20%7B%0D%0A%20%20%20%20this.dispatchEvent%28new%20CustomEvent%28%27oscd-open%27%2C%20%7Bdetail%3A%20%7BdocName%3A%20%27testDoc.scd%27%2C%20doc%3A%20window.document%7D%2C%20bubbles%3A%20true%2C%20composed%3A%20true%7D%29%29%3B%0D%0A%20%20%7D%0D%0A%7D',
              icon: 'polymer',
              active: true,
              requireDoc: false,
            },
            {
              name: 'Test Menu Plugin 3',
              translations: { de: 'Test Menü Erweiterung 3' },
              src: 'data:text/javascript;charset=utf-8,export%20default%20class%20BrokenTestPlugin%20extends%20HTMLElement%20%7B%0D%0A%20%20%2F%2F%20oh%20NO%21%20There%27s%20no%20run%20method%21%0D%0A%7D',
              icon: 'dry',
              active: true,
              requireDoc: false,
            },
            {
              name: 'Test Menu Plugin 4',
              translations: { de: 'Test Menü Erweiterung 4' },
              src: 'data:text/javascript;charset=utf-8,export%20default%20class%20BrokenTestPlugin%20extends%20HTMLElement%20%7B%0D%0A%20%20%2F%2F%20oh%20no%21%20There%27s%20no%20run%20method%21%0D%0A%7D',
              icon: 'translate',
              active: false,
              requireDoc: true,
            },
          ],
        };
        await editor.updateComplete;
        await menuPluginCount(4);
      });

      it('displays menu plugins in the menu', async () => {
        await openMenuDrawer();
        await visualDiff(editor, `menu-plugins-${lang}`);
      });

      it('triggers menu plugins on menu entry click', async () => {
        await openMenuDrawer();
        editor.menuUI
          ?.querySelector<OscdFilledIconButton>('oscd-list-item:nth-of-type(2)')
          ?.click();
        editor.menuUI
          ?.querySelector<OscdFilledIconButton>('oscd-list-item:nth-of-type(3)')
          ?.click();

        await editor.updateComplete;
        await timeout(200);
        expect(editor.docName).to.equal('testDoc.scd');
        await editor.updateComplete;
        await visualDiff(editor, `menu-plugins-triggered-${lang}`);
      });
    });

    describe('with editor plugins loaded', () => {
      beforeEach(async () => {
        editor.plugins = {
          menu: [],
          editor: [
            {
              name: 'Test Editor Plugin',
              translations: { de: 'Test Editor Erweiterung' },
              src: 'data:text/javascript;charset=utf-8,export%20default%20class%20TestEditorPlugin%20extends%20HTMLElement%20%7B%0D%0A%20%20constructor%20%28%29%20%7B%20super%28%29%3B%20this.innerHTML%20%3D%20%60%3Cp%3ETest%20Editor%20Plugin%3C%2Fp%3E%60%3B%20%7D%0D%0A%7D',
              icon: 'edit',
              active: true,
              requireDoc: true,
            },
            {
              name: 'Test Editor Plugin 2',
              src: 'data:text/javascript;charset=utf-8,export%20default%20class%20TestEditorPlugin2%20extends%20HTMLElement%20%7B%0D%0A%20%20constructor%20%28%29%20%7B%20super%28%29%3B%20this.innerHTML%20%3D%20%60%3Cp%3ETest%20Editor%20Plugin%202%3C%2Fp%3E%60%3B%20%7D%0D%0A%7D',
              icon: 'android',
              active: true,
              requireDoc: false,
            },
            {
              name: 'Test Editor Plugin 3',
              translations: { de: 'Test Editor Erweiterung 3' },
              src: 'data:text/javascript;charset=utf-8,export%20default%20class%20EditorPluginTest3%20extends%20HTMLElement%20%7B%0D%0A%20%20%20%20constructor%20%28%29%20%7B%0D%0A%09%2F%2F%20Create%20a%20shadow%20root%0D%0A%09this.attachShadow%28%7B%20mode%3A%20%22open%22%20%7D%29%3B%20%2F%2F%20sets%20and%20returns%20%27this.shadowRoot%27%0D%0A%0D%0A%09const%20info%20%3D%20wrapper.appendChild%28document.createElement%28%22span%22%29%29%3B%0D%0A%09info.setAttribute%28%22class%22%2C%20%22info%22%29%3B%0D%0A%09%2F%2F%20Take%20attribute%20content%20and%20put%20it%20inside%20the%20info%20span%0D%0A%09info.textContent%20%3D%20this.getAttribute%28%22docName%22%29%20%7C%7C%20%27no%20docName%20Test3%27%3B%0D%0A%0D%0A%09%2F%2F%20attach%20the%20created%20elements%20to%20the%20shadow%20DOM%0D%0A%09this.shadowRoot.append%28style%2C%20info%29%3B%0D%0A%20%20%20%20%7D%0D%0A%7D%3B',
              icon: 'polymer',
              active: true,
              requireDoc: false,
            },
            {
              name: 'Test Editor Plugin 4',
              translations: { de: 'Test Editor Erweiterung 4' },
              src: 'data:text/javascript;charset=utf-8,export%20default%20class%20TestEditorPlugin4%20extends%20HTMLElement%20%7B%0D%0A%20%20constructor%20%28%29%20%7B%20super%28%29%3B%20this.innerHTML%20%3D%20%60%3Cp%3ETest%20Editor%20Plugin%204%3C%2Fp%3E%60%3B%20%7D%0D%0A%7D',
              icon: 'edit',
              active: false,
              requireDoc: true,
            },
          ],
        };
        await editor.updateComplete;
        await editorTabCount(2);
      });

      it('displays editor plugins', async () => {
        await visualDiff(editor, `editor-plugins-${lang}`);
      });

      it('displays more tabs with a doc loaded', async () => {
        editor.dispatchEvent(newOpenEvent(doc, 'test.scd'));
        await editor.updateComplete;
        await editorTabCount(3);
        await timeout(500);
        await visualDiff(editor, `editor-plugins-with-doc-${lang}`);
      });

      it('changes active editor plugin on tab click', async () => {
        editor.shadowRoot
          ?.querySelector<OscdSecondaryTab>('oscd-secondary-tab:nth-of-type(2)')
          ?.click();

        await editor.updateComplete;
        await timeout(120);
        await visualDiff(editor, `editor-plugins-selected-${lang}`);
      });
    });
  }),
);
