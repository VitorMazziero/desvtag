//! Optional thread-local work observation; no clock, I/O or change to scientific outputs.
use std::cell::RefCell;
use std::collections::BTreeMap;

thread_local! {
    static COUNTS: RefCell<BTreeMap<&'static str, u64>> = const { RefCell::new(BTreeMap::new()) };
}

/// Add completed/attempted work at the named observation point, with saturating counters.
pub fn record(label: &'static str, amount: u64) {
    COUNTS.with_borrow_mut(|counts| {
        let count = counts.entry(label).or_default();
        *count = count.saturating_add(amount);
    });
}

/// Run one operation with fresh counters, returning its unchanged output and observations.
pub fn observe<T>(operation: impl FnOnce() -> T) -> (T, BTreeMap<&'static str, u64>) {
    COUNTS.with_borrow_mut(BTreeMap::clear);
    let result = operation();
    (result, COUNTS.with_borrow_mut(std::mem::take))
}
