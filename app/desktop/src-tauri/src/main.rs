// Evita a janela de console extra no Windows em release; não remover.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    optima_desktop_lib::run();
}
