export declare function getFirstTextNodeContent(element: Element | null): string | undefined;
export declare function querySelectorContainingText(scope: Element, selector: string, text: string): Element | undefined;
export declare function simulateKeypressOnElement(key: string, ctrlKey: boolean): void;
export declare function waitForDialogState(dialog: Element, state: 'open' | 'closed'): Promise<Element>;
/**
 * Finds a control, typically a button (but in theory could be some other component) by selector + enclosed icon name (inside an oscd-icon).
 * @param root The root element to search within.
 * @param buttonSelector The selector (e.g. 'oscd-filled-icon-button').
 * @param iconName The icon name to match (text content of enclosed oscd-icon).
 * @returns The matching button element or null.
 */
export declare function findButtonByIcon(root: ParentNode, buttonSelector: string, iconName: string): HTMLElement | null;
