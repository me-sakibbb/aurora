/** The recipe editor: a new recipe, or an own recipe to edit. */
export function recipeEditorHref(id?: string) {
  return id ? `/food/recipe?id=${encodeURIComponent(id)}` : '/food/recipe';
}
