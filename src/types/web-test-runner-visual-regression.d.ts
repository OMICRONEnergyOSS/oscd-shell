declare module '@web/test-runner-visual-regression' {
  export function visualDiff(element: Node, name: string): Promise<void>;
}
