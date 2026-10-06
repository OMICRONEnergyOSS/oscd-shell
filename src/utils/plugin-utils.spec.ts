import { expect } from '@open-wc/testing';
import {
  isTaggedPlugin,
  isSourcedPlugin,
  validatePlugin,
  filterBySearchTerm,
  filterByPinned,
  loadSourcedPlugins,
} from './plugin-utils.js';
import { PluginGroup, ResolvedPlugin } from '../oscd-shell.js';

describe('Plugin Utils', () => {
  describe('isTaggedPlugin', () => {
    it('returns true for a plugin with a string tagName', () => {
      const plugin = {
        tagName: 'test-plugin',
        name: 'Test Plugin',
        icon: 'test-icon',
        requireDoc: false,
      };
      expect(plugin).satisfies(isTaggedPlugin);
    });

    it('should return false for an object without tagName', () => {
      const plugin = {
        name: 'Test Plugin',
        icon: 'test-icon',
        requireDoc: false,
      };
      expect(plugin).to.not.satisfy(isTaggedPlugin);
    });

    it('returns false for a sourced plugin without a tagName', () => {
      const plugin = {
        name: 'Test Plugin',
        icon: 'test-icon',
        src: 'data:text/javascript;charset=utf-8,import%20%7B%20default%20as%20TestPlugin%20%7D%20from%20"./test-plugin.js";',
      };
      expect(plugin).to.not.satisfy(isTaggedPlugin);
    });
  });

  describe('isSourcedPlugin', () => {
    it('returns true for a plugin with a string src', () => {
      const plugin = {
        name: 'Test Plugin',
        src: 'data:text/javascript;charset=utf-8,import%20%7B%20default%20as%20TestPlugin%20%7D%20from%20"./test-plugin.js";',
        icon: 'test-icon',
      };
      expect(plugin).satisfies(isSourcedPlugin);
    });

    it('should return false for an object without a src field', () => {
      const plugin = {
        name: 'Test Plugin',
        icon: 'test-icon',
      };
      expect(plugin).not.to.satisfy(isSourcedPlugin);
    });

    it('returns false for a tagged plugin without a src', () => {
      const plugin = {
        name: 'Test Plugin',
        icon: 'test-icon',
        tagName: 'test-plugin',
      };
      expect(plugin).not.to.satisfy(isSourcedPlugin);
    });
  });
});

describe('validatePlugin', () => {
  it('returns the original plugin object for a valid tagged definition', async () => {
    const plugin = {
      name: 'Tagless, Sourceless, Hopeless Plugin',
      icon: 'coronavirus',
      tagName: 'test-tagless-plugin',
    };

    expect(validatePlugin(plugin)).to.equal(plugin);
  });

  it('rejects a plugin definition missing tagName', async () => {
    const plugin = {
      icon: 'coronavirus',
      name: 'Tagless, Sourceless, Hopeless Plugin',
    };

    expect(validatePlugin(plugin)).to.equal(undefined);
  });

  it('rejects a plugin definition missing name', async () => {
    const plugin = {
      icon: 'coronavirus',
      tagName: 'test-tagless-plugin',
    };

    expect(validatePlugin(plugin)).to.equal(undefined);
  });

  it('rejects a plugin definition missing icon', async () => {
    const plugin = {
      name: 'Tagless, Sourceless, Hopeless Plugin',
      tagName: 'test-tagless-plugin',
    };

    expect(validatePlugin(plugin)).to.equal(undefined);
  });

  it('rejects an otherwise valid definition with non-boolean requireDoc', async () => {
    const plugin = {
      name: 'Tagless, Sourceless, Hopeless Plugin',
      tagName: 'test-tagless-plugin',
      icon: 'coronavirus',
      requireDoc: 'not-a-boolean',
    };

    expect(validatePlugin(plugin)).to.equal(undefined);
  });

  it('rejects an otherwise valid definition with non-object translations', async () => {
    const plugin = {
      name: 'Tagless, Sourceless, Hopeless Plugin',
      tagName: 'test-tagless-plugin',
      icon: 'coronavirus',
      translations: 'ops',
    };

    expect(validatePlugin(plugin)).to.equal(undefined);
  });

  it('rejects an otherwise valid definition with a non-string translation value', async () => {
    const plugin = {
      name: 'Tagless, Sourceless, Hopeless Plugin',
      tagName: 'test-tagless-plugin',
      icon: 'coronavirus',
      translations: {
        en: 'Tagless, Sourceless, Hopeless Plugin',
        fr: 123, // Invalid translation (not a string)
      },
    };

    expect(validatePlugin(plugin)).to.equal(undefined);
  });
});

describe('filterBySearchTerm', () => {
  const leaf = (name: string, tagName: string): ResolvedPlugin => ({
    name,
    tagName,
    icon: 'margin',
  });
  const group = (
    name: string,
    plugins: ResolvedPlugin[],
  ): PluginGroup<ResolvedPlugin> => ({
    name,
    icon: 'folder',
    plugins,
  });

  const editors: (ResolvedPlugin | PluginGroup<ResolvedPlugin>)[] = [
    leaf('Substation Editor', 'oscd-substation'),
    leaf('Single Line Diagram', 'oscd-sld'),
    group('Communication', [
      leaf('GOOSE Editor', 'oscd-goose'),
      leaf('Sampled Values', 'oscd-smv'),
    ]),
  ];

  it('returns the plugins unchanged for an empty term', () => {
    expect(filterBySearchTerm(editors, '')).to.equal(editors);
  });

  it('returns the plugins unchanged for a whitespace-only term', () => {
    expect(filterBySearchTerm(editors, '   ')).to.equal(editors);
  });

  it('matches leaf plugin names case-insensitively', () => {
    const result = filterBySearchTerm(editors, 'EDITOR');
    const names = result.flatMap(item =>
      'plugins' in item ? item.plugins.map(p => p.name) : [item.name],
    );
    expect(names).to.have.members(['Substation Editor', 'GOOSE Editor']);
  });

  it('matches anywhere within a plugin name, not just the start', () => {
    const result = filterBySearchTerm(editors, 'line');
    expect(result).to.have.lengthOf(1);
    expect((result[0] as ResolvedPlugin).name).to.equal('Single Line Diagram');
  });

  it('preserves group structure and keeps only matching children', () => {
    const result = filterBySearchTerm(editors, 'goose');
    expect(result).to.have.lengthOf(1);
    const communication = result[0] as PluginGroup<ResolvedPlugin>;
    expect(communication.name).to.equal('Communication');
    expect(communication.plugins.map(p => p.name)).to.deep.equal([
      'GOOSE Editor',
    ]);
  });

  it('drops groups whose children do not match', () => {
    const result = filterBySearchTerm(editors, 'substation');
    expect(
      result.some(item => 'plugins' in item && item.name === 'Communication'),
    ).to.be.false;
  });

  it('does not match against group names', () => {
    expect(filterBySearchTerm(editors, 'Communication')).to.be.empty;
  });

  it('matches the localized label when a locale is given', () => {
    const localized: (ResolvedPlugin | PluginGroup<ResolvedPlugin>)[] = [
      {
        ...leaf('Substation Editor', 'oscd-substation'),
        translations: { de: 'Unterstation' },
      },
      leaf('Single Line Diagram', 'oscd-sld'),
    ];
    const result = filterBySearchTerm(localized, 'unterstation', 'de');
    expect(result).to.have.lengthOf(1);
    expect((result[0] as ResolvedPlugin).tagName).to.equal('oscd-substation');
  });

  it('does not match the localized label when no locale is given', () => {
    const localized: (ResolvedPlugin | PluginGroup<ResolvedPlugin>)[] = [
      {
        ...leaf('Substation Editor', 'oscd-substation'),
        translations: { de: 'Unterstation' },
      },
    ];
    expect(filterBySearchTerm(localized, 'unterstation')).to.be.empty;
  });
});

describe('filterByPinned', () => {
  const leaf = (name: string, tagName: string): ResolvedPlugin => ({
    name,
    tagName,
    icon: 'margin',
  });
  const editors: (ResolvedPlugin | PluginGroup<ResolvedPlugin>)[] = [
    leaf('Substation Editor', 'oscd-substation'),
    {
      name: 'Communication',
      icon: 'folder',
      plugins: [
        leaf('GOOSE Editor', 'oscd-goose'),
        leaf('Sampled Values', 'oscd-smv'),
      ],
    },
  ];

  it('returns flattened leaf entries whose tagName is pinned', () => {
    const result = filterByPinned(editors, ['oscd-substation', 'oscd-smv']);
    expect(result.map(p => p.tagName)).to.deep.equal([
      'oscd-substation',
      'oscd-smv',
    ]);
  });

  it('finds pinned plugins nested within groups', () => {
    const result = filterByPinned(editors, ['oscd-goose']);
    expect(result).to.have.lengthOf(1);
    expect(result[0].name).to.equal('GOOSE Editor');
  });

  it('returns an empty array when nothing is pinned', () => {
    expect(filterByPinned(editors, [])).to.be.empty;
  });

  it('ignores pinned ids that do not match any plugin', () => {
    expect(filterByPinned(editors, ['does-not-exist'])).to.be.empty;
  });
});

describe('loadSourcedPlugins', () => {
  const src =
    'data:text/javascript;charset=utf-8,export%20default%20class%20extends%20HTMLElement%20%7B%7D';

  it('derives a tagName from src and drops src from the render form', () => {
    const [resolved] = loadSourcedPlugins(
      [{ name: 'Sourced', icon: 'icon', src }],
      customElements,
    );

    expect(resolved.tagName).to.match(/^oscd-p/);
    expect(resolved).to.not.have.property('src');
  });

  it('derives the same tagName for the same src, so repeated loads are stable', () => {
    const [first] = loadSourcedPlugins(
      [{ name: 'Sourced', icon: 'icon', src }],
      customElements,
    );
    const [second] = loadSourcedPlugins(
      [{ name: 'Sourced', icon: 'icon', src }],
      customElements,
    );

    expect(second).to.deep.equal(first);
  });

  it('resolves from src when an entry carries both src and a stale tagName', () => {
    const [resolved] = loadSourcedPlugins(
      [{ name: 'Sourced', icon: 'icon', src, tagName: 'oscd-pSTALE' }],
      customElements,
    );

    expect(resolved.tagName).to.not.equal('oscd-pSTALE');
  });

  it('passes a tagName-only entry through unchanged', () => {
    const [resolved] = loadSourcedPlugins(
      [{ name: 'Tagged', icon: 'icon', tagName: 'oscd-tagged' }],
      customElements,
    );

    expect(resolved).to.deep.equal({
      name: 'Tagged',
      icon: 'icon',
      tagName: 'oscd-tagged',
    });
  });
});
