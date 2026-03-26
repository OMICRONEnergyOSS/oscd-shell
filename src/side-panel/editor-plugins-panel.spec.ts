import { expect, fixture, html } from '@open-wc/testing';
import type { OscdShell } from '../oscd-shell.js';
import '../oscd-shell.js';
import { EditorPluginsPanel } from './editor-plugins-panel.js';
import { OscdIconButton } from '@omicronenergy/oscd-ui/iconbutton/OscdIconButton.js';
import { createTestDocs } from '../utils/testing/test-doc-helpers.js';
import { sampleEditorPlugins } from '../utils/testing/plugin-helpers.js';
import { TestMenuPlugin1 } from '../utils/testing/test-plugins.js';

const findPanelToggleButton = (pluginsMenu: EditorPluginsPanel) => {
  const toggleButton = pluginsMenu.shadowRoot?.querySelector(
    'oscd-icon-button.toggle-button',
  ) as OscdIconButton;
  expect(toggleButton).to.exist;
  return toggleButton;
};

const findToggleLabel = (pluginsMenu: EditorPluginsPanel) => {
  const label = pluginsMenu.shadowRoot?.querySelector(
    'span.toggle-sidebar',
  ) as HTMLSpanElement;
  expect(label).to.exist;
  return label;
};

const isPanelExpanded = (pluginsMenu: EditorPluginsPanel) => {
  return pluginsMenu.hasAttribute('expanded') && pluginsMenu.expanded;
};

describe('editor-plugins-panel', () => {
  let oscdShell: OscdShell;
  let editorPluginsPanel: EditorPluginsPanel;
  let docs: Record<string, XMLDocument>;

  beforeEach(async () => {
    docs = createTestDocs(1);
    oscdShell = <OscdShell>(
      await fixture(
        html`<oscd-shell
          .docs=${docs}
          docName=${Object.keys(docs)[0]}
        ></oscd-shell>`,
      )
    );
    if (!oscdShell.registry?.get('test-menu-plugin1')) {
      oscdShell.registry?.define('test-menu-plugin1', TestMenuPlugin1);
    }
    oscdShell.plugins = {
      editor: sampleEditorPlugins,
    };
    editorPluginsPanel = oscdShell.shadowRoot!.querySelector(
      'editor-plugins-panel',
    )!;
    await oscdShell.updateComplete;
    await editorPluginsPanel.updateComplete;
  });

  afterEach(() => {
    oscdShell.remove();
    localStorage.removeItem('editorsPanel.expanded');
  });

  it('collapses on toggle button click when already expanded ', async () => {
    const toggleButton = findPanelToggleButton(editorPluginsPanel);
    expect(isPanelExpanded(editorPluginsPanel)).to.be.true;
    toggleButton.click();
    await editorPluginsPanel.updateComplete;
    expect(isPanelExpanded(editorPluginsPanel)).to.be.false;
  });

  it('expands on toggle button click when already collapsed', async () => {
    const toggleButton = findPanelToggleButton(editorPluginsPanel);
    expect(isPanelExpanded(editorPluginsPanel)).to.be.true;
    toggleButton.click();
    await editorPluginsPanel.updateComplete;
    expect(isPanelExpanded(editorPluginsPanel)).to.be.false;
    toggleButton.click();
    await editorPluginsPanel.updateComplete;
    expect(isPanelExpanded(editorPluginsPanel)).to.be.true;
  });

  it('initially appears expanded if no value found in localStorage', async () => {
    expect(isPanelExpanded(editorPluginsPanel)).to.be.true;
  });

  it('uses value stored in localstorage initially', async () => {
    localStorage.setItem('editorsPanel.expanded', 'false');
    const oscdShell2 = <OscdShell>(
      await fixture(
        html`<oscd-shell
          .docs=${docs}
          docName=${Object.keys(docs)[0]}
        ></oscd-shell>`,
      )
    );
    oscdShell2.plugins = {
      editor: sampleEditorPlugins,
    };
    const editorPluginsPanel2 = oscdShell2.shadowRoot!.querySelector(
      'editor-plugins-panel',
    )!;
    await oscdShell2.updateComplete;
    await editorPluginsPanel2.updateComplete;
    expect(isPanelExpanded(editorPluginsPanel2)).to.be.false;
    oscdShell2.remove();
  });

  it('collapses on toggle label click', async () => {
    expect(isPanelExpanded(editorPluginsPanel)).to.be.true;
    findToggleLabel(editorPluginsPanel).click();
    await editorPluginsPanel.updateComplete;
    expect(isPanelExpanded(editorPluginsPanel)).to.be.false;
  });

  it('collapses on Enter key press on toggle label', async () => {
    expect(isPanelExpanded(editorPluginsPanel)).to.be.true;
    findToggleLabel(editorPluginsPanel).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    await editorPluginsPanel.updateComplete;
    expect(isPanelExpanded(editorPluginsPanel)).to.be.false;
  });

  it('collapses on Space key press on toggle label', async () => {
    expect(isPanelExpanded(editorPluginsPanel)).to.be.true;
    findToggleLabel(editorPluginsPanel).dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', bubbles: true }),
    );
    await editorPluginsPanel.updateComplete;
    expect(isPanelExpanded(editorPluginsPanel)).to.be.false;
  });

  it('saves expanded/collapsed state (when toggled) in localStorage', async () => {
    const toggleButton = findPanelToggleButton(editorPluginsPanel);
    expect(localStorage.getItem('editorsPanel.expanded')).to.be.null;
    expect(isPanelExpanded(editorPluginsPanel)).to.be.true;

    toggleButton.click();
    await editorPluginsPanel.updateComplete;
    expect(isPanelExpanded(editorPluginsPanel)).to.be.false;
    expect(localStorage.getItem('editorsPanel.expanded')).to.equal('false');

    toggleButton.click();
    await editorPluginsPanel.updateComplete;
    expect(isPanelExpanded(editorPluginsPanel)).to.be.true;
    expect(localStorage.getItem('editorsPanel.expanded')).to.equal('true');
  });
});
