import { PluginMetadata, PluginGroup, ResolvedPlugin, OscdPlugin, SourcedPlugin, TaggedPlugin } from '../oscd-shell.js';
/**
 * Helper fn to filter root plugins and grouped plugins, whilst preserving the structure.
 */
export declare function filterPlugins(pluginItems: (ResolvedPlugin | PluginGroup<ResolvedPlugin>)[], predicate: (plugin: ResolvedPlugin) => boolean): (ResolvedPlugin | PluginGroup<ResolvedPlugin>)[];
/**
 * Returns a flattened array of all plugin entries from a given PluginSet, including those nested within PluginGroups.
 */
export declare function flattenPluginEntries<P extends PluginMetadata = ResolvedPlugin>(pluginSet: (P | PluginGroup<P>)[]): P[];
/**
 * Filters plugins by a search term, matching (case-insensitively) against the
 * leaf plugin names only - group names are intentionally not matched. When a
 * `locale` is given, the plugin's localized label (`translations[locale]`) is
 * also matched, so users can search by the label they see. The group structure
 * is preserved and empty groups are dropped. An empty or whitespace-only term
 * returns the plugins unchanged.
 */
export declare function filterBySearchTerm(editors: (ResolvedPlugin | PluginGroup<ResolvedPlugin>)[], searchTerm: string, locale?: string): (ResolvedPlugin | PluginGroup<ResolvedPlugin>)[];
/**
 * Flattens plugins (including those nested within groups) and returns the leaf
 * entries whose tagName is included in the given pinnedIds.
 */
export declare function filterByPinned(editors: (ResolvedPlugin | PluginGroup<ResolvedPlugin>)[], pinnedIds: string[]): ResolvedPlugin[];
export declare function isPluginGroup<P extends PluginMetadata = ResolvedPlugin>(item: unknown): item is PluginGroup<P>;
/**
 * Checks whether the given object carries a `tagName`, i.e. names an element
 * the shell does not have to load itself.
 * @param item - The object to check.
 * @returns true if the object is a TaggedPlugin, false otherwise.
 */
export declare function isTaggedPlugin(item: unknown): item is TaggedPlugin;
/**
 * Checks if the given object is a SourcedPlugin.
 * @param item - The object to check.
 * @returns true if the object is a SourcedPlugin, false otherwise.
 */
export declare function isSourcedPlugin(item: unknown): item is SourcedPlugin;
/**
 * Validates a Plugin object, checking for required fields and types.
 * If the plugin is invalid, it logs an error and returns undefined.
 * @param plugin - The plugin object to validate.
 * @returns The validated Plugin object or undefined if invalid.
 */
export declare function validatePlugin(plugin: unknown): ResolvedPlugin | undefined;
/**
 * Resolves a declared plugin list into its render form: every entry is
 * validated and comes back with a `tagName`, sourced entries having been
 * imported into the registry under a tag derived from their `src`.
 *
 * `src` is checked before `tagName`, so an entry carrying both is re-resolved
 * from source rather than trusting a tag that may be stale. `src` is dropped
 * from the result - the declared set remains the record of where a plugin
 * came from.
 *
 * If a sourced plugin fails to load (bad src), it is replaced with an Error Web Component.
 * @param plugins - Array of declared plugins to resolve.
 * @returns Array of resolved plugins, each with a tagName.
 */
export declare function loadSourcedPlugins(plugins: OscdPlugin[], registry: CustomElementRegistry): ResolvedPlugin[];
export declare function loadSourcedPlugins(plugins: (OscdPlugin | PluginGroup<OscdPlugin>)[], registry: CustomElementRegistry): (ResolvedPlugin | PluginGroup<ResolvedPlugin>)[];
