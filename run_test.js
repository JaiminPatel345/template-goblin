const doc = { fontSize: () => {}, widthOfString: () => 100, text: () => {}, save: () => {}, rect: () => ({ fill: () => {}, clip: () => {} }), fillColor: () => {}, restore: () => {} };
const { renderText } = require('./packages/core/dist/render/text.js');
renderText(doc, { x: 0, y: 0, width: 200, height: 50, style: { fontSize: 60, lineHeight: 1.2, maxRows: 2, overflowMode: 'truncate' } }, 'Hello World', new Map());
