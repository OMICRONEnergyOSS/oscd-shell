import { expect, fixture } from '@open-wc/testing';

import { html } from 'lit';

import './oscd-shell.js';
import type { OpenSCD, Plugin } from './oscd-shell.js';

const backgroundPluginSrcStr = `export default class TestPlugin extends HTMLElement {
        constructor() {
          super();
          document.addEventListener('test-tx', (event) => {
            document.dispatchEvent(
              new CustomEvent('test-rx', {
                detail: event.detail
              }),
            );
          });
        }
    }`;
const backgroundPluginSrc = `data:text/javascript;charset=utf-8,${encodeURIComponent(backgroundPluginSrcStr)}`;

const sampleMenuPlugins: Plugin[] = [
  {
    name: 'Test Menu Plugin',
    translations: { de: 'Test Menu Erweiterung' },
    src: 'data:text/javascript;charset=utf-8,export%20default%20class%20TestPlugin%20extends%20HTMLElement%20%7B%0D%0A%20%20async%20run%28%29%20%7B%0D%0A%20%20%20%20return%20true%3B%0D%0A%20%20%7D%0D%0A%7D',
    icon: 'margin',
    active: true,
    requireDoc: false,
  },
  {
    name: 'Test Menu Plugin 2',
    src: 'data:text/javascript;charset=utf-8,export%20default%20class%20TestPlugin%20extends%20HTMLElement%20%7B%0D%0A%20%20async%20run%28%29%20%7B%0D%0A%20%20%20%20return%20true%3B%0D%0A%20%20%7D%0D%0A%7D',
    icon: 'margin',
    active: true,
    requireDoc: false,
  },
  {
    name: 'Test Menu Plugin 3',
    src: 'data:text/javascript;charset=utf-8,export%20default%20class%20TestPlugin%20extends%20HTMLElement%20%7B%0D%0A%20%20async%20run%28%29%20%7B%0D%0A%20%20%20%20return%20true%3B%0D%0A%20%20%7D%0D%0A%7D',
    icon: 'margin',
    active: false,
    requireDoc: false,
  },
];

describe('Plugging Element', () => {
  let editor: OpenSCD;

  beforeEach(async () => {
    editor = <OpenSCD>await fixture(html`<oscd-shell></oscd-shell>`);
  });

  it('loads menu plugins', () => {
    editor.plugins = {
      menu: sampleMenuPlugins,
    };
    expect(editor).property('plugins').property('menu').to.have.lengthOf(3);
  });
  it('loads background plugins', () => {
    editor.plugins = {
      background: [
        {
          name: 'Background Plugin',
          src: backgroundPluginSrc,
          icon: 'none',
        },
      ],
    };
    expect(editor)
      .property('plugins')
      .property('background')
      .to.have.lengthOf(1);
  });

  it('background plugins are active', async () => {
    editor.plugins = {
      background: [
        {
          name: 'Background Plugin',
          src: backgroundPluginSrc,
          icon: 'none',
        },
      ],
    };

    // Use a real event listener and a Promise to avoid timing issues
    const eventPromise = new Promise<CustomEvent>(resolve => {
      document.addEventListener(
        'test-rx',
        (e: Event) => resolve(e as CustomEvent),
        { once: true },
      );
    });

    document.dispatchEvent(new CustomEvent('test-tx', { detail: 'test' }));

    const event = await eventPromise;
    expect(event.detail).to.equal('test');
  });

  it('loading the same plugins twice does not result in duplicates', () => {
    editor.plugins = {
      menu: sampleMenuPlugins,
    };
    expect(editor).property('plugins').property('menu').to.have.lengthOf(3);
    editor.plugins = {
      menu: sampleMenuPlugins,
    };
    expect(editor).property('plugins').property('menu').to.have.lengthOf(3);
  });

  it('loads editor plugins', () => {
    editor.plugins = {
      editor: [
        {
          name: 'Test Editor Plugin',
          translations: { de: 'Test Editor Erweiterung' },
          src: 'data:text/javascript;charset=utf-8,export%20default%20class%20TestEditorPlugin%20extends%20HTMLElement%20%7B%0D%0A%20%20constructor%20%28%29%20%7B%20super%28%29%3B%20this.innerHTML%20%3D%20%60%3Cp%3ETest%20Editor%20Plugin%3C%2Fp%3E%60%3B%20%7D%0D%0A%7D',
          icon: 'coronavirus',
          active: true,
        },
        {
          name: 'Test Editor Plugin 2',
          src: 'data:text/javascript;charset=utf-8,export%20default%20class%20TestEditorPlugin%20extends%20HTMLElement%20%7B%0D%0A%20%20constructor%20%28%29%20%7B%20super%28%29%3B%20this.innerHTML%20%3D%20%60%3Cp%3ETest%20Editor%20Plugin%3C%2Fp%3E%60%3B%20%7D%0D%0A%7D',
          icon: 'coronavirus',
          active: true,
        },
      ],
    };
    expect(editor).property('plugins').property('editor').to.have.lengthOf(2);
  });
});
