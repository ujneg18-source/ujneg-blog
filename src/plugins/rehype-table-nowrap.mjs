// 짧은 표 셀(텍스트 16자 이하)은 줄바꿈하지 않도록 nowrap 클래스를 붙인다.
const MAX = 16;

function text(node) {
  if (node.type === 'text') return node.value;
  return (node.children || []).map(text).join('');
}

function walk(node) {
  if (node.type === 'element' && (node.tagName === 'td' || node.tagName === 'th')) {
    const hasImg = JSON.stringify(node).includes('"tagName":"img"');
    if (!hasImg && text(node).trim().length <= MAX) {
      const p = (node.properties ||= {});
      const cls = p.className ? [].concat(p.className) : [];
      p.className = [...cls, 'nowrap'];
    }
  }
  (node.children || []).forEach(walk);
}

export default function rehypeTableNowrap() {
  return (tree) => walk(tree);
}
