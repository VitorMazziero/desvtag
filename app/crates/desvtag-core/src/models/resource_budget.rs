//! Deterministic, per-request execution budget; clones share the same remaining work.
use std::cell::Cell;
use std::rc::Rc;

#[derive(Debug)]
struct State {
    limit: u64,
    remaining: Cell<u64>,
    exhausted: Cell<bool>,
    #[cfg(feature = "validation-metrics")]
    label: &'static str,
}

#[derive(Clone, Debug)]
pub(crate) struct WorkBudget(Rc<State>);

impl WorkBudget {
    pub fn new(limit: u64, _label: &'static str) -> Self {
        Self(Rc::new(State {
            limit,
            remaining: Cell::new(limit),
            exhausted: Cell::new(false),
            #[cfg(feature = "validation-metrics")]
            label: _label,
        }))
    }
    pub fn charge(&self, amount: u64) -> bool {
        if self.exhausted() {
            return false;
        }
        let Some(remaining) = self.0.remaining.get().checked_sub(amount) else {
            self.0.exhausted.set(true);
            return false;
        };
        self.0.remaining.set(remaining);
        #[cfg(feature = "validation-metrics")]
        crate::validation_metrics::record(self.0.label, amount);
        true
    }
    pub fn exhausted(&self) -> bool {
        self.0.exhausted.get()
    }
    pub fn limit(&self) -> u64 {
        self.0.limit
    }
    #[cfg(test)]
    pub fn spent(&self) -> u64 {
        self.0.limit - self.0.remaining.get()
    }
}

#[cfg(test)]
mod tests {
    use super::WorkBudget;

    #[test]
    fn cloning_does_not_renew_a_request_and_refusal_stays_terminal() {
        let budget = WorkBudget::new(10, "test.work");
        let inference = budget.clone();
        assert!(budget.charge(6));
        assert!(!inference.charge(5));
        assert!(budget.exhausted());
        assert!(!budget.charge(1));
        assert_eq!(budget.spent(), 6);
    }
    #[test]
    fn excessive_charge_cannot_wrap_into_an_admissible_request() {
        let budget = WorkBudget::new(100, "test.work");
        assert!(!budget.charge(u64::MAX));
        assert_eq!(budget.spent(), 0);
    }
}
