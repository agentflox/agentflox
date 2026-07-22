const fs = require('fs');
const ts = require('typescript');
const content = fs.readFileSync('apps/frontend/src/entities/task/components/TaskDetailModal.tsx', 'utf-8');
const sourceFile = ts.createSourceFile('TaskDetailModal.tsx', content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function printErrors(node) {
  if (node.kind === ts.SyntaxKind.JsxElement) {
    if (node.openingElement.tagName.getText() !== node.closingElement.tagName.getText()) {
      console.log('Mismatched tags: <' + node.openingElement.tagName.getText() + '> and </' + node.closingElement.tagName.getText() + '> at pos ' + node.pos);
    }
  }
  ts.forEachChild(node, printErrors);
}
printErrors(sourceFile);
console.log('Done checking AST');

