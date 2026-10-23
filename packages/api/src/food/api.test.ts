import { apiFetch } from '../backend';
import {
  type FoodItem,
  fetchFoodCatalogue,
  fetchFoodPage,
  matchCatalogue,
  mergeResults,
  methodIgnored,
  normalizeQuery,
  offsetIgnored,
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
  kcal_range: null,
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

  it('reads a photo when the backend sends one', async () => {
    mockFetch.mockResolvedValueOnce({
      recipes: [{ id: 'r1', name: 'Biryani', image_url: 'https://cdn.example/biryani.jpg' }],
    });
    const [item] = await searchFoods('biryani');
    expect(item?.image_url).toBe('https://cdn.example/biryani.jpg');
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
