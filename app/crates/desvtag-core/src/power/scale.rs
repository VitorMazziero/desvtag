//! Positive products at representable scales, pairing opposite magnitudes before multiplication.
pub(super) fn positive_product(mut factors: [f64; 5]) -> Option<f64> {
    if factors
        .iter()
        .any(|value| !value.is_finite() || *value <= 0.0)
    {
        return None;
    }
    factors.sort_by(f64::total_cmp);
    let mut paired = [factors[0] * factors[4], factors[1] * factors[3], factors[2]];
    paired.sort_by(f64::total_cmp);
    let value = (paired[0] * paired[2]) * paired[1];
    (value.is_finite() && value > 0.0).then_some(value)
}
