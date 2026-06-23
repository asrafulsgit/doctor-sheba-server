import slugify from "slugify";

export const getSlug = (title: string) => {
  return slugify(title, {
    lower: true,
    strict: true,
    trim: true,
  });
};
