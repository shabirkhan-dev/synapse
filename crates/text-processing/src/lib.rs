//! Text processing for Synapse. Pure library code: no N-API here (see `crates/bindings`).

use tiktoken_rs::{CoreBPE, o200k_base_singleton};

/// The tokenizer behind every count: OpenAI's `o200k_base` (GPT-4o family). Other vendors
/// tokenize differently, so for them a count is a close approximation, not an exact figure.
pub const TOKENIZER: &str = "o200k_base";

fn tokenizer() -> &'static CoreBPE {
    o200k_base_singleton()
}

/// Number of tokens in `text`. Special tokens (e.g. `<|endoftext|>`) are counted as plain text,
/// so untrusted input can never be read as a control token.
pub fn count_tokens(text: &str) -> usize {
    tokenizer().encode_ordinary(text).len()
}

/// [`count_tokens`] for each input, in order.
pub fn count_tokens_batch<S: AsRef<str>>(texts: &[S]) -> Vec<usize> {
    texts
        .iter()
        .map(|text| count_tokens(text.as_ref()))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn counts_known_strings() {
        assert_eq!(count_tokens(""), 0);
        assert_eq!(count_tokens("hello world"), 2);
        assert!(count_tokens("Refunds are accepted within 30 days.") < 12);
    }

    #[test]
    fn special_tokens_are_plain_text() {
        assert!(count_tokens("<|endoftext|>") > 1);
    }

    #[test]
    fn non_latin_text_costs_more_than_four_chars_per_token_suggests() {
        let text = "返金は購入から30日以内に受け付けます。";
        assert!(count_tokens(text) > text.chars().count() / 4);
    }

    #[test]
    fn batch_keeps_order() {
        assert_eq!(
            count_tokens_batch(&["hello world", "", "hello"]),
            vec![2, 0, 1]
        );
    }
}
