import { LitElement } from 'lit';
import { OscdIcon } from '@omicronenergy/oscd-ui/icon/OscdIcon.js';
import { OscdTextButton } from '@omicronenergy/oscd-ui/button/OscdTextButton.js';
import { PluginEntry } from '../oscd-shell.js';
import { LocaleTag } from '../localization.js';
import { OscdElevation } from '@omicronenergy/oscd-ui/elevation/OscdElevation.js';
declare global {
    interface HTMLElementTagNameMap {
        'landing-page': LandingPage;
    }
}
declare const LandingPage_base: typeof LitElement & import("@open-wc/scoped-elements/lit-element.js").ScopedElementsHostConstructor;
export declare class LandingPage extends LandingPage_base {
    static scopedElements: {
        'oscd-icon': typeof OscdIcon;
        'oscd-text-button': typeof OscdTextButton;
        'oscd-elevation': typeof OscdElevation;
    };
    heading: string;
    subHeading: string;
    menuPlugins: PluginEntry[];
    locale: LocaleTag;
    render(): import("lit-html").TemplateResult<1>;
    static styles: import("lit").CSSResult;
}
export {};
