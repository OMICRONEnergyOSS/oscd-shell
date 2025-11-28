import { OscdShell } from '../../oscd-shell.js';
export declare const nonSclDocString = "<testdoc></testdoc>";
export declare const sclDocString = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n  <SCL version=\"2007\" revision=\"B\" xmlns=\"http://www.iec.ch/61850/2003/SCL\" xmlns:ens1=\"http://example.org/somePreexistingExtensionNamespace\">\n  <Substation ens1:foo=\"a\" name=\"A1\" desc=\"test substation\"></Substation>\n</SCL>";
export declare const createNonSclDocument: () => Document;
export declare const createSclDocument: () => Document;
export declare const openDocOnShell: (shell: OscdShell, docName: string, doc: XMLDocument) => Promise<void>;
export declare function createTestDocs(amount: number): any;
