import '../oscd-shell.js';
export declare function newRenameEvent(oldName: string, newName: string): CustomEvent<{
    oldName: string;
    newName: string;
}>;
