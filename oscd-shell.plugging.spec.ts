/* eslint-disable max-classes-per-file */
import { expect, fixture, waitUntil } from '@open-wc/testing';

import { html } from 'lit';

import './oscd-shell.js';
import sinon from 'sinon';
import type { OpenSCD, Plugin } from './oscd-shell.js';

customElements.define(
  'test-menu-plugin1',
  class TestMenuPlugin1 extends HTMLElement {
    async run() {
      return !!this;
    }
  },
);

customElements.define(
  'test-background-plugin',
  class TestBackgroundPlugin extends HTMLElement {
    constructor() {
      super();
      document.addEventListener('test-tx', event => {
        document.dispatchEvent(
          new CustomEvent('test-rx', {
            detail: (event as CustomEvent).detail,
          }),
        );
      });
    }
  },
);

const isPluginLoaded = (editor: OpenSCD, plugin: Plugin): boolean =>
  !!customElements.get(plugin.tagName) &&
  !!editor.shadowRoot?.querySelector(plugin.tagName);

const waitForPlugin = async (editor: OpenSCD, plugin: Plugin): Promise<void> =>
  waitUntil(
    () => isPluginLoaded(editor, plugin),
    `Plugin: "${plugin.name}" <${plugin.tagName}> failed to load. CustomElements Registry: ${customElements.get(plugin.tagName) ? 'Found' : 'Missing'}, DOM: ${editor.shadowRoot?.querySelector(plugin.tagName) ? 'Found' : 'Missing'}`,
  );

const waitForPluginsToLoad = async (oscdShell: OpenSCD) => {
  const allPlugins = Object.values(oscdShell.plugins).flat();
  await Promise.all(allPlugins.map(plugin => waitForPlugin(oscdShell, plugin)));
};

const sampleMenuPlugins: (Omit<Plugin, 'tagName'> & {
  tagName?: string;
  src?: string;
})[] = [
  {
    name: 'Test Menu Plugin',
    translations: { de: 'Test Menu Erweiterung' },
    tagName: 'test-menu-plugin1',
    icon: 'margin',
    requireDoc: false,
  },
  {
    name: 'Test Menu Plugin 2',
    src: 'data:text/javascript;charset=utf-8,export%20default%20class%20TestStrMenuPlugin2%20extends%20HTMLElement%20%7B%0D%0A%20%20async%20run%28%29%20%7B%0D%0A%20%20%20%20return%20true%3B%0D%0A%20%20%7D%0D%0A%7D',
    icon: 'margin',
    requireDoc: false,
  },
  {
    name: 'Test Menu Plugin 3',
    src: 'data:text/javascript;charset=utf-8,export%20default%20class%20TestStrMenuPlugin3%20extends%20HTMLElement%20%7B%0D%0A%20%20async%20run%28%29%20%7B%0D%0A%20%20%20%20return%20true%3B%0D%0A%20%20%7D%0D%0A%7D',
    icon: 'margin',
    requireDoc: false,
  },
];

describe('OscdShell Plugin Handling', () => {
  let oscdShell: OpenSCD;

  beforeEach(async () => {
    oscdShell = await fixture(html`<oscd-shell></oscd-shell>`);
    oscdShell.plugins = {
      menu: sampleMenuPlugins,
      background: [
        {
          name: 'Background Plugin',
          tagName: 'test-background-plugin',
          icon: 'none',
        },
      ],
    };
    await oscdShell.updateComplete;
    await waitForPluginsToLoad(oscdShell);
  });

  it('loads menu plugins', () => {
    expect(oscdShell).property('plugins').property('menu').to.have.lengthOf(3);
  });

  it('loads background plugins', () => {
    expect(oscdShell)
      .property('plugins')
      .property('background')
      .to.have.lengthOf(1);
  });

  it('background plugins do something', async () => {
    // Use a real event listener and a Promise to avoid timing issues
    const eventPromise = new Promise<CustomEvent>(resolve => {
      document.addEventListener(
        'test-rx',
        (e: Event) => resolve(e as CustomEvent),
        { once: true },
      );
    });
    const testValue = crypto.randomUUID();
    document.dispatchEvent(new CustomEvent('test-tx', { detail: testValue }));

    const event = await eventPromise;
    expect(event.detail).to.equal(testValue);
  });

  it('loading the same plugins twice does not result in duplicates', () => {
    oscdShell.plugins = {
      menu: sampleMenuPlugins,
    };
    expect(oscdShell).property('plugins').property('menu').to.have.lengthOf(3);
    oscdShell.plugins = {
      menu: sampleMenuPlugins,
    };
    expect(oscdShell).property('plugins').property('menu').to.have.lengthOf(3);
  });

  it('loads editor plugins', async () => {
    oscdShell.plugins = {
      editor: [
        {
          name: 'Test Editor Plugin',
          translations: { de: 'Test Editor Erweiterung' },
          src: 'data:text/javascript;charset=utf-8,export%20default%20class%20TestEditorPlugin%20extends%20HTMLElement%20%7B%0D%0A%20%20constructor%20%28%29%20%7B%20super%28%29%3B%20this.innerHTML%20%3D%20%60%3Cp%3ETest%20Editor%20Plugin%3C%2Fp%3E%60%3B%20%7D%0D%0A%7D',
          icon: 'coronavirus',
        },
        {
          name: 'Test Editor Plugin 2',
          src: 'data:text/javascript;charset=utf-8,export%20default%20class%20TestEditorPlugin%20extends%20HTMLElement%20%7B%0D%0A%20%20constructor%20%28%29%20%7B%20super%28%29%3B%20this.innerHTML%20%3D%20%60%3Cp%3ETest%20Editor%20Plugin%3C%2Fp%3E%60%3B%20%7D%0D%0A%7D',
          icon: 'coronavirus',
        },
      ],
    };
    await oscdShell.updateComplete;
    expect(oscdShell)
      .property('plugins')
      .property('editor')
      .to.have.lengthOf(2);
  });

  it('ignores plugins with no tagName or src', async () => {
    oscdShell.plugins = {
      editor: [
        {
          name: 'Tagless, Sourceless, Hopeless Plugin',
          icon: 'coronavirus',
        },
      ],
    };
    await oscdShell.updateComplete;
    expect(oscdShell)
      .property('plugins')
      .property('editor')
      .to.have.lengthOf(0);
  });

  it('ignores invalid SourcePlugins', async () => {
    oscdShell.plugins = {
      background: [
        {
          src: 'test-background-plugin',
        },
      ],
    };
    await oscdShell.updateComplete;
    expect(oscdShell)
      .property('plugins')
      .property('background')
      .to.have.lengthOf(0);
  });

  it('ignores plugins missing a few fields', async () => {
    oscdShell.plugins = {
      background: [
        {
          tagName: 'test-background-plugin',
        },
      ],
    };
    await oscdShell.updateComplete;
    expect(oscdShell)
      .property('plugins')
      .property('background')
      .to.have.lengthOf(0);
  });

  describe('shows an error plugin inplace of corrupted src plugins', () => {
    let alertStub: sinon.SinonStub;

    beforeEach(async () => {
      alertStub = sinon.stub(window, 'alert');
      oscdShell.plugins = {
        menu: [
          {
            name: 'malformed menu plugin',
            icon: 'none',
            src: 'data:text/javascript;charset=utf-8,export bad menu',
          },
        ],
        editor: [
          {
            name: 'malformed editor plugin',
            icon: 'none',
            src: 'data:text/javascript;charset=utf-8,export bad editor',
          },
        ],
      };
      await waitForPluginsToLoad(oscdShell);
    });

    afterEach(() => {
      alertStub.restore();
    });

    it('should replace the corrupted menu plugins wc with the Error WC', async () => {
      const { menu } = oscdShell.plugins;
      expect(menu).to.have.lengthOf(1);
      const menuPluginElement = oscdShell.shadowRoot?.querySelector(
        menu[0].tagName,
      ) as HTMLElement & {
        run: () => Promise<void>;
      };
      expect(menuPluginElement, 'Menu Plugin Element').to.exist;
      // lets trigger the menu plugin to verfiy it triggers a native window.alert
      await menuPluginElement.run();
      await oscdShell.updateComplete;

      expect(alertStub.called).to.be.true;
      const alertCalls = alertStub.getCalls().map(call => call.args[0]);
      expect(alertCalls.some(msg => msg.includes('Error'))).to.be.true;
    });

    it('should replace the corrupted editor plugins wc with the Error WC', () => {
      const { editor } = oscdShell.plugins;
      expect(editor).to.have.lengthOf(1);
      const editorPluginElement = oscdShell.shadowRoot?.querySelector(
        editor[0].tagName,
      );
      expect(editorPluginElement, 'Editor Plugin Element').to.exist;
      expect(editorPluginElement?.querySelector('h1')?.textContent).to.contain(
        'Error',
      );
    });
  });
});
