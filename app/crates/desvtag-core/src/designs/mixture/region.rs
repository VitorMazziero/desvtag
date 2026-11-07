//! Geometry of a box intersected with the mixture sum hyperplane.
use super::MixtureRegion;

const TOLERANCE: f64 = 64.0 * f64::EPSILON;

pub(crate) fn valid_upper_bounds(lower: &[f64], upper: &[f64]) -> bool {
    upper.len() == lower.len()
        && upper
            .iter()
            .zip(lower)
            .all(|(u, l)| u.is_finite() && *u >= *l && *u <= 1.0)
        && upper.iter().sum::<f64>() >= 1.0 - TOLERANCE
}

fn same(a: &[f64], b: &[f64]) -> bool {
    a.iter().zip(b).all(|(x, y)| (x - y).abs() <= TOLERANCE)
}

fn sort_unique(points: &mut Vec<Vec<f64>>) {
    points.sort_by(|a, b| {
        a.iter()
            .zip(b)
            .map(|(x, y)| x.total_cmp(y))
            .find(|order| !order.is_eq())
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    // Roundoff can interleave equivalent points in lexicographic order.
    let mut unique = Vec::with_capacity(points.len());
    for point in points.drain(..) {
        if !unique.iter().any(|other: &Vec<f64>| same(other, &point)) {
            unique.push(point);
        }
    }
    *points = unique;
}

pub(crate) fn geometry(lower: &[f64], upper: &[f64]) -> MixtureRegion {
    let q = lower.len();
    let mut vertices = Vec::new();
    for free in 0..q {
        for mask in 0..(1_usize << (q - 1)) {
            let mut point = lower.to_vec();
            let mut bit = 0;
            for (index, value) in point.iter_mut().enumerate() {
                if index != free {
                    if mask & (1 << bit) != 0 {
                        *value = upper[index];
                    }
                    bit += 1;
                }
            }
            let remaining = 1.0
                - point
                    .iter()
                    .enumerate()
                    .filter(|(index, _)| *index != free)
                    .map(|(_, x)| x)
                    .sum::<f64>();
            if remaining >= lower[free] - TOLERANCE && remaining <= upper[free] + TOLERANCE {
                point[free] = remaining.clamp(lower[free], upper[free]);
                vertices.push(point);
            }
        }
    }
    sort_unique(&mut vertices);
    let mut edges = Vec::new();
    for (i, a) in vertices.iter().enumerate() {
        for (j, b) in vertices.iter().enumerate().skip(i + 1) {
            let mut changing = 0;
            let mut shared_interior = false;
            for k in 0..q {
                if (a[k] - b[k]).abs() > TOLERANCE {
                    changing += 1;
                } else if (a[k] - lower[k]).abs() > TOLERANCE && (a[k] - upper[k]).abs() > TOLERANCE
                {
                    shared_interior = true;
                }
            }
            if changing == 2 && !shared_interior {
                edges.push([i as u32, j as u32]);
            }
        }
    }
    let varying = (0..q)
        .filter(|&k| {
            let min = vertices.iter().map(|v| v[k]).fold(f64::INFINITY, f64::min);
            let max = vertices
                .iter()
                .map(|v| v[k])
                .fold(f64::NEG_INFINITY, f64::max);
            max - min > TOLERANCE
        })
        .count();
    MixtureRegion {
        vertices,
        edges,
        dimension: varying.saturating_sub(1) as u32,
    }
}

pub(crate) fn points(region: &MixtureRegion, degree: u32) -> Vec<Vec<f64>> {
    let mut points = region.vertices.clone();
    for [i, j] in &region.edges {
        let (a, b) = (&region.vertices[*i as usize], &region.vertices[*j as usize]);
        for step in 1..degree {
            let fraction = f64::from(step) / f64::from(degree);
            points.push(
                a.iter()
                    .zip(b)
                    .map(|(x, y)| (1.0 - fraction) * x + fraction * y)
                    .collect(),
            );
        }
    }
    sort_unique(&mut points);
    points
}
