use super::{NonlinearRequest, SaturationModel};
use crate::numeric::Matrix;
/// `f(S; θ)`.
pub(super) fn predict(model: SaturationModel, theta: &[f64], s: f64) -> f64 {
    record_work!("nonlinear.predict_calls", 1);
    match model {
        SaturationModel::Monod => theta[0] * s / (theta[1] + s),
        SaturationModel::Haldane => theta[0] * s / (theta[1] + s + s * s / theta[2]),
        SaturationModel::Hill => {
            let (u, w) = (s.powf(theta[2]), theta[1].powf(theta[2]));
            theta[0] * u / (w + u)
        }
    }
}

/// Gradiente de `f` em relação aos parâmetros.
pub(super) fn gradient(model: SaturationModel, theta: &[f64], s: f64) -> Vec<f64> {
    gradient_components(model, theta, s)[..model.names().len()].to_vec()
}

fn gradient_components(model: SaturationModel, theta: &[f64], s: f64) -> [f64; 3] {
    record_work!("nonlinear.gradient_calls", 1);
    match model {
        SaturationModel::Monod => {
            let d = theta[1] + s;
            [s / d, -theta[0] * s / (d * d), 0.0]
        }
        SaturationModel::Haldane => {
            let d = theta[1] + s + s * s / theta[2];
            [
                s / d,
                -theta[0] * s / (d * d),
                theta[0] * s * s * s / (theta[2] * theta[2] * d * d),
            ]
        }
        SaturationModel::Hill => {
            let (a, b, n) = (theta[0], theta[1], theta[2]);
            let (u, w) = (s.powf(n), b.powf(n));
            let d = u + w;
            let ln_ratio = if s > 0.0 { s.ln() - b.ln() } else { 0.0 };
            [
                u / d,
                -a * u * n * b.powf(n - 1.0) / (d * d),
                if s > 0.0 {
                    a * u * w * ln_ratio / (d * d)
                } else {
                    0.0
                },
            ]
        }
    }
}

pub(super) fn residual_sum(request: &NonlinearRequest, theta: &[f64]) -> f64 {
    request
        .x
        .iter()
        .zip(&request.y)
        .map(|(&s, &y)| {
            let r = y - predict(request.model, theta, s);
            r * r
        })
        .sum()
}

pub(super) fn jacobian(request: &NonlinearRequest, theta: &[f64]) -> Matrix {
    record_work!("nonlinear.jacobian_allocations", 1);
    let mut matrix = Matrix::zeros(request.x.len(), theta.len());
    jacobian_into(request, theta, &mut matrix);
    matrix
}

pub(super) fn jacobian_into(request: &NonlinearRequest, theta: &[f64], matrix: &mut Matrix) {
    for (row, &s) in request.x.iter().enumerate() {
        let values = gradient_components(request.model, theta, s);
        for col in 0..theta.len() {
            matrix[(row, col)] = values[col];
        }
    }
}
