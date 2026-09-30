// slug không dấu + hậu tố ngẫu nhiên để không bao giờ trùng
export const makeSlug = (s) =>
  `${
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'item'
  }-${Math.random().toString(36).slice(2, 6)}`
