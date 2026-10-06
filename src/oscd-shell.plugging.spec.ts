import { expect, fixture } from '@open-wc/testing';

import { html } from 'lit';

import './oscd-shell.js';
import sinon from 'sinon';
import type { OscdPlugin, OscdShell, ResolvedPlugin } from './oscd-shell.js';
import {
  TestBackgroundPlugin,
  TestMenuPlugin1,
} from './utils/testing/test-plugins.js';
import {
  sampleEditorPlugins,
  sampleMenuPlugins,
  waitForAllPluginsToInstantiate,
} from './utils/testing/plugin-helpers.js';
import { createSclDocument } from './utils/testing/test-doc-helpers.js';
import { flattenPluginEntries } from './utils/plugin-utils.js';

describe('OscdShell Plugin Handling', () => {
  let oscdShell: OscdShell;

  beforeEach(async () => {
    oscdShell = await fixture(html`<oscd-shell></oscd-shell>`);
    const registry = oscdShell.registry!;
    if (!registry.get('test-background-plugin')) {
      registry?.define('test-background-plugin', TestBackgroundPlugin);
    }
    if (!registry.get('test-menu-plugin1')) {
      registry?.define('test-menu-plugin1', TestMenuPlugin1);
    }

    oscdShell.docs = {
      ['sample.scd']: createSclDocument(),
    };
    oscdShell.docName = 'sample.scd';

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
    await waitForAllPluginsToInstantiate(oscdShell);
  });

  afterEach(() => {
    oscdShell.remove();
  });

  describe('with sample plugins loaded', () => {
    it('resolves, registers and renders each menu plugin, including grouped entries', () => {
      expect(oscdShell)
        .property('plugins')
        .property('menu')
        .to.have.lengthOf(3);
      expect(oscdShell._resolvedPlugins.menu).to.have.lengthOf(3);
      const plugins = flattenPluginEntries(oscdShell._resolvedPlugins.menu);
      expect(plugins).to.have.lengthOf(3);
      expect(oscdShell.shadowRoot!.querySelectorAll('.menu-plugins > *').length)
        .to.equal(plugins.length);
      for (const plugin of plugins) {
        const definition = oscdShell.registry!.get(plugin.tagName);
        expect(typeof definition, plugin.tagName).to.equal('function');
        const instances = oscdShell.shadowRoot!.querySelectorAll(
          `.menu-plugins > ${plugin.tagName}`,
        );
        expect(instances.length, plugin.tagName).to.equal(1);
        expect(instances[0] instanceof definition!, plugin.tagName).to.be.true;
      }
    });

    it('resolves, registers and renders the background plugin', () => {
      expect(oscdShell)
        .property('plugins')
        .property('background')
        .to.have.lengthOf(1);
      expect(oscdShell._resolvedPlugins.background).to.have.lengthOf(1);
      expect(oscdShell.registry!.get('test-background-plugin') === TestBackgroundPlugin)
        .to.be.true;
      const instances = oscdShell.shadowRoot!.querySelectorAll(
        '.background-plugins > test-background-plugin',
      );
      expect(instances.length).to.equal(1);
      expect(instances[0] instanceof TestBackgroundPlugin).to.be.true;
    });

    it('instantiates a background plugin that echoes test-tx detail through test-rx', async () => {
      // Use a real event listener and a Promise to avoid timing issues
      const eventPromise = new Promise<CustomEvent>((resolve) => {
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

    it('reassigning the same menu configuration preserves single instances without redefining tags', async () => {
      const plugins = flattenPluginEntries(oscdShell._resolvedPlugins.menu);
      const originalInstances = plugins.map(plugin =>
        oscdShell.shadowRoot!.querySelector(`.menu-plugins > ${plugin.tagName}`),
      );
      const defineSpy = sinon.spy(oscdShell.registry!, 'define');
      try {
        for (let assignment = 0; assignment < 2; assignment += 1) {
          oscdShell.plugins = { menu: sampleMenuPlugins };
          await oscdShell.updateComplete;
          await waitForAllPluginsToInstantiate(oscdShell);
          expect(oscdShell.plugins.menu).to.have.lengthOf(3);
          expect(flattenPluginEntries(oscdShell._resolvedPlugins.menu))
            .to.deep.equal(plugins);
          expect(oscdShell.shadowRoot!.querySelectorAll('.menu-plugins > *').length)
            .to.equal(plugins.length);
          plugins.forEach((plugin, index) => {
            const instances = oscdShell.shadowRoot!.querySelectorAll(
              `.menu-plugins > ${plugin.tagName}`,
            );
            expect(instances.length, plugin.tagName).to.equal(1);
            expect(instances[0] === originalInstances[index], plugin.tagName)
              .to.be.true;
          });
          expect(defineSpy.called).to.be.false;
        }
      } finally {
        defineSpy.restore();
      }
    });

    it('resolves and registers editor definitions and renders only the selected editor', async () => {
      oscdShell.plugins = {
        editor: sampleEditorPlugins,
      };
      await oscdShell.updateComplete;
      await waitForAllPluginsToInstantiate(oscdShell);
      expect(oscdShell)
        .property('plugins')
        .property('editor')
        .to.have.lengthOf(2);
      const plugins = flattenPluginEntries(oscdShell._resolvedPlugins.editor);
      expect(plugins).to.have.lengthOf(2);
      for (const plugin of plugins) {
        await oscdShell.registry!.whenDefined(plugin.tagName);
        expect(typeof oscdShell.registry!.get(plugin.tagName)).to.equal('function');
      }
      expect(oscdShell.selectedEditor?.tagName).to.equal(plugins[0].tagName);
      const instances = oscdShell.shadowRoot!.querySelectorAll('.editor-container > *');
      expect(instances.length).to.equal(1);
      expect(instances[0].localName).to.equal(plugins[0].tagName);
      expect(instances[0] instanceof oscdShell.registry!.get(plugins[0].tagName)!)
        .to.be.true;
    });

    it('keeps a plugin with no tagName or src in the declared set, but excludes it from the resolved set', async () => {
      oscdShell.plugins = {
        editor: [
          {
            name: 'Tagless, Sourceless, Hopeless Plugin',
            icon: 'coronavirus',
          } as unknown as OscdPlugin,
        ],
      };
      await oscdShell.updateComplete;
      expect(oscdShell.plugins.editor).to.have.lengthOf(1);
      expect(oscdShell._resolvedPlugins.editor).to.have.lengthOf(0);
    });

    it('excludes an invalid SourcePlugin from the resolved set', async () => {
      oscdShell.plugins = {
        background: [
          {
            src: 'test-background-plugin',
          } as unknown as OscdPlugin,
        ],
      };
      await oscdShell.updateComplete;
      expect(oscdShell.plugins.background).to.have.lengthOf(1);
      expect(oscdShell._resolvedPlugins.background).to.have.lengthOf(0);
    });

    it('excludes a plugin missing required fields from the resolved set', async () => {
      oscdShell.plugins = {
        background: [
          {
            tagName: 'test-background-plugin',
          } as unknown as OscdPlugin,
        ],
      };
      await oscdShell.updateComplete;
      expect(oscdShell.plugins.background).to.have.lengthOf(1);
      expect(oscdShell._resolvedPlugins.background).to.have.lengthOf(0);
    });
  });

  describe('error components for plugins whose source fails to load', () => {
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
      await waitForAllPluginsToInstantiate(oscdShell);
    });

    afterEach(() => {
      alertStub.restore();
    });

    it('renders a replacement menu plugin that alerts with an error when run', async () => {
      const { menu } = oscdShell._resolvedPlugins;
      expect(menu).to.have.lengthOf(1);
      const menuPluginElement = oscdShell.shadowRoot?.querySelector(
        (menu[0] as ResolvedPlugin).tagName,
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

    it('renders a replacement editor plugin with an error heading', () => {
      const { editor } = oscdShell._resolvedPlugins;
      expect(editor).to.have.lengthOf(1);
      const editorPluginElement = oscdShell.shadowRoot?.querySelector(
        (editor[0] as ResolvedPlugin).tagName,
      );
      expect(editorPluginElement, 'Editor Plugin Element').to.exist;
      expect(editorPluginElement?.querySelector('h1')?.textContent).to.contain(
        'Error',
      );
    });
  });
});
