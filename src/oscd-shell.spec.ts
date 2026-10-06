import { expect, fixture, fixtureCleanup, waitUntil } from '@open-wc/testing';
import { getFirstTextNodeContent } from '@omicronenergy/oscd-test-utils';

import './oscd-shell.js';

import { OscdTreeItem } from '@omicronenergy/oscd-ui/tree/OscdTreeItem.js';
import type { OscdTree } from '@omicronenergy/oscd-ui/tree/OscdTree.js';
import Sinon from 'sinon';

import { newEditEventV2, newOpenEvent } from '@openscd/oscd-api/utils.js';
import type { OscdShell, ResolvedPlugin } from './oscd-shell.js';

import { cyrb64 } from './foundation.js';
import { Plugin } from '@openscd/oscd-api';
import { EditorPluginsPanel } from './side-panel/editor-plugins-panel.js';
import { OscdMenuItem } from '@omicronenergy/oscd-ui/menu/OscdMenuItem.js';
import {
  isPluginInstanciated,
  registerPlugin,
  waitForAllPluginsToInstantiate,
} from './utils/testing/plugin-helpers.js';
import {
  testMenuPlugin1,
  testMenuPlugin2,
  testEditorPlugin,
  testEditorPlugin2,
  TestBackgroundPlugin,
  TestMenuPlugin1,
} from './utils/testing/test-plugins.js';
import {
  createSclDocument,
  openDocOnShell,
} from './utils/testing/test-doc-helpers.js';

const getIndexOfSelectedEditor = (editorItems: OscdTreeItem[]) => {
  return editorItems.findIndex(
    item => item.closest('.row')?.getAttribute('data-selected') === 'true',
  );
};

describe('OscdShell', () => {
  let oscdShell: OscdShell;
  beforeEach(async () => {
    oscdShell = await fixture<OscdShell>(`<oscd-shell></oscd-shell>`);
    registerPlugin(oscdShell, 'test-background-plugin', TestBackgroundPlugin);
    registerPlugin(oscdShell, 'test-menu-plugin1', TestMenuPlugin1);
  });

  afterEach(() => {
    oscdShell.remove();
    fixtureCleanup();
  });

  describe('with no documents loaded', async () => {
    beforeEach(async () => {
      oscdShell.plugins = {
        menu: [testMenuPlugin1, testMenuPlugin2],
        editor: [testEditorPlugin, testEditorPlugin2],
        background: [
          {
            name: 'Test Background Plugin',
            tagName: 'test-background-plugin',
            icon: 'none',
          },
        ],
      };
      await oscdShell.updateComplete;

      await waitForAllPluginsToInstantiate(oscdShell);
    });

    it('retains declared menu entries and renders a document-independent menu plugin', () => {
      expect(oscdShell.plugins.menu.length).to.equal(2); //ok, they're set on the oscdShell. But that should be it.

      //NOTE: This test relies on the fact that the landing page contains the plugins, so they're searched for in a different way.
      expect(
        oscdShell.shadowRoot?.querySelectorAll('.menu-plugins > *').length,
      ).to.equal(1); //no document loaded, so no menu items should be shown.
    });

    it('resolves, registers and renders the background plugin without a document', () => {
      expect(oscdShell.plugins.background.length).to.equal(1);
      expect(oscdShell._resolvedPlugins.background).to.have.lengthOf(1);
      expect(oscdShell.registry!.get('test-background-plugin') === TestBackgroundPlugin)
        .to.be.true;
      const instances = oscdShell.shadowRoot!.querySelectorAll(
        '.background-plugins > test-background-plugin',
      );
      expect(instances.length).to.equal(1);
      expect(instances[0] instanceof TestBackgroundPlugin).to.be.true;
    });

    it('retains editor definitions without rendering the first editor', () => {
      expect(oscdShell.plugins.editor.length).to.equal(2);

      expect(
        oscdShell.shadowRoot?.querySelector(
          (oscdShell.plugins.editor[0] as ResolvedPlugin).tagName,
        )?.localName,
      ).to.equal(undefined);
    });

    it('does not load the file selector in the app-bar when no document is set', async () => {
      const sclDoc = createSclDocument();
      oscdShell.docs = { 'test.scd': sclDoc };
      oscdShell.docName = '';
      await oscdShell.updateComplete;

      const appBarEnd =
        oscdShell.shadowRoot?.querySelector('[slot="alignEnd"]');
      expect(appBarEnd?.querySelector('files-menu')?.localName).to.equal(undefined);
      expect(appBarEnd?.querySelector('oscd-divider')?.localName).to.equal(undefined);
    });
  });

  describe('with editor plugins loaded', () => {
    let editorPlugin: HTMLElement & Plugin & { editCount: number };
    const sclDoc = createSclDocument();

    beforeEach(async () => {
      oscdShell.dispatchEvent(newOpenEvent(sclDoc, 'test.scd'));

      oscdShell.plugins = {
        menu: [],
        editor: [testEditorPlugin, testEditorPlugin2],
      };
      await oscdShell.updateComplete;

      await waitForAllPluginsToInstantiate(oscdShell);

      await waitUntil(
        () => oscdShell.selectedEditor !== undefined,
        'No editor plugin selected',
      );
      const selectedEditorTagName = oscdShell.selectedEditor!.tagName;
      editorPlugin = oscdShell.shadowRoot?.querySelector(
        selectedEditorTagName,
      ) as HTMLElement & Plugin & { editCount: number };
    });

    it('changes editor plugin when clicking on the editor item', async () => {
      const editorPluginsSidePanel = oscdShell.shadowRoot?.querySelector(
        'editor-plugins-panel',
      ) as EditorPluginsPanel;

      //Pre-checks...
      expect(editorPluginsSidePanel?.localName).to.equal('editor-plugins-panel');

      const editorsTree = editorPluginsSidePanel.shadowRoot?.querySelector(
        'oscd-tree.editors-tree',
      ) as HTMLElement;
      expect(editorsTree?.localName, 'Editor tree did not render')
        .to.equal('oscd-tree');

      const queryEditorItems = () =>
        Array.from(
          editorsTree.shadowRoot?.querySelectorAll('oscd-tree-item') ?? [],
        ) as OscdTreeItem[];

      const editorItems = queryEditorItems();

      //expect there to be two editor entries
      expect(editorItems.length).to.equal(2);

      //expect first item to be selected
      expect(getIndexOfSelectedEditor(editorItems)).to.equal(0);

      expect(
        getFirstTextNodeContent(editorItems[0].querySelector('span')),
      ).to.equal(testEditorPlugin.name);
      expect(
        getFirstTextNodeContent(editorItems[1].querySelector('span')),
      ).to.equal(testEditorPlugin2.name);

      const lastEditorItem = editorItems[editorItems.length - 1];
      expect(lastEditorItem?.localName).to.equal('oscd-tree-item');
      lastEditorItem!.click();

      await oscdShell.updateComplete;

      await waitUntil(
        () =>
          isPluginInstanciated(oscdShell.selectedEditor!.tagName, oscdShell),
        'second editor plugin did not load',
      );

      const secondEditorPluginContent = oscdShell.shadowRoot!.querySelector(
        oscdShell!.selectedEditor!.tagName,
      );
      expect(
        secondEditorPluginContent?.querySelector('p')?.textContent?.trim(),
      ).to.equal('Test Editor Plugin2');
      await waitUntil(
        () => getIndexOfSelectedEditor(queryEditorItems()) === 1,
        'selected editor did not move to second item',
      );
      expect(getIndexOfSelectedEditor(queryEditorItems())).to.equal(1);
    });

    it('places the current editor at the start and file selector at the end of the app bar', async () => {
      const currentEditor = oscdShell.shadowRoot?.querySelector(
        '.current-editor[slot="alignStart"]',
      );
      expect(currentEditor?.textContent).to.contain(
        oscdShell.selectedEditor!.name,
      );
      expect(currentEditor?.querySelector('oscd-divider.vertical')?.localName)
        .to.equal('oscd-divider');

      const appBarEnd =
        oscdShell.shadowRoot?.querySelector('[slot="alignEnd"]');
      expect(appBarEnd?.querySelector('files-menu')?.localName).to.equal('files-menu');
      expect(appBarEnd?.querySelector('oscd-divider.vertical')?.localName)
        .to.equal('oscd-divider');
      expect(
        appBarEnd?.querySelectorAll('oscd-filled-icon-button').length,
      ).to.equal(2);
    });

    it('passes the locale property to the editor plugin', () => {
      expect(editorPlugin.locale).to.equal('en');
    });

    it('has its docName property set', () => {
      expect(editorPlugin.docName).to.equal('test.scd');
    });

    it('has its doc property set', () => {
      expect(editorPlugin.doc === sclDoc).to.be.true;
    });

    it('has its docs property set', () => {
      expect(typeof editorPlugin.docs).to.equal('object');
      expect(editorPlugin.docs['test.scd'] === sclDoc).to.be.true;
    });

    it('passes property docVersion', async () => {
      expect(editorPlugin.docVersion).to.equal(0);
      expect(editorPlugin.editCount).to.equal(0);
    });

    it('increments the editor plugin docVersion and editCount after an edit event', async () => {
      oscdShell.dispatchEvent(
        newEditEventV2({
          element: sclDoc.querySelector('Substation')!,
          attributes: { name: 'someName' },
          attributesNS: {},
        }),
      );
      await oscdShell.updateComplete;

      expect(editorPlugin.docVersion).to.equal(1);
      expect(editorPlugin.editCount).to.equal(1);
    });
  });

  describe('with menu plugins loaded', () => {
    let menuPlugin: HTMLElement & Plugin & { editCount: number };
    beforeEach(async () => {
      oscdShell.plugins = {
        menu: [testMenuPlugin1],
      };
      await oscdShell.updateComplete;
      await waitForAllPluginsToInstantiate(oscdShell);

      menuPlugin = oscdShell.shadowRoot?.querySelector(
        '.off-screen-plugin-container .menu-plugins > *:first-child',
      ) as HTMLElement & Plugin & { editCount: number };
    });

    it('passes the locale property to the menu plugin', () => {
      expect(menuPlugin.locale).to.equal('en');
    });

    describe('with no document loaded', () => {
      it('passes an empty docName to the menu plugin', () => {
        expect(menuPlugin.docName).to.equal('');
      });

      it('passes an undefined doc to the menu plugin', () => {
        expect(menuPlugin.doc === undefined).to.be.true;
      });

      it('passes an empty docs object to the menu plugin', () => {
        expect(typeof menuPlugin.docs).to.equal('object');
        expect(Object.keys(menuPlugin.docs).length).to.equal(0);
      });
    });

    describe('with a document loaded', async () => {
      let doc: XMLDocument;
      beforeEach(async () => {
        doc = createSclDocument();
        oscdShell.dispatchEvent(newOpenEvent(doc, 'test.scd'));
        await oscdShell.updateComplete;
        menuPlugin = oscdShell.shadowRoot?.querySelector(
          '.off-screen-plugin-container .menu-plugins > *:first-child',
        ) as HTMLElement & Plugin & { editCount: number };
      });

      it('has its docName property set', () => {
        expect(menuPlugin.docName).to.equal('test.scd');
      });

      it('has its doc property set', () => {
        expect(menuPlugin.doc === doc).to.be.true;
      });

      it('has its docs property set', () => {
        expect(typeof menuPlugin.docs).to.equal('object');
        expect(menuPlugin.docs['test.scd'] === doc).to.be.true;
      });

      it('passes property docVersion', () => {
        expect(menuPlugin.docVersion).to.equal(0);
        expect(menuPlugin.editCount).to.equal(0);
      });

      it('increments the menu plugin docVersion and editCount after an edit event', async () => {
        // const doc = createSclDocument();
        // oscdShell.dispatchEvent(newOpenEvent(doc, 'test.scd'));
        await oscdShell.updateComplete;

        oscdShell.dispatchEvent(
          newEditEventV2({
            element: doc.querySelector('testdoc')!,
            attributes: { name: 'someName' },
            attributesNS: {},
          }),
        );
        await oscdShell.updateComplete;

        expect(menuPlugin.docVersion).to.equal(1);
        expect(menuPlugin.editCount).to.equal(1);
      });
    });
  });

  describe('Custom plugins', () => {
    let sclDoc: XMLDocument;
    beforeEach(async () => {
      sclDoc = createSclDocument();
      openDocOnShell(oscdShell, 'test.scd', sclDoc);
      oscdShell.plugins = {
        menu: [testMenuPlugin1],
        editor: [testEditorPlugin],
      };
      await oscdShell.updateComplete;

      await waitUntil(
        () =>
          oscdShell.pluginsMenu.shadowRoot?.querySelectorAll('oscd-menu-item')
            .length === 1,
        `Custom Menu Plugin "${testMenuPlugin1.name}" did not load`,
      );
    });

    it('executes the plugin upon menu item click', async () => {
      const node = oscdShell.doc.querySelector('Substation')!;
      oscdShell.dispatchEvent(newEditEventV2({ node }));
      await oscdShell.updateComplete;
      expect(sclDoc.querySelector('Substation') === null).to.be.true;

      oscdShell.pluginsMenu.open();
      await oscdShell.pluginsMenu.updateComplete;

      const pluginMenuItem = oscdShell.pluginsMenu.shadowRoot?.querySelectorAll(
        'oscd-menu-item',
      )[0] as OscdMenuItem;
      expect(pluginMenuItem?.localName).to.equal('oscd-menu-item');
      expect(pluginMenuItem.disabled).to.be.false;
      pluginMenuItem?.click();
      await oscdShell.updateComplete;
      expect(sclDoc.querySelector('Substation')?.localName).to.equal('Substation');
    });

    it('does not redefine a source-derived tag already registered in the shell scoped registry', async () => {
      const customEditorPlugin = {
        name: 'Test 123 Editor Plugin',
        src: 'data:text/javascript;charset=utf-8,export%20default%20class%20TestEditorPlugin%20extends%20HTMLElement%20%7B%0D%0A%20%20constructor%20%28%29%20%7B%20super%28%29%3B%20this.innerHTML%20%3D%20%60%3Cp%3ETest123%20Editor%20Plugin%3C%2Fp%3E%60%3B%20%7D%0D%0A%7D',
        icon: 'edit',
        requireDoc: false,
      };

      const customEditorPluginTagName = `oscd-p${cyrb64(customEditorPlugin.src)}`;

      registerPlugin(
        oscdShell,
        customEditorPluginTagName,
        class extends HTMLElement {},
      );

      expect(oscdShell.registry).not.to.be.undefined;
      const customElementDefineSpy =
        oscdShell.registry?.define && Sinon.spy(oscdShell.registry, 'define');

      oscdShell.plugins = { menu: [], editor: [customEditorPlugin] };
      await oscdShell.updateComplete;

      expect(customElementDefineSpy!.called).to.be.false;
    });
  });

  describe('localization', () => {
    const untranslatedEditor = {
      ...testEditorPlugin2,
      translations: undefined,
    };

    const getEditorLabels = async () => {
      await oscdShell.updateComplete;
      await oscdShell.editorPluginsPanel.updateComplete;
      const editorsTree =
        oscdShell.editorPluginsPanel.shadowRoot!.querySelector<OscdTree>(
          'oscd-tree.editors-tree',
        )!;
      expect(editorsTree?.localName, 'Editor tree did not render')
        .to.equal('oscd-tree');
      await editorsTree.updateComplete;
      return Array.from(
        editorsTree.shadowRoot!.querySelectorAll(
          'oscd-tree-item > span[slot="headline"]',
        ),
      ).map(label => label.textContent?.trim());
    };

    beforeEach(async () => {
      const sclDoc = createSclDocument();
      openDocOnShell(oscdShell, 'test.scd', sclDoc);
      oscdShell.plugins = {
        menu: [testMenuPlugin1],
        editor: [testEditorPlugin, untranslatedEditor],
      };
      await oscdShell.updateComplete;

      await waitForAllPluginsToInstantiate(oscdShell);

      await oscdShell.pluginsMenu.updateComplete;
      const menuItemStrings = Array.from(
        oscdShell.pluginsMenu.shadowRoot!.querySelectorAll(
          "oscd-menu-item > div[slot='headline']",
        ),
      ).map(label => label.textContent?.trim());
      expect(menuItemStrings).to.deep.equal([testMenuPlugin1.name]);

      expect(await getEditorLabels()).to.deep.equal([
        testEditorPlugin.name,
        untranslatedEditor.name,
      ]);

      // we only change the locale after waiting for the plugins to load and getting their default strings
      oscdShell.locale = 'de';
      await waitUntil(
        () => oscdShell.locale === 'de',
        'Locale failed to change',
      );
    });

    afterEach(async () => {
      // reset to en so we can find the loaded plugins by their name
      oscdShell.locale = 'en';
      await oscdShell.updateComplete;
    });

    it('renders the German menu plugin label after switching locale', async () => {
      await oscdShell.updateComplete;
      await oscdShell.pluginsMenu.updateComplete;
      const labels = Array.from(
        oscdShell.pluginsMenu.shadowRoot!.querySelectorAll(
          "oscd-menu-item > div[slot='headline']",
        ),
      ).map(label => label.textContent?.trim());

      expect(labels).to.deep.equal([testMenuPlugin1.translations.de]);
    });

    it('renders the German editor label and falls back to the name for an untranslated editor', async () => {
      expect(await getEditorLabels()).to.deep.equal([
        testEditorPlugin.translations.de,
        untranslatedEditor.name,
      ]);
    });

    it('keeps the shell locale English when an unsupported locale is requested', async () => {
      oscdShell.locale = 'en';
      // @ts-expect-error we want to test a non-existing locale
      oscdShell.locale = 'xx';
      await waitUntil(
        () => oscdShell.locale === 'en',
        'Locale failed to change',
      );
      expect(oscdShell.locale).to.equal('en');
    });
  });
});
