import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import type { OscdShell } from '../oscd-shell.js';
import '../oscd-shell.js';
import { EditorPluginsPanel } from './editor-plugins-panel.js';
import type { ResolvedPlugin, PluginGroup } from '../oscd-shell.js';
import { createTestDocs } from '../utils/testing/test-doc-helpers.js';
import { sampleEditorPlugins } from '../utils/testing/plugin-helpers.js';
import { TestMenuPlugin1 } from '../utils/testing/test-plugins.js';
import type { OscdMenu } from '@omicronenergy/oscd-ui/menu/OscdMenu.js';
import type { OscdTree } from '@omicronenergy/oscd-ui/tree/OscdTree.js';
import { OscdOutlinedSearchField } from '@omicronenergy/oscd-ui/search-field/OscdOutlinedSearchField.js';
import sinon from 'sinon';

// A grouped editor fixture, used to exercise the collapsed rail's group
// flyout (rendered only when `editors` contains a `PluginGroup<ResolvedPlugin>`).
const groupedEditorPlugins: PluginGroup<ResolvedPlugin>[] = [
  {
    name: 'Grouped Editors',
    icon: 'folder',
    plugins: [
      {
        name: 'Grouped Editor 1',
        tagName: 'test-grouped-editor-1',
        icon: 'coronavirus',
      },
      {
        name: 'Grouped Editor 2',
        tagName: 'test-grouped-editor-2',
        icon: 'coronavirus',
      },
    ],
  },
];

const findPanelToggleButton = (pluginsMenu: EditorPluginsPanel) => {
  const toggleButton = pluginsMenu.shadowRoot?.querySelector(
    '.toggle-button',
  ) as HTMLElement;
  expect(toggleButton).to.exist;
  return toggleButton;
};

const isPanelExpanded = (pluginsMenu: EditorPluginsPanel) => {
  return pluginsMenu.hasAttribute('expanded') && pluginsMenu.expanded;
};

describe('editor-plugins-panel', () => {
  let oscdShell: OscdShell;
  let editorPluginsPanel: EditorPluginsPanel;
  let docs: Record<string, XMLDocument>;
  const extraShells: OscdShell[] = [];

  const LS_KEYS = {
    expanded: 'editor-plugins-panel:expanded',
    expandedIds: 'editor-plugins-panel:expandedIds',
    pinnedPluginIds: 'editor-plugins-panel:pinnedPluginIds',
    pinnedExpanded: 'editor-plugins-panel:pinnedExpanded',
  };

  // Mounts a brand-new shell + panel, simulating a page reload. Any pre-seeded
  // localStorage is therefore read by a freshly constructed panel.
  const mountFreshPanel = async (): Promise<EditorPluginsPanel> => {
    const shell = <OscdShell>(
      await fixture(
        html`<oscd-shell
          .docs=${docs}
          docName=${Object.keys(docs)[0]}
        ></oscd-shell>`,
      )
    );
    shell.plugins = { editor: sampleEditorPlugins };
    const panel = shell.shadowRoot!.querySelector('editor-plugins-panel')!;
    await shell.updateComplete;
    await panel.updateComplete;
    extraShells.push(shell);
    return panel;
  };

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

  for (const expanded of [true, false]) {
    it(`shows the footer divider only during overflow (${expanded ? 'expanded' : 'collapsed'})`, async () => {
      const panel = editorPluginsPanel;
      panel.expanded = expanded;
      panel.style.height = '1000px';
      await panel.updateComplete;
      const divider = panel.shadowRoot!.querySelector('.footer-divider')!;
      const scrollArea = panel.shadowRoot!.querySelector('.tree-scroll, .rail')!;
      await waitUntil(() => scrollArea.clientHeight > 0);
      await waitUntil(() => getComputedStyle(divider).visibility === 'hidden');
      expect(scrollArea.scrollHeight).to.be.at.most(scrollArea.clientHeight);

      panel.style.height = '120px';
      await waitUntil(() => getComputedStyle(divider).visibility === 'visible');
      expect(scrollArea.scrollHeight).to.be.greaterThan(scrollArea.clientHeight);
      if (!expanded) {
        expect(getComputedStyle(scrollArea).overflowX).to.equal('hidden');
      }
      expect(findPanelToggleButton(panel).getBoundingClientRect().height).to.be.greaterThan(0);

      panel.style.height = '1000px';
      await waitUntil(() => getComputedStyle(divider).visibility === 'hidden');
    });
  }

  it('updates the divider when filtering removes overflowing content', async () => {
    const panel = editorPluginsPanel;
    panel.style.height = '180px';
    await panel.updateComplete;
    const divider = panel.shadowRoot!.querySelector('.footer-divider')!;
    await waitUntil(() => getComputedStyle(divider).visibility === 'visible');

    panel.searchValue = 'no matching editor';
    await panel.updateComplete;
    await waitUntil(() => getComputedStyle(divider).visibility === 'hidden');

    panel.searchValue = '';
    await panel.updateComplete;
    await waitUntil(() => getComputedStyle(divider).visibility === 'visible');
  });

  it('does not render a pin accessory for the empty pinned placeholder', async () => {
    editorPluginsPanel.pinnedExpanded = ['pinned'];
    await editorPluginsPanel.updateComplete;

    const pinnedTree = editorPluginsPanel.shadowRoot!.querySelector<OscdTree>(
      '.tree-container oscd-tree.pinned-tree',
    )!;
    await pinnedTree.updateComplete;

    const placeholderItem = Array.from(
      pinnedTree.shadowRoot!.querySelectorAll('oscd-tree-item'),
    ).find(item => item.textContent?.includes('Items you pin'));

    expect(placeholderItem).to.exist;
    expect(placeholderItem?.closest('[role="treeitem"]')?.querySelector('.accessory'))
      .not.to.exist;
  });

  afterEach(() => {
    oscdShell.remove();
    while (extraShells.length) {
      extraShells.pop()!.remove();
    }
    Object.values(LS_KEYS).forEach(key => localStorage.removeItem(key));
  });

  it('collapses on toggle button click when already expanded', async () => {
    const toggleButton = findPanelToggleButton(editorPluginsPanel);
    expect(isPanelExpanded(editorPluginsPanel)).to.be.true;
    toggleButton.click();
    await editorPluginsPanel.updateComplete;
    expect(isPanelExpanded(editorPluginsPanel)).to.be.false;
  });

  it('expands on toggle button click when already collapsed', async () => {
    findPanelToggleButton(editorPluginsPanel).click();
    await editorPluginsPanel.updateComplete;
    expect(isPanelExpanded(editorPluginsPanel)).to.be.false;
    // The control is a different element in the collapsed rail, so re-query it.
    findPanelToggleButton(editorPluginsPanel).click();
    await editorPluginsPanel.updateComplete;
    expect(isPanelExpanded(editorPluginsPanel)).to.be.true;
  });

  it('initially appears expanded if no value found in localStorage', async () => {
    expect(isPanelExpanded(editorPluginsPanel)).to.be.true;
  });

  it('preserves the editor tree row height', () => {
    const editorsTree = editorPluginsPanel.shadowRoot!.querySelector(
      '.tree-container oscd-tree.editors-tree',
    )!;
    const item = editorsTree.shadowRoot!.querySelector('oscd-tree-item')!;

    expect(item.getBoundingClientRect().height).to.equal(36);
  });

  it('starts collapsed when localStorage contains expanded=false', async () => {
    localStorage.setItem(LS_KEYS.expanded, JSON.stringify(false));
    const editorPluginsPanel2 = await mountFreshPanel();
    expect(isPanelExpanded(editorPluginsPanel2)).to.be.false;
  });

  it('saves expanded/collapsed state (when toggled) in localStorage', async () => {
    expect(isPanelExpanded(editorPluginsPanel)).to.be.true;

    findPanelToggleButton(editorPluginsPanel).click();
    await editorPluginsPanel.updateComplete;
    expect(isPanelExpanded(editorPluginsPanel)).to.be.false;
    expect(localStorage.getItem(LS_KEYS.expanded)).to.equal(
      JSON.stringify(false),
    );

    // Re-query: the collapsed rail renders a different toggle element.
    findPanelToggleButton(editorPluginsPanel).click();
    await editorPluginsPanel.updateComplete;
    expect(isPanelExpanded(editorPluginsPanel)).to.be.true;
    expect(localStorage.getItem(LS_KEYS.expanded)).to.equal(
      JSON.stringify(true),
    );
  });

  describe('restores persisted state on reload (fresh mount)', () => {
    it('hydrates expandedIds from localStorage and does not clobber it', async () => {
      const seeded = ['group:0:Communication', 'group:1:Advanced'];
      localStorage.setItem(LS_KEYS.expandedIds, JSON.stringify(seeded));

      const panel = await mountFreshPanel();

      expect(panel.expandedIds).to.deep.equal(seeded);
      expect(localStorage.getItem(LS_KEYS.expandedIds)).to.equal(
        JSON.stringify(seeded),
      );
    });

    it('hydrates pinnedPluginIds from localStorage and does not clobber it', async () => {
      const seeded = ['oscd-example-editor', 'oscd-other-editor'];
      localStorage.setItem(LS_KEYS.pinnedPluginIds, JSON.stringify(seeded));

      const panel = await mountFreshPanel();

      expect(panel.pinnedPluginIds).to.deep.equal(seeded);
      expect(localStorage.getItem(LS_KEYS.pinnedPluginIds)).to.equal(
        JSON.stringify(seeded),
      );
    });

    it('hydrates pinnedExpanded from localStorage and does not clobber it', async () => {
      const seeded = ['pinned'];
      localStorage.setItem(LS_KEYS.pinnedExpanded, JSON.stringify(seeded));

      const panel = await mountFreshPanel();

      expect(panel.pinnedExpanded).to.deep.equal(seeded);
      expect(localStorage.getItem(LS_KEYS.pinnedExpanded)).to.equal(
        JSON.stringify(seeded),
      );
    });

    it('hydrates expanded (collapsed) state from localStorage and does not clobber it', async () => {
      localStorage.setItem(LS_KEYS.expanded, JSON.stringify(false));

      const panel = await mountFreshPanel();

      expect(panel.expanded).to.be.false;
      expect(localStorage.getItem(LS_KEYS.expanded)).to.equal(
        JSON.stringify(false),
      );
    });
  });

  const getSearchField = () =>
    editorPluginsPanel.shadowRoot!.querySelector(
      'oscd-outlined-search-field',
    ) as OscdOutlinedSearchField;

  const setSearch = async (value: string) => {
    const field = getSearchField();
    field.value = value;
    field.dispatchEvent(new Event('input'));
    await editorPluginsPanel.updateComplete;
  };

  it('filters editors by their (source) name when searching', async () => {
    await setSearch('Plugin 2');
    expect(editorPluginsPanel.editorTreeNodes).to.have.lengthOf(1);
    expect(editorPluginsPanel.editorTreeNodes[0].name).to.equal(
      'Test Editor Plugin 2',
    );
  });

  it('filters editors by their localized label when a locale is set', async () => {
    editorPluginsPanel.locale = 'de';
    await editorPluginsPanel.updateComplete;
    await setSearch('Erweiterung');
    // Both sample editors share the German label "…Erweiterung" only on the
    // first entry; searching the German term must still match it.
    const names = editorPluginsPanel.editorTreeNodes.map(n => n.name);
    expect(names).to.include('Test Editor Plugin');
  });

  it('makes the Pinned root active on search-field ArrowDown with no search query', async () => {
    const field = getSearchField();
    field.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        composed: true,
      }),
    );
    await editorPluginsPanel.updateComplete;

    expect(editorPluginsPanel.focusedTree).to.equal('pinned');
    expect(
      (editorPluginsPanel.shadowRoot!.querySelector('.pinned-tree') as OscdTree)
        .activeId,
    ).to.equal('pinned');
    expect(editorPluginsPanel.selectedEditor).to.exist;
  });

  it('preserves the search query when the field is refocused', async () => {
    await setSearch('Plugin 2');
    const field = getSearchField();

    editorPluginsPanel.focusSearch();
    await editorPluginsPanel.updateComplete;

    expect(field.value).to.equal('Plugin 2');
    expect(editorPluginsPanel.editorTreeNodes).to.have.lengthOf(1);
  });

  it('hands search-field arrow navigation to the editor tree when searching', async () => {
    await setSearch('Plugin');
    const field = getSearchField();
    field.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        composed: true,
      }),
    );
    await editorPluginsPanel.updateComplete;

    const editorsTree = editorPluginsPanel.shadowRoot!.querySelector(
      '.editors-tree',
    ) as OscdTree;
    expect(editorPluginsPanel.focusedTree).to.equal('editors');
    expect(editorsTree.activeId).to.equal(editorsTree.getFirstNodeId());
  });

  it('starts search navigation at the last editor for ArrowUp', async () => {
    await setSearch('Plugin');
    const field = getSearchField();
    field.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        bubbles: true,
        composed: true,
      }),
    );
    await editorPluginsPanel.updateComplete;

    const editorsTree = editorPluginsPanel.shadowRoot!.querySelector(
      '.editors-tree',
    ) as OscdTree;
    expect(editorsTree.activeId).to.equal(editorsTree.getLastNodeId());
  });

  it('selects the only search result when Enter is pressed in the search field', async () => {
    await setSearch('Plugin 2');
    const field = getSearchField();
    let selected: ResolvedPlugin | undefined;
    editorPluginsPanel.addEventListener('editor-select', (event: Event) => {
      selected = (event as CustomEvent).detail.editor;
    });
    field.focus();
    field.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        composed: true,
      }),
    );
    await editorPluginsPanel.updateComplete;

    expect(selected).to.exist;
  });

  it('does not dispatch editor-select on search-field Enter when multiple results remain', async () => {
    await setSearch('Plugin');
    const field = getSearchField();
    let selected = false;
    editorPluginsPanel.addEventListener('editor-select', () => {
      selected = true;
    });
    field.focus();
    field.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        composed: true,
      }),
    );
    await editorPluginsPanel.updateComplete;

    expect(selected).to.be.false;
  });

  it('updates the focused tree when the tree emits active-changed or receives focus', async () => {
    const editorsTree = editorPluginsPanel.shadowRoot!.querySelector(
      '.editors-tree',
    ) as OscdTree;
    editorsTree.dispatchEvent(new Event('focusin', { bubbles: true }));
    expect(editorPluginsPanel.focusedTree).to.equal('editors');

    editorsTree.dispatchEvent(
      new CustomEvent('active-changed', {
        detail: { activeId: editorsTree.activeId },
        bubbles: true,
      }),
    );
    expect(editorPluginsPanel.focusedTree).to.equal('editors');
  });

  it('does not focus a tree when the handoff has no active node', () => {
    // @ts-expect-error focusTree is private; exercise its null-node guard.
    expect(editorPluginsPanel.focusTree('editors', null)).to.be.false;
  });

  it('transfers focus from the pinned tree to the editor tree at its boundary', async () => {
    const pinnedTree = editorPluginsPanel.shadowRoot!.querySelector(
      '.pinned-tree',
    ) as OscdTree;
    const editorsTree = editorPluginsPanel.shadowRoot!.querySelector(
      '.editors-tree',
    ) as OscdTree;
    pinnedTree.activeId = pinnedTree.getLastNodeId();
    const focusSpy = sinon.spy(editorsTree, 'focus');

    pinnedTree.dispatchEvent(
      new CustomEvent('navigation-boundary', {
        detail: { direction: 'last' },
        bubbles: true,
        composed: true,
      }),
    );
    await editorPluginsPanel.updateComplete;

    expect(editorPluginsPanel.focusedTree).to.equal('editors');
    expect(editorsTree.activeId).to.equal(editorsTree.getFirstNodeId());
    expect(focusSpy.called).to.be.true;
    focusSpy.restore();
  });

  it('transfers focus back to the pinned tree at the editor boundary', async () => {
    const pinnedTree = editorPluginsPanel.shadowRoot!.querySelector(
      '.pinned-tree',
    ) as OscdTree;
    const editorsTree = editorPluginsPanel.shadowRoot!.querySelector(
      '.editors-tree',
    ) as OscdTree;
    editorPluginsPanel.focusedTree = 'editors';
    editorsTree.activeId = editorsTree.getFirstNodeId();

    editorsTree.dispatchEvent(
      new CustomEvent('navigation-boundary', {
        detail: { direction: 'first' },
        bubbles: true,
        composed: true,
      }),
    );
    await editorPluginsPanel.updateComplete;

    expect(editorPluginsPanel.focusedTree).to.equal('pinned');
    expect(pinnedTree.activeId).to.equal(pinnedTree.getLastNodeId());
  });

  it('does not transfer across the editor boundary while searching', async () => {
    await setSearch('Plugin');
    const editorsTree = editorPluginsPanel.shadowRoot!.querySelector(
      '.editors-tree',
    ) as OscdTree;
    editorPluginsPanel.focusedTree = 'editors';
    editorsTree.dispatchEvent(
      new CustomEvent('navigation-boundary', {
        detail: { direction: 'first' },
        bubbles: true,
      }),
    );
    await editorPluginsPanel.updateComplete;
    expect(editorPluginsPanel.focusedTree).to.equal('editors');
  });

  it('persists a pinned editor id and removes it from panel state on unpin', async () => {
    const tagName = (oscdShell._resolvedPlugins.editor[0] as ResolvedPlugin)
      .tagName;

    editorPluginsPanel.togglePin(tagName);
    await editorPluginsPanel.updateComplete;
    expect(editorPluginsPanel.pinnedPluginIds).to.include(tagName);
    expect(
      localStorage.getItem('editor-plugins-panel:pinnedPluginIds'),
    ).to.contain(tagName);

    editorPluginsPanel.togglePin(tagName);
    await editorPluginsPanel.updateComplete;
    expect(editorPluginsPanel.pinnedPluginIds).to.not.include(tagName);
  });

  it('does not track selection in the pinned tree', async () => {
    const editor = oscdShell._resolvedPlugins.editor[0] as ResolvedPlugin;

    editorPluginsPanel.togglePin(editor.tagName);
    editorPluginsPanel.selectedEditor = editor;
    await editorPluginsPanel.updateComplete;

    const pinnedTree = editorPluginsPanel.shadowRoot!.querySelector<OscdTree>(
      '.tree-container oscd-tree:not(.editors-tree)',
    )!;
    expect(pinnedTree.selectionMode).to.equal('none');
    expect(pinnedTree.selectedIds).to.deep.equal([]);
  });

  it('selects an editor chosen from the pinned tree', async () => {
    const editor = oscdShell._resolvedPlugins.editor[0] as ResolvedPlugin;
    editorPluginsPanel.togglePin(editor.tagName);
    await editorPluginsPanel.updateComplete;

    let selected: ResolvedPlugin | undefined;
    editorPluginsPanel.addEventListener('editor-select', (event: Event) => {
      selected = (event as CustomEvent).detail.editor;
    });

    const pinnedTree = editorPluginsPanel.shadowRoot!.querySelector<OscdTree>(
      '.tree-container oscd-tree:not(.editors-tree)',
    )!;
    await pinnedTree.updateComplete;
    const item = Array.from(
      pinnedTree.shadowRoot!.querySelectorAll('oscd-tree-item'),
    ).find(item => item.textContent?.includes(editor.name))!;
    item.click();
    await editorPluginsPanel.updateComplete;

    expect(selected?.tagName).to.equal(editor.tagName);
    expect(pinnedTree.selectedIds).to.deep.equal([]);
  });

  it('leaves non-activation keys unconsumed by pinned activation handling', async () => {
    const pinnedTree = editorPluginsPanel.shadowRoot!.querySelector<OscdTree>(
      '.pinned-tree',
    )!;
    const selectEditor = sinon.spy(editorPluginsPanel, 'selectEditor');
    const event = new KeyboardEvent('keydown', {
      key: 'a',
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    let propagated = false;
    editorPluginsPanel.addEventListener('keydown', () => {
      propagated = true;
    }, { once: true });

    pinnedTree.dispatchEvent(event);

    expect(selectEditor.called).to.be.false;
    expect(event.defaultPrevented).to.be.false;
    expect(propagated).to.be.true;
  });

  it('leaves activation keys unconsumed when the pinned tree is absent', async () => {
    editorPluginsPanel.searchValue = 'Plugin';
    await editorPluginsPanel.updateComplete;
    expect(editorPluginsPanel.shadowRoot!.querySelector('.pinned-tree')).to.be.null;
    const selectEditor = sinon.spy(editorPluginsPanel, 'selectEditor');

    for (const key of ['Enter', ' ']) {
      const event = new KeyboardEvent('keydown', { key, cancelable: true });
      // @ts-expect-error Exercise the private missing-tree guard directly.
      editorPluginsPanel.handlePinnedKeydown(event);
      expect(event.defaultPrevented).to.be.false;
      expect(event.cancelBubble).to.be.false;
    }
    expect(selectEditor.called).to.be.false;
  });

  it('does not consume Enter or Space from a pinned editor unpin button', async () => {
    const editor = oscdShell._resolvedPlugins.editor[0] as ResolvedPlugin;
    editorPluginsPanel.togglePin(editor.tagName);
    await editorPluginsPanel.updateComplete;
    const pinnedTree = editorPluginsPanel.shadowRoot!.querySelector<OscdTree>(
      '.pinned-tree',
    )!;
    pinnedTree.activeId = editor.tagName;
    await pinnedTree.updateComplete;
    const button = pinnedTree.shadowRoot!.querySelector<HTMLButtonElement>(
      '.accessory button',
    )!;
    expect(button).to.exist;
    const selectEditor = sinon.spy(editorPluginsPanel, 'selectEditor');
    const expandedIds = [...pinnedTree.expandedIds];

    for (const key of ['Enter', ' ']) {
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        composed: true,
        cancelable: true,
      });
      let reachedButton = false;
      button.addEventListener('keydown', () => {
        reachedButton = true;
      }, { once: true });
      button.dispatchEvent(event);
      expect(reachedButton).to.be.true;
      expect(event.defaultPrevented).to.be.false;
      expect(pinnedTree.selectedIds).to.deep.equal([]);
      expect(pinnedTree.expandedIds).to.deep.equal(expandedIds);
    }
    expect(selectEditor.called).to.be.false;
    expect(editorPluginsPanel.pinnedPluginIds).to.include(editor.tagName);
  });

  it('activates pinned editors with Enter and Space without tree selection', async () => {
    const editor = oscdShell._resolvedPlugins.editor[0] as ResolvedPlugin;
    editorPluginsPanel.togglePin(editor.tagName);
    await editorPluginsPanel.updateComplete;
    const pinnedTree = editorPluginsPanel.shadowRoot!.querySelector<OscdTree>(
      '.pinned-tree',
    )!;
    pinnedTree.activeId = editor.tagName;
    await pinnedTree.updateComplete;
    const selectEditor = sinon.spy(editorPluginsPanel, 'selectEditor');
    const activeRow = pinnedTree.shadowRoot!.querySelector(
      '[data-active="true"]',
    )!;

    for (const key of ['Enter', ' ']) {
      activeRow.dispatchEvent(
        new KeyboardEvent('keydown', {
          key,
          bubbles: true,
          composed: true,
        }),
      );
      expect(selectEditor.lastCall.args).to.deep.equal([[editor.tagName]]);
      expect(pinnedTree.selectedIds).to.deep.equal([]);
    }
    expect(selectEditor.callCount).to.equal(2);

    pinnedTree.activeId = 'pinned';
    await pinnedTree.updateComplete;
    pinnedTree.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        composed: true,
      }),
    );
    expect(pinnedTree.expandedIds).to.deep.equal([]);
    expect(pinnedTree.selectedIds).to.deep.equal([]);
  });

  it('selects the group row when collapsed and the editor row when expanded or searching', async () => {
    oscdShell.plugins = { editor: groupedEditorPlugins };
    await oscdShell.updateComplete;
    await editorPluginsPanel.updateComplete;
    const group = editorPluginsPanel.editorTreeNodes[0];
    const editor = (oscdShell._resolvedPlugins.editor[0] as PluginGroup<ResolvedPlugin>)
      .plugins[0];
    editorPluginsPanel.selectedEditor = editor;
    editorPluginsPanel.expandedIds = [];
    await editorPluginsPanel.updateComplete;
    const editorsTree = editorPluginsPanel.shadowRoot!.querySelector<OscdTree>(
      '.editors-tree',
    )!;
    expect(editorsTree.selectedIds).to.deep.equal([group.id]);

    editorPluginsPanel.expandedIds = [group.id!];
    await editorPluginsPanel.updateComplete;
    expect(editorsTree.selectedIds).to.deep.equal([editor.tagName]);

    await setSearch(editor.name);
    expect(editorsTree.selectedIds).to.deep.equal([editor.tagName]);
  });

  it('ignores an editor selection with no id', async () => {
    let dispatched = false;
    editorPluginsPanel.addEventListener('editor-select', () => {
      dispatched = true;
    });
    editorPluginsPanel.selectEditor([]);
    expect(dispatched).to.be.false;
  });

  it('ignores an unknown editor selection id', async () => {
    let dispatched = false;
    editorPluginsPanel.addEventListener('editor-select', () => {
      dispatched = true;
    });
    editorPluginsPanel.selectEditor(['unknown-editor']);
    expect(dispatched).to.be.false;
  });

  describe('transient search mode (collapsed rail)', () => {
    const collapse = async (panel: EditorPluginsPanel) => {
      findPanelToggleButton(panel).click();
      await panel.updateComplete;
      expect(isPanelExpanded(panel)).to.be.false;
    };

    const findRailSearchButton = (panel: EditorPluginsPanel) =>
      panel.shadowRoot!.querySelector(
        '.rail oscd-icon-button.rail-item',
      ) as HTMLElement;

    it('opens the panel without persisting `expanded` when the rail search icon is clicked', async () => {
      await collapse(editorPluginsPanel);
      expect(localStorage.getItem('editor-plugins-panel:expanded')).to.equal(
        JSON.stringify(false),
      );

      findRailSearchButton(editorPluginsPanel).click();
      await editorPluginsPanel.updateComplete;

      expect(editorPluginsPanel.hasAttribute('search-mode')).to.be.true;
      expect(editorPluginsPanel.shadowRoot!.querySelector('.tree-container')).to
        .exist;
      // Still collapsed as far as persisted state is concerned.
      expect(editorPluginsPanel.expanded).to.be.false;
      expect(localStorage.getItem('editor-plugins-panel:expanded')).to.equal(
        JSON.stringify(false),
      );
    });

    it('focuses the search field on entering search mode', async () => {
      await collapse(editorPluginsPanel);
      const focusSpy = sinon.spy(OscdOutlinedSearchField.prototype, 'focus');

      findRailSearchButton(editorPluginsPanel).click();
      await editorPluginsPanel.updateComplete;
      // The focus() call is chained off `updateComplete.then(...)`; await it
      // again so that microtask has a chance to run.
      await editorPluginsPanel.updateComplete;

      expect(focusSpy.called).to.be.true;
      focusSpy.restore();
    });

    it('exits search mode (and clears the query) on Escape', async () => {
      await collapse(editorPluginsPanel);
      findRailSearchButton(editorPluginsPanel).click();
      await editorPluginsPanel.updateComplete;
      await setSearch('Plugin 2');
      expect(editorPluginsPanel.searchValue).to.equal('Plugin 2');

      editorPluginsPanel.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      await editorPluginsPanel.updateComplete;

      expect(editorPluginsPanel.hasAttribute('search-mode')).to.be.false;
      expect(editorPluginsPanel.searchValue).to.equal('');
    });

    it('ignores Escape when not in search mode', async () => {
      await collapse(editorPluginsPanel);
      editorPluginsPanel.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      await editorPluginsPanel.updateComplete;
      expect(isPanelExpanded(editorPluginsPanel)).to.be.false;
    });

    it('exits search mode on selecting an editor, without persisting expanded', async () => {
      await collapse(editorPluginsPanel);
      findRailSearchButton(editorPluginsPanel).click();
      await editorPluginsPanel.updateComplete;

      let selected: ResolvedPlugin | undefined;
      editorPluginsPanel.addEventListener('editor-select', (event: Event) => {
        selected = (event as CustomEvent).detail.editor;
      });
      const tagName = (oscdShell._resolvedPlugins.editor[0] as ResolvedPlugin)
        .tagName;
      editorPluginsPanel.selectEditor([tagName]);
      await editorPluginsPanel.updateComplete;

      expect(selected?.tagName).to.equal(tagName);
      expect(editorPluginsPanel.hasAttribute('search-mode')).to.be.false;
      expect(editorPluginsPanel.expanded).to.be.false;
    });

    it('selects a root editor from the collapsed rail', async () => {
      await collapse(editorPluginsPanel);

      const editor = oscdShell._resolvedPlugins.editor[0] as ResolvedPlugin;
      const railEditors = editorPluginsPanel.shadowRoot!.querySelectorAll(
        '.rail > oscd-icon-button.rail-item',
      );
      const railEditor = railEditors[2] as HTMLElement;
      expect(!!railEditor).to.be.true;
      let selected: ResolvedPlugin | undefined;
      editorPluginsPanel.addEventListener('editor-select', (event: Event) => {
        selected = (event as CustomEvent).detail.editor;
      });

      railEditor.dispatchEvent(
        new MouseEvent('click', { bubbles: true, composed: true }),
      );
      await editorPluginsPanel.updateComplete;

      expect(selected?.tagName).to.equal(editor.tagName);
    });
  });

  describe('pinned/editor tree expansion event handling', () => {
    it('updates pinnedExpanded on the pinned tree expanded-ids-changed event', async () => {
      const tagName = (oscdShell._resolvedPlugins.editor[0] as ResolvedPlugin)
        .tagName;
      editorPluginsPanel.togglePin(tagName);
      await editorPluginsPanel.updateComplete;

      const pinnedTree = editorPluginsPanel.shadowRoot!.querySelector(
        '.tree-container oscd-tree:not(.editors-tree)',
      )!;
      pinnedTree.dispatchEvent(
        new CustomEvent('expanded-ids-changed', {
          detail: { expandedIds: ['pinned'] },
        }),
      );
      await editorPluginsPanel.updateComplete;

      expect(editorPluginsPanel.pinnedExpanded).to.deep.equal(['pinned']);
    });

    it('updates expandedIds on the editor tree expanded-ids-changed event', async () => {
      const editorsTree = editorPluginsPanel.shadowRoot!.querySelector(
        '.tree-container oscd-tree.editors-tree',
      )!;
      editorsTree.dispatchEvent(
        new CustomEvent('expanded-ids-changed', {
          detail: { expandedIds: ['group:0:Communication'] },
        }),
      );
      await editorPluginsPanel.updateComplete;

      expect(editorPluginsPanel.expandedIds).to.deep.equal([
        'group:0:Communication',
      ]);
    });
  });

  describe('grouped editors and collapsed rail flyouts', () => {
    let groupedShell: OscdShell;
    let groupedPanel: EditorPluginsPanel;

    beforeEach(async () => {
      groupedShell = <OscdShell>(
        await fixture(
          html`<oscd-shell
            .docs=${docs}
            docName=${Object.keys(docs)[0]}
          ></oscd-shell>`,
        )
      );
      groupedShell.plugins = { editor: groupedEditorPlugins };
      groupedPanel = groupedShell.shadowRoot!.querySelector(
        'editor-plugins-panel',
      )!;
      await groupedShell.updateComplete;
      await groupedPanel.updateComplete;
      // Start from the collapsed rail, where the group flyout lives.
      findPanelToggleButton(groupedPanel).click();
      await groupedPanel.updateComplete;
      extraShells.push(groupedShell);
    });

    const findGroupRailButton = () =>
      groupedPanel.shadowRoot!.querySelector('#rail-group-0') as HTMLElement;

    const findGroupFlyoutMenu = () =>
      groupedPanel.shadowRoot!.querySelector(
        'oscd-menu.rail-flyout[data-flyout="group-0"]',
      ) as OscdMenu;

    it('shows a disabled placeholder in the empty pinned flyout', () => {
      const pinnedFlyout = groupedPanel.shadowRoot!.querySelector(
        'oscd-menu.rail-flyout[data-flyout="pinned"]',
      );
      const placeholder = pinnedFlyout?.querySelector('oscd-menu-item');

      expect(placeholder?.hasAttribute('disabled')).to.be.true;
      expect(placeholder?.textContent).to.contain(
        'Items you pin will appear here',
      );
    });

    it('opens the group flyout menu on rail icon click', async () => {
      const menu = findGroupFlyoutMenu();
      expect(menu.open).to.be.false;

      findGroupRailButton().click();
      await groupedPanel.updateComplete;

      expect(menu.open).to.be.true;
    });

    it('closes the group flyout menu on a second rail icon click', async () => {
      findGroupRailButton().click();
      await groupedPanel.updateComplete;
      expect(findGroupFlyoutMenu().open).to.be.true;

      findGroupRailButton().click();
      await groupedPanel.updateComplete;

      expect(findGroupFlyoutMenu().open).to.be.false;
    });

    it('does not throw when toggling a flyout with no matching anchor', () => {
      expect(() =>
        // @ts-expect-error toggleFlyout is private; exercised directly to
        // cover the defensive "no matching anchor" guard.
        groupedPanel.toggleFlyout('unknown-group'),
      ).to.not.throw();
    });

    it('dispatches editor-select when a flyout item is clicked', async () => {
      findGroupRailButton().click();
      await groupedPanel.updateComplete;

      let selected: ResolvedPlugin | undefined;
      groupedPanel.addEventListener('editor-select', (event: Event) => {
        selected = (event as CustomEvent).detail.editor;
      });

      const flyoutItem = findGroupFlyoutMenu().querySelector('oscd-menu-item');
      flyoutItem!.dispatchEvent(new Event('click', { bubbles: true }));
      await groupedPanel.updateComplete;

      expect(selected?.tagName).to.equal('test-grouped-editor-1');
    });

    it('expands a group when its tree selection is committed', async () => {
      findPanelToggleButton(groupedPanel).click();
      await groupedPanel.updateComplete;

      const editorsTree = groupedPanel.shadowRoot!.querySelector(
        '.editors-tree',
      ) as OscdTree;
      editorsTree.dispatchEvent(
        new CustomEvent('selected-ids-changed', {
          detail: { selectedIds: ['group:0:Grouped Editors'] },
          bubbles: true,
        }),
      );
      await groupedPanel.updateComplete;

      expect(editorsTree.expandedIds).to.include('group:0:Grouped Editors');
    });

    it('marks the rail group icon active when one of its plugins is selected', async () => {
      groupedPanel.selectedEditor = {
        name: 'Grouped Editor 1',
        tagName: 'test-grouped-editor-1',
        icon: 'coronavirus',
      };
      await groupedPanel.updateComplete;

      expect(findGroupRailButton().classList.contains('active')).to.be.true;
    });

    it('preserves popout selection after ArrowDown and reopening, and updates it when the current editor changes', async () => {
      const editor = groupedEditorPlugins[0].plugins[0];
      groupedPanel.selectedEditor = editor;
      await groupedPanel.updateComplete;

      const items = findGroupFlyoutMenu().querySelectorAll('oscd-menu-item');
      expect(items[0].selected).to.be.true;
      expect(items[1].selected).to.be.false;

      const menu = findGroupFlyoutMenu();
      await menu.show();
      items[0].focus();
      items[0].dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          composed: true,
        }),
      );
      expect(items[0].selected).to.be.true;
      expect(items[1].selected).to.be.false;
      await menu.close();
      await menu.show();
      expect(items[0].selected).to.be.true;
      expect(items[1].selected).to.be.false;

      groupedPanel.selectedEditor = groupedEditorPlugins[0].plugins[1];
      await groupedPanel.updateComplete;
      expect(items[0].selected).to.be.false;
      expect(items[1].selected).to.be.true;
    });

    it('does not mark the current editor in the pinned popout', async () => {
      const editor = groupedEditorPlugins[0].plugins[0];
      groupedPanel.togglePin(editor.tagName);
      groupedPanel.selectedEditor = editor;
      await groupedPanel.updateComplete;

      const pinnedMenu = groupedPanel.shadowRoot!.querySelector(
        'oscd-menu[data-flyout="pinned"]',
      )!;
      expect(pinnedMenu.querySelector('oscd-menu-item')).to.exist;
      expect(pinnedMenu.querySelector('oscd-menu-item')!.selected).to.be.false;
    });
  });
});
