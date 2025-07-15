import { expect, waitUntil } from '@open-wc/testing';
import {
  getFirstTextNodeContent,
  querySelectorContainingText,
} from '@omicronenergy/oscd-test-utils/queries.js';

import { sclDocString } from '@omicronenergy/oscd-test-utils/scl-sample-docs.js';

import './oscd-shell.js';

import { OscdListItem } from '@omicronenergy/oscd-ui/list/OscdListItem.js';
import { OscdTabs } from '@omicronenergy/oscd-ui/tabs/OscdTabs.js';
import Sinon from 'sinon';

import { OscdSecondaryTab } from '@omicronenergy/oscd-ui/tabs/OscdSecondaryTab.js';

import { newEditEventV2, newOpenEvent } from '@omicronenergy/oscd-api/utils.js';
import type { OpenSCD } from './oscd-shell.js';

import { cyrb64 } from './foundation.js';

function isOscdPlugin(tag: string): boolean {
  return tag.toLocaleLowerCase().startsWith('oscd-p');
}

const doc = new DOMParser().parseFromString(
  `<testdoc></testdoc>`,
  'application/xml',
);

const testMenuPlugin = {
  name: 'Test Undo Menu Plugin',
  translations: { de: 'Test Rückgängig-Menü-Plugin' },
  src: 'data:text/javascript;charset=utf-8,export%20default%20class%20TestPlugin%20extends%20HTMLElement%20%7B%0D%0A%20%20async%20run()%20%7B%0D%0A%20%20const%20editor%20=%20(this.getRootNode()).host;%20%0D%0A%20editor.undo();%0D%0A%20return%20true;%0D%0A%20%20%7D%0D%0A%7D',
  icon: 'undo',
  requireDoc: false,
};

const testEditorPlugin = {
  name: 'Test Editor Plugin',
  translations: { de: 'Test Editor Erweiterung' },
  src: 'data:text/javascript;charset=utf-8,export%20default%20class%20TestEditorPlugin%20extends%20HTMLElement%20%7B%0D%0A%20%20constructor%20%28%29%20%7B%20super%28%29%3B%20this.innerHTML%20%3D%20%60%3Cp%3ETest%20Editor%20Plugin%3C%2Fp%3E%60%3B%20%7D%0D%0A%7D',
  icon: 'edit',
  requireDoc: false,
};
const testEditorPlugin2 = {
  name: 'Test Editor Plugin 2',
  translations: { de: 'Test Editor Erweiterung 2' },
  src: 'data:text/javascript;charset=utf-8,export%20default%20class%20TestEditorPlugin2%20extends%20HTMLElement%20%7B%0D%0A%20%20constructor%20%28%29%20%7B%20super%28%29%3B%20this.innerHTML%20%3D%20%60%3Cp%3ETest%20Editor%20Plugin2%3C%2Fp%3E%60%3B%20%7D%0D%0A%7D',
  icon: 'edit',
  requireDoc: false,
};

let editor: OpenSCD;
beforeEach(() => {
  editor = document.createElement('oscd-shell');
  document.body.prepend(editor);
});

afterEach(() => {
  editor.remove();
});

describe('with editor plugins loaded', () => {
  beforeEach(async () => {
    editor.plugins = {
      menu: [],
      editor: [testEditorPlugin, testEditorPlugin2],
    };
    await editor.updateComplete;

    await waitUntil(
      () =>
        editor.shadowRoot!.querySelectorAll('oscd-secondary-tab').length === 2,
      'Custom Plugin did not load',
    );
  });

  it('changes editor plugin when clicking on the editor tab', async () => {
    const editorTabBar = editor.shadowRoot?.querySelector(
      'oscd-tabs',
    ) as OscdTabs;
    expect(editorTabBar).to.exist;
    expect(editorTabBar.activeTabIndex).to.equal(0);
    expect(editorTabBar.querySelectorAll('oscd-secondary-tab').length).to.equal(
      2,
    );
    const tabs =
      editorTabBar.querySelectorAll<OscdSecondaryTab>('oscd-secondary-tab');
    expect(getFirstTextNodeContent(tabs[0])).to.equal(testEditorPlugin.name);
    expect(getFirstTextNodeContent(tabs[1])).to.equal(testEditorPlugin2.name);

    const lastTab = editorTabBar.querySelectorAll(
      'oscd-secondary-tab:last-child',
    )[0] as OscdSecondaryTab;
    expect(lastTab).to.exist;
    lastTab!.click();

    await editor.updateComplete;
    await waitUntil(
      () => editor.shadowRoot!.querySelector(editor!.editor),
      'second editor plugin did not load',
    );
    const secondEditorPluginContent = editor.shadowRoot!.querySelector(
      editor!.editor,
    );
    expect(
      secondEditorPluginContent?.querySelector('p')?.textContent?.trim(),
    ).to.equal('Test Editor Plugin2');
    expect(editorTabBar.activeTabIndex).to.equal(1);
  });

  it('passes attribute locale', () => {
    const plugin = editor.shadowRoot?.querySelector('*[locale="en"]');
    expect(plugin?.tagName).to.exist.and.to.satisfy(isOscdPlugin);
  });

  it('passes attribute docname', async () => {
    editor.dispatchEvent(newOpenEvent(doc, 'test.scd'));
    await editor.updateComplete;

    const plugin = editor.shadowRoot?.querySelector('*[docName="test.scd"]');
    expect(plugin?.tagName).to.exist.and.to.satisfy(isOscdPlugin);
  });

  it('passes property doc', async () => {
    editor.dispatchEvent(newOpenEvent(doc, 'test.scd'));
    await editor.updateComplete;

    const plugin = editor.shadowRoot?.querySelector('*[docname="test.scd"]');
    expect(plugin).to.have.property('docs');
  });

  it('passes property stateVersion', async () => {
    editor.dispatchEvent(newOpenEvent(doc, 'test.scd'));
    await editor.updateComplete;

    const plugin = editor.shadowRoot?.querySelector('*[docname="test.scd"]');
    expect(plugin).to.have.property('stateVersion', 0);
    expect(plugin).to.have.property('editCount', 0);
  });

  it('updated passed stateVersion property on edit events', async () => {
    editor.dispatchEvent(newOpenEvent(doc, 'test.scd'));
    await editor.updateComplete;

    editor.dispatchEvent(
      newEditEventV2({
        element: doc.querySelector('testdoc')!,
        attributes: { name: 'someName' },
        attributesNS: {},
      }),
    );
    await editor.updateComplete;

    const plugin = editor.shadowRoot?.querySelector('*[docname="test.scd"]');
    expect(plugin).to.have.property('stateVersion', 1);
    expect(plugin).to.have.property('editCount', 1);
  });
});

describe('with menu plugins loaded', () => {
  beforeEach(async () => {
    editor.plugins = {
      menu: [testMenuPlugin],
    };
    await editor.updateComplete;
    await waitUntil(
      () =>
        querySelectorContainingText(
          editor.menuUI,
          'oscd-list-item > span',
          testMenuPlugin.name,
        ),
      'Custom Plugin did not load',
    );
  });

  it('passes attribute locale', () => {
    const plugin = editor.shadowRoot?.querySelector('*[locale="en"]');
    expect(plugin?.tagName).to.exist.and.to.satisfy(isOscdPlugin);
  });

  it('passes attribute docname', async () => {
    editor.dispatchEvent(newOpenEvent(doc, 'test.scd'));
    await editor.updateComplete;

    const plugin = editor.shadowRoot?.querySelector('*[docName="test.scd"]');
    expect(plugin?.tagName).to.exist.and.to.satisfy(isOscdPlugin);
  });

  it('passes property doc', async () => {
    editor.dispatchEvent(newOpenEvent(doc, 'test.scd'));
    await editor.updateComplete;

    const plugin = editor.shadowRoot?.querySelector('*[docname="test.scd"]');
    expect(plugin).to.have.property('docs');
  });

  it('passes property stateVersion', async () => {
    editor.dispatchEvent(newOpenEvent(doc, 'test.scd'));
    await editor.updateComplete;

    const plugin = editor.shadowRoot?.querySelector('*[docname="test.scd"]');
    expect(plugin).to.have.property('stateVersion', 0);
    expect(plugin).to.have.property('editCount', 0);
  });

  it('updated passed stateVersion property on edit events', async () => {
    editor.dispatchEvent(newOpenEvent(doc, 'test.scd'));
    await editor.updateComplete;

    editor.dispatchEvent(
      newEditEventV2({
        element: doc.querySelector('testdoc')!,
        attributes: { name: 'someName' },
        attributesNS: {},
      }),
    );
    await editor.updateComplete;

    const plugin = editor.shadowRoot?.querySelector('*[docname="test.scd"]');
    expect(plugin).to.have.property('stateVersion', 1);
    expect(plugin).to.have.property('editCount', 1);
  });
});

describe('Custom plugins', () => {
  beforeEach(async () => {
    editor.plugins = {
      menu: [testMenuPlugin],
      editor: [testEditorPlugin],
    };
    await editor.updateComplete;

    await waitUntil(
      () =>
        querySelectorContainingText(
          editor.menuUI,
          'oscd-list-item > span',
          testMenuPlugin.name,
        ),
      'Custom Plugin did not load',
    );
  });

  it('executes the plugin upon menu item click', async () => {
    const sclDoc = new DOMParser().parseFromString(
      sclDocString,
      'application/xml',
    );
    editor.dispatchEvent(newOpenEvent(sclDoc, 'test.scd'));
    await editor.updateComplete;
    const node = editor.doc.querySelector('Substation')!;
    editor.dispatchEvent(newEditEventV2({ node }));
    await editor.updateComplete;
    expect(sclDoc.querySelector('Substation')).to.not.exist;

    editor.menuUI.opened = true;
    await editor.menuUI.updateComplete;
    const pluginMenuItem = querySelectorContainingText(
      editor.menuUI,
      'oscd-list-item > span',
      'Test Undo Menu Plugin',
    )?.closest('oscd-list-item') as OscdListItem;
    expect(pluginMenuItem).to.exist;
    expect(pluginMenuItem).to.have.property('disabled', false);
    pluginMenuItem?.click();
    await editor.updateComplete;
    expect(sclDoc.querySelector('Substation')).to.exist;
  });

  it('does not attempt to call customElements.define if the plugin has already been defined', async () => {
    const customEditorPlugin = {
      name: 'Test 123 Editor Plugin',
      src: 'data:text/javascript;charset=utf-8,export%20default%20class%20TestEditorPlugin%20extends%20HTMLElement%20%7B%0D%0A%20%20constructor%20%28%29%20%7B%20super%28%29%3B%20this.innerHTML%20%3D%20%60%3Cp%3ETest123%20Editor%20Plugin%3C%2Fp%3E%60%3B%20%7D%0D%0A%7D',
      icon: 'edit',
      requireDoc: false,
    };

    const customEditorPluginTagName = `oscd-p${cyrb64(customEditorPlugin.src)}`;

    customElements.define(
      customEditorPluginTagName,
      class extends HTMLElement {},
    );

    const customElementDefineSpy = Sinon.spy(window.customElements, 'define');

    editor.plugins = { menu: [], editor: [customEditorPlugin] };
    await editor.updateComplete;

    expect(customElementDefineSpy.called).to.be.false;
  });

  it('does not allow the loading of a duplicate plugin', async () => {
    const { menu } = editor.plugins;
    const currentMenuPluginCount = editor.loadedPlugins.menu.length;
    editor.plugins = {
      menu: [...menu, ...menu],
      editor: [],
    };
    await editor.updateComplete;
    expect(editor.loadedPlugins.menu.length).to.equal(currentMenuPluginCount);
  });
});

describe('localization', () => {
  let menuItemStrings: string[] = [];
  let editorTabStrings: string[] = [];

  beforeEach(async () => {
    editor.plugins = {
      menu: [testMenuPlugin],
      editor: [testEditorPlugin],
    };
    await editor.updateComplete;
    await waitUntil(
      () =>
        querySelectorContainingText(
          editor.menuUI,
          'oscd-list-item > span',
          testMenuPlugin.name,
        ),
      `Custom menu plugin (${testMenuPlugin.name}) did not load`,
    );
    await waitUntil(
      () =>
        querySelectorContainingText(
          editor.shadowRoot!.querySelector('oscd-tabs')!,
          'oscd-secondary-tab',
          testEditorPlugin.name,
        ),
      `Custom editor plugin (${testEditorPlugin.name}) did not load`,
    );

    menuItemStrings = Array.from(
      editor.menuUI.querySelectorAll('oscd-list-item > span'),
    ).map((span: Element) => span.textContent?.trim() || '');

    editorTabStrings = Array.from(
      editor?.shadowRoot?.querySelectorAll('oscd-secondary-tab') || [],
    ).map(
      (tab: Element) =>
        Array.from(tab.childNodes)
          .filter(node => node.nodeType === Node.TEXT_NODE)
          .map(node => node.textContent?.trim() ?? '')[0] || '',
    );

    // we only change the locale after waiting for the plugins to load and getting their default strings
    editor.locale = 'de';
    await waitUntil(() => editor.locale === 'de', 'Locale failed to change');
  });

  afterEach(async () => {
    // reset to en so we can find the loaded plugins by their name
    editor.locale = 'en';
    await editor.updateComplete;
  });

  it('the menu items appear in german', () => {
    const untranslatedStrings = Array.from(
      editor.menuUI.querySelectorAll('oscd-list-item > span'),
    )
      .map((span: Element) => span.textContent?.trim() || '')
      .filter((text: string) => menuItemStrings.includes(text));

    expect(untranslatedStrings).to.be.empty;
  });

  it('the editor plugin appears in german', () => {
    const untranslatedStrings = Array.from(
      editor.shadowRoot?.querySelectorAll('oscd-secondary-tab') || [],
    )
      .map((span: Element) => span.textContent?.trim() || '')
      .filter((text: string) => editorTabStrings.includes(text));

    expect(untranslatedStrings).to.be.empty;
  });

  it('it remains in english after attempting to load a non-existing locale', async () => {
    editor.locale = 'en';
    // @ts-ignore
    editor.locale = 'xx';
    await waitUntil(() => editor.locale === 'en', 'Locale failed to change');
    expect(editor.locale).to.equal('en');
  });
});
