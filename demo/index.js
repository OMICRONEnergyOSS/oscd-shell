// import '@webcomponents/scoped-custom-element-registry';
// import '../dist/oscd-shell.js';
import OscdMenuOpen from '@omicronenergy/oscd-menu-open';
import OscdMenuSave from '@omicronenergy/oscd-menu-save';
import {
  OscdMenuFileClose,
  OscdMenuFileRename,
  OscdMenuNew,
} from '@omicronenergy/oscd-menu-commons';
import OscdBackgroundEditV1 from '@omicronenergy/oscd-background-editv1';
import OscdEditorSource from '@omicronenergy/oscd-editor-source';

const plugins = {
  menu: [
    {
      name: 'Open...',
      translations: { de: 'Datei öffnen' },
      icon: 'folder_open',
      tagName: 'oscd-menu-open',
    },
    {
      name: 'New File...',
      translations: { de: 'Neu Datei' },
      icon: 'note_add',
      tagName: 'oscd-menu-new',
    },
    {
      name: 'Save...',
      translations: { de: 'Datei speichern' },
      icon: 'save',
      requireDoc: true,
      tagName: 'oscd-menu-save',
    },
    {
      name: 'Rename...',
      translations: { de: 'Datei umbenenen' },
      icon: 'edit',
      requireDoc: true,
      src: 'https://omicronenergyoss.github.io/oscd-menu-commons/oscd-menu-file-rename.js',
    },
    {
      name: 'Close',
      translations: { de: 'Schließen' },
      icon: 'close',
      requireDoc: true,
      src: 'https://omicronenergyoss.github.io/oscd-menu-commons/oscd-menu-file-close.js',
    },
    {
      name: 'Add plugins...',
      translations: { de: 'Erweitern...' },
      icon: 'extension',
      src: './AddPlugins.js',
    },
  ],
  editor: [
    {
      name: 'SLD',
      icon: 'add_box',
      requireDoc: true,
      plugins: [
        {
          name: 'Design SLD',
          icon: 'add_box',
          requireDoc: true,
          src: 'https://omicronenergyoss.github.io/oscd-editor-sld/oscd-editor-sld.js',
        },
        {
          name: 'Edit Substation',
          icon: 'margin',
          requireDoc: true,
          src: 'https://OpenEnergyTools.github.io/scl-substation-editor/scl-substation-editor.js',
        },
      ],
    },
    {
      name: 'View GOOSE/SMV',
      icon: 'hub',
      requireDoc: true,
      plugins: [
        {
          name: 'Edit Communication',
          icon: 'hub',
          requireDoc: true,
          src: 'https://danyill.github.io/scl-communication-editor/scl-communication-editor.js',
        },
        {
          name: 'Explore Communication',
          icon: 'lan',
          requireDoc: true,
          src: 'https://sprinteins.github.io/oscd-plugins/oscd-plugins.js',
        },
      ],
    },
    {
      name: 'Subscriptions & Supervisions',
      icon: 'add_box',
      requireDoc: true,
      plugins: [
        {
          name: 'Subscribe (Later Binding)',
          icon: 'link',
          requireDoc: true,
          src: 'https://danyill.github.io/oscd-subscriber-later-binding/oscd-subscriber-later-binding.js',
        },
        {
          name: 'Supervise',
          icon: 'ecg',
          requireDoc: true,
          src: 'https://danyill.github.io/oscd-supervision/oscd-supervision.js',
        },
      ],
    },
    {
      name: 'Publish and Address',
      icon: 'network_node',
      requireDoc: true,
      plugins: [
        {
          name: 'Publish',
          icon: 'publish',
          requireDoc: true,
          src: 'https://com-pas.github.io/oscd-publisher/oscd-publisher.js',
        },
        {
          name: 'Address Multicast (TP)',
          icon: 'auto_fix_normal',
          requireDoc: true,
          src: 'https://danyill.github.io/oscd-tp-multicast-naming/oscd-tp-multicast-naming.js',
        },
        {
          name: 'Communicate',
          icon: 'network_node',
          requireDoc: true,
          src: 'https://openenergytools.github.io/scl-communication/scl-communication.js',
        },
      ],
    },
    {
      name: 'Configure Network (TP)',
      icon: 'news',
      requireDoc: true,
      src: 'https://danyill.github.io/oscd-network-config/oscd-network-config.js',
    },
    {
      name: 'Compare',
      icon: 'compare',
      requireDoc: true,
      src: 'https://OMICRONEnergyOSS.github.io/oscd-editor-diff/oscd-editor-diff.js',
    },
    {
      name: 'Stencil',
      icon: 'draw_collage',
      requireDoc: true,
      src: 'https://danyill.github.io/oscd-stencil/oscd-stencil.js',
    },
    {
      name: 'Source Editor',
      icon: 'code',
      requireDoc: true,
      src: 'https://OMICRONEnergyOSS.github.io/oscd-editor-source/oscd-editor-source.js',
    },
    {
      name: 'Describe',
      icon: 'description',
      requireDoc: true,
      src: 'https://danyill.github.io/oscd-description/oscd-description.js',
    },
  ],
};

const oscdShell = document.querySelector('oscd-shell');
const { registry } = oscdShell;
registry.define('oscd-menu-open', OscdMenuOpen);
registry.define('oscd-menu-save', OscdMenuSave);
registry.define('oscd-menu-new', OscdMenuNew);
registry.define('oscd-menu-file-rename', OscdMenuFileRename);
registry.define('oscd-menu-file-close', OscdMenuFileClose);
registry.define('oscd-background-editv1', OscdBackgroundEditV1);
registry.define('oscd-editor-source', OscdEditorSource);

oscdShell.plugins = plugins;

const params = new URL(document.location).searchParams;
for (const [name, value] of params) {
  oscdShell.setAttribute(name, value);
}

// const sclDocString = await fetch('sample.scd').then(r => r.text());
// const sclDocString = `<?xml version="1.0" encoding="UTF-8"?>
//   <SCL version="2007" revision="B" xmlns="http://www.iec.ch/61850/2003/SCL">
//   <Substation name="A1" desc="test substation"></Substation>
// </SCL>`;
// oscdShell.docs = {
//   ['sample.scd']: new DOMParser().parseFromString(
//     sclDocString,
//     'application/xml',
//   ),
// };
// oscdShell.docName = 'sample.scd';
