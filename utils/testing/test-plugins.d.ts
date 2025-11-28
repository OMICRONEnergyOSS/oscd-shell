import { LitElement } from 'lit';
export declare class TestMenuPlugin1 extends LitElement {
    docVersion: number;
    run(): Promise<boolean>;
}
export declare class TestBackgroundPlugin extends HTMLElement {
    constructor();
}
export declare const testMenuPlugin1: {
    name: string;
    translations: {
        de: string;
    };
    tagName: string;
    icon: string;
    requireDoc: boolean;
};
export declare const testMenuPlugin2: {
    name: string;
    translations: {
        de: string;
    };
    src: string;
    icon: string;
    requireDoc: boolean;
};
export declare const testEditorPlugin: {
    name: string;
    translations: {
        de: string;
    };
    src: string;
    icon: string;
    requireDoc: boolean;
};
export declare const testEditorPlugin2: {
    name: string;
    translations: {
        de: string;
    };
    src: string;
    icon: string;
    requireDoc: boolean;
};
