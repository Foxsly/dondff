//yacht-fisher shuffle: https://github.com/queviva/yacht-fisher
export const shuffle = (v, r = [...v]) => v.map(() => r.splice(~~(Math.random() * r.length), 1)[0]);
