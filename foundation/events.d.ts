export type CloseDetail = {
    docName: string;
};
/** Represents the intent to close the document with filename `docName`. */
export type CloseEvent = CustomEvent<CloseDetail>;
export type RenameDetail = {
    oldName: string;
    newName: string;
};
/** Represents the intent to rename the document with filename `docName`. */
export type RenameEvent = CustomEvent<RenameDetail>;
declare global {
    interface ElementEventMap {
        ['oscd-close']: CloseEvent;
        ['oscd-rename']: RenameEvent;
    }
}
