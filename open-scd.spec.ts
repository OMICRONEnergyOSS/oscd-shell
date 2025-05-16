import { expect, waitUntil } from '@open-wc/testing';

import './open-scd.js';

import Sinon from 'sinon';

import type { OpenSCD } from './open-scd.js';

import { cyrb64, newEditEvent, newOpenEvent } from './foundation.js';
import { util } from './open-scd.editing.spec.js';

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
  active: true,
  requireDoc: false,
};

const testEditorPlugin = {
  name: 'Test Editor Plugin',
  translations: { de: 'Test Editor Erweiterung' },
  src: 'data:text/javascript;charset=utf-8,export%20default%20class%20TestEditorPlugin%20extends%20HTMLElement%20%7B%0D%0A%20%20constructor%20%28%29%20%7B%20super%28%29%3B%20this.innerHTML%20%3D%20%60%3Cp%3ETest%20Editor%20Plugin%3C%2Fp%3E%60%3B%20%7D%0D%0A%7D',
  icon: 'edit',
  active: true,
  requireDoc: false,
};

let editor: OpenSCD;
beforeEach(() => {
  editor = document.createElement('open-scd');
  document.body.prepend(editor);
});

afterEach(() => {
  editor.remove();
});

describe('with editor plugins loaded', () => {
  beforeEach(async () => {
    editor.plugins = {
      menu: [],
      editor: [testEditorPlugin],
    };
    await editor.updateComplete;

    await waitUntil(() => {
      const pluginTab = editor?.shadowRoot?.querySelector(
        `mwc-tab[label="${testEditorPlugin.name}"]`,
      );
      return !!pluginTab;
    }, 'Custom Plugin did not load');
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

  it('passes property editCount', async () => {
    editor.dispatchEvent(newOpenEvent(doc, 'test.scd'));
    await editor.updateComplete;

    const plugin = editor.shadowRoot?.querySelector('*[docname="test.scd"]');
    expect(plugin).to.have.property('editCount', 0);
  });

  it('updated passed editCount property on edit events', async () => {
    editor.dispatchEvent(newOpenEvent(doc, 'test.scd'));
    await editor.updateComplete;

    editor.dispatchEvent(
      newEditEvent({
        element: doc.querySelector('testdoc')!,
        attributes: { name: 'someName' },
      }),
    );
    await editor.updateComplete;

    const plugin = editor.shadowRoot?.querySelector('*[docname="test.scd"]');
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
        util.querySelectorWithTextContent(
          editor.menuUI,
          'mwc-list-item > span',
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

  it('passes property editCount', async () => {
    editor.dispatchEvent(newOpenEvent(doc, 'test.scd'));
    await editor.updateComplete;

    const plugin = editor.shadowRoot?.querySelector('*[docname="test.scd"]');
    expect(plugin).to.have.property('editCount', 0);
  });

  it('updated passed editCount property on edit events', async () => {
    editor.dispatchEvent(newOpenEvent(doc, 'test.scd'));
    await editor.updateComplete;

    editor.dispatchEvent(
      newEditEvent({
        element: doc.querySelector('testdoc')!,
        attributes: { name: 'someName' },
      }),
    );
    await editor.updateComplete;

    const plugin = editor.shadowRoot?.querySelector('*[docname="test.scd"]');
    expect(plugin).to.have.property('editCount', 1);
  });
});

describe('Custom plugins', () => {
  beforeEach(async () => {
    editor.plugins = {
      menu: [testMenuPlugin],
    };
    await editor.updateComplete;

    await waitUntil(
      () =>
        util.querySelectorWithTextContent(
          editor.menuUI,
          'mwc-list-item > span',
          testMenuPlugin.name,
        ),
      'Custom Plugin did not load',
    );
  });

  it('executes the plugin upon menu item click', async () => {
    const sclDoc = new DOMParser().parseFromString(
      util.sclDocString,
      'application/xml',
    );
    editor.dispatchEvent(newOpenEvent(sclDoc, 'test.scd'));
    await editor.updateComplete;
    const node = editor.doc.querySelector('Substation')!;
    editor.dispatchEvent(newEditEvent({ node }));
    await editor.updateComplete;
    expect(sclDoc.querySelector('Substation')).to.not.exist;

    editor.menuUI.opened = true;
    await editor.menuUI.updateComplete;
    const pluginMenuItem = util
      .querySelectorWithTextContent(
        editor.menuUI,
        'mwc-list-item > span',
        'Test Undo Menu Plugin',
      )
      ?.closest('mwc-list-item') as HTMLLIElement;
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
      active: true,
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

  let logDialogStrings = {
    title: '',
    message: '',
    undo: '',
    redo: '',
    close: '',
  };

  beforeEach(async () => {
    editor.plugins = {
      menu: [testMenuPlugin],
      editor: [testEditorPlugin],
    };
    await editor.updateComplete;
    await waitUntil(
      () =>
        util.querySelectorWithTextContent(
          editor.menuUI,
          'mwc-list-item > span',
          testMenuPlugin.name,
        ),
      'Custom menu plugin did not load',
    );
    await waitUntil(() => {
      const pluginTab = editor?.shadowRoot?.querySelector(
        `mwc-tab[label="${testEditorPlugin.name}"]`,
      );
      return !!pluginTab;
    }, 'Custom editor plugin did not load');

    menuItemStrings = Array.from(
      editor.menuUI.querySelectorAll('mwc-list-item > span'),
    ).map((span: Element) => span.textContent?.trim() || '');

    editorTabStrings = Array.from(
      editor?.shadowRoot?.querySelectorAll('mwc-tab') || [],
    ).map((tab: Element) => tab.getAttribute('label')?.trim() || '');

    logDialogStrings = {
      title: editor.logUI.shadowRoot?.querySelector('h2')?.textContent || '',
      message:
        editor.logUI.querySelector('mwc-list-item > span')?.textContent || '',
      undo:
        editor.logUI
          .querySelector('mwc-button[icon="undo"]')
          ?.getAttribute('label') || '',
      redo:
        editor.logUI
          .querySelector('mwc-button[icon="redo"]')
          ?.getAttribute('label') || '',
      close:
        editor.logUI.querySelector('mwc-button[dialogAction="close"]')
          ?.textContent || '',
    };

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
      editor.menuUI.querySelectorAll('mwc-list-item > span'),
    )
      .map((span: Element) => span.textContent?.trim() || '')
      .filter((text: string) => menuItemStrings.includes(text));

    expect(untranslatedStrings).to.be.empty;
  });

  it('the editor plugin appears in german', () => {
    const untranslatedStrings = Array.from(
      editor.shadowRoot?.querySelectorAll('mwc-tab') || [],
    )
      .map((span: Element) => span.textContent?.trim() || '')
      .filter((text: string) => editorTabStrings.includes(text));

    expect(untranslatedStrings).to.be.empty;
  });

  it('the log dialog appears in german', () => {
    const localizedStrings = {
      title: editor.logUI.shadowRoot?.querySelector('h2')?.textContent || '',
      message:
        editor.logUI.querySelector('mwc-list-item > span')?.textContent || '',
      undo:
        editor.logUI
          .querySelector('mwc-button[icon="undo"]')
          ?.getAttribute('label') || '',
      redo:
        editor.logUI
          .querySelector('mwc-button[icon="redo"]')
          ?.getAttribute('label') || '',
      close:
        editor.logUI.querySelector('mwc-button[dialogAction="close"]')
          ?.textContent || '',
    };

    expect(localizedStrings).not.to.deep.equal(logDialogStrings);
  });

  it('it remains in english after attempting to load a non-existing locale', async () => {
    editor.locale = 'en';
    // @ts-ignore
    editor.locale = 'xx';
    await waitUntil(() => editor.locale === 'en', 'Locale failed to change');
    expect(editor.locale).to.equal('en');
  });
});
