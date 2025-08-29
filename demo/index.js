import '@webcomponents/scoped-custom-element-registry';

import '../oscd-shell.js';
import OscdMenuOpen from '@omicronenergy/oscd-menu-open';
import OscdMenuSave from '@omicronenergy/oscd-menu-save';
import OscdBackgroundEditV1 from '@omicronenergy/oscd-background-editv1';

const plugins = {
  menu: [
    {
      name: 'Open File',
      translations: { de: 'Datei öffnen' },
      icon: 'folder_open',
      tagName: 'oscd-menu-open',
    },
    {
      name: 'Save File',
      translations: { de: 'Datei speichern' },
      icon: 'save',
      requireDoc: true,
      tagName: 'oscd-template-menu',
    },
    {
      name: 'Template Menu item',
      translations: { de: 'Vorlagenmenüelement' },
      icon: 'edit',
      requireDoc: true,
      tagName: 'oscd-template-menu',
    },
  ],
  editor: [
    {
      name: 'Start',
      translations: {
        de: 'Start',
      },
      icon: 'start',
      src: 'https://openenergytools.github.io/scl-editor-landing/scl-editor-landing.js',
    },

    {
      name: 'Substation',
      icon: 'margin',
      requireDoc: true,
      src: 'https://omicronenergyoss.github.io/oscd-editor-substation/oscd-editor-substation.js',
    },
    {
      name: 'Design SLD',
      translations: {
        de: 'Designer',
      },
      icon: 'add_box',
      requireDoc: true,
      src: 'https://omicronenergyoss.github.io/oscd-editor-sld/oscd-editor-sld.js',
    },
  ],
  background: [
    {
      name: 'EditV1 Events Listener',
      icon: 'none',
      requireDoc: true,
      tagName: 'oscd-background-editv1',
    },
  ],
};

const oscdShell = document.querySelector('oscd-shell');
const registry = oscdShell.registry;
registry.define('oscd-menu-open', OscdMenuOpen);
registry.define('oscd-menu-save', OscdMenuSave);
registry.define('oscd-background-editv1', OscdBackgroundEditV1);

oscdShell.plugins = plugins;

const params = new URL(document.location).searchParams;
for (const [name, value] of params) {
  oscdShell.setAttribute(name, value);
}

const sample = await fetch('sample.scd').then(r => r.text());
oscdShell.docs = {
  ['sample.scd']: new DOMParser().parseFromString(sample, 'application/xml'),
};
oscdShell.docName = 'sample.scd';
