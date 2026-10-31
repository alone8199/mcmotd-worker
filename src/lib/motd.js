/**
 * 将任意格式的 MOTD（字符串或 JSON 文本组件）转换为纯文本，并去掉 § 格式码。
 * 与原版 queryService.js 中的 motdToPlainText 行为一致。
 */
const FORMAT_CODE = /§[0-9a-fk-or]/g;

export function motdToPlainText(motd) {
  if (!motd) return '';

  if (typeof motd === 'string') {
    return motd.replace(FORMAT_CODE, '');
  }

  if (typeof motd === 'object') {
    let plain = '';

    const walk = (component) => {
      if (typeof component === 'string') {
        plain += component;
        return;
      }
      if (component && component.text) {
        plain += component.text;
      }
      if (component && Array.isArray(component.extra)) {
        component.extra.forEach(walk);
      }
    };

    walk(motd);
    return plain.replace(FORMAT_CODE, '');
  }

  return '';
}
