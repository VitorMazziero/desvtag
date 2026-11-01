//! C19 — registro de métodos, capacidades e situação.
//!
//! O registro é a fonte que a interface usa para apresentar métodos e
//! explicar indisponibilidades; não se oferece cálculo para método não
//! entregue.

pub mod capabilities;
pub mod methods;
pub mod status;

pub use capabilities::Capabilities;
pub use methods::{MethodInfo, registered_methods};
pub use status::{Implementation, Validation};
