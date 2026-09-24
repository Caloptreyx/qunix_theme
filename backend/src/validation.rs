//! Validators for values that the frontend interpolates into CSS (`url(...)`, custom properties)
//! or into `<a href>`. Keep in sync with `frontend/src/lib/validation.ts`.

use compact_str::CompactString;
use std::collections::HashMap;

const MAX_COLOR_LEN: usize = 100;
const MAX_URL_LEN: usize = 2048;
const MAX_EGG_BANNERS: usize = 1000;
const MAX_EGG_KEY_LEN: usize = 64;

/// Accepts `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()/rgba()/hsl()/hsla()` with plain
/// numeric arguments, and bare keywords (`red`, `transparent`, `currentColor`).
/// Nested functions (`url(`, `var(`, `image-set(`), quotes and separators are rejected, so a
/// colour can never make the browser fetch a resource.
pub fn is_css_color(value: &str) -> bool {
    if value.is_empty() || value.len() > MAX_COLOR_LEN {
        return false;
    }

    if let Some(hex) = value.strip_prefix('#') {
        return matches!(hex.len(), 3 | 4 | 6 | 8) && hex.bytes().all(|b| b.is_ascii_hexdigit());
    }

    if value.bytes().all(|b| b.is_ascii_alphabetic()) {
        return true;
    }

    let Some((name, rest)) = value.split_once('(') else {
        return false;
    };
    let Some(args) = rest.strip_suffix(')') else {
        return false;
    };

    matches!(
        name.to_ascii_lowercase().as_str(),
        "rgb" | "rgba" | "hsl" | "hsla"
    ) && !args.trim().is_empty()
        && args
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'.' | b',' | b'%' | b'/' | b' ' | b'+' | b'-'))
}

/// Accepts an empty string (clears the value), absolute `http(s)://` URLs with a host, or
/// root-relative paths (`/assets/x.png`, not protocol-relative `//host`). Rejects whitespace,
/// control characters, quotes, backslashes, angle brackets and parentheses so the value is inert
/// both inside CSS `url()` and in an `href`.
pub fn is_safe_url(value: &str) -> bool {
    if value.is_empty() {
        return true;
    }
    if value.len() > MAX_URL_LEN {
        return false;
    }
    if value.chars().any(|c| {
        c.is_whitespace()
            || c.is_control()
            || matches!(c, '"' | '\'' | '`' | '\\' | '<' | '>' | '(' | ')')
    }) {
        return false;
    }

    let lower = value.to_ascii_lowercase();
    let after_scheme = lower
        .strip_prefix("https://")
        .or_else(|| lower.strip_prefix("http://"));

    match after_scheme {
        Some(rest) => rest
            .split(['/', '?', '#'])
            .next()
            .is_some_and(|host| !host.is_empty()),
        None => value.starts_with('/') && !value.starts_with("//"),
    }
}

pub fn css_color(value: &str, _context: &()) -> garde::Result {
    if is_css_color(value) {
        Ok(())
    } else {
        Err(garde::Error::new(
            "must be a hex, rgb(a), hsl(a) or named CSS colour (max 100 characters)",
        ))
    }
}

pub fn safe_url(value: &str, _context: &()) -> garde::Result {
    if is_safe_url(value) {
        Ok(())
    } else {
        Err(garde::Error::new(
            "must be empty, an http(s):// URL or a path starting with / (no spaces, quotes or parentheses; max 2048 characters)",
        ))
    }
}

pub fn egg_banners(value: &HashMap<CompactString, CompactString>, _context: &()) -> garde::Result {
    if value.len() > MAX_EGG_BANNERS {
        return Err(garde::Error::new(format!(
            "must contain at most {MAX_EGG_BANNERS} entries"
        )));
    }

    for (key, url) in value {
        if key.is_empty()
            || key.len() > MAX_EGG_KEY_LEN
            || !key.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-')
        {
            return Err(garde::Error::new(format!(
                "key {key:?} must be an egg UUID"
            )));
        }
        if !is_safe_url(url) {
            return Err(garde::Error::new(format!(
                "banner for egg {key} must be empty, an http(s):// URL or a path starting with /"
            )));
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn colors() {
        for ok in [
            "#fff",
            "#ffff",
            "#6c5ce7",
            "#6c5ce7cc",
            "red",
            "transparent",
            "currentColor",
            "rgba(108, 92, 231, 0.15)",
            "hsla(263, 85%, 60%, 1.00)",
            "rgb(0 0 0 / 50%)",
            "hsl(120deg 50% 50%)",
        ] {
            assert!(is_css_color(ok), "{ok}");
        }
        for bad in [
            "",
            "#ff",
            "#gggggg",
            "url(https://tracker.example/x)",
            "rgb(url(x))",
            "var(--x)",
            "red; background: url(x)",
            "rgba(1,2,3,0.5) url(x)",
            "rgb()",
            "rgb(1,2,3",
            "\"red\"",
        ] {
            assert!(!is_css_color(bad), "{bad}");
        }
    }

    #[test]
    fn urls() {
        for ok in [
            "",
            "https://example.com/a.png",
            "HTTP://example.com",
            "https://example.com?x=1",
            "/assets/bg.webp",
        ] {
            assert!(is_safe_url(ok), "{ok}");
        }
        for bad in [
            "javascript:alert(1)",
            "JaVaScRiPt:alert`1`",
            "data:image/png;base64,AAAA",
            "//evil.example/x",
            "https://",
            "https:///path",
            "https://a.com/x) , url(//evil",
            "https://a.com/x\"",
            "https://a.com/ x",
            "relative/path.png",
            "https://a.com/\\x",
        ] {
            assert!(!is_safe_url(bad), "{bad}");
        }
    }

    #[test]
    fn banners() {
        let mut map = HashMap::new();
        map.insert(
            CompactString::from("3f2b1c9e-0000-4000-8000-000000000000"),
            CompactString::from("https://example.com/b.png"),
        );
        map.insert(CompactString::from("abc"), CompactString::from(""));
        assert!(egg_banners(&map, &()).is_ok());

        map.insert(CompactString::from("x;y"), CompactString::from(""));
        assert!(egg_banners(&map, &()).is_err());

        map.remove("x;y");
        map.insert(CompactString::from("abc"), CompactString::from("javascript:x"));
        assert!(egg_banners(&map, &()).is_err());
    }
}
