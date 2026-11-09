//! N-API bindings (napi-rs). Keep this surface small and typed; logic lives in the library crates.

use napi_derive::napi;

/// Tokenizer name, e.g. `o200k_base`.
#[napi]
pub fn tokenizer() -> &'static str {
    synapse_text_processing::TOKENIZER
}

/// Tokens in `text`.
#[napi]
pub fn count_tokens(text: String) -> u32 {
    saturate(synapse_text_processing::count_tokens(&text))
}

/// Tokens in each text, in order (one call for many texts saves N-API round trips).
#[napi]
pub fn count_tokens_batch(texts: Vec<String>) -> Vec<u32> {
    synapse_text_processing::count_tokens_batch(&texts)
        .into_iter()
        .map(saturate)
        .collect()
}

fn saturate(count: usize) -> u32 {
    u32::try_from(count).unwrap_or(u32::MAX)
}
