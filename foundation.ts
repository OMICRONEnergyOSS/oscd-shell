import { LitElement } from 'lit';

/** Constructor type for defining `LitElement` mixins. */
export type LitElementConstructor = new (...args: any[]) => LitElement;

export { cyrb64 } from './foundation/cyrb64.js';
