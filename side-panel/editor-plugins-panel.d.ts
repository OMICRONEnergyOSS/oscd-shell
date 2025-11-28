import { LitElement } from 'lit';
import { OscdIconButton } from '@omicronenergy/oscd-ui/iconbutton/OscdIconButton.js';
import { OscdIcon } from '@omicronenergy/oscd-ui/icon/OscdIcon.js';
import { OscdList } from '@omicronenergy/oscd-ui/list/OscdList.js';
import { OscdListItem } from '@omicronenergy/oscd-ui/list/OscdListItem.js';
import { LocaleTag } from '../localization.js';
import { PluginEntry } from '../oscd-shell.js';
declare global {
    interface HTMLElementTagNameMap {
        'editor-plugins-panel': EditorPluginsPanel;
    }
}
declare const EditorPluginsPanel_base: typeof LitElement & import("@open-wc/scoped-elements/lit-element.js").ScopedElementsHostConstructor;
export declare class EditorPluginsPanel extends EditorPluginsPanel_base {
    static scopedElements: {
        'oscd-icon-button': typeof OscdIconButton;
        'oscd-icon': typeof OscdIcon;
        'oscd-list': typeof OscdList;
        'oscd-list-item': typeof OscdListItem;
    };
    editors: PluginEntry[];
    editorIndex: number;
    locale: LocaleTag;
    get expanded(): boolean;
    set expanded(expanded: boolean);
    render(): import("lit-html").TemplateResult<1>;
    static styles: import("lit").CSSResult;
}
export {};
