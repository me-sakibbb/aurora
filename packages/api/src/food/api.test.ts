import { apiFetch } from '../backend';
import {
  createCustomRecipe,
  createFoodLog,
  deleteCustomRecipe,
  type FoodItem,
  fetchFoodCatalogue,
  fetchFoodPage,
  fetchRecipe,
  fetchRecipeDetail,
  identifyMealPhoto,
  matchCatalogue,
  mealCandidateFood,
  mealPhotoSessionId,
  mergeResults,
  methodIgnored,
  normalizeQuery,
  offsetIgnored,
  photoUrl,
  previewRecipeNutrition,
  searchIngredients,
} from './api';

const searchFoods = (search: string) => fetchFoodPage({ offset: 0, search });

jest.mock('../backend', () => ({
  ...jest.requireActual('../backend'),
  apiFetch: jest.fn(),
}));

const mockFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

const food = (id: string, name: string, name_bn: string | null = null): FoodItem => ({
  id,
  name,
  name_bn,
  cooking_method: 'other',
  servings: 1,
  weight_g: 100,
  kcal_per_100g: 100,
  nutrients_per_100g: null,
  image_url: null,
  thumbnail_url: null,
  is_custom: false,
  kcal_range: null,
  questions: [],
});

const MASOOR = food('1', 'Masoor Dal', 'মসুর ডাল');
const ALU = food('2', 'Alu Bhorta (Mashed Potato)', 'আলু ভর্তা');
const BHAT = food('3', 'Bhat (Steamed Rice)', 'ভাত');
const CATALOGUE = [ALU, BHAT, MASOOR];

describe('fetchFoodPage', () => {
  it('sends the trimmed query and keeps the figures as returned', async () => {
    mockFetch.mockResolvedValueOnce({
      recipes: [
        {
          id: 'r1',
          name: 'Bhat (Steamed Rice)',
          name_bn: 'ভাত',
          cooking_method: 'bhat',
          servings: 1,
          weight_g: 200,
          yield_factor: 2.5,
          kcal_per_100g: 138,
          nutrients_per_100g: { kcal: 138, protein_g: 2.6, fat_g: 0.1, iron_mg: 0.3 },
        },
      ],
    });

    const results = await searchFoods('  bhat ');

    expect(mockFetch).toHaveBeenCalledWith('/food/recipes?limit=20&offset=0&search=bhat', {
      signal: undefined,
    });
    expect(results[0]).toMatchObject({
      id: 'r1',
      name_bn: 'ভাত',
      kcal_per_100g: 138,
      nutrients_per_100g: { kcal: 138, protein_g: 2.6, fat_g: 0.1 },
      image_url: null,
      kcal_range: null,
    });
  });

  it('reads the thumbnail as the photo', async () => {
    mockFetch.mockResolvedValueOnce({
      recipes: [{ id: 'r1', name: 'Biryani', thumbnail_url: 'https://cdn.example/biryani.jpg' }],
    });
    const [item] = await searchFoods('biryani');
    expect(item?.image_url).toBe('https://cdn.example/biryani.jpg');
  });

  it("treats the backend's placeholder thumbnail as no photo", async () => {
    mockFetch.mockResolvedValueOnce({
      recipes: [
        { id: 'r1', name: 'Biryani', thumbnail_url: 'https://placehold.co/640x480?text=Recipe' },
      ],
    });
    const [item] = await searchFoods('biryani');
    expect(item?.image_url).toBeNull();
  });

  it('reads recipe questions, required by default', async () => {
    mockFetch.mockResolvedValueOnce({
      recipes: [
        {
          id: 'r1',
          name: 'Biryani',
          questions: [
            {
              id: 'meat_ratio',
              prompt: 'How much meat relative to rice?',
              choices: [
                { value: 'less', label: 'Less meat' },
                { value: 'more', label: 'More meat' },
              ],
            },
          ],
        },
        { id: 'r2', name: 'Bhat' },
      ],
    });
    const [biryani, bhat] = await searchFoods('b');
    expect(biryani?.questions).toEqual([
      {
        id: 'meat_ratio',
        prompt: 'How much meat relative to rice?',
        required: true,
        choices: [
          { value: 'less', label: 'Less meat' },
          { value: 'more', label: 'More meat' },
        ],
      },
    ]);
    expect(bhat?.questions).toEqual([]);
  });

  it('reads a calorie range when the backend sends one', async () => {
    mockFetch.mockResolvedValueOnce({
      recipes: [{ id: 'r1', name: 'Biryani', kcal_min: 520, kcal_max: 700 }],
    });

    const [item] = await searchFoods('biryani');

    expect(item?.kcal_range).toEqual({ min: 520, max: 700 });
    expect(item?.name_bn).toBeNull();
  });

  it('ignores half a range', async () => {
    mockFetch.mockResolvedValueOnce({ recipes: [{ id: 'r1', name: 'Cha', kcal_min: 40 }] });
    const [item] = await searchFoods('cha');
    expect(item?.kcal_range).toBeNull();
  });

  it('asks for a later page of one cooking method', async () => {
    mockFetch.mockResolvedValueOnce({ recipes: [] });
    await fetchFoodPage({ offset: 40, method: 'dal' });
    expect(mockFetch).toHaveBeenCalledWith('/food/recipes?limit=20&offset=40&cooking_method=dal', {
      signal: undefined,
    });
  });
});

describe('fetchFoodCatalogue', () => {
  it('asks for the whole catalogue', async () => {
    mockFetch.mockResolvedValueOnce({ recipes: [] });
    await expect(fetchFoodCatalogue()).resolves.toEqual([]);
    expect(mockFetch).toHaveBeenCalledWith('/food/recipes?limit=200');
  });
});

describe('photoUrl', () => {
  it('keeps real photos and drops placeholders and junk', () => {
    expect(photoUrl('https://cdn.example/a.jpg')).toBe('https://cdn.example/a.jpg');
    expect(photoUrl('https://PLACEHOLD.co/640x480')).toBeNull();
    expect(photoUrl('not a url')).toBeNull();
    expect(photoUrl(null)).toBeNull();
  });
});

describe('logging', () => {
  it('previews nutrition with the answers', async () => {
    mockFetch.mockResolvedValueOnce({ recipe_id: 'r1', grams: 250, nutrients: { kcal: 410.5 } });
    const nutrients = await previewRecipeNutrition('r1', {
      grams: 250,
      answers: { meat_ratio: 'more' },
    });
    expect(mockFetch).toHaveBeenCalledWith('/food/recipes/r1/nutrition', {
      method: 'POST',
      body: { grams: 250, answers: { meat_ratio: 'more' } },
      signal: undefined,
    });
    expect(nutrients.kcal).toBe(410.5);
  });

  it('saves a log and reads the nutrition the backend worked out', async () => {
    const input = {
      recipe_id: 'r1',
      grams: 250,
      oil_tier: 'typical' as const,
      logged_at: '2026-11-15T07:00:00.000Z',
      answers: {},
    };
    mockFetch.mockResolvedValueOnce({
      received: true,
      log_id: 'l1',
      recipe_id: 'r1',
      grams: 250,
      logged_at: '2026-11-15T07:00:00+00:00',
      nutrients: { kcal: 345 },
    });
    const log = await createFoodLog(input);
    expect(mockFetch).toHaveBeenCalledWith('/food/recipes/log', { method: 'POST', body: input });
    expect(log).toMatchObject({ log_id: 'l1', nutrients: { kcal: 345 } });
  });
});

describe('normalizeQuery', () => {
  it('lowercases, drops punctuation and squeezes spaces', () => {
    expect(normalizeQuery('  Alu   Bhorta (Mashed) ')).toBe('alu bhorta mashed');
  });

  it('strips zero-width joiners but keeps Bengali vowel signs', () => {
    expect(normalizeQuery('ভ‍র্তা')).toBe('ভর্তা');
    expect(normalizeQuery('মসুর ডাল')).toBe('মসুর ডাল');
  });
});

describe('matchCatalogue', () => {
  it('matches English, Bengali and a mix, in catalogue order', () => {
    expect(matchCatalogue(CATALOGUE, 'dal')).toEqual([MASOOR]);
    expect(matchCatalogue(CATALOGUE, 'ডাল')).toEqual([MASOOR]);
    expect(matchCatalogue(CATALOGUE, 'masoor ডাল')).toEqual([MASOOR]);
    expect(matchCatalogue(CATALOGUE, 'BHO')).toEqual([ALU]);
  });

  it('needs every word to match', () => {
    expect(matchCatalogue(CATALOGUE, 'alu rice')).toEqual([]);
  });

  it('returns nothing for an empty query', () => {
    expect(matchCatalogue(CATALOGUE, ' ( ) ')).toEqual([]);
  });
});

describe('mergeResults', () => {
  it('keeps local order and appends the backend extras once', () => {
    expect(mergeResults([BHAT], [MASOOR, BHAT, ALU])).toEqual([BHAT, MASOOR, ALU]);
  });

  it('falls back to local matches without a backend answer', () => {
    expect(mergeResults([BHAT], undefined)).toEqual([BHAT]);
  });
});

describe('paging support', () => {
  it('spots a backend that repeats the first page instead of honouring offset', () => {
    expect(offsetIgnored([[ALU, BHAT]])).toBe(false);
    expect(offsetIgnored([[ALU, BHAT], [MASOOR]])).toBe(false);
    expect(
      offsetIgnored([
        [ALU, BHAT],
        [ALU, BHAT],
      ]),
    ).toBe(true);
    expect(offsetIgnored([[ALU, BHAT], []])).toBe(false);
  });

  it('spots a backend that ignores the cooking method filter', () => {
    const dal = { ...MASOOR, cooking_method: 'dal' };
    expect(methodIgnored([dal], 'dal')).toBe(false);
    expect(methodIgnored([dal, ALU], 'dal')).toBe(true);
    expect(methodIgnored([ALU], null)).toBe(false);
  });
});

describe('custom recipes', () => {
  const detail = {
    id: 'c1',
    owner_id: 'u1',
    name: "Mom's Khichuri",
    name_bn: null,
    cooking_method: 'other',
    servings: 4,
    thumbnail_url: 'https://placehold.co/640x480?text=Recipe',
    weight_g: 800,
    yield_factor: 0.8,
    water_added_g: 0,
    nutrients: { total: { kcal: 1200 }, per_100g: { kcal: 150, protein_g: 5 } },
    questions: [],
    ingredients: [
      { food_id: 'f1', edible_g: 600, bfct_foods: { name_en: 'Rice', name_bn: 'চাল' } },
      { food_id: 'f2', edible_g: 400, bfct_foods: { name_en: 'Lentil', name_bn: '' } },
    ],
  };

  it('reads a recipe detail: own recipe, per-100 g nutrition, ingredients, stored thumbnail', async () => {
    mockFetch.mockResolvedValueOnce(detail);
    const recipe = await fetchRecipeDetail('c1');
    expect(recipe.is_custom).toBe(true);
    expect(recipe.kcal_per_100g).toBe(150);
    expect(recipe.nutrients_per_100g?.protein_g).toBe(5);
    expect(recipe.yield_factor).toBe(0.8);
    expect(recipe.image_url).toBeNull();
    expect(recipe.thumbnail_url).toBe('https://placehold.co/640x480?text=Recipe');
    expect(recipe.ingredients).toEqual([
      { food_id: 'f1', edible_g: 600, name_en: 'Rice', name_bn: 'চাল', image_url: null },
      { food_id: 'f2', edible_g: 400, name_en: 'Lentil', name_bn: null, image_url: null },
    ]);
  });

  it('posts the recipe body as entered', async () => {
    mockFetch.mockResolvedValueOnce(detail);
    const input = {
      name: "Mom's Khichuri",
      name_bn: null,
      cooking_method: 'other',
      thumbnail_url: null,
      servings: 4,
      yield_factor: 0.8,
      ingredients: [{ food_id: 'f1', edible_g: 600 }],
    };
    await createCustomRecipe(input);
    expect(mockFetch).toHaveBeenLastCalledWith('/food/recipes/custom', {
      method: 'POST',
      body: input,
    });
  });

  it('deletes with a DELETE and passes a 409 through', async () => {
    const { ApiError } = jest.requireActual('../backend');
    mockFetch.mockRejectedValueOnce(new ApiError(409, 'recipe cannot be deleted'));
    await expect(deleteCustomRecipe('c1')).rejects.toMatchObject({ status: 409 });
    expect(mockFetch).toHaveBeenLastCalledWith('/food/recipes/c1', { method: 'DELETE' });
  });

  it('searches ingredients by trimmed text', async () => {
    mockFetch.mockResolvedValueOnce({
      ingredients: [{ id: 'f1', name_en: 'Rice', name_bn: '', kcal_per_100g: 350, extra: 1 }],
    });
    const result = await searchIngredients('  rice ');
    expect(mockFetch.mock.calls.at(-1)?.[0]).toBe('/food/ingredients?limit=50&search=rice');
    expect(result).toEqual([
      { id: 'f1', name_en: 'Rice', name_bn: null, kcal_per_100g: 350, image_url: null },
    ]);
  });
});

describe('fetchRecipe', () => {
  it('uses per_100g figures from a single recipe when the list fields are missing', async () => {
    mockFetch.mockResolvedValueOnce({
      id: 'r1',
      name: 'Biryani',
      weight_g: 306.9,
      servings: 1,
      nutrients: { total: { kcal: 701 }, per_100g: { kcal: 228.6, protein_g: 9.2 } },
    });
    const recipe = await fetchRecipe('r1');
    expect(recipe.kcal_per_100g).toBe(228.6);
    expect(recipe.nutrients_per_100g).toEqual({ kcal: 228.6, protein_g: 9.2 });
    expect(recipe).not.toHaveProperty('nutrients');
  });
});

describe('meal photo matching', () => {
  const photo = () => new Blob(['x'], { type: 'image/jpeg' });

  it('sends the photo, session and trimmed hint as multipart and parses candidates', async () => {
    mockFetch.mockResolvedValueOnce({
      image_session_id: 's1',
      image_upload_id: 'u1',
      status: 'needs_confirmation',
      recipe_id: 'r1',
      candidates: [
        { recipe_id: 'r1', name: 'Biryani', name_bn: null, confidence: 0.9, reason: 'rice' },
        {
          recipe_id: 'r2',
          name: 'Polao',
          cooking_method: 'polao',
          thumbnail_url: 'https://x/p.jpg',
        },
      ],
      retry_options: ['retake_photo'],
    });
    const result = await identifyMealPhoto({
      file: photo(),
      sessionId: 's1',
      description: '  beef tehari ',
    });
    const [path, init] = mockFetch.mock.calls.at(-1) ?? [];
    expect(path).toBe('/food/log/image');
    const form = init?.body as FormData;
    expect(init?.method).toBe('POST');
    expect(form.get('session_id')).toBe('s1');
    expect(form.get('description')).toBe('beef tehari');
    expect(form.get('image')).toBeInstanceOf(Blob);
    expect(result.status).toBe('needs_confirmation');
    expect(result.candidates.map((c) => c.recipe_id)).toEqual(['r1', 'r2']);
    expect(result.candidates[0]).not.toHaveProperty('confidence');
  });

  it('leaves out an empty hint and session, and accepts no match', async () => {
    mockFetch.mockResolvedValueOnce({ image_session_id: 's2', status: 'no_match', candidates: [] });
    const result = await identifyMealPhoto({ file: photo(), description: '   ' });
    const form = mockFetch.mock.calls.at(-1)?.[1]?.body as FormData;
    expect(form.has('session_id')).toBe(false);
    expect(form.has('description')).toBe(false);
    expect(result).toEqual({ image_session_id: 's2', status: 'no_match', candidates: [] });
  });

  it("shows a single recipe's figures from its nutrients block", () => {
    const food = mealCandidateFood({ recipe_id: 'r1', name: 'Biryani' });
    expect(food).toMatchObject({ id: 'r1', kcal_per_100g: null, image_url: null });
  });

  it('reads the session a failed match left behind', () => {
    const { ApiError } = jest.requireActual('../backend');
    const failed = new ApiError(502, 'could not identify', { image_session_id: 's3' });
    expect(mealPhotoSessionId(failed)).toBe('s3');
    expect(mealPhotoSessionId(new ApiError(502, 'x'))).toBeNull();
    expect(mealPhotoSessionId(new Error('x'))).toBeNull();
  });
});
