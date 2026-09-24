import { z } from 'zod';
import { CSS_COLOR_MESSAGE, EGG_BANNER_KEY, SAFE_URL_MESSAGE, cssUrl, isCssColor, isSafeUrl } from './validation.ts';

const color = z.string().refine(isCssColor, CSS_COLOR_MESSAGE);
const url = z.string().refine(isSafeUrl, SAFE_URL_MESSAGE);

export const qunixThemeSettingsSchema = z.object({
  background_color: color,
  text_color: color,
  focus_color: color,
  shadow_opacity: z.number().min(0).max(1),
  font_family: z.string().min(1).max(100),
  sidebar_color: color,
  card_color: color,
  border_color: color,
  border_radius: z.number().min(0).max(100),
  navbar_color: color,
  terminal_color: color,
  terminal_text_color: color,
  input_color: color,
  button_radius: z.number().min(0).max(100),
  input_radius: z.number().min(0).max(100),
  card_radius: z.number().min(0).max(100),
  navbar_height: z.number().min(32).max(200),
  sidebar_item_gap: z.number().min(0).max(100),
  sidebar_animation: z.boolean(),
  background_image: url.optional(),
  favicon_url: url.optional(),
  sidebar_blur: z.number().min(0).max(50),
  wallpaper_blur: z.number().min(0).max(50),
  wallpaper_brightness: z.number().min(0).max(1),
  glass_transparency: z.number().min(0).max(100),
  editor_color: color,
  editor_text_color: color,
  listing_color: color,
  button_color: color,
  server_action_bg: color,
  power_start_bg: color,
  power_restart_bg: color,
  power_stop_bg: color,
  sidebar_active_color: color,
  sidebar_active_bg: color,
  sidebar_item_height: z.number().min(20).max(100),
  terminal_cursor_color: color,
  terminal_selection_color: color,
  terminal_ansi_black: color,
  terminal_ansi_red: color,
  terminal_ansi_green: color,
  terminal_ansi_yellow: color,
  terminal_ansi_blue: color,
  terminal_ansi_magenta: color,
  terminal_ansi_cyan: color,
  terminal_ansi_white: color,
  egg_banners: z
    .record(z.string().regex(EGG_BANNER_KEY, 'Must be an egg UUID'), url)
    .refine((banners) => Object.keys(banners).length <= 1000, 'At most 1000 egg banners')
    .optional(),
  chart_series_1_border: color,
  chart_series_1_fill: color,
  chart_series_2_border: color,
  chart_series_2_fill: color,

  // Light Mode Theme Fields
  light_background_color: color,
  light_text_color: color,
  light_focus_color: color,
  light_shadow_opacity: z.number().min(0).max(1),
  light_sidebar_color: color,
  light_card_color: color,
  light_border_color: color,
  light_navbar_color: color,
  light_terminal_color: color,
  light_terminal_text_color: color,
  light_input_color: color,
  light_background_image: url.optional().nullable(),
  light_editor_color: color,
  light_editor_text_color: color,
  light_listing_color: color,
  light_button_color: color,
  light_server_action_bg: color,
  light_power_start_bg: color,
  light_power_restart_bg: color,
  light_power_stop_bg: color,
  light_sidebar_active_color: color,
  light_sidebar_active_bg: color,
  light_terminal_cursor_color: color,
  light_terminal_selection_color: color,
  light_terminal_ansi_black: color,
  light_terminal_ansi_red: color,
  light_terminal_ansi_green: color,
  light_terminal_ansi_yellow: color,
  light_terminal_ansi_blue: color,
  light_terminal_ansi_magenta: color,
  light_terminal_ansi_cyan: color,
  light_terminal_ansi_white: color,
  light_chart_series_1_border: color,
  light_chart_series_1_fill: color,
  light_chart_series_2_border: color,
  light_chart_series_2_fill: color,

  // Announcement Styles customization
  announcement_bg: color,
  light_announcement_bg: color,
  announcement_blur: z.number().min(0).max(100),
  announcement_border_color: color,
  light_announcement_border_color: color,
  announcement_radius: z.number().min(0).max(100),
  announcement_cta: z.boolean(),
  announcement_cta_bg: color,
  light_announcement_cta_bg: color,
  announcement_cta_color: color,
  light_announcement_cta_color: color,
  announcement_cta_radius: z.number().min(0).max(100),
  announcement_cta_link: url.optional(),
  announcement_cta_text: z.string().optional(),
  toast_style: z.string().min(4).max(100),
  toast_timer: z.boolean(),
  toast_radius: z.number().min(0).max(100),
  toast_colored_border: z.boolean(),
  toast_background_tint: z.boolean(),
  dark_7_color: color,
  light_dark_7_color: color,
  dark_6_color: color,
  light_dark_6_color: color,
  listing_radius: z.number().min(0).max(100),
  checkbox_radius: z.number().min(0).max(100),
  sidebar_hover_style: z.string().min(1).max(50),
  sidebar_width: z.number().min(150).max(400),
  sidebar_radius: z.number().min(0).max(50),
  sidebar_active_radius: z.number().min(0).max(50),
  page_title_icon: z.boolean(),
});

const URL_KEYS = ['background_image', 'light_background_image', 'favicon_url', 'announcement_cta_link'] as const;
const COLOR_KEYS = Object.entries(qunixThemeSettingsSchema.shape)
  .filter(([, schema]) => schema === color)
  .map(([key]) => key);

/**
 * Drops stored values that would be unsafe to interpolate into CSS or an `href`
 * (e.g. saved before server-side validation existed). Missing colours fall back to the
 * consumers' defaults; unsafe URLs become empty.
 */
export function sanitizeThemeSettings<T extends Record<string, any>>(settings: T): T {
  const clean: Record<string, any> = { ...settings };

  for (const key of COLOR_KEYS) {
    if (typeof clean[key] === 'string' && !isCssColor(clean[key])) delete clean[key];
  }
  for (const key of URL_KEYS) {
    if (typeof clean[key] === 'string' && !isSafeUrl(clean[key])) clean[key] = '';
  }
  if (clean.egg_banners && typeof clean.egg_banners === 'object') {
    clean.egg_banners = Object.fromEntries(
      Object.entries(clean.egg_banners).filter(
        ([egg, banner]) => EGG_BANNER_KEY.test(egg) && cssUrl(banner) !== null,
      ),
    );
  }

  return clean as T;
}
