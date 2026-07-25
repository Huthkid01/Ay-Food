import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { MENU_CATEGORIES, NIGERIAN_MENU_FOODS } from '../src/data/nigerian-menu';
import { getFoodImageUrl } from '../src/utils/food-images';

async function main() {
  const env = Object.fromEntries(
    readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
      .split('\n')
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')];
      }),
  );

  const email = process.env.PLAYWRIGHT_ADMIN_EMAIL || env.VITE_ADMIN_EMAIL || 'contact@ayfoodpalace.com';
  const password = process.env.PLAYWRIGHT_ADMIN_PASSWORD;
  if (!password) {
    console.error('Set PLAYWRIGHT_ADMIN_PASSWORD to seed (password is not stored in .env.local).');
    process.exit(1);
  }

  const sb = createClient(env.VITE_SUPABASE_URL!, env.VITE_SUPABASE_ANON_KEY!);

  const { data: login, error: loginErr } = await sb.rpc('admin_login', {
    p_email: email,
    p_password: password,
  });
  if (loginErr || !login?.token) {
    console.error('Login failed:', loginErr?.message);
    process.exit(1);
  }
  const token = login.token as string;

  const categories = MENU_CATEGORIES.map((c, i) => ({
    name: c.name,
    slug: c.slug,
    description: '',
    image: getFoodImageUrl('', c.slug),
    sort_order: i + 1,
    is_active: true,
  }));

  const foods = NIGERIAN_MENU_FOODS.map((f) => ({
    name: f.name,
    slug: f.slug,
    description: f.description ?? '',
    image: f.image ?? getFoodImageUrl(f.slug, f.category.slug),
    category_slug: f.category.slug,
    is_available: true,
    is_popular: f.isPopular,
    is_new: f.isNew,
    prep_time_minutes: f.prepTimeMinutes ?? 25,
    tags: f.tags ?? '',
    portions: f.portions.map((p) => ({
      portion_name: p.portion.name,
      price: p.price,
      is_available: true,
    })),
  }));

  const { data, error } = await sb.rpc('admin_import_flyer_menu', {
    p_admin_token: token,
    p_categories: categories,
    p_foods: foods,
  });
  console.log({ data, error: error?.message ?? null });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
