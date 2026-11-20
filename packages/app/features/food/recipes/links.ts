/** The person's own recipes, as a full list. */
export const MY_RECIPES_HREF = '/food/my-recipes';

/** The recipe editor: a new recipe, or an own recipe to edit. */
export function recipeEditorHref(id?: string) {
  return id ? `/food/recipe?id=${encodeURIComponent(id)}` : '/food/recipe';
}
